package com.testshaper.service;

import com.testshaper.entity.QuestionType;

import java.util.List;
import java.util.UUID;

public interface QuestionTypeService {
    List<QuestionType> getAllQuestionTypes();
    QuestionType getQuestionTypeById(UUID id);
    QuestionType getQuestionTypeByCode(String code);
    QuestionType createQuestionType(QuestionType questionType);
    QuestionType updateQuestionType(UUID id, QuestionType questionType);
    void deleteQuestionType(UUID id);
}
