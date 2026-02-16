package com.testshaper.repository;

import com.testshaper.entity.AcademicClass;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface AcademicClassRepository extends JpaRepository<AcademicClass, UUID> {

}
