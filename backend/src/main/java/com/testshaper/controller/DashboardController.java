package com.testshaper.controller;

import com.testshaper.dto.DashboardStatsDTO;
import com.testshaper.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/admin-stats")
    public ResponseEntity<DashboardStatsDTO> getAdminStats() {
        return ResponseEntity.ok(dashboardService.getAdminDashboardStats());
    }

    @GetMapping("/institute-stats")
    public ResponseEntity<DashboardStatsDTO> getInstituteStats() {
        return ResponseEntity.ok(dashboardService.getInstituteDashboardStats());
    }

    @GetMapping("/teacher-stats")
    public ResponseEntity<DashboardStatsDTO> getTeacherStats() {
        return ResponseEntity.ok(dashboardService.getTeacherDashboardStats());
    }

    @GetMapping("/student-stats")
    public ResponseEntity<DashboardStatsDTO> getStudentStats() {
        return ResponseEntity.ok(dashboardService.getStudentDashboardStats());
    }
}
