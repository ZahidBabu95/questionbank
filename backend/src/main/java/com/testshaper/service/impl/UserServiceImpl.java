package com.testshaper.service.impl;

import com.testshaper.dto.CreateUserDTO;
import com.testshaper.dto.UpdateUserDTO;
import com.testshaper.dto.UserDTO;
import com.testshaper.entity.Institute;
import com.testshaper.entity.Role;
import com.testshaper.entity.User;
import com.testshaper.mapper.UserMapper;
import com.testshaper.repository.AcademicClassRepository;
import com.testshaper.repository.InstituteRepository;
import com.testshaper.repository.RoleRepository;
import com.testshaper.repository.UserRepository;
import com.testshaper.repository.BillingPackageRepository;
import com.testshaper.entity.BillingPackage;
import com.testshaper.service.SecuritySettingService;
import com.testshaper.service.UserService;
import com.testshaper.service.EmailService;
import com.testshaper.service.UserActivityLogService;
import com.testshaper.service.DynamicStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.lang.NonNull;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final InstituteRepository instituteRepository;
    private final UserMapper userMapper;
    private final SecuritySettingService securityService;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;
    private final UserActivityLogService activityLogService;
    private final DynamicStorageService storageService;
    private final AcademicClassRepository academicClassRepository;
    private final BillingPackageRepository billingPackageRepository;

    @Override
    @Transactional
    public UserDTO createUser(@NonNull CreateUserDTO dto) {
        if (userRepository.existsByEmail(dto.getEmail())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email already exists");
        }

        // Get Current Logged In User
        String currentEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        User currentUser = userRepository.findByEmail(currentEmail).orElse(null);
        
        boolean isSuperAdminCreation = dto.getRoles() != null && dto.getRoles().contains("SUPER_ADMIN");
        boolean isCreatorSuperAdmin = currentUser != null && currentUser.getRoles().stream().anyMatch(r -> r.getName().equals("SUPER_ADMIN"));

        UUID instituteIdToUse = dto.getInstituteId();

        // Auto-assign institute if creator is NOT Super Admin but has an Institute
        if (!isCreatorSuperAdmin && currentUser != null && currentUser.getInstitute() != null) {
            instituteIdToUse = currentUser.getInstitute().getId();
        }

        // Handle independent users: If the new user is NOT SUPER_ADMIN and no institute is provided, create a Personal Workspace
        if (!isSuperAdminCreation && instituteIdToUse == null) {
            Institute personalInstitute = new Institute();
            personalInstitute.setName(dto.getName() + "'s Workspace");
            personalInstitute.setCode("PERS-" + java.util.UUID.randomUUID().toString().substring(0, 8).toUpperCase());
            personalInstitute.setType(Institute.InstituteType.PERSONAL);
            personalInstitute.setStatus(Institute.InstituteStatus.ACTIVE);

            // Assign billing package if selected
            if (dto.getPackageId() != null) {
                BillingPackage pkg = billingPackageRepository.findById(dto.getPackageId()).orElse(null);
                if (pkg != null) {
                    personalInstitute.setSubscriptionPackage(pkg);
                    personalInstitute.setMaxTeachers(pkg.getMaxTeachers() != null ? pkg.getMaxTeachers() : 5);
                    personalInstitute.setMaxStudents(pkg.getMaxStudents() != null ? pkg.getMaxStudents() : 50);
                    personalInstitute.setAiLimitPerMonth(pkg.getAiLimitPerMonth() != null ? pkg.getAiLimitPerMonth() : 100000);
                    personalInstitute.setMaxQuestions(pkg.getMaxQuestions() != null ? pkg.getMaxQuestions() : 500);
                    personalInstitute.setStorageLimitMb(pkg.getStorageLimitMb() != null ? pkg.getStorageLimitMb() : 500);
                    
                    if (pkg.getPackageCode().contains("PREMIUM")) {
                        personalInstitute.setPlanType(Institute.SubscriptionPlan.PREMIUM);
                    } else if (pkg.getPackageCode().contains("BASIC")) {
                        personalInstitute.setPlanType(Institute.SubscriptionPlan.BASIC);
                    } else if (pkg.getPackageCode().contains("ENTERPRISE")) {
                        personalInstitute.setPlanType(Institute.SubscriptionPlan.ENTERPRISE);
                    } else {
                        personalInstitute.setPlanType(Institute.SubscriptionPlan.BETA);
                    }
                } else {
                    personalInstitute.setPlanType(Institute.SubscriptionPlan.BETA);
                }
            } else {
                personalInstitute.setPlanType(Institute.SubscriptionPlan.BETA);
            }
            
            personalInstitute = instituteRepository.save(personalInstitute);
            instituteIdToUse = personalInstitute.getId();
        }

        // Validate Password
        String tenantId = instituteIdToUse != null ? instituteIdToUse.toString() : null;
        try {
            securityService.validatePassword(dto.getPassword(), tenantId);
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        }

        User user = userMapper.toEntity(dto);
        user.setPassword(passwordEncoder.encode(dto.getPassword()));

        // Handle Roles
        if (dto.getRoles() != null && !dto.getRoles().isEmpty()) {
            Set<Role> roles = new HashSet<>();
            org.springframework.security.core.Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            boolean isPublicSelfRegistration = auth == null ||
                    auth instanceof org.springframework.security.authentication.AnonymousAuthenticationToken ||
                    !auth.isAuthenticated();

            for (String roleName : dto.getRoles()) {
                Role role = roleRepository.findByName(roleName)
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST,
                                "Role not found: " + roleName));
                
                if (isPublicSelfRegistration && !role.isAllowSelfRegistration()) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                            "Role not allowed for public registration: " + roleName);
                }
                
                roles.add(role);
            }
            user.setRoles(roles);
        } else {
            // Default role for new signups
            Role defaultRole = roleRepository.findByName("TEACHER").orElse(null);
            if (defaultRole != null) {
                Set<Role> roles = new HashSet<>();
                roles.add(defaultRole);
                user.setRoles(roles);
            }
        }

        // Handle Institute & Limits Enforcement
        if (instituteIdToUse != null) {
            Institute institute = instituteRepository.findById(instituteIdToUse)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Institute not found"));
            
            // Check limits for TEACHER or STUDENT creation (unless creator is SUPER_ADMIN)
            if (!isCreatorSuperAdmin) {
                boolean isTeacher = dto.getRoles() == null || dto.getRoles().isEmpty() || dto.getRoles().contains("TEACHER");
                boolean isStudent = dto.getRoles() != null && dto.getRoles().contains("STUDENT");
                
                if (isTeacher) {
                    long currentTeachers = userRepository.countByInstituteIdAndRoleName(instituteIdToUse, "TEACHER");
                    Integer maxTeachers = institute.getMaxTeachers();
                    if (maxTeachers != null && currentTeachers >= maxTeachers) {
                        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, 
                            "Teacher limit reached (" + maxTeachers + "). Please upgrade your package.");
                    }
                }
                
                if (isStudent) {
                    long currentStudents = userRepository.countByInstituteIdAndRoleName(instituteIdToUse, "STUDENT");
                    Integer maxStudents = institute.getMaxStudents();
                    if (maxStudents != null && currentStudents >= maxStudents) {
                        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, 
                            "Student limit reached (" + maxStudents + "). Please upgrade your package.");
                    }
                }
            }
            
            user.setInstitute(institute);
        }

        // Handle Academic Class & Student Roll
        if (dto.getClassId() != null) {
            com.testshaper.entity.AcademicClass academicClass = academicClassRepository.findById(dto.getClassId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Academic Class not found"));
            user.setAcademicClass(academicClass);
        }
        if (dto.getStudentRoll() != null) {
            user.setStudentRoll(dto.getStudentRoll());
        }

        User savedUser = userRepository.save(user);
        return userMapper.toDTO(savedUser);
    }

    @Override
    @Transactional(readOnly = true)
    public UserDTO getUserById(@NonNull UUID id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        return userMapper.toDTO(user);
    }

    @Override
    @Transactional(readOnly = true)
    public UserDTO getUserByEmail(@NonNull String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(
                        () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found with email: " + email));
        return userMapper.toDTO(user);
    }

    @Override
    @Transactional
    public UserDTO updateUser(@NonNull UUID id, @NonNull UpdateUserDTO dto) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        if (!user.getEmail().equals(dto.getEmail()) && userRepository.existsByEmail(dto.getEmail())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email already exists");
        }

        // Update basic fields
        user.setName(dto.getName());
        user.setEmail(dto.getEmail());
        user.setPhone(dto.getPhone());
        user.setActive(dto.isActive());

        // Update Roles
        if (dto.getRoles() != null) {
            Set<Role> roles = new HashSet<>();
            for (String roleName : dto.getRoles()) {
                Role role = roleRepository.findByName(roleName)
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST,
                                "Role not found: " + roleName));
                roles.add(role);
            }
            user.setRoles(roles);
        }

        // Update Institute
        UUID instituteId = dto.getInstituteId();
        if (instituteId != null) {
            Institute institute = instituteRepository.findById(instituteId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Institute not found"));
            user.setInstitute(institute);
        }

        // Update Academic Class & Student Roll
        if (dto.getClassId() != null) {
            com.testshaper.entity.AcademicClass academicClass = academicClassRepository.findById(dto.getClassId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Academic Class not found"));
            user.setAcademicClass(academicClass);
        } else {
            user.setAcademicClass(null);
        }
        user.setStudentRoll(dto.getStudentRoll());

        return userMapper.toDTO(userRepository.save(user));
    }

    @Override
    @Transactional
    public UserDTO updateProfile(@NonNull UUID id, @NonNull com.testshaper.dto.UpdateProfileDTO dto) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        user.setName(dto.getName());
        user.setPhone(dto.getPhone());
        user.setUserInstituteNameEn(dto.getInstituteNameEn());
        user.setUserInstituteNameBn(dto.getInstituteNameBn());
        
        return userMapper.toDTO(userRepository.save(user));
    }

    @Override
    @Transactional
    public void deleteUser(@NonNull UUID id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        userRepository.delete(user);
    }

    @Override
    @Transactional
    public void activateUser(@NonNull UUID id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        user.setActive(true);
        if (user.getInstitute() != null) {
            user.getInstitute().setStatus(Institute.InstituteStatus.ACTIVE);
            instituteRepository.save(user.getInstitute());
        }
        userRepository.save(user);
    }

    @Override
    @Transactional
    public void deactivateUser(@NonNull UUID id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        user.setActive(false);
        userRepository.save(user);
    }

    @Override
    @Transactional
    public void unlockUser(@NonNull UUID id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        user.setAccountLocked(false);
        user.setFailedLoginAttempts(0);
        user.setLockTime(null);
        userRepository.save(user);
    }

    @Override
    @Transactional
    public String resetPassword(@NonNull UUID id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        String newPassword = "QS@" + (int)(Math.random() * 90000 + 10000); // e.g. QS@47293
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        // Send email async
        try { emailService.sendPasswordResetEmail(user.getEmail(), user.getName(), newPassword); }
        catch (Exception ignored) { /* graceful — email optional */ }
        // Audit log
        String actor = SecurityContextHolder.getContext().getAuthentication().getName();
        activityLogService.log(null, actor, user.getId(), user.getName(),
            "RESET_PASSWORD", "Password reset by " + actor, null);
        return newPassword;
    }

    @Override
    @Transactional
    public void changePassword(@NonNull UUID id, @NonNull String oldPassword, @NonNull String newPassword) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        if (!passwordEncoder.matches(oldPassword, user.getPassword())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid old password");
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<com.testshaper.dto.UserSummaryDTO> getAllUsers(String query, UUID instituteId, String role, Boolean active, Boolean accountLocked,
            boolean includeDeleted, Pageable pageable) {

        String currentEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        User currentUser = userRepository.findByEmail(currentEmail).orElse(null);
        UUID targetInstituteId = instituteId;
        
        if (currentUser != null) {
            boolean isSuperAdmin = currentUser.getRoles().stream()
                    .anyMatch(r -> r.getName().equals("SUPER_ADMIN"));
            if (!isSuperAdmin) {
                targetInstituteId = currentUser.getInstitute() != null ? currentUser.getInstitute().getId() : null;
            }
        }

        org.springframework.data.jpa.domain.Specification<User> spec = 
            com.testshaper.specification.UserSpecification.filterUsers(
                query, targetInstituteId, role, active, accountLocked, includeDeleted, currentEmail
            );

        return userRepository.findAll(spec, pageable).map(userMapper::toSummaryDTO);
    }

    @Override
    @Transactional
    public void uploadProfileImage(@NonNull UUID id, @NonNull MultipartFile file) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        try {
            String imageUrl = storageService.uploadFile(
                file, 
                user.getInstitute() != null ? user.getInstitute().getId().toString() : null, 
                "avatars"
            );
            user.setProfileImageUrl(imageUrl);
            userRepository.save(user);
        } catch (java.io.IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to upload profile image to storage: " + e.getMessage());
        }
    }

    @Override
    @Transactional(readOnly = true)
    public java.util.Map<String, Object> getUserStats() {
        String currentEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        User currentUser = userRepository.findByEmail(currentEmail).orElse(null);
        java.time.LocalDateTime thirtyDaysAgo = java.time.LocalDateTime.now().minusDays(30);

        if (currentUser != null) {
            boolean isSuperAdmin = currentUser.getRoles().stream()
                    .anyMatch(r -> r.getName().equals("SUPER_ADMIN"));
            if (!isSuperAdmin && currentUser.getInstitute() != null) {
                UUID instId = currentUser.getInstitute().getId();
                return java.util.Map.of(
                    "total",        userRepository.countByInstituteIdAndDeletedFalse(instId),
                    "active",       userRepository.countByInstituteIdAndActiveTrueAndDeletedFalse(instId),
                    "inactive",     userRepository.countByInstituteIdAndActiveFalseAndDeletedFalse(instId),
                    "locked",       userRepository.countByInstituteIdAndAccountLockedTrueAndDeletedFalse(instId),
                    "teachers",     userRepository.countByInstituteIdAndRoleName(instId, "TEACHER"),
                    "students",     userRepository.countByInstituteIdAndRoleName(instId, "STUDENT"),
                    "admins",       userRepository.countByInstituteIdAndRoleName(instId, "INSTITUTE_ADMIN"),
                    "newLast30Days", userRepository.countNewUsersByInstituteSince(instId, thirtyDaysAgo)
                );
            }
        }

        return java.util.Map.of(
            "total",        userRepository.countByDeletedFalse(),
            "active",       userRepository.countByActiveTrueAndDeletedFalse(),
            "inactive",     userRepository.countByActiveFalseAndDeletedFalse(),
            "locked",       userRepository.countByAccountLockedTrueAndDeletedFalse(),
            "teachers",     userRepository.countByRoleName("TEACHER"),
            "students",     userRepository.countByRoleName("STUDENT"),
            "admins",       userRepository.countByRoleName("INSTITUTE_ADMIN"),
            "newLast30Days", userRepository.countNewUsersSince(thirtyDaysAgo)
        );
    }

    @Override
    @Transactional
    public void bulkActivate(java.util.List<UUID> ids) {
        ids.forEach(id -> {
            userRepository.findById(id).ifPresent(u -> {
                u.setActive(true);
                if (u.getInstitute() != null) {
                    u.getInstitute().setStatus(Institute.InstituteStatus.ACTIVE);
                    instituteRepository.save(u.getInstitute());
                }
                userRepository.save(u);
            });
        });
    }

    @Override
    @Transactional
    public void bulkDeactivate(java.util.List<UUID> ids) {
        ids.forEach(id -> {
            userRepository.findById(id).ifPresent(u -> { u.setActive(false); userRepository.save(u); });
        });
    }

    @Override
    @Transactional
    public void bulkDelete(java.util.List<UUID> ids) {
        ids.forEach(id -> {
            userRepository.findById(id).ifPresent(u -> userRepository.delete(u));
        });
    }

    @Override
    @Transactional(readOnly = true)
    public byte[] exportUsersCsv(String role, Boolean active) {
        String currentEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        org.springframework.data.domain.Pageable pageable =
            org.springframework.data.domain.PageRequest.of(0, Integer.MAX_VALUE);
        java.util.List<UserDTO> users = userRepository
            .searchUsers("", role, active, null, currentEmail, pageable)
            .getContent().stream().map(userMapper::toDTO)
            .collect(java.util.stream.Collectors.toList());

        StringBuilder csv = new StringBuilder("Name,Email,Phone,Roles,Institute,Status,Joined\n");
        for (UserDTO u : users) {
            csv.append(String.join(",",
                q(u.getName()), q(u.getEmail()), q(u.getPhone()),
                q(String.join("|", u.getRoles() != null ? u.getRoles() : java.util.List.of())),
                q(u.getInstituteName()),
                q(u.isActive() ? "Active" : "Inactive"),
                q(u.getCreatedAt() != null ? u.getCreatedAt().toLocalDate().toString() : "")
            )).append("\n");
        }
        return csv.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8);
    }

    private String q(String s) {
        if (s == null) return "";
        return "\"" + s.replace("\"", "\"\"") + "\"";
    }
}
