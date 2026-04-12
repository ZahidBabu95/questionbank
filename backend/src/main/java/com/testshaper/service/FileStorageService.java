package com.testshaper.service;

import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;

public interface FileStorageService {
    String storeFile(MultipartFile file, String subDir) throws IOException;
    void deleteFile(String filePath);
    byte[] loadFile(String filePath) throws IOException;
}
