package com.testshaper.dto.cms;

import lombok.Data;

@Data
public class AppReleaseRequest {
    private String platform;
    private String versionName;
    private Integer versionCode;
    private String releaseType;
    private String downloadUrl;
    private String changelog;
    private Boolean isForceUpdate;
    private Boolean active;
}
