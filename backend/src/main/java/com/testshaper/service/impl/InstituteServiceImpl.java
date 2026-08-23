package com.testshaper.service.impl;

import com.testshaper.entity.Institute;
import com.testshaper.entity.BillingPackage;
import com.testshaper.repository.InstituteRepository;
import com.testshaper.repository.BillingPackageRepository;
import com.testshaper.service.InstituteService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@SuppressWarnings("null")
public class InstituteServiceImpl implements InstituteService {

    private final InstituteRepository instituteRepository;
    private final BillingPackageRepository billingPackageRepository;
    private final com.testshaper.repository.ClassSubjectRepository classSubjectRepository;
    private final com.testshaper.repository.UserRepository userRepository;
    private final com.testshaper.repository.RoleRepository roleRepository;
    // In a real app, inject FileStorageService here

    @Override
    @Transactional
    public Institute createInstitute(Institute institute, MultipartFile logo) {
        if (instituteRepository.existsByCode(institute.getCode())) {
            throw new RuntimeException("Institute code '" + institute.getCode() + "' already exists.");
        }

        // Handle logo upload logic here (mocked for now)
        if (logo != null && !logo.isEmpty()) {
            institute.setLogoPath("uploads/logos/" + institute.getCode() + ".png");
        }

        // Set defaults
        if (institute.getPlanStartDate() == null) {
            institute.setPlanStartDate(LocalDate.now());
        }

        // Calculate expiry if not set
        if (institute.getExpiryDate() == null) {
            institute.setExpiryDate(LocalDate.now().plusMonths(1)); // Default 1 month
        }

        // Handle package assignment
        if (institute.getSubscriptionPackage() != null && institute.getSubscriptionPackage().getId() != null) {
            BillingPackage pkg = billingPackageRepository.findById(institute.getSubscriptionPackage().getId()).orElse(null);
            if (pkg != null) {
                institute.setSubscriptionPackage(pkg);
                // Copy package limits
                institute.setMaxTeachers(pkg.getMaxTeachers() != null ? pkg.getMaxTeachers() : 5);
                institute.setMaxStudents(pkg.getMaxStudents() != null ? pkg.getMaxStudents() : 50);
                institute.setAiLimitPerMonth(pkg.getAiLimitPerMonth() != null ? pkg.getAiLimitPerMonth() : 1000);
                institute.setMaxQuestions(pkg.getMaxQuestions() != null ? pkg.getMaxQuestions() : 500);
                institute.setStorageLimitMb(pkg.getStorageLimitMb() != null ? pkg.getStorageLimitMb() : 500);
            }
        }

        return instituteRepository.save(institute);
    }

