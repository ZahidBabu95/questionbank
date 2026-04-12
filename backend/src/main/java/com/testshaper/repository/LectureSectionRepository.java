package com.testshaper.repository;

import com.testshaper.entity.LectureSection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface LectureSectionRepository extends JpaRepository<LectureSection, UUID> {
}
