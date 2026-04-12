package com.testshaper.service;

import com.testshaper.dto.billing.InvoiceDTO;
import com.testshaper.dto.billing.InvoiceRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.io.ByteArrayInputStream;
import java.util.UUID;

public interface InvoiceService {
    Page<InvoiceDTO> getAllInvoices(Pageable pageable);
    InvoiceDTO getInvoiceById(UUID id);
    InvoiceDTO createInvoice(InvoiceRequest request);
    InvoiceDTO updateStatus(UUID id, String status, String method, String reference);
    void deleteInvoice(UUID id);
    ByteArrayInputStream generateInvoicePdf(UUID id);
}