    @Override
    @Transactional
    public Institute requestWorkspace(String userEmail, com.testshaper.dto.WorkspaceRequestDTO request) {
        com.testshaper.entity.User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Institute institute = user.getInstitute();
        if (institute == null) {
            institute = new Institute();
            institute.setCode("REQ-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase());
            institute.setType(Institute.InstituteType.PERSONAL);
            institute.setContactEmail(user.getEmail());
        }

        if (user.getUserInstituteNameEn() != null && !user.getUserInstituteNameEn().isEmpty()) {
            institute.setName(user.getUserInstituteNameEn());
            institute.setNameEn(user.getUserInstituteNameEn());
        } else if (institute.getName() == null) {
            institute.setName(user.getName() + "'s Workspace (" + UUID.randomUUID().toString().substring(0, 4).toUpperCase() + ")");
        }

        if (user.getUserInstituteNameBn() != null && !user.getUserInstituteNameBn().isEmpty()) {
            institute.setNameBn(user.getUserInstituteNameBn());
        }

        if (request.getMedium() != null && !request.getMedium().isEmpty()) {
            institute.setMedium(request.getMedium());
        } else if (institute.getMedium() == null) {
            institute.setMedium("Bangla"); // default
        }
        
        institute.setStatus(Institute.InstituteStatus.ACTIVE);
        institute.setPlanStartDate(LocalDate.now());

        if (request.getPackageId() != null) {
            BillingPackage pkg = billingPackageRepository.findById(request.getPackageId()).orElse(null);
            if (pkg != null) {
                institute.setSubscriptionPackage(pkg);
                institute.setMaxTeachers(pkg.getMaxTeachers() != null ? pkg.getMaxTeachers() : 5);
                institute.setMaxStudents(pkg.getMaxStudents() != null ? pkg.getMaxStudents() : 50);
                institute.setAiLimitPerMonth(pkg.getAiLimitPerMonth() != null ? pkg.getAiLimitPerMonth() : 1000);
                institute.setMaxQuestions(pkg.getMaxQuestions() != null ? pkg.getMaxQuestions() : 500);
                institute.setStorageLimitMb(pkg.getStorageLimitMb() != null ? pkg.getStorageLimitMb() : 500);
            }
        }

        institute = instituteRepository.save(institute);

        if (request.getSubjectIds() != null && !request.getSubjectIds().isEmpty()) {
            java.util.List<com.testshaper.entity.ClassSubject> subjects = classSubjectRepository.findAllById(request.getSubjectIds());
            institute.setAssignedSubjects(new java.util.HashSet<>(subjects));
            instituteRepository.save(institute);
        }

        user.setInstitute(institute);
        
        // Add dynamic role from package or default INSTITUTE_ADMIN
        String roleToAssign = "INSTITUTE_ADMIN";
        if (request.getPackageId() != null) {
            com.testshaper.entity.BillingPackage pkg = billingPackageRepository.findById(request.getPackageId()).orElse(null);
            if (pkg != null && pkg.getAssociatedRole() != null && !pkg.getAssociatedRole().isEmpty()) {
                roleToAssign = pkg.getAssociatedRole();
            }
        }
        
        com.testshaper.entity.Role adminRole = roleRepository.findByName(roleToAssign).orElse(null);
        if (adminRole != null) {
            java.util.Set<com.testshaper.entity.Role> currentRoles = user.getRoles();
            if (currentRoles == null) {
                currentRoles = new java.util.HashSet<>();
            }
            currentRoles.add(adminRole);
            user.setRoles(currentRoles);
        }
        
        userRepository.save(user);

        return institute;
    }

    @Override
    @Transactional
    public Institute updateInstitute(UUID id, Institute updatedInfo, MultipartFile logo) {
        Institute institute = getInstitute(id);

        institute.setName(updatedInfo.getName());
        institute.setNameEn(updatedInfo.getNameEn());
        institute.setNameBn(updatedInfo.getNameBn());
        institute.setShortName(updatedInfo.getShortName());
        institute.setAddress(updatedInfo.getAddress());
        institute.setCity(updatedInfo.getCity());
        institute.setDistrict(updatedInfo.getDistrict());
        institute.setDivision(updatedInfo.getDivision());
        institute.setCountry(updatedInfo.getCountry());
        institute.setContactEmail(updatedInfo.getContactEmail());
        institute.setContactPhone(updatedInfo.getContactPhone());
        institute.setWebsite(updatedInfo.getWebsite());
        institute.setEstablishedYear(updatedInfo.getEstablishedYear());
        if(updatedInfo.getMedium() != null) {
            institute.setMedium(updatedInfo.getMedium());
        }

        // Update limits based on updatedInfo or attached package
        if (updatedInfo.getSubscriptionPackage() != null && updatedInfo.getSubscriptionPackage().getId() != null) {
            BillingPackage pkg = billingPackageRepository.findById(updatedInfo.getSubscriptionPackage().getId()).orElse(null);
            if (pkg != null) {
                institute.setSubscriptionPackage(pkg);
                institute.setMaxTeachers(pkg.getMaxTeachers() != null ? pkg.getMaxTeachers() : 5);
                institute.setMaxStudents(pkg.getMaxStudents() != null ? pkg.getMaxStudents() : 50);
                institute.setAiLimitPerMonth(pkg.getAiLimitPerMonth() != null ? pkg.getAiLimitPerMonth() : 1000);
                institute.setMaxQuestions(pkg.getMaxQuestions() != null ? pkg.getMaxQuestions() : 500);
                institute.setStorageLimitMb(pkg.getStorageLimitMb() != null ? pkg.getStorageLimitMb() : 500);
            }
        } else {
            // Manual overrides if package is not set or updated
            if (updatedInfo.getMaxTeachers() != null) institute.setMaxTeachers(updatedInfo.getMaxTeachers());
            if (updatedInfo.getMaxStudents() != null) institute.setMaxStudents(updatedInfo.getMaxStudents());
            if (updatedInfo.getAiLimitPerMonth() != null) institute.setAiLimitPerMonth(updatedInfo.getAiLimitPerMonth());
            if (updatedInfo.getMaxQuestions() != null) institute.setMaxQuestions(updatedInfo.getMaxQuestions());
            if (updatedInfo.getStorageLimitMb() != null) institute.setStorageLimitMb(updatedInfo.getStorageLimitMb());
            if (updatedInfo.getSubscriptionPackage() == null) institute.setSubscriptionPackage(null);
        }

        if (logo != null && !logo.isEmpty()) {
            institute.setLogoPath("uploads/logos/" + institute.getCode() + "_" + System.currentTimeMillis() + ".png");
        }

        return instituteRepository.save(institute);
    }

    @Override
    public Institute getInstitute(UUID id) {
        return instituteRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Institute not found with ID: " + id));
    }

    @Override
    public Institute getInstituteByCode(String code) {
        return instituteRepository.findByCode(code)
                .orElseThrow(() -> new RuntimeException("Institute not found with Code: " + code));
    }

    @Override
    public Page<Institute> getAllInstitutes(String search, Institute.InstituteStatus status, Pageable pageable) {
        // Simple implementation, extend repository for search specification
        if (status != null) {
            // This is a simplification; ideally use Specification for dynamic filtering
            return instituteRepository.findAll(pageable);
        }
        return instituteRepository.findAll(pageable);
    }

    @Override
    @Transactional
    public void deleteInstitute(UUID id) {
        Institute institute = getInstitute(id);
        institute.setDeleted(true);
        institute.setStatus(Institute.InstituteStatus.INACTIVE);
        instituteRepository.save(institute);
    }

    @Override
    @Transactional
    public void activateInstitute(UUID id) {
        Institute institute = getInstitute(id);
        institute.setStatus(Institute.InstituteStatus.ACTIVE);
        instituteRepository.save(institute);
    }

    @Override
    @Transactional
    public void suspendInstitute(UUID id) {
        Institute institute = getInstitute(id);
        institute.setStatus(Institute.InstituteStatus.SUSPENDED);
        instituteRepository.save(institute);
    }

    @Override
    @Transactional
    public void upgradePlan(UUID id, Institute.SubscriptionPlan plan, int durationMonths) {
        Institute institute = getInstitute(id);
        institute.setPlanType(plan);
        institute.setPlanStartDate(LocalDate.now());
        institute.setPlanEndDate(LocalDate.now().plusMonths(durationMonths));

        // Update limits based on plan (Example logic)
        switch (plan) {
            case BASIC:
                institute.setMaxTeachers(10);
                institute.setMaxStudents(100);
                institute.setAiLimitPerMonth(500);
                break;
            case PREMIUM:
                institute.setMaxTeachers(50);
                institute.setMaxStudents(1000);
                institute.setAiLimitPerMonth(5000);
                break;
            case ENTERPRISE:
                institute.setMaxTeachers(500);
                institute.setMaxStudents(10000);
                institute.setAiLimitPerMonth(50000);
                break;
            default: // FREE
                institute.setMaxTeachers(5);
                institute.setMaxStudents(50);
                institute.setAiLimitPerMonth(100);
        }

        institute.setExpiryDate(institute.getPlanEndDate());
        instituteRepository.save(institute);
    }

    @Override
    @Transactional
    public void incrementAiUsage(UUID instituteId, int tokens) {
        Institute institute = getInstitute(instituteId);
        institute.setAiUsedCurrentMonth(institute.getAiUsedCurrentMonth() + tokens);
        instituteRepository.save(institute);
    }

    @Override
    @Transactional
    public void updateStorageUsage(UUID instituteId, double sizeMb) {
        Institute institute = getInstitute(instituteId);
        institute.setStorageUsedMb(institute.getStorageUsedMb() + sizeMb);
        instituteRepository.save(institute);
    }

    private Institute getOrCreateInstituteForTarget(UUID id) {
        java.util.Optional<Institute> instOpt = instituteRepository.findById(id);
        if (instOpt.isPresent()) {
            return instOpt.get();
        }
        java.util.Optional<com.testshaper.entity.User> userOpt = userRepository.findById(id);
        if (userOpt.isPresent()) {
            com.testshaper.entity.User user = userOpt.get();
            if (user.getInstitute() != null) {
                return user.getInstitute();
            }
            String pCode = "PERS-" + user.getId().toString().substring(0, 8).toUpperCase();
            java.util.Optional<Institute> existingPers = instituteRepository.findByCode(pCode);
            if (existingPers.isPresent()) {
                user.setInstitute(existingPers.get());
                userRepository.save(user);
                return existingPers.get();
            }
            Institute personal = new Institute();
            personal.setName((user.getName() != null ? user.getName() : "Personal") + " Workspace");
            personal.setCode(pCode);
            personal.setStatus(Institute.InstituteStatus.ACTIVE);
            personal.setPlanType(Institute.SubscriptionPlan.FREE);
            personal = instituteRepository.save(personal);
            user.setInstitute(personal);
            userRepository.save(user);
            return personal;
        }
        return getInstitute(id);
    }

    @Override
    @Transactional
    public void assignAcademicSubjects(UUID instituteId, java.util.Set<UUID> classSubjectIds) {
        Institute institute = getOrCreateInstituteForTarget(instituteId);
        java.util.List<com.testshaper.entity.ClassSubject> subjects = classSubjectRepository.findAllById(classSubjectIds);
        institute.setAssignedSubjects(new java.util.HashSet<>(subjects));
        instituteRepository.save(institute);
    }

    @Override
    public java.util.Set<UUID> getAssignedAcademicSubjects(UUID instituteId) {
        Institute institute = getOrCreateInstituteForTarget(instituteId);
        return institute.getAssignedSubjects().stream()
                .map(com.testshaper.entity.ClassSubject::getId)
                .collect(java.util.stream.Collectors.toSet());
    }

    @Override
    @Transactional
    public Institute updateSubscriptionPackage(UUID instituteId, UUID packageId) {
        Institute institute = getInstitute(instituteId);
        BillingPackage pkg = billingPackageRepository.findById(packageId)
                .orElseThrow(() -> new RuntimeException("Billing package not found"));
        institute.setSubscriptionPackage(pkg);
        institute.setMaxTeachers(pkg.getMaxTeachers() != null ? pkg.getMaxTeachers() : 5);
        institute.setMaxStudents(pkg.getMaxStudents() != null ? pkg.getMaxStudents() : 50);
        institute.setAiLimitPerMonth(pkg.getAiLimitPerMonth() != null ? pkg.getAiLimitPerMonth() : 100000);
        institute.setMaxQuestions(pkg.getMaxQuestions() != null ? pkg.getMaxQuestions() : 500);
        institute.setStorageLimitMb(pkg.getStorageLimitMb() != null ? pkg.getStorageLimitMb() : 500);
        
        if (pkg.getPackageCode().contains("PREMIUM")) {
            institute.setPlanType(Institute.SubscriptionPlan.PREMIUM);
        } else if (pkg.getPackageCode().contains("BASIC")) {
            institute.setPlanType(Institute.SubscriptionPlan.BASIC);
        } else if (pkg.getPackageCode().contains("ENTERPRISE")) {
            institute.setPlanType(Institute.SubscriptionPlan.ENTERPRISE);
        } else {
            institute.setPlanType(Institute.SubscriptionPlan.FREE);
        }
        return instituteRepository.save(institute);
    }
}
