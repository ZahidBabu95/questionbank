package com.testshaper.repository;

import com.testshaper.entity.Institute;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface InstituteRepository extends JpaRepository<Institute, UUID> {
    Optional<Institute> findByCode(String code);

    boolean existsByCode(String code);

    List<Institute> findAllByStatus(Institute.InstituteStatus status);

    @Query("SELECT i FROM Institute i WHERE i.expiryDate < :date AND i.status = 'ACTIVE'")
    List<Institute> findExpiredInstitutes(java.time.LocalDate date);
}
