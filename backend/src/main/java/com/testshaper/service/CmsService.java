package com.testshaper.service;

import com.testshaper.dto.cms.CmsSectionDTO;
import com.testshaper.dto.cms.CmsSectionRequest;

import java.util.List;
import java.util.UUID;

public interface CmsService {
    List<CmsSectionDTO> getAllSections();
    CmsSectionDTO getSectionByKey(String key);
    CmsSectionDTO updateSection(UUID id, CmsSectionRequest request);
    CmsSectionDTO updateStatus(UUID id, String status);
    List<CmsSectionDTO> getPublicLandingData();
}
