package com.testshaper.service;

import com.testshaper.entity.Question;
import com.testshaper.entity.QuestionOption;
import java.util.List;
import java.util.UUID;

public interface QuestionService {

    Question createMCQ(Question question, List<QuestionOption> options);

    void createMCQBulk(List<Question> questions, List<List<QuestionOption>> optionsList);

    Question createShortQuestion(Question question);

    Question createCQ(Question question);

    Question getQuestion(UUID id);

    List<QuestionOption> getOptions(UUID questionId);

    List<Question> getAllQuestions();

    org.springframework.data.domain.Page<Question> getAllQuestionsPaginated(
        java.util.Map<String, String> filters, 
        org.springframework.data.domain.Pageable pageable
    );

    List<UUID> getAllQuestionIds(java.util.Map<String, String> filters);

    java.util.Map<String, Object> getOverviewStats(java.util.Map<String, String> filters);

    void deleteQuestion(UUID id);

    void deleteQuestionsBulk(List<UUID> ids);

    Question approveQuestion(UUID id, String approverId);

    Question rejectQuestion(UUID id);

    Question rejectQuestion(UUID id, String rejectionReason, String rejectedBy);

    Question updateQuestion(UUID id, Question questionDetails, List<QuestionOption> options);

    void approveQuestionsBulk(List<UUID> ids, String approverId);

    void rejectQuestionsBulk(List<UUID> ids);

    void updateStatusBulk(List<UUID> ids, Question.QuestionStatus status, String approverId);

    // --- Revision / Pull Request Core System ---
    Question submitRevision(UUID originalQuestionId, Question revisionDraft, List<QuestionOption> options, String userEmail, String versionComment);

    Question approveRevision(UUID revisionId, String approverId);

    // In-place option update (for revise — no delete/recreate, avoids detached entity errors)
    void updateOptionsInPlace(UUID questionId, List<QuestionOption> incomingOptions);
}
