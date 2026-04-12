package com.testshaper.controller;

import com.testshaper.dto.CreateTicketRequest;
import com.testshaper.dto.ReplyTicketRequest;
import com.testshaper.dto.SupportTicketDTO;
import com.testshaper.entity.SupportTicket;
import com.testshaper.service.SupportTicketService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/support")
@RequiredArgsConstructor
public class SupportTicketController {

    private final SupportTicketService ticketService;

    private String getCurrentUserEmail() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth.getName();
    }

    private boolean isUserAdmin() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().contains("ADMIN"));
    }

    // Creating a new ticket
    @PostMapping("/tickets")
    public ResponseEntity<SupportTicketDTO> createTicket(@RequestBody CreateTicketRequest request) {
        return ResponseEntity.ok(ticketService.createTicket(getCurrentUserEmail(), request));
    }

    // Replying to a ticket
    @PostMapping("/tickets/{id}/messages")
    public ResponseEntity<SupportTicketDTO> replyToTicket(@PathVariable UUID id, @RequestBody ReplyTicketRequest request) {
        return ResponseEntity.ok(ticketService.replyToTicket(id, getCurrentUserEmail(), request, isUserAdmin()));
    }

    // Getting tickets for the current user
    @GetMapping("/tickets/me")
    public ResponseEntity<Page<SupportTicketDTO>> getMyTickets(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "15") int size) {
        Pageable pageable = PageRequest.of(page, size);
        return ResponseEntity.ok(ticketService.getUserTickets(getCurrentUserEmail(), pageable));
    }

    // Getting ALL tickets (Admin Only)
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'INSTITUTE_ADMIN')")
    @GetMapping("/tickets")
    public ResponseEntity<Page<SupportTicketDTO>> getAllTickets(
            @RequestParam(required = false) SupportTicket.TicketStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "15") int size) {
        Pageable pageable = PageRequest.of(page, size);
        return ResponseEntity.ok(ticketService.getAllTickets(status, pageable));
    }

    // Get specific ticket details (with messages)
    @GetMapping("/tickets/{id}")
    public ResponseEntity<SupportTicketDTO> getTicketDetails(@PathVariable UUID id) {
        return ResponseEntity.ok(ticketService.getTicketDetails(id, getCurrentUserEmail()));
    }

    // Update ticket status (Admin Only)
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'INSTITUTE_ADMIN')")
    @PatchMapping("/tickets/{id}/status")
    public ResponseEntity<SupportTicketDTO> updateTicketStatus(
            @PathVariable UUID id,
            @RequestParam SupportTicket.TicketStatus status) {
        return ResponseEntity.ok(ticketService.updateTicketStatus(id, status, getCurrentUserEmail()));
    }
}
