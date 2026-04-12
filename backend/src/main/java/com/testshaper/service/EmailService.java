package com.testshaper.service;

import org.springframework.web.multipart.MultipartFile;
import java.util.Map;

public interface EmailService {
    void sendPasswordResetEmail(String toEmail, String userName, String newPassword);
    void sendWelcomeEmail(String toEmail, String userName, String tempPassword);
}
