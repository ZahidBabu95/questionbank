package com.testshaper.service;

import com.testshaper.dto.CreateUserDTO;
import com.testshaper.dto.UpdateUserDTO;
import com.testshaper.dto.UserDTO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.lang.NonNull;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;
import java.util.UUID;

public interface UserService {

    UserDTO createUser(CreateUserDTO createUserDTO);

    UserDTO getUserById(UUID id);

    UserDTO getUserByEmail(String email);

    UserDTO updateUser(UUID id, UpdateUserDTO updateUserDTO);

    UserDTO updateProfile(UUID id, com.testshaper.dto.UpdateProfileDTO dto);

    void deleteUser(UUID id);

    void activateUser(UUID id);

    void deactivateUser(UUID id);

    void unlockUser(UUID id);

    String resetPassword(UUID id);

    void changePassword(UUID id, String oldPassword, String newPassword);

    Page<com.testshaper.dto.UserSummaryDTO> getAllUsers(String query, UUID instituteId, String role, Boolean active, Boolean accountLocked,
            boolean includeDeleted, Pageable pageable);

    void uploadProfileImage(@NonNull UUID id, @NonNull MultipartFile file);

    Map<String, Object> getUserStats();

    void bulkActivate(List<UUID> ids);
    void bulkDeactivate(List<UUID> ids);
    void bulkDelete(List<UUID> ids);

    byte[] exportUsersCsv(String role, Boolean active);

    java.util.Set<UUID> getAssignedSubjects(UUID userId);
    void assignSubjects(UUID userId, java.util.Set<UUID> classSubjectIds);
}
