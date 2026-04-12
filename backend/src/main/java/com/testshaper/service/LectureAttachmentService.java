package com.testshaper.service;

import com.testshaper.dto.AttachmentResponseDTO;
import org.springframework.web.multipart.MultipartFile;
import java.util.List;
import java.util.UUID;

public interface LectureAttachmentService {
    AttachmentResponseDTO uploadAttachment(UUID lectureId, String title, String description, MultipartFile file, String username);
    AttachmentResponseDTO addExternalLink(UUID lectureId, String title, String description, String url, String username);
    List<AttachmentResponseDTO> getAttachments(UUID lectureId);
    void deleteAttachment(UUID attachmentId);
    AttachmentResponseDTO renameAttachment(UUID attachmentId, String newTitle);
    void reorderAttachments(List<UUID> attachmentIds);
}
