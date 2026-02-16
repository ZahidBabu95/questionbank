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

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {

        Optional<User> findByEmail(String email);

        boolean existsByEmail(String email);

        // Fetch users by institute
        Page<User> findByInstituteId(UUID instituteId, Pageable pageable);

        // Search users with filters (Role, Active status, Account Locked)
        @Query("SELECT DISTINCT u FROM User u LEFT JOIN u.roles r WHERE " +
                        "(LOWER(u.name) LIKE LOWER(CONCAT('%', :query, '%')) OR LOWER(u.email) LIKE LOWER(CONCAT('%', :query, '%'))) "
                        +
                        "AND (:role IS NULL OR r.name = :role) " +
                        "AND (:active IS NULL OR u.isActive = :active) " +
                        "AND (:accountLocked IS NULL OR u.accountLocked = :accountLocked) " +
                        "AND u.deleted = false")
        Page<User> searchUsers(@Param("query") String query,
                        @Param("role") String role,
                        @Param("active") Boolean active,
                        @Param("accountLocked") Boolean accountLocked,
                        Pageable pageable);

        // Search users within an institute with filters
        @Query("SELECT DISTINCT u FROM User u LEFT JOIN u.roles r WHERE u.institute.id = :instituteId " +
                        "AND (LOWER(u.name) LIKE LOWER(CONCAT('%', :query, '%')) OR LOWER(u.email) LIKE LOWER(CONCAT('%', :query, '%'))) "
                        +
                        "AND (:role IS NULL OR r.name = :role) " +
                        "AND (:active IS NULL OR u.isActive = :active) " +
                        "AND (:accountLocked IS NULL OR u.accountLocked = :accountLocked) " +
                        "AND u.deleted = false")
        Page<User> searchUsersInInstitute(@Param("instituteId") UUID instituteId,
                        @Param("query") String query,
                        @Param("role") String role,
                        @Param("active") Boolean active,
                        @Param("accountLocked") Boolean accountLocked,
                        Pageable pageable);
}
