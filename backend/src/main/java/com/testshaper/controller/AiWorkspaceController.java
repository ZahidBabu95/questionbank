package com.testshaper.controller;

import com.testshaper.common.ApiResponse;
import com.testshaper.entity.AiChatMessage;
import com.testshaper.entity.AiChatSession;
import com.testshaper.repository.AiChatMessageRepository;
import com.testshaper.repository.AiChatSessionRepository;
import com.testshaper.service.CopilotService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/ai/workspace")
@RequiredArgsConstructor
@Slf4j
public class AiWorkspaceController {

    private final AiChatSessionRepository sessionRepo;
    private final AiChatMessageRepository messageRepo;
    private final CopilotService copilotService;
    private final com.testshaper.service.GeneralSettingService settingService;

    @GetMapping("/config")
    public ResponseEntity<?> getWorkspaceConfig() {
        try {
            String tenantId = com.testshaper.security.TenantContext.getTenantId();
            Map<String, String> settings;
            if (tenantId == null || "DEFAULT".equals(tenantId)) {
                settings = settingService.getGlobalSettings(com.testshaper.entity.GeneralSetting.SettingCategory.AI);
            } else {
                settings = settingService.getInstituteSettings(tenantId, com.testshaper.entity.GeneralSetting.SettingCategory.AI);
                if (settings == null || settings.isEmpty()) {
                    settings = settingService.getGlobalSettings(com.testshaper.entity.GeneralSetting.SettingCategory.AI);
                }
            }
            return ResponseEntity.ok(ApiResponse.success(settings, "Workspace config retrieved"));
        } catch (Exception e) {
            log.error("Failed to fetch workspace config: ", e);
            return ResponseEntity.internalServerError().body(ApiResponse.error(e.getMessage(), 500));
        }
    }

    // ═══════════════════ Session Management ═══════════════════

    @GetMapping("/sessions")
    public ResponseEntity<?> getUserSessions() {
        try {
            Long userId = getCurrentUserId();
            String tenantId = com.testshaper.security.TenantContext.getTenantId();
            if (tenantId == null) tenantId = "DEFAULT";

            List<AiChatSession> sessions = sessionRepo.findByUserIdAndTenantIdAndDeletedFalseOrderByUpdatedAtDesc(userId, tenantId);
            return ResponseEntity.ok(ApiResponse.success(sessions, "Sessions retrieved successfully"));
        } catch (Exception e) {
            log.error("Failed to fetch sessions: ", e);
            return ResponseEntity.internalServerError().body(ApiResponse.error(e.getMessage(), 500));
        }
    }

    @PostMapping("/sessions")
    public ResponseEntity<?> createSession(@RequestBody Map<String, String> request) {
        try {
            String title = request.getOrDefault("title", "New Chat");
            Long userId = getCurrentUserId();
            String userEmail = getCurrentUserEmail();

            AiChatSession session = AiChatSession.builder()
                    .userId(userId)
                    .userEmail(userEmail)
                    .title(title)
                    .build();

            // Tenant ID is automatically set by BaseTenantEntity's @PrePersist
            session = sessionRepo.save(session);
            return ResponseEntity.ok(ApiResponse.success(session, "Session created"));
        } catch (Exception e) {
            log.error("Failed to create session: ", e);
            return ResponseEntity.internalServerError().body(ApiResponse.error(e.getMessage(), 500));
        }
    }

    @DeleteMapping("/sessions/{id}")
    public ResponseEntity<?> deleteSession(@PathVariable UUID id) {
        return sessionRepo.findById(id).map(session -> {
            session.setDeleted(true);
            sessionRepo.save(session);
            return ResponseEntity.ok(ApiResponse.success(null, "Session deleted"));
        }).orElse(ResponseEntity.notFound().build());
    }

    // ═══════════════════ Admin Audit & Telemetry ═══════════════════

    @GetMapping("/admin/audit/sessions")
    public ResponseEntity<?> getAllAuditSessions() {
        try {
            String tenantId = com.testshaper.security.TenantContext.getTenantId();
            List<AiChatSession> sessions;
            
            // If DEFAULT (Super Admin), fetch all sessions globally. Else, fetch tenant-specific.
            if (tenantId == null || "DEFAULT".equals(tenantId)) {
                sessions = sessionRepo.findAllByDeletedFalseOrderByUpdatedAtDesc();
            } else {
                sessions = sessionRepo.findByTenantIdAndDeletedFalseOrderByUpdatedAtDesc(tenantId);
            }
            
            return ResponseEntity.ok(ApiResponse.success(sessions, "Audit sessions retrieved"));
        } catch (Exception e) {
            log.error("Failed to fetch audit sessions: ", e);
            return ResponseEntity.internalServerError().body(ApiResponse.error(e.getMessage(), 500));
        }
    }

