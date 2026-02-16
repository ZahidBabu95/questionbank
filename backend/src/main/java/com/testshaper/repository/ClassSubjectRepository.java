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

@Repository
public interface ClassSubjectRepository extends JpaRepository<ClassSubject, UUID> {
    List<ClassSubject> findByAcademicClass(AcademicClass academicClass);

    List<ClassSubject> findByAcademicClassId(UUID academicClassId);

    List<ClassSubject> findByAcademicClassAndSession(AcademicClass academicClass, AcademicSession session);

    Optional<ClassSubject> findByAcademicClassAndSubjectAndSession(AcademicClass academicClass, Subject subject,
            AcademicSession session);
}
