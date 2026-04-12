package com.testshaper.repository;
import com.testshaper.entity.AcademicLevel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;
@Repository
public interface AcademicLevelRepository extends JpaRepository<AcademicLevel, UUID> {
    List<AcademicLevel> findByTenantIdOrderByOrderAsc(String tenantId);
    long countByTenantId(String tenantId);

}
