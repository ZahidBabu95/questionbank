package com.testshaper.repository;

import com.testshaper.entity.AppRelease;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AppReleaseRepository extends JpaRepository<AppRelease, UUID> {
    List<AppRelease> findAllByDeletedFalseOrderByVersionCodeDesc();
    List<AppRelease> findAllByPlatformAndDeletedFalseOrderByVersionCodeDesc(AppRelease.Platform platform);
    Optional<AppRelease> findFirstByPlatformAndActiveTrueAndDeletedFalseOrderByVersionCodeDesc(AppRelease.Platform platform);
}
