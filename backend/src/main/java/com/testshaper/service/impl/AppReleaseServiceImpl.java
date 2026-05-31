package com.testshaper.service.impl;

import com.testshaper.dto.cms.AppReleaseDTO;
import com.testshaper.dto.cms.AppReleaseRequest;
import com.testshaper.entity.AppRelease;
import com.testshaper.repository.AppReleaseRepository;
import com.testshaper.service.AppReleaseService;
import com.testshaper.service.DynamicStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AppReleaseServiceImpl implements AppReleaseService {

    private final AppReleaseRepository appReleaseRepository;
    private final DynamicStorageService storageService;

    @Override
    @Transactional(readOnly = true)
    public List<AppReleaseDTO> getAllReleases() {
        return appReleaseRepository.findAllByDeletedFalseOrderByVersionCodeDesc().stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public AppReleaseDTO getLatestActiveRelease(String platform) {
        AppRelease.Platform plat;
        try {
            plat = AppRelease.Platform.valueOf(platform.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid platform: " + platform);
        }

        AppRelease release = appReleaseRepository.findFirstByPlatformAndActiveTrueAndDeletedFalseOrderByVersionCodeDesc(plat)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No active release found for platform: " + platform));

        return mapToDTO(release);
    }

    @Override
    @Transactional
    public AppReleaseDTO createRelease(AppReleaseRequest request) {
        AppRelease.Platform platform;
        AppRelease.ReleaseType releaseType;

        try {
            platform = AppRelease.Platform.valueOf(request.getPlatform().toUpperCase());
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid platform: " + request.getPlatform());
        }

        try {
            releaseType = AppRelease.ReleaseType.valueOf(request.getReleaseType().toUpperCase());
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid release type: " + request.getReleaseType());
        }

        if (request.getVersionName() == null || request.getVersionName().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Version name is required");
        }
        if (request.getVersionCode() == null || request.getVersionCode() <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Valid version code is required");
        }

        AppRelease release = new AppRelease();
        release.setPlatform(platform);
        release.setVersionName(request.getVersionName());
        release.setVersionCode(request.getVersionCode());
        release.setReleaseType(releaseType);
        release.setDownloadUrl(request.getDownloadUrl());
        release.setChangelog(request.getChangelog());
        
        if (request.getIsForceUpdate() != null) {
            release.setForceUpdate(request.getIsForceUpdate());
        }
        if (request.getActive() != null) {
            release.setActive(request.getActive());
        }

        return mapToDTO(appReleaseRepository.save(release));
    }

    @Override
    @Transactional
    public AppReleaseDTO updateRelease(UUID id, AppReleaseRequest request) {
        AppRelease release = appReleaseRepository.findById(id)
                .filter(r -> !r.isDeleted())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "App release not found"));

        if (request.getPlatform() != null) {
            try {
                release.setPlatform(AppRelease.Platform.valueOf(request.getPlatform().toUpperCase()));
            } catch (Exception e) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid platform");
            }
        }

        if (request.getReleaseType() != null) {
            try {
                release.setReleaseType(AppRelease.ReleaseType.valueOf(request.getReleaseType().toUpperCase()));
            } catch (Exception e) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid release type");
            }
        }

        if (request.getVersionName() != null) release.setVersionName(request.getVersionName());
        if (request.getVersionCode() != null) release.setVersionCode(request.getVersionCode());
        if (request.getDownloadUrl() != null) release.setDownloadUrl(request.getDownloadUrl());
        if (request.getChangelog() != null) release.setChangelog(request.getChangelog());
        if (request.getIsForceUpdate() != null) release.setForceUpdate(request.getIsForceUpdate());
        if (request.getActive() != null) release.setActive(request.getActive());

        return mapToDTO(appReleaseRepository.save(release));
    }

    @Override
    @Transactional
    public void deleteRelease(UUID id) {
        AppRelease release = appReleaseRepository.findById(id)
                .filter(r -> !r.isDeleted())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "App release not found"));
        release.setDeleted(true);
        appReleaseRepository.save(release);
    }

    @Override
    public String uploadReleaseFile(MultipartFile file, String platform) throws IOException {
        // Validate platform
        try {
            AppRelease.Platform.valueOf(platform.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid platform: " + platform);
        }

        // Upload using storage service under dynamic subfolder (falls back to R2 or local)
        return storageService.uploadFile(file, null, "apps/" + platform.toLowerCase());
    }

    private AppReleaseDTO mapToDTO(AppRelease entity) {
        AppReleaseDTO dto = new AppReleaseDTO();
        dto.setId(entity.getId());
        dto.setPlatform(entity.getPlatform().name());
        dto.setVersionName(entity.getVersionName());
        dto.setVersionCode(entity.getVersionCode());
        dto.setReleaseType(entity.getReleaseType().name());
        dto.setDownloadUrl(entity.getDownloadUrl());
        dto.setChangelog(entity.getChangelog());
        dto.setForceUpdate(entity.isForceUpdate());
        dto.setActive(entity.isActive());
        dto.setCreatedAt(entity.getCreatedAt());
        dto.setUpdatedAt(entity.getUpdatedAt());
        return dto;
    }
}
