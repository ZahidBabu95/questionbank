package com.testshaper.service.impl;

import com.testshaper.dto.CreateUserDTO;
import com.testshaper.dto.UpdateUserDTO;
import com.testshaper.dto.UserDTO;
import com.testshaper.entity.Institute;
import com.testshaper.entity.Role;
import com.testshaper.entity.User;
import com.testshaper.mapper.UserMapper;
import com.testshaper.repository.InstituteRepository;
import com.testshaper.repository.RoleRepository;
import com.testshaper.repository.UserRepository;
import com.testshaper.service.SecuritySettingService;
import com.testshaper.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.lang.NonNull;
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

    @Override
    @Transactional
    public UserDTO createUser(@NonNull CreateUserDTO dto) {
        if (userRepository.existsByEmail(dto.getEmail())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email already exists");
        }

        // Validate Password
        String tenantId = dto.getInstituteId() != null ? dto.getInstituteId().toString() : null;
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
            for (String roleName : dto.getRoles()) {
                Role role = roleRepository.findByName(roleName)
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST,
                                "Role not found: " + roleName));
                roles.add(role);
            }
            user.setRoles(roles);
        }

        // Handle Institute
        UUID instituteId = dto.getInstituteId();
        if (instituteId != null) {
            Institute institute = instituteRepository.findById(instituteId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Institute not found"));
            user.setInstitute(institute);
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

        return userMapper.toDTO(userRepository.save(user));
    }

    @Override
    @Transactional
    public void deleteUser(@NonNull UUID id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        user.setDeleted(true);
        user.setActive(false);
        userRepository.save(user);
    }

    @Override
    @Transactional
    public void activateUser(@NonNull UUID id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        user.setActive(true);
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
    public void resetPassword(@NonNull UUID id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        // TODO: Generate random password and send via email. For now, setting to
        // default.
        user.setPassword(passwordEncoder.encode("Default@123"));
        userRepository.save(user);
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
    public Page<UserDTO> getAllUsers(String query, UUID instituteId, String role, Boolean active, Boolean accountLocked,
            boolean includeDeleted, Pageable pageable) {
        if (instituteId != null) {
            return userRepository
                    .searchUsersInInstitute(instituteId, query != null ? query : "", role, active, accountLocked,
                            pageable)
                    .map(userMapper::toDTO);
        }
        return userRepository.searchUsers(query != null ? query : "", role, active, accountLocked, pageable)
                .map(userMapper::toDTO);
    }

    @Override
    @Transactional
    public void uploadProfileImage(@NonNull UUID id, @NonNull MultipartFile file) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        // Logic to save file to disk/cloud and update URL
        String imageUrl = "/uploads/" + id + "_" + file.getOriginalFilename();
        user.setProfileImageUrl(imageUrl);
        userRepository.save(user);
    }
}
