package com.testshaper.controller;

import com.testshaper.dto.ExamDTO;
import com.testshaper.entity.Exam;
import com.testshaper.entity.User;
import com.testshaper.entity.ExamResult;
import com.testshaper.entity.ExamResultAnswer;
import com.testshaper.entity.Question;
import com.testshaper.repository.ExamRepository;
import com.testshaper.repository.UserRepository;
import com.testshaper.repository.ExamResultRepository;
import com.testshaper.service.impl.ExamGenerationServiceImpl;
import jakarta.persistence.EntityManager;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/v1/student/exams")
@RequiredArgsConstructor
public class StudentExamController {

    private final ExamRepository examRepository;
    private final UserRepository userRepository;
    private final ExamResultRepository examResultRepository;
    private final ExamGenerationServiceImpl examGenerationService;
    private final EntityManager entityManager;

    private User getCurrentStudent() {
        String currentEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(currentEmail)
                .orElseGet(() -> {
                    User u = new User();
                    u.setEmail(currentEmail != null ? currentEmail : "guest@testshaper.com");
                    return u;
                });
    }

    @GetMapping("/assigned")
    public ResponseEntity<List<ExamDTO>> getAssignedExams() {
        User student = getCurrentStudent();
        if (student.getAcademicClass() == null) {
            return ResponseEntity.ok(Collections.emptyList());
        }

        List<Exam> exams = examRepository.findActiveExamsByClassId(student.getAcademicClass().getId());
        List<ExamDTO> dtos = new ArrayList<>();
        for (Exam exam : exams) {
            ExamDTO dto = examGenerationService.getExam(exam.getId());
            dtos.add(cleanExamForStudent(dto));
        }
        return ResponseEntity.ok(dtos);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ExamDTO> getExamForStudent(@PathVariable UUID id) {
        User user = getCurrentStudent();
        Exam exam = examRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Exam not found"));

        if (exam.getStatus() == Exam.ExamStatus.DRAFT) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Exam is in Draft status and not active");
        }

        ExamDTO dto = examGenerationService.getExam(id);
        return ResponseEntity.ok(cleanExamForStudent(dto));
    }

    @PostMapping("/{id}/submit")
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<Map<String, Object>> submitExam(
            @PathVariable UUID id,
            @RequestBody StudentSubmissionRequest submission) {
        User student = getCurrentStudent();
        Exam exam = examRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Exam not found"));

        if (exam.getStatus() == Exam.ExamStatus.DRAFT) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Exam is in Draft status and not active");
        }

        // Fetch detailed exam DTO with answers for grading
        ExamDTO detailedExam = examGenerationService.getExam(id);

        double obtainedMarks = 0.0;
        double totalExamMarks = exam.getTotalMarks();

        ExamResult examResult = new ExamResult();
        examResult.setExam(exam);
        examResult.setStudentUsername(student.getEmail());
        examResult.setSubmittedAt(LocalDateTime.now());
        examResult.setTenantId(exam.getTenantId());

        List<ExamResultAnswer> resultAnswers = new ArrayList<>();

        Map<UUID, ExamDTO.ExamQuestionDTO> questionMap = new HashMap<>();
        if (detailedExam.getQuestions() != null) {
            for (ExamDTO.ExamQuestionDTO eq : detailedExam.getQuestions()) {
                if (eq.getOriginalQuestionId() != null) {
                    questionMap.put(eq.getOriginalQuestionId(), eq);
                } else {
                    questionMap.put(eq.getId(), eq);
                }
            }
        }

        if (submission.getAnswers() != null) {
            for (Map.Entry<String, String> entry : submission.getAnswers().entrySet()) {
                UUID qId = UUID.fromString(entry.getKey());
                String selectedOptIdStr = entry.getValue();

                ExamDTO.ExamQuestionDTO eq = questionMap.get(qId);
                if (eq == null) continue;

                ExamResultAnswer era = new ExamResultAnswer();
                era.setExamResult(examResult);
                
                Question qProxy = entityManager.getReference(Question.class, qId);
                era.setQuestion(qProxy);

                if (selectedOptIdStr == null || selectedOptIdStr.isBlank()) {
                    era.setSkipped(true);
                    era.setCorrect(false);
                    era.setMarksObtained(0.0);
                } else {
                    era.setSkipped(false);
                    era.setSelectedOption(selectedOptIdStr);

                    boolean isCorrect = false;
                    if (eq.getOptions() != null) {
                        for (ExamDTO.OptionDTO opt : eq.getOptions()) {
                            if (opt.getId().toString().equals(selectedOptIdStr)) {
                                isCorrect = opt.isCorrect();
                                break;
                            }
                        }
                    }
                    era.setCorrect(isCorrect);
                    double marks = eq.getMarks() != null ? eq.getMarks() : 1.0;
                    if (isCorrect) {
                        era.setMarksObtained(marks);
                        obtainedMarks += marks;
                    } else {
                        era.setMarksObtained(0.0);
                    }
                }
                resultAnswers.add(era);
            }
        }

        examResult.setScore(obtainedMarks);
        examResult.setTotalMarks(totalExamMarks);
        examResult.setAnswers(resultAnswers);

        examResultRepository.save(examResult);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "score", obtainedMarks,
                "totalMarks", totalExamMarks,
                "submittedAt", examResult.getSubmittedAt()
        ));
    }

    private ExamDTO cleanExamForStudent(ExamDTO dto) {
        if (dto == null) return null;
        if (dto.getQuestions() != null) {
            for (ExamDTO.ExamQuestionDTO q : dto.getQuestions()) {
                q.setCorrectAnswer(null);
                q.setExplanation(null);
                if (q.getOptions() != null) {
                    for (ExamDTO.OptionDTO o : q.getOptions()) {
                        o.setCorrect(false);
                    }
                }
            }
        }
        return dto;
    }

    @Data
    public static class StudentSubmissionRequest {
        private Map<String, String> answers;
    }
}
