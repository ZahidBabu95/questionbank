package com.testshaper.repository;

import com.testshaper.entity.AcademicClass;
import com.testshaper.entity.AcademicSession;
import com.testshaper.entity.ClassSubject;
import com.testshaper.entity.Subject;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

@Repository
public interface ClassSubjectRepository extends JpaRepository<ClassSubject, UUID> {
        java.util.List<ClassSubject> findByAcademicClass(AcademicClass academicClass);

        java.util.List<ClassSubject> findByAcademicClassId(UUID academicClassId);
        
        java.util.List<ClassSubject> findByTenantIdAndAcademicClassIdAndSessionIdOrderByOrderAsc(String tenantId, UUID classId, UUID sessionId);
        
        java.util.List<ClassSubject> findByTenantIdAndAcademicClassIdAndAcademicGroupIdAndSessionIdOrderByOrderAsc(String tenantId, UUID classId, UUID groupId, UUID sessionId);

        java.util.List<ClassSubject> findByAcademicClassAndSession(AcademicClass academicClass, AcademicSession session);

        Optional<ClassSubject> findByAcademicClassAndSubjectAndSession(AcademicClass academicClass, Subject subject,
                        AcademicSession session);

        @Query("SELECT cs FROM ClassSubject cs WHERE cs.tenantId = :tenantId AND LOWER(cs.academicClass.name) = LOWER(:className) AND LOWER(cs.subject.name) = LOWER(:subjectName)")
        List<ClassSubject> findByNames(@Param("tenantId") String tenantId, @Param("className") String className,
                        @Param("subjectName") String subjectName);
}
