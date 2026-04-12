package com.testshaper.service;

import com.testshaper.dto.billing.BillingPackageDTO;
import com.testshaper.dto.billing.BillingPackageRequest;

import java.util.List;
import java.util.UUID;

public interface BillingPackageService {
    List<BillingPackageDTO> getAllPackages();
    BillingPackageDTO getPackageById(UUID id);
    BillingPackageDTO createPackage(BillingPackageRequest request);
    BillingPackageDTO updatePackage(UUID id, BillingPackageRequest request);
    void deletePackage(UUID id);
    BillingPackageDTO updateStatus(UUID id, String status);
}
