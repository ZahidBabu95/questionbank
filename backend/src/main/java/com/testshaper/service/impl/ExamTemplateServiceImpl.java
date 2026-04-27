package com.testshaper.service.impl;

import com.testshaper.dto.ExamTemplateDTO;
import com.testshaper.entity.ExamTemplate;
import com.testshaper.repository.ExamTemplateRepository;
import com.testshaper.security.TenantContext;
import com.testshaper.service.ExamTemplateService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Transactional
public class ExamTemplateServiceImpl implements ExamTemplateService {

    private final ExamTemplateRepository repository;

    public ExamTemplateServiceImpl(ExamTemplateRepository repository) {
        this.repository = repository;
    }

    @Override
    public List<ExamTemplateDTO> getAvailableTemplates() {
        String tenantId = TenantContext.getTenantId();
        return repository.findAvailableTemplates(tenantId).stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Override
    public ExamTemplateDTO createTemplate(ExamTemplateDTO dto) {
        ExamTemplate entity = new ExamTemplate();
        entity.setTemplateName(dto.getTemplateName());
        entity.setGlobal(dto.isGlobal());
        entity.setStructureJson(dto.getStructureJson());
        entity.setCreatedBy(dto.getCreatedBy());
        return mapToDto(repository.save(entity));
    }

    @Override
    public ExamTemplateDTO updateTemplate(UUID id, ExamTemplateDTO dto) {
        ExamTemplate entity = repository.findById(id).orElseThrow();
        entity.setTemplateName(dto.getTemplateName());
        entity.setGlobal(dto.isGlobal());
        entity.setStructureJson(dto.getStructureJson());
        return mapToDto(repository.save(entity));
    }

    @Override
    public void deleteTemplate(UUID id) {
        ExamTemplate entity = repository.findById(id).orElseThrow();
        entity.setDeleted(true);
        repository.save(entity);
    }

    private ExamTemplateDTO mapToDto(ExamTemplate entity) {
        ExamTemplateDTO dto = new ExamTemplateDTO();
        dto.setId(entity.getId());
        dto.setTemplateName(entity.getTemplateName());
        dto.setGlobal(entity.isGlobal());
        dto.setStructureJson(entity.getStructureJson());
        dto.setCreatedBy(entity.getCreatedBy());
        dto.setCreatedAt(entity.getCreatedAt());
        dto.setUpdatedAt(entity.getUpdatedAt());
        return dto;
    }
}
