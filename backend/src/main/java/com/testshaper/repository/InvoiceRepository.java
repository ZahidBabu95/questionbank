package com.testshaper.repository;

import com.testshaper.entity.Invoice;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface InvoiceRepository extends JpaRepository<Invoice, UUID> {
    Optional<Invoice> findByInvoiceNumberAndDeletedFalse(String invoiceNumber);
    Page<Invoice> findAllByTenantIdAndDeletedFalse(String tenantId, Pageable pageable);
    Page<Invoice> findAllByDeletedFalse(Pageable pageable);
}
