package com.testshaper.repository;

import com.testshaper.entity.Subject;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SubjectRepository extends JpaRepository<Subject, UUID> {

    java.util.List<Subject> findByTenantId(String tenantId);
    Optional<Subject> findByCode(String code);

    Optional<Subject> findByTenantIdAndName(String tenantId, String name);

    Optional<Subject> findByTenantIdAndNameIgnoreCase(String tenantId, String name);

}
