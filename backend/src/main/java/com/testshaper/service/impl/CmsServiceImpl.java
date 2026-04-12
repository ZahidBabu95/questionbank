package com.testshaper.service.impl;

import com.testshaper.dto.cms.CmsSectionDTO;
import com.testshaper.dto.cms.CmsSectionRequest;
import com.testshaper.entity.CmsSection;
import com.testshaper.entity.CmsSectionContent;
import com.testshaper.repository.CmsSectionRepository;
import com.testshaper.service.CmsService;
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
public class CmsServiceImpl implements CmsService {

    private final CmsSectionRepository sectionRepository;

    @Override
    @Transactional(readOnly = true)
    public List<CmsSectionDTO> getAllSections() {
        return sectionRepository.findAllByDeletedFalseOrderBySortOrderAsc().stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public CmsSectionDTO getSectionByKey(String key) {
        CmsSection section = sectionRepository.findBySectionKeyAndDeletedFalse(key)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Section not found"));
        return mapToDTO(section);
    }

    @Override
    @Transactional
    public CmsSectionDTO updateSection(UUID id, CmsSectionRequest request) {
        CmsSection section = sectionRepository.findById(id)
                .filter(s -> !s.isDeleted())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Section not found"));

        if (request.getSectionName() != null) section.setSectionName(request.getSectionName());
        if (request.getSortOrder() != null) section.setSortOrder(request.getSortOrder());
        if (request.getStatus() != null) section.setStatus(CmsSection.SectionStatus.valueOf(request.getStatus().toUpperCase()));

        if (request.getContents() != null) {
            section.getContents().clear();
            for (CmsSectionRequest.ContentRequest c : request.getContents()) {
                CmsSectionContent content = new CmsSectionContent();
                content.setContentKey(c.getContentKey());
                content.setContentValue(c.getContentValue());
                content.setContentType(CmsSectionContent.ContentType.valueOf(c.getContentType().toUpperCase()));
                section.addContent(content);
            }
        }

        return mapToDTO(sectionRepository.save(section));
    }

    @Override
    @Transactional
    public CmsSectionDTO updateStatus(UUID id, String status) {
        CmsSection section = sectionRepository.findById(id)
                .filter(s -> !s.isDeleted())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Section not found"));
        section.setStatus(CmsSection.SectionStatus.valueOf(status.toUpperCase()));
        return mapToDTO(sectionRepository.save(section));
    }

    @Override
    @Transactional(readOnly = true)
    public List<CmsSectionDTO> getPublicLandingData() {
        return sectionRepository.findAllByStatusAndDeletedFalseOrderBySortOrderAsc(CmsSection.SectionStatus.ACTIVE).stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    private CmsSectionDTO mapToDTO(CmsSection entity) {
        CmsSectionDTO dto = new CmsSectionDTO();
        dto.setId(entity.getId());
        dto.setSectionName(entity.getSectionName());
        dto.setSectionKey(entity.getSectionKey());
        dto.setStatus(entity.getStatus().name());
        dto.setSortOrder(entity.getSortOrder());
        dto.setContents(entity.getContents().stream().map(c -> {
            CmsSectionDTO.ContentDTO cDto = new CmsSectionDTO.ContentDTO();
            cDto.setContentKey(c.getContentKey());
            cDto.setContentValue(c.getContentValue());
            cDto.setContentType(c.getContentType().name());
            return cDto;
        }).collect(Collectors.toList()));
        return dto;
    }
}
