package com.testshaper.service;

import com.testshaper.entity.Institute;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

public interface InstituteService {

    Institute createInstitute(Institute institute, MultipartFile logo);

    Institute updateInstitute(UUID id, Institute institute, MultipartFile logo);

    Institute getInstitute(UUID id);

    Institute getInstituteByCode(String code);

    Page<Institute> getAllInstitutes(String search, Institute.InstituteStatus status, Pageable pageable);

    void deleteInstitute(UUID id);

    void activateInstitute(UUID id);

    void suspendInstitute(UUID id);

    void upgradePlan(UUID id, Institute.SubscriptionPlan plan, int durationMonths);

    // Usage Tracking
    void incrementAiUsage(UUID instituteId, int tokens);

    void updateStorageUsage(UUID instituteId, double sizeMb);
}
