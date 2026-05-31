package com.testshaper.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "app_releases", indexes = {
    @Index(name = "idx_app_platform", columnList = "platform"),
    @Index(name = "idx_app_active", columnList = "active")
})
@Getter
@Setter
@NoArgsConstructor
public class AppRelease extends BaseEntity {

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Platform platform;

    @Column(name = "version_name", nullable = false, length = 50)
    private String versionName;

    @Column(name = "version_code", nullable = false)
    private int versionCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "release_type", nullable = false, length = 20)
    private ReleaseType releaseType;

    @Column(name = "download_url", length = 500)
    private String downloadUrl;

    @Column(columnDefinition = "TEXT")
    private String changelog;

    @Column(name = "is_force_update", nullable = false)
    private boolean isForceUpdate = false;

    @Column(nullable = false)
    private boolean active = true;

    public enum Platform {
        ANDROID, IOS, WINDOWS, LINUX
    }

    public enum ReleaseType {
        STORE_LINK, FILE_UPLOAD
    }
}
