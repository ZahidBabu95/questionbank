package com.testshaper.service;

import com.testshaper.dto.cms.AppReleaseDTO;
import com.testshaper.dto.cms.AppReleaseRequest;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

public interface AppReleaseService {
    List<AppReleaseDTO> getAllReleases();
    AppReleaseDTO getLatestActiveRelease(String platform);
    AppReleaseDTO createRelease(AppReleaseRequest request);
    AppReleaseDTO updateRelease(UUID id, AppReleaseRequest request);
    void deleteRelease(UUID id);
    String uploadReleaseFile(MultipartFile file, String platform) throws IOException;
}
