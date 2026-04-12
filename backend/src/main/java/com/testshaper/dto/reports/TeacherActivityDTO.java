package com.testshaper.dto.reports;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeacherActivityDTO {
    private String teacherName;
    private long questionsCreated;
    private long examsGenerated;
    private long lecturesCreated;
    private LocalDateTime lastActive;
    private double activityScore;
}
