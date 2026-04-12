package com.testshaper.service.impl;

import com.testshaper.service.FileStorageService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

@Service
@Slf4j
public class LocalFileStorageServiceImpl implements FileStorageService {

    private final Path fileStorageLocation;

    public LocalFileStorageServiceImpl(@Value("${file.upload.dir:uploads}") String uploadDir) {
        this.fileStorageLocation = Paths.get(uploadDir).toAbsolutePath().normalize();
        try {
            Files.createDirectories(this.fileStorageLocation);
        } catch (Exception ex) {
            log.error("Could not create upload directory", ex);
        }
    }

    @Override
    public String storeFile(MultipartFile file, String subDir) throws IOException {
        String originalFileName = StringUtils.cleanPath(file.getOriginalFilename());
        String extension = "";
        
        int i = originalFileName.lastIndexOf('.');
        if (i > 0) {
            extension = originalFileName.substring(i);
        }
        
        String fileName = UUID.randomUUID().toString() + extension;
        Path targetLocation = this.fileStorageLocation.resolve(subDir);
        Files.createDirectories(targetLocation);
        
        Path filePath = targetLocation.resolve(fileName);
        Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);
        
        return subDir + "/" + fileName;
    }

    @Override
    public void deleteFile(String filePath) {
        try {
            Path path = this.fileStorageLocation.resolve(filePath);
            Files.deleteIfExists(path);
        } catch (IOException ex) {
            log.error("Error deleting file: " + filePath, ex);
        }
    }

    @Override
    public byte[] loadFile(String filePath) throws IOException {
        Path path = this.fileStorageLocation.resolve(filePath);
        return Files.readAllBytes(path);
    }
}
