package com.testshaper.service.impl;

import com.testshaper.dto.AiKnowledgeBaseDTO;
import com.testshaper.entity.AiKnowledgeBase;
import com.testshaper.entity.User;
import com.testshaper.repository.AiKnowledgeBaseRepository;
import com.testshaper.repository.UserRepository;
import com.testshaper.service.AiKnowledgeBaseService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AiKnowledgeBaseServiceImpl implements AiKnowledgeBaseService {

    private final AiKnowledgeBaseRepository knowledgeRepository;
    private final UserRepository userRepository;

    @Override
    public List<AiKnowledgeBaseDTO> getAllKnowledge() {
        return knowledgeRepository.findAll().stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    @Override
    public List<AiKnowledgeBaseDTO> getActiveKnowledge() {
        return knowledgeRepository.findByIsActiveTrue().stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public AiKnowledgeBaseDTO createKnowledge(AiKnowledgeBaseDTO dto, String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));
                
        AiKnowledgeBase kb = new AiKnowledgeBase();
        kb.setTitle(dto.getTitle());
        kb.setContent(dto.getContent());
        kb.setTags(dto.getTags());
        kb.setActive(dto.isActive());
        kb.setCreatedBy(user);
        
        return mapToDTO(knowledgeRepository.save(kb));
    }

    @Override
    @Transactional
    public AiKnowledgeBaseDTO updateKnowledge(UUID id, AiKnowledgeBaseDTO dto) {
        AiKnowledgeBase kb = knowledgeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Knowledge Base not found"));
                
        kb.setTitle(dto.getTitle());
        kb.setContent(dto.getContent());
        kb.setTags(dto.getTags());
        kb.setActive(dto.isActive());
        
        return mapToDTO(knowledgeRepository.save(kb));
    }

    @Override
    @Transactional
    public void deleteKnowledge(UUID id) {
        knowledgeRepository.deleteById(id);
    }

    @Override
    @Transactional
    public AiKnowledgeBaseDTO toggleStatus(UUID id) {
        AiKnowledgeBase kb = knowledgeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Knowledge Base not found"));
        kb.setActive(!kb.isActive());
        return mapToDTO(knowledgeRepository.save(kb));
    }

    private AiKnowledgeBaseDTO mapToDTO(AiKnowledgeBase ent) {
        AiKnowledgeBaseDTO dto = new AiKnowledgeBaseDTO();
        dto.setId(ent.getId());
        dto.setTitle(ent.getTitle());
        dto.setContent(ent.getContent());
        dto.setTags(ent.getTags());
        dto.setActive(ent.isActive());
        dto.setCreatedAt(ent.getCreatedAt());
        dto.setUpdatedAt(ent.getUpdatedAt());
        if (ent.getCreatedBy() != null) {
            dto.setCreatedByName(ent.getCreatedBy().getName());
        }
        return dto;
    }
}
