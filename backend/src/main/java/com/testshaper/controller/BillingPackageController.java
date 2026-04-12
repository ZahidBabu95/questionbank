package com.testshaper.controller;

import com.testshaper.dto.billing.BillingPackageDTO;
import com.testshaper.dto.billing.BillingPackageRequest;
import com.testshaper.service.BillingPackageService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/billing/packages")
@RequiredArgsConstructor
public class BillingPackageController {

    private final BillingPackageService packageService;

    @GetMapping
    public ResponseEntity<List<BillingPackageDTO>> getAllPackages() {
        return ResponseEntity.ok(packageService.getAllPackages());
    }

    @GetMapping("/{id}")
    public ResponseEntity<BillingPackageDTO> getPackage(@PathVariable UUID id) {
        return ResponseEntity.ok(packageService.getPackageById(id));
    }

    @PostMapping
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<BillingPackageDTO> createPackage(@Valid @RequestBody BillingPackageRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(packageService.createPackage(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<BillingPackageDTO> updatePackage(@PathVariable UUID id, @Valid @RequestBody BillingPackageRequest request) {
        return ResponseEntity.ok(packageService.updatePackage(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<Void> deletePackage(@PathVariable UUID id) {
        packageService.deletePackage(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<BillingPackageDTO> updateStatus(@PathVariable UUID id, @RequestBody Map<String, String> payload) {
        return ResponseEntity.ok(packageService.updateStatus(id, payload.get("status")));
    }
}
