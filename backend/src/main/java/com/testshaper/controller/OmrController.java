package com.testshaper.controller;

import com.testshaper.common.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/omr")
public class OmrController {

    @GetMapping("/active-exams")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'INSTITUTE_ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getActiveExams() {
        List<Map<String, Object>> activeExams = new ArrayList<>();
        
        Map<String, Object> exam1 = new HashMap<>();
        exam1.put("id", "exam-1");
        exam1.put("title", "পদার্থবিজ্ঞান অর্ধবার্ষিক মডেল টেস্ট - ২০২৬");
        exam1.put("subject", "Physics");
        exam1.put("className", "Class 10");
        activeExams.add(exam1);

        Map<String, Object> exam2 = new HashMap<>();
        exam2.put("id", "exam-2");
        exam2.put("title", "রসায়ন প্রথম পত্র সাপ্তাহিক পরীক্ষা - ২০২৬");
        exam2.put("subject", "Chemistry");
        exam2.put("className", "Class 11");
        activeExams.add(exam2);

        Map<String, Object> exam3 = new HashMap<>();
        exam3.put("id", "exam-3");
        exam3.put("title", "সাধারণ গণিত চ্যাপ্টার ২ টেস্ট");
        exam3.put("subject", "Math");
        exam3.put("className", "Class 9");
        activeExams.add(exam3);

        return ResponseEntity.ok(ApiResponse.success(activeExams, "Active exams for OMR fetched successfully"));
    }

    @PostMapping("/scan-single")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'INSTITUTE_ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> scanSingleSheet(
            @RequestParam("file") MultipartFile file,
            @RequestParam("examId") String examId) {
        
        // Mock parsing result matching the OpenCV scanner requirements
        Map<String, Object> result = new HashMap<>();
        result.put("success", true);
        result.put("studentId", "STU-982105");
        result.put("studentName", "তাহমিদ হাসান রনি");
        result.put("roll", "১০০২৫");
        result.put("className", "Class 10");
        result.put("score", "২৪/৩০");
        result.put("grade", "A");
        result.put("mcqCorrect", 24);
        result.put("mcqTotal", 30);
        result.put("fileName", file.getOriginalFilename());

        return ResponseEntity.ok(ApiResponse.success(result, "OMR sheet processed successfully by OpenCV"));
    }

    @GetMapping("/results/{examId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'INSTITUTE_ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getResultsByExam(@PathVariable String examId) {
        List<Map<String, Object>> results = new ArrayList<>();

        Map<String, Object> r1 = new HashMap<>();
        r1.put("id", "st-1");
        r1.put("name", "তাহমিদ হাসান রনি");
        r1.put("roll", "১০০২৫");
        r1.put("class", "Class 10");
        r1.put("mcqScore", 24);
        r1.put("cqScore", 42);
        r1.put("totalScore", 66);
        r1.put("status", "GRADED");
        results.add(r1);

        Map<String, Object> r2 = new HashMap<>();
        r2.put("id", "st-2");
        r2.put("name", "সাফওয়ান চৌধুরী");
        r2.put("roll", "১০০২৮");
        r2.put("class", "Class 10");
        r2.put("mcqScore", 28);
        r2.put("cqScore", 45);
        r2.put("totalScore", 73);
        r2.put("status", "GRADED");
        results.add(r2);

        Map<String, Object> r3 = new HashMap<>();
        r3.put("id", "st-3");
        r3.put("name", "নাসরিন সুলতানা মৌ");
        r3.put("roll", "১০০৩৪");
        r3.put("class", "Class 10");
        r3.put("mcqScore", 19);
        r3.put("cqScore", 35);
        r3.put("totalScore", 54);
        r3.put("status", "GRADED");
        results.add(r3);

        return ResponseEntity.ok(ApiResponse.success(results, "OMR results retrieved successfully"));
    }
}
