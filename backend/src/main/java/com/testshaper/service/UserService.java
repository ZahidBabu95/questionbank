package com.testshaper.service;

import com.testshaper.dto.CreateUserDTO;
import com.testshaper.dto.UpdateUserDTO;
import com.testshaper.dto.UserDTO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.lang.NonNull;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

public interface UserService {

    UserDTO createUser(CreateUserDTO createUserDTO);

    UserDTO getUserById(UUID id);

    UserDTO updateUser(UUID id, UpdateUserDTO updateUserDTO);

    void deleteUser(UUID id);

    void activateUser(UUID id);

    void deactivateUser(UUID id);

    void resetPassword(UUID id); // Resets to default or sends email

    void changePassword(UUID id, String oldPassword, String newPassword);

    Page<UserDTO> getAllUsers(String query, UUID instituteId, String role, Boolean active, Boolean accountLocked,
            boolean includeDeleted,
            Pageable pageable);

    void uploadProfileImage(@NonNull UUID id, @NonNull MultipartFile file);
}
