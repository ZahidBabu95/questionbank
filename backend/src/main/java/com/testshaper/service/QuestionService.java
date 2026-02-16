package com.testshaper.service;

import com.testshaper.entity.Question;
import com.testshaper.entity.QuestionOption;
import java.util.List;
import java.util.UUID;

public interface QuestionService {

    Question createMCQ(Question question, List<QuestionOption> options);

    Question createShortQuestion(Question question);

    Question createCQ(Question question);

    Question getQuestion(UUID id);

    List<QuestionOption> getOptions(UUID questionId);

    List<Question> getAllQuestions();

    void deleteQuestion(UUID id);

    Question approveQuestion(UUID id, String approverId);

    Question rejectQuestion(UUID id);
}
