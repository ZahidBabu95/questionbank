package com.testshaper.repository;

import com.testshaper.entity.BillingPackage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface BillingPackageRepository extends JpaRepository<BillingPackage, UUID> {
    Optional<BillingPackage> findByPackageCodeAndDeletedFalse(String packageCode);
    List<BillingPackage> findAllByDeletedFalseOrderBySortOrderAsc();
}
