package com.testshaper.repository;

import com.testshaper.entity.AcademicClass;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface AcademicClassRepository extends JpaRepository<AcademicClass, UUID> {
    java.util.List<AcademicClass> findByTenantIdOrderByOrderAsc(String tenantId);
    java.util.List<AcademicClass> findByTenantIdAndStreamIdOrderByOrderAsc(String tenantId, UUID streamId);
    Optional<AcademicClass> findByTenantIdAndName(String tenantId, String name);
    Optional<AcademicClass> findByTenantIdAndNameIgnoreCase(String tenantId, String name);
}
