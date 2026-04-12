package com.testshaper.service.impl;

import com.lowagie.text.*;
import com.lowagie.text.Font;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import com.testshaper.dto.billing.InvoiceDTO;
import com.testshaper.dto.billing.InvoiceItemDTO;
import com.testshaper.dto.billing.InvoiceRequest;
import com.testshaper.entity.BillingPackage;
import com.testshaper.entity.Institute;
import com.testshaper.entity.Invoice;
import com.testshaper.entity.InvoiceItem;
import com.testshaper.repository.BillingPackageRepository;
import com.testshaper.repository.InstituteRepository;
import com.testshaper.repository.InvoiceRepository;
import com.testshaper.security.TenantContext;
import com.testshaper.service.InvoiceService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.awt.Color;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class InvoiceServiceImpl implements InvoiceService {

    private final InvoiceRepository invoiceRepository;
    private final InstituteRepository instituteRepository;
    private final BillingPackageRepository packageRepository;

    @Override
    @Transactional(readOnly = true)
    public Page<InvoiceDTO> getAllInvoices(Pageable pageable) {
        String tenantId = TenantContext.getTenantId();
        // If Super Admin, show all. If regular tenant, show only theirs.
        // For simplicity, let's assume we filter by tenant unless user is super admin.
        // Assuming Super Admin role is handled at controller level.
        return invoiceRepository.findAllByTenantIdAndDeletedFalse(tenantId, pageable)
                .map(this::mapToDTO);
    }

    @Override
    @Transactional(readOnly = true)
    public InvoiceDTO getInvoiceById(UUID id) {
        Invoice invoice = invoiceRepository.findById(id)
                .filter(i -> !i.isDeleted())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Invoice not found"));
        return mapToDTO(invoice);
    }

    @Override
    @Transactional
    public InvoiceDTO createInvoice(InvoiceRequest request) {
        Institute institute = instituteRepository.findById(request.getInstituteId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Institute not found"));

        BillingPackage pkg = null;
        if (request.getPackageId() != null) {
            pkg = packageRepository.findById(request.getPackageId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Package not found"));
        }

        Invoice invoice = new Invoice();
        invoice.setInvoiceNumber("INV-" + System.currentTimeMillis());
        invoice.setInstitute(institute);
        invoice.setSubscriptionPackage(pkg);
        invoice.setTenantId(institute.getCode()); // Or however tenant is linked
        invoice.setInvoiceDate(request.getInvoiceDate());
        invoice.setDueDate(request.getDueDate() != null ? request.getDueDate() : request.getInvoiceDate().plusDays(7));
        invoice.setNotes(request.getNotes());
        invoice.setDiscount(request.getDiscount());
        invoice.setTax(request.getTax());
        invoice.setCurrency("USD");

        BigDecimal subtotal = BigDecimal.ZERO;
        for (InvoiceRequest.ItemRequest itemReq : request.getItems()) {
            InvoiceItem item = new InvoiceItem();
            item.setItemName(itemReq.getItemName());
            item.setDescription(itemReq.getDescription());
            item.setQuantity(itemReq.getQuantity());
            item.setUnitPrice(itemReq.getUnitPrice());
            item.setTotalPrice(itemReq.getUnitPrice().multiply(new BigDecimal(itemReq.getQuantity())));

            invoice.addItem(item);
            subtotal = subtotal.add(item.getTotalPrice());
        }

        invoice.setAmount(subtotal);
        BigDecimal total = subtotal.subtract(request.getDiscount()).add(request.getTax());
        invoice.setTotalAmount(total);

        return mapToDTO(invoiceRepository.save(invoice));
    }

    @Override
    @Transactional
    public InvoiceDTO updateStatus(UUID id, String status, String method, String reference) {
        Invoice invoice = invoiceRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Invoice not found"));

        invoice.setPaymentStatus(Invoice.PaymentStatus.valueOf(status.toUpperCase()));
        if (method != null)
            invoice.setPaymentMethod(method);
        if (reference != null)
            invoice.setPaymentReference(reference);

        return mapToDTO(invoiceRepository.save(invoice));
    }

    @Override
    @Transactional
    public void deleteInvoice(UUID id) {
        Invoice invoice = invoiceRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Invoice not found"));
        invoice.setDeleted(true);
        invoiceRepository.save(invoice);
    }

    @Override
    public ByteArrayInputStream generateInvoicePdf(UUID id) {
        Invoice invoice = invoiceRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Invoice not found"));

        Document document = new Document(PageSize.A4);
        ByteArrayOutputStream out = new ByteArrayOutputStream();

        try {
            PdfWriter.getInstance(document, out);
            document.open();

            // Font styles
            Font headerFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 22, Color.DARK_GRAY);
            Font subHeaderFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 14, Color.GRAY);
            Font normalFont = FontFactory.getFont(FontFactory.HELVETICA, 10, Color.BLACK);
            Font boldFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, Color.BLACK);

            // Header
            Paragraph title = new Paragraph("QuestionShaper Invoice", headerFont);
            title.setAlignment(Element.ALIGN_RIGHT);
            document.add(title);

            document.add(new Paragraph(" ")); // Spacer

            // Info Table
            PdfPTable infoTable = new PdfPTable(2);
            infoTable.setWidthPercentage(100);

            // From
            PdfPCell fromCell = new PdfPCell(new Phrase(
                    "From:\nQuestionShaper Platform\nDhaka, Bangladesh\ncontact@questionshaper.com", normalFont));
            fromCell.setBorder(Rectangle.NO_BORDER);
            infoTable.addCell(fromCell);

            // Bill To
            PdfPCell toCell = new PdfPCell(new Phrase(
                    "Bill To:\n" + invoice.getInstitute().getName() + "\n" + invoice.getInstitute().getAddress(),
                    normalFont));
            toCell.setBorder(Rectangle.NO_BORDER);
            toCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
            infoTable.addCell(toCell);

            document.add(infoTable);
            document.add(new Paragraph(" "));

            // Invoice Summary
            document.add(new Paragraph("Invoice Number: " + invoice.getInvoiceNumber(), boldFont));
            document.add(
                    new Paragraph("Date: " + invoice.getInvoiceDate().format(DateTimeFormatter.ISO_DATE), normalFont));
            document.add(
                    new Paragraph("Due Date: " + invoice.getDueDate().format(DateTimeFormatter.ISO_DATE), normalFont));
            document.add(new Paragraph("Status: " + invoice.getPaymentStatus().name(), boldFont));
            document.add(new Paragraph(" "));

            // Items Table
            PdfPTable table = new PdfPTable(4);
            table.setWidthPercentage(100);
            table.setWidths(new float[] { 4, 1, 2, 2 });

            // Headers
            String[] headers = { "Item", "Qty", "Unit Price", "Total" };
            for (String header : headers) {
                PdfPCell cell = new PdfPCell(new Phrase(header, boldFont));
                cell.setBackgroundColor(Color.LIGHT_GRAY);
                cell.setPadding(5);
                table.addCell(cell);
            }

            // Rows
            for (InvoiceItem item : invoice.getItems()) {
                table.addCell(new Phrase(item.getItemName(), normalFont));
                table.addCell(new Phrase(item.getQuantity().toString(), normalFont));
                table.addCell(new Phrase(invoice.getCurrency() + " " + item.getUnitPrice(), normalFont));
                table.addCell(new Phrase(invoice.getCurrency() + " " + item.getTotalPrice(), normalFont));
            }

            document.add(table);

            // Totals
            PdfPTable totalTable = new PdfPTable(2);
            totalTable.setWidthPercentage(40);
            totalTable.setHorizontalAlignment(Element.ALIGN_RIGHT);

            totalTable.addCell(new Phrase("Subtotal:", normalFont));
            totalTable.addCell(new Phrase(invoice.getCurrency() + " " + invoice.getAmount(), normalFont));

            totalTable.addCell(new Phrase("Tax:", normalFont));
            totalTable.addCell(new Phrase(invoice.getCurrency() + " " + invoice.getTax(), normalFont));

            totalTable.addCell(new Phrase("Discount:", normalFont));
            totalTable.addCell(new Phrase("-" + invoice.getCurrency() + " " + invoice.getDiscount(), normalFont));

            PdfPCell totalLabel = new PdfPCell(new Phrase("Total:", boldFont));
            totalLabel.setBackgroundColor(Color.YELLOW);
            totalTable.addCell(totalLabel);

            PdfPCell totalVal = new PdfPCell(
                    new Phrase(invoice.getCurrency() + " " + invoice.getTotalAmount(), boldFont));
            totalVal.setBackgroundColor(Color.YELLOW);
            totalTable.addCell(totalVal);

            document.add(new Paragraph(" "));
            document.add(totalTable);

            document.close();
        } catch (DocumentException e) {
            e.printStackTrace();
        }

        return new ByteArrayInputStream(out.toByteArray());
    }

    private InvoiceDTO mapToDTO(Invoice entity) {
        InvoiceDTO dto = new InvoiceDTO();
        dto.setId(entity.getId());
        dto.setInvoiceNumber(entity.getInvoiceNumber());
        dto.setInstituteId(entity.getInstitute().getId());
        dto.setInstituteName(entity.getInstitute().getName());
        if (entity.getSubscriptionPackage() != null) {
            dto.setPackageId(entity.getSubscriptionPackage().getId());
            dto.setPackageName(entity.getSubscriptionPackage().getName());
        }
        dto.setInvoiceDate(entity.getInvoiceDate());
        dto.setDueDate(entity.getDueDate());
        dto.setAmount(entity.getAmount());
        dto.setTax(entity.getTax());
        dto.setDiscount(entity.getDiscount());
        dto.setTotalAmount(entity.getTotalAmount());
        dto.setCurrency(entity.getCurrency());
        dto.setPaymentStatus(entity.getPaymentStatus().name());
        dto.setPaymentMethod(entity.getPaymentMethod());
        dto.setPaymentReference(entity.getPaymentReference());
        dto.setNotes(entity.getNotes());

        dto.setItems(entity.getItems().stream().map(item -> {
            InvoiceItemDTO itemDto = new InvoiceItemDTO();
            itemDto.setId(item.getId());
            itemDto.setItemName(item.getItemName());
            itemDto.setDescription(item.getDescription());
            itemDto.setQuantity(item.getQuantity());
            itemDto.setUnitPrice(item.getUnitPrice());
            itemDto.setTotalPrice(item.getTotalPrice());
            return itemDto;
        }).collect(Collectors.toList()));

        return dto;
    }
}
