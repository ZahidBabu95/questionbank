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
            @Mapping(target = "instituteNameEn", expression = "java(user.getUserInstituteNameEn() != null && !user.getUserInstituteNameEn().isEmpty() ? user.getUserInstituteNameEn() : (user.getInstitute() != null ? user.getInstitute().getNameEn() : null))"),
            @Mapping(target = "instituteNameBn", expression = "java(user.getUserInstituteNameBn() != null && !user.getUserInstituteNameBn().isEmpty() ? user.getUserInstituteNameBn() : (user.getInstitute() != null ? user.getInstitute().getNameBn() : null))"),
            @Mapping(target = "instituteMedium", expression = "java(user.getInstitute() != null ? user.getInstitute().getMedium() : null)"),
            @Mapping(target = "instituteStatus", expression = "java(user.getInstitute() != null && user.getInstitute().getStatus() != null ? user.getInstitute().getStatus().name() : null)"),
            @Mapping(target = "subscriptionPackage", expression = "java(user.getInstitute() != null && user.getInstitute().getSubscriptionPackage() != null ? user.getInstitute().getSubscriptionPackage().getName() : (user.getInstitute() != null && user.getInstitute().getPlanType() != null ? user.getInstitute().getPlanType().name() : null))"),
            @Mapping(target = "maxTeachers", expression = "java(user.getInstitute() != null ? user.getInstitute().getMaxTeachers() : null)"),
            @Mapping(target = "maxStudents", expression = "java(user.getInstitute() != null ? user.getInstitute().getMaxStudents() : null)"),
            @Mapping(target = "maxQuestions", expression = "java(user.getInstitute() != null ? user.getInstitute().getMaxQuestions() : null)"),
            @Mapping(target = "questionsUsedCurrentMonth", expression = "java(user.getInstitute() != null ? user.getInstitute().getQuestionsUsedCurrentMonth() : null)"),
            @Mapping(target = "aiLimitPerMonth", expression = "java(user.getInstitute() != null ? user.getInstitute().getAiLimitPerMonth() : null)"),
            @Mapping(target = "aiUsedCurrentMonth", expression = "java(user.getInstitute() != null ? user.getInstitute().getAiUsedCurrentMonth() : null)"),
            @Mapping(target = "storageLimitMb", expression = "java(user.getInstitute() != null ? user.getInstitute().getStorageLimitMb() : null)"),
            @Mapping(target = "storageUsedMb", expression = "java(user.getInstitute() != null ? user.getInstitute().getStorageUsedMb() : null)"),
            @Mapping(target = "planType", expression = "java(user.getInstitute() != null && user.getInstitute().getPlanType() != null ? user.getInstitute().getPlanType().name() : null)"),
            @Mapping(target = "billingCycle", expression = "java(user.getInstitute() != null && user.getInstitute().getBillingCycle() != null ? user.getInstitute().getBillingCycle().name() : null)"),
            @Mapping(target = "planStartDate", expression = "java(user.getInstitute() != null ? user.getInstitute().getPlanStartDate() : null)"),
            @Mapping(target = "planEndDate", expression = "java(user.getInstitute() != null ? user.getInstitute().getPlanEndDate() : null)"),
            @Mapping(target = "expiryDate", expression = "java(user.getInstitute() != null ? user.getInstitute().getExpiryDate() : null)"),
            @Mapping(source = "active", target = "active"),
            @Mapping(source = "roles", target = "roles", qualifiedByName = "mapRolesToStrings"),
            @Mapping(source = "roles", target = "permissions", qualifiedByName = "mapPermissionsToStrings"),
            @Mapping(target = "classId", expression = "java(user.getAcademicClass() != null ? user.getAcademicClass().getId() : null)"),
            @Mapping(target = "className", expression = "java(user.getAcademicClass() != null ? user.getAcademicClass().getName() : null)")
    })
    UserDTO toDTO(User user);

    @Mappings({
            @Mapping(target = "instituteId", expression = "java(user.getInstitute() != null ? user.getInstitute().getId() : null)"),
            @Mapping(target = "instituteName", expression = "java(user.getInstitute() != null ? user.getInstitute().getName() : null)"),
            @Mapping(target = "instituteNameEn", expression = "java(user.getUserInstituteNameEn() != null && !user.getUserInstituteNameEn().isEmpty() ? user.getUserInstituteNameEn() : (user.getInstitute() != null ? user.getInstitute().getNameEn() : null))"),
            @Mapping(target = "instituteNameBn", expression = "java(user.getUserInstituteNameBn() != null && !user.getUserInstituteNameBn().isEmpty() ? user.getUserInstituteNameBn() : (user.getInstitute() != null ? user.getInstitute().getNameBn() : null))"),
            @Mapping(source = "active", target = "active"),
            @Mapping(source = "roles", target = "roles", qualifiedByName = "mapRolesToStrings"),
            @Mapping(target = "classId", expression = "java(user.getAcademicClass() != null ? user.getAcademicClass().getId() : null)"),
            @Mapping(target = "className", expression = "java(user.getAcademicClass() != null ? user.getAcademicClass().getName() : null)")
            // Intentionally excluding permissions mapping for lightweight listing
    })
    com.testshaper.dto.UserSummaryDTO toSummaryDTO(User user);

    @Mappings({
            @Mapping(target = "id", ignore = true),
            @Mapping(target = "createdAt", ignore = true),
            @Mapping(target = "updatedAt", ignore = true),
            @Mapping(target = "deleted", ignore = true),
            @Mapping(target = "roles", ignore = true), // Handled in service
            @Mapping(target = "institute", ignore = true), // Handled in service
            @Mapping(target = "version", ignore = true),
            @Mapping(target = "profileImageUrl", ignore = true),
            @Mapping(target = "active", constant = "true"), // Active by default, restricted by Institute status
            @Mapping(target = "failedLoginAttempts", ignore = true),
            @Mapping(target = "accountLocked", ignore = true),
            @Mapping(target = "lockTime", ignore = true),
            @Mapping(target = "academicClass", ignore = true)
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
            @Mapping(target = "active", source = "active"),
            @Mapping(target = "academicClass", ignore = true)
    })
    void updateEntityFromDTO(UpdateUserDTO dto, @org.mapstruct.MappingTarget User user);

    @Named("mapRolesToStrings")
    default Set<String> mapRolesToStrings(Set<Role> roles) {
        if (roles == null) {
            return null;
        }
        return roles.stream().map(Role::getName).collect(Collectors.toSet());
    }

    @Named("mapPermissionsToStrings")
    default Set<String> mapPermissionsToStrings(Set<Role> roles) {
        if (roles == null) {
            return null;
        }
        return roles.stream()
                .flatMap(role -> role.getPermissions().stream())
                .map(com.testshaper.entity.Permission::getName)
                .collect(Collectors.toSet());
    }
}
