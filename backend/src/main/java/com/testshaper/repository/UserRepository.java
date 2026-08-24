package com.testshaper.repository;

import com.testshaper.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

@Repository
public interface UserRepository extends JpaRepository<User, UUID>, JpaSpecificationExecutor<User> {

        Optional<User> findByEmail(String email);

        @Query("SELECT u FROM User u LEFT JOIN FETCH u.assignedSubjects LEFT JOIN FETCH u.roles WHERE u.email = :email")
        Optional<User> findByEmailWithSubjects(@Param("email") String email);

        boolean existsByEmail(String email);

        // Fetch users by institute
        Page<User> findByInstituteId(UUID instituteId, Pageable pageable);

        java.util.List<User> findByInstituteId(UUID instituteId);

        long countByInstituteId(UUID instituteId);

        // Search users with filters (Role, Active status, Account Locked) and Super
        // Admin masking
        @Query("SELECT DISTINCT u FROM User u LEFT JOIN u.roles r WHERE " +
                        "(LOWER(u.name) LIKE LOWER(CONCAT('%', :query, '%')) OR LOWER(u.email) LIKE LOWER(CONCAT('%', :query, '%'))) "
                        +
                        "AND (:role IS NULL OR r.name = :role) " +
                        "AND (:active IS NULL OR u.active = :active) " +
                        "AND (:accountLocked IS NULL OR u.accountLocked = :accountLocked) " +
                        "AND u.deleted = false " +
                        "AND (u.email = :currentEmail OR NOT EXISTS (SELECT rs FROM u.roles rs WHERE rs.name = 'SUPER_ADMIN'))")
        Page<User> searchUsers(@Param("query") String query,
                        @Param("role") String role,
                        @Param("active") Boolean active,
                        @Param("accountLocked") Boolean accountLocked,
                        @Param("currentEmail") String currentEmail,
                        Pageable pageable);

        // Search users within an institute with filters and Super Admin masking
        @Query("SELECT DISTINCT u FROM User u LEFT JOIN u.roles r WHERE u.institute.id = :instituteId " +
                        "AND (LOWER(u.name) LIKE LOWER(CONCAT('%', :query, '%')) OR LOWER(u.email) LIKE LOWER(CONCAT('%', :query, '%'))) "
                        +
                        "AND (:role IS NULL OR r.name = :role) " +
                        "AND (:active IS NULL OR u.active = :active) " +
                        "AND (:accountLocked IS NULL OR u.accountLocked = :accountLocked) " +
                        "AND u.deleted = false " +
                        "AND (u.email = :currentEmail OR NOT EXISTS (SELECT rs FROM u.roles rs WHERE rs.name = 'SUPER_ADMIN'))")
        Page<User> searchUsersInInstitute(@Param("instituteId") UUID instituteId,
                        @Param("query") String query,
                        @Param("role") String role,
                        @Param("active") Boolean active,
                        @Param("accountLocked") Boolean accountLocked,
                        @Param("currentEmail") String currentEmail,
                        Pageable pageable);

        // Stats queries
        long countByDeletedFalse();
        long countByActiveTrueAndDeletedFalse();
        long countByActiveFalseAndDeletedFalse();
        long countByAccountLockedTrueAndDeletedFalse();

        @Query("SELECT COUNT(DISTINCT u) FROM User u JOIN u.roles r WHERE r.name = :roleName AND u.deleted = false")
        long countByRoleName(@Param("roleName") String roleName);

        // New users in last 30 days
        @Query("SELECT COUNT(u) FROM User u WHERE u.createdAt >= :since AND u.deleted = false")
        long countNewUsersSince(@Param("since") java.time.LocalDateTime since);

        @Query("SELECT COUNT(u) FROM User u WHERE u.createdAt >= :start AND u.createdAt < :end AND u.deleted = false")
        long countNewUsersBetween(@Param("start") java.time.LocalDateTime start,
                                  @Param("end") java.time.LocalDateTime end);

        // Tenant-specific count queries
        long countByInstituteIdAndDeletedFalse(UUID instituteId);
        long countByInstituteIdAndActiveTrueAndDeletedFalse(UUID instituteId);
        long countByInstituteIdAndActiveFalseAndDeletedFalse(UUID instituteId);
        long countByInstituteIdAndAccountLockedTrueAndDeletedFalse(UUID instituteId);

        @Query("SELECT COUNT(DISTINCT u) FROM User u JOIN u.roles r WHERE u.institute.id = :instituteId AND r.name = :roleName AND u.deleted = false")
        long countByInstituteIdAndRoleName(@Param("instituteId") UUID instituteId, @Param("roleName") String roleName);

        @Query("SELECT COUNT(u) FROM User u WHERE u.institute.id = :instituteId AND u.createdAt >= :since AND u.deleted = false")
        long countNewUsersByInstituteSince(@Param("instituteId") UUID instituteId, @Param("since") java.time.LocalDateTime since);

        @Query("SELECT COUNT(u) FROM User u WHERE u.institute.id = :instituteId AND u.createdAt >= :start AND u.createdAt < :end AND u.deleted = false")
        long countNewUsersByInstituteBetween(@Param("instituteId") UUID instituteId,
                                             @Param("start") java.time.LocalDateTime start,
                                             @Param("end") java.time.LocalDateTime end);

        @Query("SELECT DISTINCT u FROM User u JOIN u.roles r WHERE r.name = 'SUPER_ADMIN' AND u.deleted = false AND u.active = true")
        java.util.List<User> findAllSuperAdmins();
}
