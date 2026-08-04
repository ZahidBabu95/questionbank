package com.testshaper.controller;

import com.testshaper.common.ApiResponse;
import com.testshaper.entity.Exam;
import com.testshaper.entity.ExamQuestion;
import com.testshaper.entity.Question;
import com.testshaper.entity.QuestionOption;
import com.testshaper.repository.ExamRepository;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.security.SecureRandom;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequiredArgsConstructor
public class PublicExamShareController {

    private final ExamRepository examRepository;
    private static final String CHARACTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final SecureRandom random = new SecureRandom();

    /**
     * Generate a clean, unique 6-character share code (e.g. EX-849201 or EX-K9P2M)
     */
    private String generateUniqueShareCode() {
        String code;
        do {
            StringBuilder sb = new StringBuilder("EX-");
            for (int i = 0; i < 6; i++) {
                sb.append(CHARACTERS.charAt(random.nextInt(CHARACTERS.length())));
            }
            code = sb.toString();
        } while (examRepository.existsByShareCode(code));
        return code;
    }

    @org.springframework.beans.factory.annotation.Value("${testshaper.mobile.app-secret-key:QS-MOBILE-SEC-849201}")
    private String appSecretKey;

    /**
     * Public Mobile API Endpoint (Requires X-APP-SECRET-KEY header)
     * Mobile Apps can fetch full exam paper data by passing the shareCode and valid header
     */
    @GetMapping("/api/v1/public/exams/share/{shareCode}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getExamForMobileApp(
            @PathVariable String shareCode,
            @RequestHeader(value = "X-APP-SECRET-KEY", required = false) String requestSecretKey) {
        
        // Validate Global Mobile App Secret Key
        if (requestSecretKey == null || !requestSecretKey.trim().equals(appSecretKey)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid or missing X-APP-SECRET-KEY header. Access Denied.");
        }

        String cleanCode = shareCode.trim().toUpperCase();
        
        Exam exam = examRepository.findByShareCode(cleanCode)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Exam not found with code: " + shareCode));

        if (exam.isDeleted()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Exam has been deleted");
        }

        // Must be public shared or published
        if (!exam.isPublicShared() && exam.getStatus() == Exam.ExamStatus.DRAFT) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Exam is in Draft mode and not enabled for mobile sharing");
        }

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("examId", exam.getId());
        data.put("shareCode", exam.getShareCode());
        data.put("title", exam.getTitle());
        data.put("examType", exam.getExamType() != null ? exam.getExamType().name() : "CLASS_TEST");
        data.put("durationMinutes", exam.getDurationMinutes());
        data.put("totalMarks", exam.getTotalMarks());
        data.put("totalQuestions", exam.getTotalQuestions());
        data.put("language", exam.getLanguage());
        data.put("instructions", exam.getInstructions());
        data.put("instituteName", exam.getInstituteName());

        if (exam.getClassSubject() != null) {
            if (exam.getClassSubject().getAcademicClass() != null) {
                data.put("className", exam.getClassSubject().getAcademicClass().getName());
            }
            if (exam.getClassSubject().getSubject() != null) {
                data.put("subjectName", exam.getClassSubject().getSubject().getName());
            }
        }

        // Build mobile question paper
        List<Map<String, Object>> questionsList = new ArrayList<>();
        if (exam.getExamQuestions() != null) {
            for (ExamQuestion eq : exam.getExamQuestions()) {
                Question q = eq.getQuestion();
                if (q == null) continue;

                Map<String, Object> qMap = new LinkedHashMap<>();
                qMap.put("questionId", q.getId());
                qMap.put("questionOrder", eq.getQuestionOrder());
                qMap.put("marks", eq.getMarks() != null ? eq.getMarks() : q.getMarks());
                qMap.put("questionText", q.getQuestionText());
                qMap.put("questionType", q.getType() != null ? q.getType() : "MCQ");
                qMap.put("explanation", q.getExplanation());
                qMap.put("stimulus", q.getStimulus());

                // MCQ Options
                if (q.getOptions() != null && !q.getOptions().isEmpty()) {
                    List<Map<String, Object>> optionsList = new ArrayList<>();
                    for (QuestionOption opt : q.getOptions()) {
                        Map<String, Object> optMap = new LinkedHashMap<>();
                        optMap.put("optionId", opt.getId());
                        optMap.put("optionText", opt.getOptionText());
                        optMap.put("optionLetter", opt.getOptionLabel());
                        optMap.put("isCorrect", opt.isCorrect());
                        optionsList.add(optMap);
                    }
                    qMap.put("options", optionsList);
                }

                questionsList.add(qMap);
            }
        }
        data.put("questions", questionsList);

        return ResponseEntity.ok(ApiResponse.success(data, "Exam details retrieved successfully for mobile app"));
    }

    /**
     * Admin Endpoint to toggle mobile sharing & generate/get shareCode
     */
    @PostMapping("/api/v1/exams/generate/{id}/mobile-share")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'INSTITUTE_ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> toggleMobileShare(
            @PathVariable UUID id,
            @RequestBody(required = false) Map<String, Object> body) {
        
        Exam exam = examRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Exam not found"));

        if (exam.getShareCode() == null || exam.getShareCode().isBlank()) {
            exam.setShareCode(generateUniqueShareCode());
        }

        if (body != null && body.containsKey("isPublicShared")) {
            boolean enabled = Boolean.TRUE.equals(body.get("isPublicShared"));
            exam.setPublicShared(enabled);
        } else {
            // Toggle by default
            exam.setPublicShared(!exam.isPublicShared());
        }

        examRepository.save(exam);

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("examId", exam.getId());
        res.put("shareCode", exam.getShareCode());
        res.put("isPublicShared", exam.isPublicShared());
        res.put("mobileApiUrl", "/api/v1/public/exams/share/" + exam.getShareCode());
        res.put("headerName", "X-APP-SECRET-KEY");
        res.put("appSecretKey", appSecretKey);

        return ResponseEntity.ok(ApiResponse.success(res, "Mobile share settings updated successfully"));
    }
}
