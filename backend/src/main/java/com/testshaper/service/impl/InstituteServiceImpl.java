package com.testshaper.service.impl;

import com.testshaper.entity.Institute;
import com.testshaper.repository.InstituteRepository;
import com.testshaper.service.InstituteService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@SuppressWarnings("null")
public class InstituteServiceImpl implements InstituteService {

    private final InstituteRepository instituteRepository;
    // In a real app, inject FileStorageService here

    @Override
    @Transactional
    public Institute createInstitute(Institute institute, MultipartFile logo) {
        if (instituteRepository.existsByCode(institute.getCode())) {
            throw new RuntimeException("Institute code '" + institute.getCode() + "' already exists.");
        }

        // Handle logo upload logic here (mocked for now)
        if (logo != null && !logo.isEmpty()) {
            institute.setLogoPath("uploads/logos/" + institute.getCode() + ".png");
        }

        // Set defaults
        if (institute.getPlanStartDate() == null) {
            institute.setPlanStartDate(LocalDate.now());
        }

        // Calculate expiry if not set
        if (institute.getExpiryDate() == null) {
            institute.setExpiryDate(LocalDate.now().plusMonths(1)); // Default 1 month
        }

        return instituteRepository.save(institute);
    }

    @Override
    @Transactional
    public Institute updateInstitute(UUID id, Institute updatedInfo, MultipartFile logo) {
        Institute institute = getInstitute(id);

        institute.setName(updatedInfo.getName());
        institute.setShortName(updatedInfo.getShortName());
        institute.setAddress(updatedInfo.getAddress());
        institute.setCity(updatedInfo.getCity());
        institute.setDistrict(updatedInfo.getDistrict());
        institute.setDivision(updatedInfo.getDivision());
        institute.setCountry(updatedInfo.getCountry());
        institute.setContactEmail(updatedInfo.getContactEmail());
        institute.setContactPhone(updatedInfo.getContactPhone());
        institute.setWebsite(updatedInfo.getWebsite());
        institute.setEstablishedYear(updatedInfo.getEstablishedYear());

        // Update Limits if provided (Admin only usually, but allowed here)
        institute.setMaxTeachers(updatedInfo.getMaxTeachers());
        institute.setMaxStudents(updatedInfo.getMaxStudents());
        institute.setAiLimitPerMonth(updatedInfo.getAiLimitPerMonth());
        institute.setStorageLimitMb(updatedInfo.getStorageLimitMb());

        if (logo != null && !logo.isEmpty()) {
            institute.setLogoPath("uploads/logos/" + institute.getCode() + "_" + System.currentTimeMillis() + ".png");
        }

        return instituteRepository.save(institute);
    }

    @Override
    public Institute getInstitute(UUID id) {
        return instituteRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Institute not found with ID: " + id));
    }

    @Override
    public Institute getInstituteByCode(String code) {
        return instituteRepository.findByCode(code)
                .orElseThrow(() -> new RuntimeException("Institute not found with Code: " + code));
    }

    @Override
    public Page<Institute> getAllInstitutes(String search, Institute.InstituteStatus status, Pageable pageable) {
        // Simple implementation, extend repository for search specification
        if (status != null) {
            // This is a simplification; ideally use Specification for dynamic filtering
            return instituteRepository.findAll(pageable);
        }
        return instituteRepository.findAll(pageable);
    }

    @Override
    @Transactional
    public void deleteInstitute(UUID id) {
        Institute institute = getInstitute(id);
        institute.setDeleted(true);
        institute.setStatus(Institute.InstituteStatus.INACTIVE);
        instituteRepository.save(institute);
    }

    @Override
    @Transactional
    public void activateInstitute(UUID id) {
        Institute institute = getInstitute(id);
        institute.setStatus(Institute.InstituteStatus.ACTIVE);
        instituteRepository.save(institute);
    }

    @Override
    @Transactional
    public void suspendInstitute(UUID id) {
        Institute institute = getInstitute(id);
        institute.setStatus(Institute.InstituteStatus.SUSPENDED);
        instituteRepository.save(institute);
    }

    @Override
    @Transactional
    public void upgradePlan(UUID id, Institute.SubscriptionPlan plan, int durationMonths) {
        Institute institute = getInstitute(id);
        institute.setPlanType(plan);
        institute.setPlanStartDate(LocalDate.now());
        institute.setPlanEndDate(LocalDate.now().plusMonths(durationMonths));

        // Update limits based on plan (Example logic)
        switch (plan) {
            case BASIC:
                institute.setMaxTeachers(10);
                institute.setMaxStudents(100);
                institute.setAiLimitPerMonth(500);
                break;
            case PREMIUM:
                institute.setMaxTeachers(50);
                institute.setMaxStudents(1000);
                institute.setAiLimitPerMonth(5000);
                break;
            case ENTERPRISE:
                institute.setMaxTeachers(500);
                institute.setMaxStudents(10000);
                institute.setAiLimitPerMonth(50000);
                break;
            default: // FREE
                institute.setMaxTeachers(5);
                institute.setMaxStudents(50);
                institute.setAiLimitPerMonth(100);
        }

        institute.setExpiryDate(institute.getPlanEndDate());
        instituteRepository.save(institute);
    }

    @Override
    @Transactional
    public void incrementAiUsage(UUID instituteId, int tokens) {
        Institute institute = getInstitute(instituteId);
        institute.setAiUsedCurrentMonth(institute.getAiUsedCurrentMonth() + tokens);
        instituteRepository.save(institute);
    }

    @Override
    @Transactional
    public void updateStorageUsage(UUID instituteId, double sizeMb) {
        Institute institute = getInstitute(instituteId);
        institute.setStorageUsedMb(institute.getStorageUsedMb() + sizeMb);
        instituteRepository.save(institute);
    }
}
