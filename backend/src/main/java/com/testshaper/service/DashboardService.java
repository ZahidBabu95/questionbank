package com.testshaper.service;

import com.testshaper.dto.DashboardStatsDTO;

public interface DashboardService {
    DashboardStatsDTO getAdminDashboardStats();

    DashboardStatsDTO getInstituteDashboardStats();

    DashboardStatsDTO getTeacherDashboardStats();

    DashboardStatsDTO getStudentDashboardStats();
}
