package com.testshaper.dto.cms;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class AppReleaseDTO {
    private UUID id;
    private String platform;
    private String versionName;
    private int versionCode;
    private String releaseType;
    private String downloadUrl;
    private String changelog;
    private boolean isForceUpdate;
    private boolean active;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
