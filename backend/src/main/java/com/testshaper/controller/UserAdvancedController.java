package com.testshaper.controller;

import com.testshaper.entity.UserActivityLog;
import com.testshaper.entity.UserLoginHistory;
import com.testshaper.repository.UserLoginHistoryRepository;
import com.testshaper.repository.UserRepository;
import com.testshaper.service.UserActivityLogService;
import com.testshaper.service.UserImportService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserAdvancedController {

    private final UserActivityLogService activityLogService;
    private final UserLoginHistoryRepository loginHistoryRepo;
    private final UserImportService importService;
    private final UserRepository userRepository;

    // ── Activity Logs for a specific user ────────────────────────────────────
    @GetMapping("/{id}/activity-log")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'INSTITUTE_ADMIN')")
    public ResponseEntity<Map<String, Object>> getUserActivityLog(
            @PathVariable UUID id,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<UserActivityLog> logs = activityLogService.getLogsForUser(id, pageable);
        return ResponseEntity.ok(Map.of("success", true, "data", logs));
    }

    // ── All Activity Logs (global audit) ──────────────────────────────────────
    @GetMapping("/activity-log")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<Map<String, Object>> getAllActivityLogs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "30") int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<UserActivityLog> logs = activityLogService.getAllLogs(pageable);
        return ResponseEntity.ok(Map.of("success", true, "data", logs));
    }

    // ── Login History for a specific user ────────────────────────────────────
    @GetMapping("/{id}/login-history")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'INSTITUTE_ADMIN')")
    public ResponseEntity<Map<String, Object>> getLoginHistory(
            @PathVariable UUID id,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<UserLoginHistory> history = loginHistoryRepo.findByUserIdOrderByCreatedAtDesc(id, pageable);
        return ResponseEntity.ok(Map.of("success", true, "data", history));
    }

    // ── Analytics: Monthly User Registrations ─────────────────────────────────
    @GetMapping("/analytics/monthly-registrations")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'INSTITUTE_ADMIN')")
    public ResponseEntity<Map<String, Object>> getMonthlyRegistrations() {
        List<Map<String, Object>> result = getMonthlyData();
        return ResponseEntity.ok(Map.of("success", true, "data", result));
    }

    // ── Analytics: Role Breakdown ─────────────────────────────────────────────
    @GetMapping("/analytics/role-breakdown")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'INSTITUTE_ADMIN')")
    public ResponseEntity<Map<String, Object>> getRoleBreakdown() {
        List<Map<String, Object>> data = List.of(
            Map.of("role", "STUDENT",          "count", userRepository.countByRoleName("STUDENT")),
            Map.of("role", "TEACHER",           "count", userRepository.countByRoleName("TEACHER")),
            Map.of("role", "INSTITUTE_ADMIN",   "count", userRepository.countByRoleName("INSTITUTE_ADMIN")),
            Map.of("role", "SUPER_ADMIN",       "count", userRepository.countByRoleName("SUPER_ADMIN"))
        );
        return ResponseEntity.ok(Map.of("success", true, "data", data));
    }

    // ── Import Users (CSV / Excel) ─────────────────────────────────────────────
    @PostMapping("/import")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'INSTITUTE_ADMIN')")
    public ResponseEntity<Map<String, Object>> importUsers(
            @RequestParam("file") MultipartFile file,
            @RequestParam(required = false, defaultValue = "STUDENT") String defaultRole,
            @RequestParam(required = false) String defaultInstituteId) {
        try {
            Map<String, Object> result = importService.importUsers(file, defaultRole, defaultInstituteId);
            return ResponseEntity.ok(Map.of("success", true, "data", result));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    // ── Download CSV Template ──────────────────────────────────────────────────
    @GetMapping("/import/template")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'INSTITUTE_ADMIN')")
    public ResponseEntity<byte[]> downloadImportTemplate() {
        byte[] template = importService.generateCsvTemplate();
        return ResponseEntity.ok()
            .header("Content-Disposition", "attachment; filename=\"user_import_template.csv\"")
            .header("Content-Type", "text/csv; charset=UTF-8")
            .body(template);
    }

    // ── Helper: get monthly user registration data ─────────────────────────────
    private List<Map<String, Object>> getMonthlyData() {
        List<Map<String, Object>> result = new ArrayList<>();
        LocalDateTime now = LocalDateTime.now();
        for (int i = 11; i >= 0; i--) {
            LocalDateTime start = now.minusMonths(i).withDayOfMonth(1).withHour(0).withMinute(0).withSecond(0).withNano(0);
            LocalDateTime end   = start.plusMonths(1);
            long count = userRepository.countNewUsersBetween(start, end);
            String label = start.getYear() + "-" + String.format("%02d", start.getMonthValue());
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("month", label);
            entry.put("count", count);
            result.add(entry);
        }
        return result;
    }
}
