package com.testshaper.mapper;

import com.testshaper.dto.CreateUserDTO;
import com.testshaper.dto.UpdateUserDTO;
import com.testshaper.dto.UserDTO;
import com.testshaper.entity.Role;
import com.testshaper.entity.User;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Mappings;
import org.mapstruct.Named;

import java.util.Set;
import java.util.stream.Collectors;

@Mapper(componentModel = "spring")
public interface UserMapper {

    @Mappings({
            @Mapping(target = "instituteId", expression = "java(user.getInstitute() != null ? user.getInstitute().getId() : null)"),
            @Mapping(target = "instituteName", expression = "java(user.getInstitute() != null ? user.getInstitute().getName() : null)"),
            @Mapping(source = "roles", target = "roles", qualifiedByName = "mapRolesToStrings")
    })
    UserDTO toDTO(User user);

    @Mappings({
            @Mapping(target = "id", ignore = true),
            @Mapping(target = "createdAt", ignore = true),
            @Mapping(target = "updatedAt", ignore = true),
            @Mapping(target = "deleted", ignore = true),
            @Mapping(target = "roles", ignore = true), // Handled in service
            @Mapping(target = "institute", ignore = true), // Handled in service
            @Mapping(target = "version", ignore = true),
            @Mapping(target = "profileImageUrl", ignore = true),
            @Mapping(target = "active", constant = "true"), // Default to active
            @Mapping(target = "failedLoginAttempts", ignore = true),
            @Mapping(target = "accountLocked", ignore = true),
            @Mapping(target = "lockTime", ignore = true)
    })
    User toEntity(CreateUserDTO dto);

    @Mappings({
            @Mapping(target = "id", ignore = true),
            @Mapping(target = "password", ignore = true), // Handles separately
            @Mapping(target = "createdAt", ignore = true),
            @Mapping(target = "updatedAt", ignore = true),
            @Mapping(target = "deleted", ignore = true),
            @Mapping(target = "roles", ignore = true), // Handled in service
            @Mapping(target = "institute", ignore = true), // Handled in service
            @Mapping(target = "version", ignore = true),
            @Mapping(target = "profileImageUrl", ignore = true),
            @Mapping(target = "failedLoginAttempts", ignore = true),
            @Mapping(target = "accountLocked", ignore = true),
            @Mapping(target = "lockTime", ignore = true),
            @Mapping(target = "active", source = "active")
    })
    void updateEntityFromDTO(UpdateUserDTO dto, @org.mapstruct.MappingTarget User user);

    @Named("mapRolesToStrings")
    default Set<String> mapRolesToStrings(Set<Role> roles) {
        if (roles == null) {
            return null;
        }
        return roles.stream().map(Role::getName).collect(Collectors.toSet());
    }
}
