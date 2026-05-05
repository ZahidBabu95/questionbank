package com.testshaper.service.impl;

import com.testshaper.dto.billing.BillingPackageDTO;
import com.testshaper.dto.billing.BillingPackageRequest;
import com.testshaper.entity.BillingPackage;
import com.testshaper.repository.BillingPackageRepository;
import com.testshaper.service.BillingPackageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BillingPackageServiceImpl implements BillingPackageService {

    private final BillingPackageRepository packageRepository;

    @Override
    @Transactional(readOnly = true)
    public List<BillingPackageDTO> getAllPackages() {
        return packageRepository.findAllByDeletedFalseOrderBySortOrderAsc().stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public BillingPackageDTO getPackageById(UUID id) {
        BillingPackage pkg = packageRepository.findById(id)
                .filter(p -> !p.isDeleted())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Package not found"));
        return mapToDTO(pkg);
    }

    @Override
    @Transactional
    public BillingPackageDTO createPackage(BillingPackageRequest request) {
        if (packageRepository.findByPackageCodeAndDeletedFalse(request.getPackageCode()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Package code already exists");
        }

        BillingPackage pkg = new BillingPackage();
        mapToEntity(request, pkg);
        return mapToDTO(packageRepository.save(pkg));
    }

    @Override
    @Transactional
    public BillingPackageDTO updatePackage(UUID id, BillingPackageRequest request) {
        BillingPackage pkg = packageRepository.findById(id)
                .filter(p -> !p.isDeleted())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Package not found"));

        if (!pkg.getPackageCode().equals(request.getPackageCode()) &&
            packageRepository.findByPackageCodeAndDeletedFalse(request.getPackageCode()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Package code already exists");
        }

        mapToEntity(request, pkg);
        return mapToDTO(packageRepository.save(pkg));
    }

    @Override
    @Transactional
    public void deletePackage(UUID id) {
        BillingPackage pkg = packageRepository.findById(id)
                .filter(p -> !p.isDeleted())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Package not found"));
        pkg.setDeleted(true);
        packageRepository.save(pkg);
    }

    @Override
    @Transactional
    public BillingPackageDTO updateStatus(UUID id, String status) {
        BillingPackage pkg = packageRepository.findById(id)
                .filter(p -> !p.isDeleted())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Package not found"));
        pkg.setStatus(BillingPackage.PackageStatus.valueOf(status.toUpperCase()));
        return mapToDTO(packageRepository.save(pkg));
    }

    private void mapToEntity(BillingPackageRequest request, BillingPackage entity) {
        entity.setName(request.getName());
        entity.setPackageCode(request.getPackageCode());
        entity.setDescription(request.getDescription());
        entity.setPrice(request.getPrice());
        entity.setCurrency(request.getCurrency());
        entity.setBillingCycle(BillingPackage.BillingCycle.valueOf(request.getBillingCycle().toUpperCase()));
        entity.setStatus(BillingPackage.PackageStatus.valueOf(request.getStatus().toUpperCase()));
        entity.setMaxTeachers(request.getMaxTeachers());
        entity.setMaxStudents(request.getMaxStudents());
        entity.setMaxQuestions(request.getMaxQuestions());
        entity.setMaxExamsPerMonth(request.getMaxExamsPerMonth());
        entity.setMaxLectures(request.getMaxLectures());
        entity.setAiLimitPerMonth(request.getAiLimitPerMonth());
        entity.setStorageLimitMb(request.getStorageLimitMb());
        entity.setFeatureFlags(request.getFeatureFlags());
        entity.setPricingRules(request.getPricingRules());
        entity.setDisplayName(request.getDisplayName());
        entity.setHighlightBadge(request.getHighlightBadge());
        entity.setSortOrder(request.getSortOrder());
        entity.setAssociatedRole(request.getAssociatedRole());
    }

    private BillingPackageDTO mapToDTO(BillingPackage entity) {
        BillingPackageDTO dto = new BillingPackageDTO();
        dto.setId(entity.getId());
        dto.setName(entity.getName());
        dto.setPackageCode(entity.getPackageCode());
        dto.setDescription(entity.getDescription());
        dto.setPrice(entity.getPrice());
        dto.setCurrency(entity.getCurrency());
        dto.setBillingCycle(entity.getBillingCycle().name());
        dto.setStatus(entity.getStatus().name());
        dto.setMaxTeachers(entity.getMaxTeachers());
        dto.setMaxStudents(entity.getMaxStudents());
        dto.setMaxQuestions(entity.getMaxQuestions());
        dto.setMaxExamsPerMonth(entity.getMaxExamsPerMonth());
        dto.setMaxLectures(entity.getMaxLectures());
        dto.setAiLimitPerMonth(entity.getAiLimitPerMonth());
        dto.setStorageLimitMb(entity.getStorageLimitMb());
        dto.setFeatureFlags(entity.getFeatureFlags());
        dto.setPricingRules(entity.getPricingRules());
        dto.setDisplayName(entity.getDisplayName());
        dto.setHighlightBadge(entity.getHighlightBadge());
        dto.setSortOrder(entity.getSortOrder());
        dto.setAssociatedRole(entity.getAssociatedRole());
        dto.setCreatedAt(entity.getCreatedAt());
        dto.setUpdatedAt(entity.getUpdatedAt());
        return dto;
    }
}
