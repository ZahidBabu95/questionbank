package com.testshaper.repository;

import com.testshaper.entity.LectureAttachment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface LectureAttachmentRepository extends JpaRepository<LectureAttachment, UUID> {
    List<LectureAttachment> findByLectureIdOrderByAttachmentOrderAsc(UUID lectureId);
    List<LectureAttachment> findByLectureIdAndTenantIdOrderByAttachmentOrderAsc(UUID lectureId, String tenantId);
}