    // ═══════════════════ Messages & Chat Interaction ═══════════════════

    @GetMapping("/sessions/{sessionId}/messages")
    public ResponseEntity<?> getSessionMessages(@PathVariable UUID sessionId) {
        try {
            List<AiChatMessage> messages = messageRepo.findBySessionIdOrderByCreatedAtAsc(sessionId);
            return ResponseEntity.ok(ApiResponse.success(messages, "Messages retrieved"));
        } catch (Exception e) {
            log.error("Failed to fetch messages: ", e);
            return ResponseEntity.internalServerError().body(ApiResponse.error(e.getMessage(), 500));
        }
    }

    @PostMapping("/sessions/{sessionId}/ask")
    public ResponseEntity<?> askInSession(@PathVariable UUID sessionId, @RequestBody Map<String, String> request) {
        String query = request.get("query");
        String docId = request.get("docId");
        String filter = request.get("filter");
        String filterId = request.get("filterId");
        String mode = request.getOrDefault("mode", "strict");
        String tone = request.getOrDefault("tone", "professional");
        String toneInstruction = request.get("toneInstruction");

        if (query == null || query.isBlank()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Query cannot be empty", 400));
        }

        try {
            // Verify session exists
            AiChatSession session = sessionRepo.findById(sessionId)
                    .orElseThrow(() -> new RuntimeException("Session not found"));

            // 1. Save User Message
            AiChatMessage userMsg = AiChatMessage.builder()
                    .sessionId(sessionId)
                    .role("user")
                    .content(query)
                    .build();
            messageRepo.save(userMsg);

            // Update session title if it's the first message
            if ("New Chat".equals(session.getTitle())) {
                String newTitle = query.length() > 30 ? query.substring(0, 30) + "..." : query;
                session.setTitle(newTitle);
                sessionRepo.save(session);
            }

            // 2. Call AI Service
            java.util.List<AiChatMessage> history = messageRepo.findBySessionIdOrderByCreatedAtAsc(sessionId);
            String answer = copilotService.askCopilot(query, history, docId, filter, filterId, mode, tone, toneInstruction);

            // Extract Actionable JSON if present
            String actionableData = null;
            int actionIdx = answer.indexOf("\"actionable_type\"");
            if (actionIdx != -1) {
                int start = answer.lastIndexOf("{", actionIdx);
                int end = answer.lastIndexOf("}");
                if (start != -1 && end != -1 && end > start) {
                    actionableData = answer.substring(start, end + 1).trim();
                    
                    String textBefore = answer.substring(0, start).trim();
                    // Remove trailing markdown code block syntax if it was left behind
                    textBefore = textBefore.replaceAll("(?i)```(json)?\\s*$", "").trim();
                    answer = textBefore;
                }
            }

            // 3. Save AI Message
            AiChatMessage aiMsg = AiChatMessage.builder()
                    .sessionId(sessionId)
                    .role("ai")
                    .content(answer)
                    .actionableData(actionableData)
                    .build();
            messageRepo.save(aiMsg);

            // Update session timestamp with fresh fetch to prevent OptimisticLockException
            sessionRepo.findById(sessionId).ifPresent(s -> {
                s.setUpdatedAt(java.time.LocalDateTime.now());
                sessionRepo.save(s);
            });

            return ResponseEntity.ok(ApiResponse.success(
                    Map.of("userMessage", userMsg, "aiMessage", aiMsg, "answer", answer),
                    "Copilot answered successfully"
            ));
        } catch (Exception e) {
            log.error("Copilot asking failed: ", e);
            return ResponseEntity.internalServerError().body(ApiResponse.error("Copilot failed: " + e.getMessage(), 500));
        }
    }

    // ═══════════════════ Helpers ═══════════════════

    private Long getCurrentUserId() {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getPrincipal() instanceof com.testshaper.security.CustomUserDetails customUser) {
                return customUser.getUserId();
            }
        } catch (Exception ignored) {}
        return 0L;
    }

    private String getCurrentUserEmail() {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getPrincipal() instanceof org.springframework.security.core.userdetails.UserDetails ud) {
                return ud.getUsername();
            }
        } catch (Exception ignored) {}
        return "unknown";
    }
}
