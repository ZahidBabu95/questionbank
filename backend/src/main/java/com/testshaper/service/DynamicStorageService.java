package com.testshaper.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import com.testshaper.entity.GeneralSetting;

import java.io.IOException;
import java.net.URI;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class DynamicStorageService {

    private final GeneralSettingService settingService;
    private final FileStorageService localFileStorageService;

    public String uploadFile(MultipartFile file, String tenantId, String subFolder) throws IOException {
        Map<String, String> storageSettings;
        if (tenantId != null) {
            storageSettings = settingService.getInstituteSettings(tenantId, GeneralSetting.SettingCategory.STORAGE);
            if (storageSettings.isEmpty()) {
                storageSettings = settingService.getGlobalSettings(GeneralSetting.SettingCategory.STORAGE);
            }
        } else {
            storageSettings = settingService.getGlobalSettings(GeneralSetting.SettingCategory.STORAGE);
        }

        String provider = storageSettings.getOrDefault("storage_provider", "LOCAL");

        if ("CLOUDFLARE_R2".equalsIgnoreCase(provider)) {
            return uploadToCloudflareR2(file, storageSettings, subFolder);
        } else {
            return localFileStorageService.storeFile(file, subFolder);
        }
    }

    public String uploadFileContent(byte[] fileBytes, String contentType, String originalFileName, String tenantId, String subFolder) throws IOException {
        Map<String, String> storageSettings;
        if (tenantId != null) {
            storageSettings = settingService.getInstituteSettings(tenantId, GeneralSetting.SettingCategory.STORAGE);
            if (storageSettings.isEmpty()) {
                storageSettings = settingService.getGlobalSettings(GeneralSetting.SettingCategory.STORAGE);
            }
        } else {
            storageSettings = settingService.getGlobalSettings(GeneralSetting.SettingCategory.STORAGE);
        }

        String provider = storageSettings.getOrDefault("storage_provider", "LOCAL");

        if ("CLOUDFLARE_R2".equalsIgnoreCase(provider)) {
            return uploadBytesToCloudflareR2(fileBytes, contentType, originalFileName, storageSettings, subFolder);
        } else {
            throw new RuntimeException("Local storage fallback not supported for raw bytes in MVP. Please use Cloudflare R2.");
        }
    }

    private String uploadToCloudflareR2(MultipartFile file, Map<String, String> settings, String subFolder)
            throws IOException {
        String accountId = settings.get("cloudflare_account_id") != null ? settings.get("cloudflare_account_id").trim() : null;
        String bucketName = settings.get("cloudflare_r2_bucket") != null ? settings.get("cloudflare_r2_bucket").trim() : null;
        String accessKey = settings.get("storage_access_key") != null ? settings.get("storage_access_key").trim() : null;
        String secretKey = settings.get("storage_secret_key") != null ? settings.get("storage_secret_key").trim() : null;
        String publicUrlBase = settings.get("cloudflare_public_url") != null ? settings.get("cloudflare_public_url").trim() : null;

        if (accountId == null || bucketName == null || accessKey == null || secretKey == null) {
            log.error("Cloudflare R2 storage settings are incomplete.");
            throw new RuntimeException("Cloudflare R2 storage settings are incomplete.");
        }

        String endpointUrl = String.format("https://%s.r2.cloudflarestorage.com", accountId);

        S3Client s3Client = S3Client.builder()
                .region(Region.of("auto"))
                .endpointOverride(URI.create(endpointUrl))
                .credentialsProvider(StaticCredentialsProvider.create(AwsBasicCredentials.create(accessKey, secretKey)))
                .forcePathStyle(true)
                .build();

        String originalFileName = file.getOriginalFilename();
        String extension = "";
        if (originalFileName != null && originalFileName.contains(".")) {
            extension = originalFileName.substring(originalFileName.lastIndexOf("."));
        }
        String fileName = subFolder + "/" + UUID.randomUUID().toString() + extension;

        PutObjectRequest putOb = PutObjectRequest.builder()
                .bucket(bucketName)
                .key(fileName)
                .contentType(file.getContentType())
                .build();

        s3Client.putObject(putOb, RequestBody.fromInputStream(file.getInputStream(), file.getSize()));

        if (publicUrlBase != null && !publicUrlBase.isEmpty()) {
            if (publicUrlBase.endsWith("/")) {
                publicUrlBase = publicUrlBase.substring(0, publicUrlBase.length() - 1);
            }
            return publicUrlBase + "/" + fileName;
        }

        return endpointUrl + "/" + bucketName + "/" + fileName;
    }

    private String uploadBytesToCloudflareR2(byte[] fileBytes, String contentType, String originalFileName, Map<String, String> settings, String subFolder) throws IOException {
        String accountId = settings.get("cloudflare_account_id") != null ? settings.get("cloudflare_account_id").trim() : null;
        String bucketName = settings.get("cloudflare_r2_bucket") != null ? settings.get("cloudflare_r2_bucket").trim() : null;
        String accessKey = settings.get("storage_access_key") != null ? settings.get("storage_access_key").trim() : null;
        String secretKey = settings.get("storage_secret_key") != null ? settings.get("storage_secret_key").trim() : null;
        String publicUrlBase = settings.get("cloudflare_public_url") != null ? settings.get("cloudflare_public_url").trim() : null;

        if (accountId == null || bucketName == null || accessKey == null || secretKey == null) {
            log.error("Cloudflare R2 storage settings are incomplete.");
            throw new RuntimeException("Cloudflare R2 storage settings are incomplete.");
        }

        String endpointUrl = String.format("https://%s.r2.cloudflarestorage.com", accountId);

        S3Client s3Client = S3Client.builder()
                .region(Region.of("auto"))
                .endpointOverride(URI.create(endpointUrl))
                .credentialsProvider(StaticCredentialsProvider.create(AwsBasicCredentials.create(accessKey, secretKey)))
                .forcePathStyle(true)
                .build();

        String extension = "";
        if (originalFileName != null && originalFileName.contains(".")) {
            extension = originalFileName.substring(originalFileName.lastIndexOf("."));
        }
        String fileName = subFolder + "/" + UUID.randomUUID().toString() + extension;

        PutObjectRequest putOb = PutObjectRequest.builder()
                .bucket(bucketName)
                .key(fileName)
                .contentType(contentType)
                .build();

        s3Client.putObject(putOb, RequestBody.fromBytes(fileBytes));

        if (publicUrlBase != null && !publicUrlBase.isEmpty()) {
            if (publicUrlBase.endsWith("/")) {
                publicUrlBase = publicUrlBase.substring(0, publicUrlBase.length() - 1);
            }
            return publicUrlBase + "/" + fileName;
        }

        return endpointUrl + "/" + bucketName + "/" + fileName;
    }

    public byte[] loadFileBytes(String filePath) throws IOException {
        if (filePath.startsWith("http://") || filePath.startsWith("https://")) {
            // Technically we could use RestTemplate or URL read, but for MVP:
            try (java.io.InputStream in = new java.net.URL(filePath).openStream()) {
                return in.readAllBytes();
            }
        }
        return localFileStorageService.loadFile(filePath);
    }

    public Map<String, Object> testConnection(Map<String, String> settings) {
        String provider = settings.getOrDefault("storage_provider", "LOCAL");
        if (!"CLOUDFLARE_R2".equalsIgnoreCase(provider)) {
            return Map.of("connected", true, "provider", provider, "message", "Local storage is active.");
        }

        String accountId = settings.get("cloudflare_account_id") != null ? settings.get("cloudflare_account_id").trim() : null;
        String bucketName = settings.get("cloudflare_r2_bucket") != null ? settings.get("cloudflare_r2_bucket").trim() : null;
        String accessKey = settings.get("storage_access_key") != null ? settings.get("storage_access_key").trim() : null;
        String secretKey = settings.get("storage_secret_key") != null ? settings.get("storage_secret_key").trim() : null;

        if (accountId == null || bucketName == null || accessKey == null || secretKey == null) {
            return Map.of("connected", false, "error", "Incomplete Cloudflare R2 credentials.");
        }

        try {
            String endpointUrl = String.format("https://%s.r2.cloudflarestorage.com", accountId);

            S3Client s3Client = S3Client.builder()
                    .region(Region.of("auto"))
                    .endpointOverride(URI.create(endpointUrl))
                    .credentialsProvider(StaticCredentialsProvider.create(AwsBasicCredentials.create(accessKey, secretKey)))
                    .forcePathStyle(true)
                    .build();

            software.amazon.awssdk.services.s3.model.ListObjectsV2Request req = 
                software.amazon.awssdk.services.s3.model.ListObjectsV2Request.builder()
                .bucket(bucketName)
                .maxKeys(1000)
                .build();

            software.amazon.awssdk.services.s3.model.ListObjectsV2Response res = s3Client.listObjectsV2(req);

            long totalSize = 0;
            for(software.amazon.awssdk.services.s3.model.S3Object obj : res.contents()) {
                totalSize += obj.size();
            }

            String sizeStr;
            if (totalSize > 1024 * 1024 * 1024) {
                sizeStr = String.format("%.2f GB", totalSize / (1024.0 * 1024 * 1024));
            } else if (totalSize > 1024 * 1024) {
                sizeStr = String.format("%.2f MB", totalSize / (1024.0 * 1024));
            } else {
                sizeStr = String.format("%.2f KB", totalSize / 1024.0);
            }

            return Map.of(
                "connected", true,
                "provider", "Cloudflare R2",
                "bucketName", bucketName,
                "objectCount", res.contents().size() + (res.isTruncated() ? "+" : ""),
                "approxSize", sizeStr + (res.isTruncated() ? "+" : ""),
                "message", "Connection successful"
            );

        } catch (Exception e) {
            return Map.of(
                "connected", false,
                "provider", "Cloudflare R2",
                "error", e.getMessage() != null ? e.getMessage() : "Connection failed"
            );
        }
    }
}
