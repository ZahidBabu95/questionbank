package com.testshaper.controller;

import com.testshaper.service.DynamicStorageService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import java.io.InputStream;
import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.IOException;

@RestController
public class CflareTestController {
    @Autowired
    private DynamicStorageService storageService;

    @GetMapping("/test-cloudflare")
    public ResponseEntity<?> testCloudflare() {
        try {
            MultipartFile testFile = new MultipartFile() {
                @Override public String getName() { return "test.txt"; }
                @Override public String getOriginalFilename() { return "test.txt"; }
                @Override public String getContentType() { return "text/plain"; }
                @Override public boolean isEmpty() { return false; }
                @Override public long getSize() { return 17; }
                @Override public byte[] getBytes() throws IOException { return "Hello Cloudflare!".getBytes(); }
                @Override public InputStream getInputStream() throws IOException { return new ByteArrayInputStream(getBytes()); }
                @Override public void transferTo(File dest) throws IOException, IllegalStateException {}
            };
            String url = storageService.uploadFile(testFile, null, "ai_imports/images/test");
            return ResponseEntity.ok("Success: " + url);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("Error: " + e.getMessage());
        }
    }
}
