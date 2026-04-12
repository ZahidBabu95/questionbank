package com.testshaper.dto.billing;

import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Data
public class InvoiceRequest {
    @NotNull(message = "Institute ID is required")
    private UUID instituteId;

    private UUID packageId;

    @NotNull(message = "Invoice date is required")
    private LocalDate invoiceDate;

    private LocalDate dueDate;

    private BigDecimal discount = BigDecimal.ZERO;
    private BigDecimal tax = BigDecimal.ZERO;

    private String notes;

    private List<ItemRequest> items;

    @Data
    public static class ItemRequest {
        private String itemName;
        private String description;
        private Integer quantity;
        private BigDecimal unitPrice;
    }
}
