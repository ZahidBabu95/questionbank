package com.testshaper.service.impl;

import com.testshaper.entity.QuestionType;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import com.testshaper.repository.QuestionTypeRepository;
import com.testshaper.security.TenantContext;
import com.testshaper.service.QuestionTypeService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class QuestionTypeServiceImpl implements QuestionTypeService {

    private final QuestionTypeRepository questionTypeRepository;

    @Override
    public List<QuestionType> getAllQuestionTypes() {
        String tenantId = TenantContext.getTenantId();
        if (tenantId == null) tenantId = "DEFAULT";
        return questionTypeRepository.findByTenantIdOrTenantId(tenantId, "DEFAULT");
    }

    @Override
    public QuestionType getQuestionTypeById(UUID id) {
        return questionTypeRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "QuestionType not found with id: " + id));
    }

    @Override
    public QuestionType getQuestionTypeByCode(String code) {
        return questionTypeRepository.findByCode(code)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "QuestionType not found with code: " + code));
    }

    @Override
    public QuestionType createQuestionType(QuestionType questionType) {
        return questionTypeRepository.save(questionType);
    }

    @Override
    public QuestionType updateQuestionType(UUID id, QuestionType questionTypeDetails) {
        QuestionType questionType = getQuestionTypeById(id);
        questionType.setName(questionTypeDetails.getName());
        questionType.setSchemaTemplate(questionTypeDetails.getSchemaTemplate());
        questionType.setAiPromptTemplate(questionTypeDetails.getAiPromptTemplate());
        // Do not update code or isSystemDefault
        return questionTypeRepository.save(questionType);
    }

    @Override
    public void deleteQuestionType(UUID id) {
        QuestionType questionType = getQuestionTypeById(id);
        if (questionType.isSystemDefault()) {
            throw new IllegalArgumentException("Cannot delete system default question type");
        }
        questionTypeRepository.delete(questionType);
    }
}
