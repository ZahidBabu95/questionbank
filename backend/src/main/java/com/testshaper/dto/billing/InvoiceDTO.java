package com.testshaper.dto.billing;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Data
public class InvoiceDTO {
    private UUID id;
    private String invoiceNumber;
    private UUID instituteId;
    private String instituteName;
    private UUID packageId;
    private String packageName;
    private LocalDate invoiceDate;
    private LocalDate dueDate;
    private BigDecimal amount;
    private BigDecimal tax;
    private BigDecimal discount;
    private BigDecimal totalAmount;
    private String currency;
    private String paymentStatus;
    private String paymentMethod;
    private String paymentReference;
    private String notes;
    private List<InvoiceItemDTO> items;
}
