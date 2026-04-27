package com.testshaper.service;

import com.testshaper.dto.ExamTemplateDTO;
import java.util.List;
import java.util.UUID;

public interface ExamTemplateService {
    List<ExamTemplateDTO> getAvailableTemplates();
    ExamTemplateDTO createTemplate(ExamTemplateDTO dto);
    ExamTemplateDTO updateTemplate(UUID id, ExamTemplateDTO dto);
    void deleteTemplate(UUID id);
}
