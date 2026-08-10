package com.testshaper.controller;

import com.testshaper.entity.*;
import com.testshaper.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class ExamResultController {

    private final ExamResultRepository examResultRepository;
    private final UserRepository userRepository;
    private final ExamRepository examRepository;

    private String getCurrentUserEmail() {
        if (SecurityContextHolder.getContext().getAuthentication() == null) {
            return "guest@testshaper.com";
        }
        String name = SecurityContextHolder.getContext().getAuthentication().getName();
        if (name == null || "anonymousUser".equalsIgnoreCase(name)) {
            return "guest@testshaper.com";
        }
        return name;
    }

    @GetMapping("/student/results")
    public ResponseEntity<List<Map<String, Object>>> getStudentResults() {
        String email = getCurrentUserEmail();
        List<ExamResult> results = examResultRepository.findByStudentUsername(email);
        List<Map<String, Object>> list = new ArrayList<>();
        for (ExamResult r : results) {
            Map<String, Object> map = new HashMap<>();
            map.put("id", r.getId());
            map.put("examId", r.getExam().getId());
            map.put("examTitle", r.getExam().getTitle());
            map.put("subjectName", r.getExam().getClassSubject() != null && r.getExam().getClassSubject().getSubject() != null 
                    ? r.getExam().getClassSubject().getSubject().getName() : "সাধারণ বিষয়");
            map.put("className", r.getExam().getClassSubject() != null && r.getExam().getClassSubject().getAcademicClass() != null 
                    ? r.getExam().getClassSubject().getAcademicClass().getName() : "সংযুক্ত নেই");
            map.put("score", r.getScore());
            map.put("totalMarks", r.getTotalMarks());
            map.put("submittedAt", r.getSubmittedAt());
            list.add(map);
        }
        return ResponseEntity.ok(list);
    }

    @GetMapping("/student/results/{id}")
    public ResponseEntity<Map<String, Object>> getStudentResultDetails(@PathVariable UUID id) {
        String email = getCurrentUserEmail();
        ExamResult r = examResultRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Result not found"));

        if (!"guest@testshaper.com".equalsIgnoreCase(email) && !r.getStudentUsername().equalsIgnoreCase(email)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied to this result");
        }

        Map<String, Object> map = new HashMap<>();
        map.put("id", r.getId());
        map.put("examId", r.getExam().getId());
        map.put("examTitle", r.getExam().getTitle());
        map.put("subjectName", r.getExam().getClassSubject() != null && r.getExam().getClassSubject().getSubject() != null 
                ? r.getExam().getClassSubject().getSubject().getName() : "সাধারণ বিষয়");
        map.put("className", r.getExam().getClassSubject() != null && r.getExam().getClassSubject().getAcademicClass() != null 
                ? r.getExam().getClassSubject().getAcademicClass().getName() : "সংযুক্ত নেই");
        map.put("score", r.getScore());
        map.put("totalMarks", r.getTotalMarks());
        map.put("submittedAt", r.getSubmittedAt());

        List<Map<String, Object>> answerList = new ArrayList<>();
        for (ExamResultAnswer era : r.getAnswers()) {
            Map<String, Object> am = new HashMap<>();
            Question q = era.getQuestion();
            am.put("questionId", q.getId());
            am.put("questionText", q.getQuestionText());
            am.put("stimulus", q.getStimulus());
            am.put("explanation", q.getExplanation());
            am.put("selectedOptionId", era.getSelectedOption());
            am.put("isCorrect", era.getCorrect());
            am.put("isSkipped", era.getSkipped());
            am.put("marksObtained", era.getMarksObtained());
            am.put("marks", q.getMarks());
            am.put("topicName", q.getTopic() != null ? q.getTopic().getName() : "সাধারণ টপিক");

            List<Map<String, Object>> optList = new ArrayList<>();
            UUID correctOptId = null;
            for (QuestionOption qo : q.getOptions()) {
                Map<String, Object> om = new HashMap<>();
                om.put("id", qo.getId());
                om.put("optionText", qo.getOptionText());
                om.put("optionLabel", qo.getOptionLabel());
                om.put("isCorrect", qo.isCorrect());
                if (qo.isCorrect()) {
                    correctOptId = qo.getId();
                }
                optList.add(om);
            }
            am.put("options", optList);
            am.put("correctOptionId", correctOptId != null ? correctOptId.toString() : null);
            answerList.add(am);
        }
        map.put("answers", answerList);

        return ResponseEntity.ok(map);
    }

    @GetMapping("/teacher/results/{id}")
    @PreAuthorize("hasAnyRole('TEACHER', 'INSTITUTE_ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<Map<String, Object>> getTeacherResultDetails(@PathVariable UUID id) {
        ExamResult r = examResultRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Result not found"));

        Map<String, Object> map = new HashMap<>();
        map.put("id", r.getId());
        map.put("studentEmail", r.getStudentUsername());
        map.put("examId", r.getExam().getId());
        map.put("examTitle", r.getExam().getTitle());
        map.put("subjectName", r.getExam().getClassSubject() != null && r.getExam().getClassSubject().getSubject() != null 
                ? r.getExam().getClassSubject().getSubject().getName() : "সাধারণ বিষয়");
        map.put("className", r.getExam().getClassSubject() != null && r.getExam().getClassSubject().getAcademicClass() != null 
                ? r.getExam().getClassSubject().getAcademicClass().getName() : "সংযুক্ত নেই");
        map.put("score", r.getScore());
        map.put("totalMarks", r.getTotalMarks());
        map.put("submittedAt", r.getSubmittedAt());

        // Get Student details
        Optional<User> studentOpt = userRepository.findByEmail(r.getStudentUsername());
        if (studentOpt.isPresent()) {
            User s = studentOpt.get();
            map.put("studentName", s.getName());
            map.put("studentRoll", s.getStudentRoll());
        }

        List<Map<String, Object>> answerList = new ArrayList<>();
        for (ExamResultAnswer era : r.getAnswers()) {
            Map<String, Object> am = new HashMap<>();
            Question q = era.getQuestion();
            am.put("questionId", q.getId());
            am.put("questionText", q.getQuestionText());
            am.put("stimulus", q.getStimulus());
            am.put("explanation", q.getExplanation());
            am.put("selectedOptionId", era.getSelectedOption());
            am.put("isCorrect", era.getCorrect());
            am.put("isSkipped", era.getSkipped());
            am.put("marksObtained", era.getMarksObtained());
            am.put("marks", q.getMarks());
            am.put("topicName", q.getTopic() != null ? q.getTopic().getName() : "সাধারণ টপিক");

            List<Map<String, Object>> optList = new ArrayList<>();
            UUID correctOptId = null;
            for (QuestionOption qo : q.getOptions()) {
                Map<String, Object> om = new HashMap<>();
                om.put("id", qo.getId());
                om.put("optionText", qo.getOptionText());
                om.put("optionLabel", qo.getOptionLabel());
                om.put("isCorrect", qo.isCorrect());
                if (qo.isCorrect()) {
                    correctOptId = qo.getId();
                }
                optList.add(om);
            }
            am.put("options", optList);
            am.put("correctOptionId", correctOptId != null ? correctOptId.toString() : null);
            answerList.add(am);
        }
        map.put("answers", answerList);

        return ResponseEntity.ok(map);
    }

    @GetMapping("/teacher/exams/{examId}/submissions")
    @PreAuthorize("hasAnyRole('TEACHER', 'INSTITUTE_ADMIN', 'SUPER_ADMIN')")
    @Transactional(readOnly = true)
    public ResponseEntity<Map<String, Object>> getExamSubmissions(@PathVariable UUID examId) {
        Exam exam = examRepository.findById(examId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Exam not found"));

        List<ExamResult> results = examResultRepository.findByExamId(examId);
        List<Map<String, Object>> submissionsList = new ArrayList<>();

        // Map to hold topic-wise correct/total counts per student
        // studentEmail -> Map<topicName, int[correctAnswers, totalQuestions]>
        Map<String, Map<String, int[]>> studentTopicScores = new HashMap<>();
        Map<String, String> studentNames = new HashMap<>();

        for (ExamResult r : results) {
            Map<String, Object> map = new HashMap<>();
            map.put("id", r.getId());
            map.put("studentEmail", r.getStudentUsername());
            map.put("score", r.getScore());
            map.put("totalMarks", r.getTotalMarks());
            map.put("submittedAt", r.getSubmittedAt());
            map.put("examTitle", exam.getTitle());
            map.put("subjectName", exam.getClassSubject() != null && exam.getClassSubject().getSubject() != null ? exam.getClassSubject().getSubject().getName() : "");

            // Get Student details (name, roll, class)
            String studentName = "Unknown Student";
            Optional<User> studentOpt = userRepository.findByEmail(r.getStudentUsername());
            if (studentOpt.isPresent()) {
                User s = studentOpt.get();
                studentName = s.getName();
                map.put("studentName", s.getName());
                map.put("studentRoll", s.getStudentRoll());
                map.put("className", s.getAcademicClass() != null ? s.getAcademicClass().getName() : "সংযুক্ত নেই");
            } else {
                map.put("studentName", "Unknown Student");
                map.put("studentRoll", "");
                map.put("className", "");
            }
            submissionsList.add(map);
            studentNames.put(r.getStudentUsername(), studentName);

            // Compute topic scores for this student
            Map<String, int[]> topicMap = studentTopicScores.computeIfAbsent(r.getStudentUsername(), k -> new HashMap<>());
            for (ExamResultAnswer era : r.getAnswers()) {
                Question q = era.getQuestion();
                if (q == null) continue;
                String tName = q.getTopic() != null ? q.getTopic().getName() : "সাধারণ টপিক";
                int[] score = topicMap.computeIfAbsent(tName, k -> new int[2]); // [correctCount, totalCount]
                score[1]++; // increment total questions
                if (Boolean.TRUE.equals(era.getCorrect())) {
                    score[0]++; // increment correct count
                }
            }
        }

        // Aggregate topic analytics
        // topicName -> Map<studentEmail, correctRate>
        Map<String, Map<String, Double>> topicCorrectRates = new HashMap<>();
        Map<String, Integer> topicQuestionCounts = new HashMap<>();
        Map<String, Double> topicTotalScoreSum = new HashMap<>();
        int totalStudents = results.size();

        for (Map.Entry<String, Map<String, int[]>> entry : studentTopicScores.entrySet()) {
            String email = entry.getKey();
            Map<String, int[]> topicMap = entry.getValue();
            for (Map.Entry<String, int[]> tEntry : topicMap.entrySet()) {
                String tName = tEntry.getKey();
                int[] score = tEntry.getValue();
                double rate = score[1] > 0 ? (double) score[0] / score[1] : 0.0;
                
                topicCorrectRates.computeIfAbsent(tName, k -> new HashMap<>()).put(email, rate);
                topicQuestionCounts.put(tName, score[1]); // all students have the same exam questions so count is constant
                topicTotalScoreSum.put(tName, topicTotalScoreSum.getOrDefault(tName, 0.0) + rate);
            }
        }

        List<Map<String, Object>> topicAnalytics = new ArrayList<>();
        for (String tName : topicCorrectRates.keySet()) {
            Map<String, Object> tAnalytics = new HashMap<>();
            tAnalytics.put("topicName", tName);
            tAnalytics.put("totalQuestions", topicQuestionCounts.get(tName));
            
            double sumRate = topicTotalScoreSum.getOrDefault(tName, 0.0);
            double avgRate = totalStudents > 0 ? (sumRate / totalStudents) * 100.0 : 0.0;
            tAnalytics.put("avgCorrectRate", Math.round(avgRate * 10.0) / 10.0); // e.g. 75.2

            // Sort students to find strong and weak
            Map<String, Double> studentRates = topicCorrectRates.get(tName);
            List<Map.Entry<String, Double>> sortedStudents = new ArrayList<>(studentRates.entrySet());
            
            // Strong: sort descending
            sortedStudents.sort((a, b) -> Double.compare(b.getValue(), a.getValue()));
            List<String> strongList = new ArrayList<>();
            for (int i = 0; i < Math.min(3, sortedStudents.size()); i++) {
                String email = sortedStudents.get(i).getKey();
                double pct = sortedStudents.get(i).getValue() * 100.0;
                strongList.add(studentNames.get(email) + " (" + Math.round(pct) + "%)");
            }
            tAnalytics.put("strongStudents", strongList);

            // Weak: sort ascending
            sortedStudents.sort((a, b) -> Double.compare(a.getValue(), b.getValue()));
            List<String> weakList = new ArrayList<>();
            for (int i = 0; i < Math.min(3, sortedStudents.size()); i++) {
                String email = sortedStudents.get(i).getKey();
                double pct = sortedStudents.get(i).getValue() * 100.0;
                weakList.add(studentNames.get(email) + " (" + Math.round(pct) + "%)");
            }
            tAnalytics.put("weakStudents", weakList);

            topicAnalytics.add(tAnalytics);
        }

        Map<String, Object> response = new HashMap<>();
        response.put("submissions", submissionsList);
        response.put("topicAnalytics", topicAnalytics);

        return ResponseEntity.ok(response);
    }
}
