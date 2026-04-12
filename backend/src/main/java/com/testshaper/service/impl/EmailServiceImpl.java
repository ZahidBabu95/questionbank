package com.testshaper.service.impl;

import com.testshaper.service.EmailService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;

@Service
@Slf4j
public class EmailServiceImpl implements EmailService {

    // Optional — app starts even without SMTP config.
    // Configure spring.mail.* properties to enable email sending.
    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Value("${spring.mail.username:noreply@questionshaper.com}")
    private String fromEmail;

    @Value("${app.name:QuestionShaper}")
    private String appName;

    @Override
    @Async
    public void sendPasswordResetEmail(String toEmail, String userName, String newPassword) {
        String subject = "[" + appName + "] পাসওয়ার্ড রিসেট করা হয়েছে";
        String html = buildPasswordResetHtml(userName, newPassword);
        send(toEmail, subject, html);
    }

    @Override
    @Async
    public void sendWelcomeEmail(String toEmail, String userName, String tempPassword) {
        String subject = "[" + appName + "] স্বাগতম! আপনার অ্যাকাউন্ট তৈরি হয়েছে";
        String html = buildWelcomeHtml(userName, toEmail, tempPassword);
        send(toEmail, subject, html);
    }

    private void send(String to, String subject, String htmlBody) {
        if (mailSender == null) {
            log.warn("Email not sent to {} — SMTP not configured. Set spring.mail.* properties to enable.", to);
            return;
        }
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromEmail);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(htmlBody, true);
            mailSender.send(message);
            log.info("Email sent to: {}", to);
        } catch (MessagingException e) {
            log.error("Failed to send email to {}: {}", to, e.getMessage());
        }
    }

    private String buildPasswordResetHtml(String name, String newPassword) {
        return """
            <!DOCTYPE html>
            <html>
            <body style="font-family: Arial, sans-serif; background:#f8fafc; padding:20px;">
            <div style="max-width:480px; margin:0 auto; background:white; border-radius:16px; overflow:hidden; box-shadow:0 4px 20px rgba(0,0,0,0.08);">
              <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed); padding:32px; text-align:center;">
                <h1 style="color:white; margin:0; font-size:22px;">🔐 পাসওয়ার্ড রিসেট</h1>
              </div>
              <div style="padding:32px;">
                <p style="color:#374151; font-size:16px;">প্রিয় <strong>%s</strong>,</p>
                <p style="color:#6b7280;">আপনার অ্যাকাউন্টের পাসওয়ার্ড রিসেট করা হয়েছে।</p>
                <div style="background:#f3f4f6; border:1px solid #e5e7eb; border-radius:12px; padding:20px; margin:24px 0; text-align:center;">
                  <p style="margin:0; font-size:12px; color:#9ca3af; text-transform:uppercase; letter-spacing:1px;">নতুন পাসওয়ার্ড</p>
                  <p style="margin:8px 0 0; font-size:24px; font-weight:bold; color:#4f46e5; letter-spacing:2px; font-family:monospace;">%s</p>
                </div>
                <p style="color:#ef4444; font-size:13px;">⚠️ লগিন করার পর অবিলম্বে পাসওয়ার্ড পরিবর্তন করুন।</p>
              </div>
              <div style="background:#f9fafb; padding:16px; text-align:center; font-size:12px; color:#9ca3af;">
                এই ইমেইল %s থেকে পাঠানো হয়েছে
              </div>
            </div>
            </body>
            </html>
            """.formatted(name, newPassword, appName);
    }

    private String buildWelcomeHtml(String name, String email, String tempPassword) {
        return """
            <!DOCTYPE html>
            <html>
            <body style="font-family: Arial, sans-serif; background:#f8fafc; padding:20px;">
            <div style="max-width:480px; margin:0 auto; background:white; border-radius:16px; overflow:hidden; box-shadow:0 4px 20px rgba(0,0,0,0.08);">
              <div style="background:linear-gradient(135deg,#059669,#0d9488); padding:32px; text-align:center;">
                <h1 style="color:white; margin:0; font-size:22px;">🎉 স্বাগতম!</h1>
              </div>
              <div style="padding:32px;">
                <p style="color:#374151; font-size:16px;">প্রিয় <strong>%s</strong>,</p>
                <p style="color:#6b7280;">%s-এ আপনার অ্যাকাউন্ট তৈরি হয়েছে।</p>
                <div style="background:#f3f4f6; border:1px solid #e5e7eb; border-radius:12px; padding:20px; margin:24px 0;">
                  <p style="margin:0; font-size:12px; color:#9ca3af;">ইমেইল</p>
                  <p style="margin:4px 0 16px; font-weight:bold; color:#374151;">%s</p>
                  <p style="margin:0; font-size:12px; color:#9ca3af;">অস্থায়ী পাসওয়ার্ড</p>
                  <p style="margin:4px 0 0; font-size:20px; font-weight:bold; color:#059669; font-family:monospace;">%s</p>
                </div>
                <p style="color:#ef4444; font-size:13px;">⚠️ লগিন করার পর অবিলম্বে পাসওয়ার্ড পরিবর্তন করুন।</p>
              </div>
            </div>
            </body>
            </html>
            """.formatted(name, appName, email, tempPassword);
    }
}
