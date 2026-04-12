package com.testshaper.repository;
import com.testshaper.entity.AcademicGroup;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;
@Repository
public interface AcademicGroupRepository extends JpaRepository<AcademicGroup, UUID> {
    List<AcademicGroup> findByTenantIdOrderByOrderAsc(String tenantId);
}
