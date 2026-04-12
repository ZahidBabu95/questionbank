package com.testshaper.dto;

import lombok.Builder;
import lombok.Data;
import java.util.List;
import java.time.LocalDateTime;

@Data
@Builder
public class DashboardStatsDTO {

    private long totalUsers;
    private double userTrend;

    private long activeInstitutes;
    private double instituteTrend;

    private long totalQuestions;
    private double questionTrend;

    private long examsConducted;
    private double examTrend;

    private List<QuestionTypeStat> questionTypes;
    private List<ActivityStat> activityAnalytics;
    private List<RecentActivity> recentActivities;

    @Data
    @Builder
    public static class QuestionTypeStat {
        private String name;
        private long value;
        private String color;
    }

    @Data
    @Builder
    public static class ActivityStat {
        private String name;
        private long questions;
        private long exams;
    }

    @Data
    @Builder
    public static class RecentActivity {
        private String id;
        private String user;
        private String avatar;
        private String action;
        private String status;
        private LocalDateTime time;
    }
}
