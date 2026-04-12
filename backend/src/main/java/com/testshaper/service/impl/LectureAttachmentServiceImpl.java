package com.testshaper.service.impl;

import com.testshaper.dto.AttachmentResponseDTO;
import com.testshaper.entity.LectureAttachment;
import com.testshaper.repository.LectureAttachmentRepository;
import com.testshaper.security.TenantContext;
import com.testshaper.service.FileStorageService;
import com.testshaper.service.LectureAttachmentService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class LectureAttachmentServiceImpl implements LectureAttachmentService {

    private final LectureAttachmentRepository attachmentRepository;
    private final FileStorageService fileStorageService;

    @Override
    @Transactional
    public AttachmentResponseDTO uploadAttachment(UUID lectureId, String title, String description, MultipartFile file, String username) {
        String tenantId = TenantContext.getTenantId();
        
        try {
            String filePath = fileStorageService.storeFile(file, "lectures/" + lectureId);
            
            LectureAttachment attachment = new LectureAttachment();
            attachment.setLectureId(lectureId);
            attachment.setTenantId(tenantId);
            attachment.setTitle(title);
            attachment.setDescription(description);
            attachment.setFileName(file.getOriginalFilename());
            attachment.setFilePath(filePath);
            attachment.setFileType(file.getContentType());
            attachment.setFileSize(file.getSize());
            attachment.setUploadedBy(username);
            
            // Set order as last
            List<LectureAttachment> existing = attachmentRepository.findByLectureIdAndTenantIdOrderByAttachmentOrderAsc(lectureId, tenantId);
            attachment.setAttachmentOrder(existing.size());
            
            LectureAttachment saved = attachmentRepository.save(attachment);
            return mapToDTO(saved);
            
        } catch (IOException e) {
            log.error("Failed to store attachment file", e);
            throw new RuntimeException("Could not store file. Please try again!");
        }
    }

    @Override
    @Transactional
    public AttachmentResponseDTO addExternalLink(UUID lectureId, String title, String description, String url, String username) {
        String tenantId = TenantContext.getTenantId();
        
        LectureAttachment attachment = new LectureAttachment();
        attachment.setLectureId(lectureId);
        attachment.setTenantId(tenantId);
        attachment.setTitle(title);
        attachment.setDescription(description);
        attachment.setExternalUrl(url);
        attachment.setFileType("URL");
        attachment.setUploadedBy(username);
        
        List<LectureAttachment> existing = attachmentRepository.findByLectureIdAndTenantIdOrderByAttachmentOrderAsc(lectureId, tenantId);
        attachment.setAttachmentOrder(existing.size());
        
        LectureAttachment saved = attachmentRepository.save(attachment);
        return mapToDTO(saved);
    }

    @Override
    public List<AttachmentResponseDTO> getAttachments(UUID lectureId) {
        String tenantId = TenantContext.getTenantId();
        return attachmentRepository.findByLectureIdAndTenantIdOrderByAttachmentOrderAsc(lectureId, tenantId)
                .stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void deleteAttachment(UUID attachmentId) {
        String tenantId = TenantContext.getTenantId();
        LectureAttachment attachment = attachmentRepository.findById(attachmentId)
                .orElseThrow(() -> new EntityNotFoundException("Attachment not found"));
        
        if (!attachment.getTenantId().equals(tenantId)) {
            throw new SecurityException("Unauthorized access to attachment");
        }
        
        if (attachment.getFilePath() != null) {
            fileStorageService.deleteFile(attachment.getFilePath());
        }
        
        attachmentRepository.delete(attachment);
    }

    @Override
    @Transactional
    public AttachmentResponseDTO renameAttachment(UUID attachmentId, String newTitle) {
        String tenantId = TenantContext.getTenantId();
        LectureAttachment attachment = attachmentRepository.findById(attachmentId)
                .orElseThrow(() -> new EntityNotFoundException("Attachment not found"));
        
        if (!attachment.getTenantId().equals(tenantId)) {
            throw new SecurityException("Unauthorized access to attachment");
        }
        
        attachment.setTitle(newTitle);
        return mapToDTO(attachmentRepository.save(attachment));
    }

    @Override
    @Transactional
    public void reorderAttachments(List<UUID> attachmentIds) {
        String tenantId = TenantContext.getTenantId();
        for (int i = 0; i < attachmentIds.size(); i++) {
            UUID id = attachmentIds.get(i);
            LectureAttachment attachment = attachmentRepository.findById(id).orElse(null);
            if (attachment != null && attachment.getTenantId().equals(tenantId)) {
                attachment.setAttachmentOrder(i);
                attachmentRepository.save(attachment);
            }
        }
    }

    private AttachmentResponseDTO mapToDTO(LectureAttachment attachment) {
        return AttachmentResponseDTO.builder()
                .id(attachment.getId())
                .lectureId(attachment.getLectureId())
                .title(attachment.getTitle())
                .description(attachment.getDescription())
                .fileName(attachment.getFileName())
                .filePath(attachment.getFilePath())
                .fileType(attachment.getFileType())
                .fileSize(attachment.getFileSize())
                .externalUrl(attachment.getExternalUrl())
                .attachmentOrder(attachment.getAttachmentOrder())
                .uploadedBy(attachment.getUploadedBy())
                .createdAt(attachment.getCreatedAt())
                .build();
    }
}
