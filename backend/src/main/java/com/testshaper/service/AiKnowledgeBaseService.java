package com.testshaper.service;

import com.testshaper.dto.AiKnowledgeBaseDTO;
import java.util.List;
import java.util.UUID;

public interface AiKnowledgeBaseService {
    List<AiKnowledgeBaseDTO> getAllKnowledge();
    List<AiKnowledgeBaseDTO> getActiveKnowledge();
    AiKnowledgeBaseDTO createKnowledge(AiKnowledgeBaseDTO dto, String userEmail);
    AiKnowledgeBaseDTO updateKnowledge(UUID id, AiKnowledgeBaseDTO dto);
    void deleteKnowledge(UUID id);
    AiKnowledgeBaseDTO toggleStatus(UUID id);
}
