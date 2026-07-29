package com.testshaper.service;

import com.testshaper.dto.AiAuditResultDto;
import com.testshaper.entity.Question;

import java.util.Map;
import java.util.UUID;

public interface AiQuestionAuditService {

    AiAuditResultDto auditQuestion(UUID questionId);

    AiAuditResultDto auditQuestionEntity(Question question);

    int auditBatchApprovedQuestions(int limit);

    Map<String, Object> startSubjectBatchAgent(UUID classSubjectId, UUID chapterId, boolean autoFixTopics, int minScore, boolean skipAlreadyAudited);


    Map<String, Object> getBatchAgentStatus(UUID batchId);

    boolean stopSubjectBatchAgent(UUID batchId);
}

