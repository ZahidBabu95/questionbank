package com.testshaper.controller;

import com.testshaper.entity.Institute;
import com.testshaper.service.InstituteService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/institutes")
@RequiredArgsConstructor
public class InstituteController {

    private final InstituteService instituteService;

    @GetMapping
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<Page<Institute>> getAllInstitutes(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Institute.InstituteStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String direction) {

        Sort sort = direction.equalsIgnoreCase("asc") ? Sort.by(sortBy).ascending() : Sort.by(sortBy).descending();
        Pageable pageable = PageRequest.of(page, size, sort);
        return ResponseEntity.ok(instituteService.getAllInstitutes(search, status, pageable));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN') or @userSecurity.isInstituteAdmin(#id)")
    public ResponseEntity<Institute> getInstitute(@PathVariable UUID id) {
        return ResponseEntity.ok(instituteService.getInstitute(id));
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<Institute> createInstitute(
            @RequestPart("institute") Institute institute,
            @RequestPart(value = "logo", required = false) MultipartFile logo) {
        return ResponseEntity.ok(instituteService.createInstitute(institute, logo));
    }

    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('SUPER_ADMIN') or @userSecurity.isInstituteAdmin(#id)")
    public ResponseEntity<Institute> updateInstitute(
            @PathVariable UUID id,
            @RequestPart("institute") Institute institute,
            @RequestPart(value = "logo", required = false) MultipartFile logo) {
        return ResponseEntity.ok(instituteService.updateInstitute(id, institute, logo));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<Void> deleteInstitute(@PathVariable UUID id) {
        instituteService.deleteInstitute(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/activate")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<Void> activateInstitute(@PathVariable UUID id) {
        instituteService.activateInstitute(id);
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/{id}/suspend")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<Void> suspendInstitute(@PathVariable UUID id) {
        instituteService.suspendInstitute(id);
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/{id}/upgrade-plan")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<Void> upgradePlan(
            @PathVariable UUID id,
            @RequestParam Institute.SubscriptionPlan plan,
            @RequestParam int durationMonths) {
        instituteService.upgradePlan(id, plan, durationMonths);
        return ResponseEntity.ok().build();
    }
}
