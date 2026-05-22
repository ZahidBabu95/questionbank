package com.testshaper.service.impl;

import com.opencsv.CSVReader;
import com.opencsv.CSVReaderBuilder;
import com.testshaper.entity.*;
import com.testshaper.repository.*;
import com.testshaper.security.TenantContext;
import com.testshaper.service.QuestionImportService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class QuestionImportServiceImpl implements QuestionImportService {

    private final QuestionRepository questionRepository;
    private final QuestionOptionRepository optionRepository;
    private final ClassSubjectRepository classSubjectRepository;
    private final ChapterRepository chapterRepository;
    private final TopicRepository topicRepository;

    @Override
    @Transactional
    public Map<String, Object> importQuestions(MultipartFile file, String type) {
        String fileName = file.getOriginalFilename();
        List<String[]> rows = new ArrayList<>();

        try {
            if (fileName != null && fileName.endsWith(".csv")) {
                rows = parseCsv(file);
            } else if (fileName != null && (fileName.endsWith(".xlsx") || fileName.endsWith(".xls"))) {
                rows = parseExcel(file);
            } else {
                throw new RuntimeException("Unsupported file format. Please upload .csv or .xlsx");
            }

            if (rows.isEmpty()) {
                throw new RuntimeException("The file is empty.");
            }

            // Remove header row
            rows.remove(0);
            int count = 0;

            for (String[] row : rows) {
                if (row.length < 2)
                    continue; // Skip empty rows

                try {
                    if ("MCQ".equalsIgnoreCase(type)) {
                        processMcqRow(row);
                    } else if ("CQ".equalsIgnoreCase(type)) {
                        processCqRow(row);
                    } else if ("SHORT".equalsIgnoreCase(type)) {
                        processShortRow(row);
                    }
                    count++;
                } catch (Exception e) {
                    log.error("Error processing row {}: {}", count + 2, e.getMessage());
                }
            }

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("count", count);
            return response;

        } catch (Exception e) {
            log.error("Import failed: ", e);
            throw new RuntimeException("Import failed: " + e.getMessage());
        }
    }

    private List<String[]> parseCsv(MultipartFile file) throws Exception {
        List<String[]> data = new ArrayList<>();
        // Using UTF-8 with BOM awareness if possible, but StandardCharsets.UTF_8 should
        // be fine
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))) {
            // Skip BOM if present manually or rely on Reader?
            // In many cases, StandardCharsets.UTF_8 doesn't skip BOM (EF BB BF).
            // Let's handle it manually just in case.
            reader.mark(1);
            if (reader.read() != 0xFEFF) {
                reader.reset();
            }

            CSVReader csvReader = new CSVReaderBuilder(reader).build();
            data = csvReader.readAll();
        }
        return data;
    }

    private List<String[]> parseExcel(MultipartFile file) throws Exception {
        List<String[]> data = new ArrayList<>();
        try (Workbook workbook = new XSSFWorkbook(file.getInputStream())) {
            Sheet sheet = workbook.getSheetAt(0);
            DataFormatter formatter = new DataFormatter();

            for (Row row : sheet) {
                int lastCellNum = row.getLastCellNum();
                String[] rowData = new String[lastCellNum];
                for (int i = 0; i < lastCellNum; i++) {
                    Cell cell = row.getCell(i);
                    rowData[i] = formatter.formatCellValue(cell);
                }
                data.add(rowData);
            }
        }
        return data;
    }

    private void processMcqRow(String[] row) {
        // Headers: Stimulus, Question Text, Option A, B, C, D, Correct, Class, Subject,
        // Chapter, Topic, Difficulty, Marks, Language, Explanation
        // Indices: 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14

        Question q = new Question();
        q.setType(Question.QuestionType.MCQ.name());
        q.setStimulus(getCol(row, 0));
        q.setQuestionText(getCol(row, 1));

        // Options
        List<QuestionOption> options = new ArrayList<>();
        String[] labels = { "A", "B", "C", "D" };
        String correct = getCol(row, 6);

        for (int i = 0; i < 4; i++) {
            String text = getCol(row, 2 + i);
            if (text != null && !text.isEmpty()) {
                QuestionOption opt = new QuestionOption();
                opt.setOptionLabel(labels[i]);
                opt.setOptionText(text);

                // Allow matching by label (e.g., "A", "b") OR by exact option text
                boolean isCorrect = labels[i].equalsIgnoreCase(correct) || text.trim().equalsIgnoreCase(correct.trim());
                opt.setCorrect(isCorrect);

                options.add(opt);
            }
        }

        resolveAcademicMetadata(q, row, 7, 8, 9, 10);

        q.setDifficulty(parseDifficulty(getCol(row, 11)));
        q.setMarks(parseMarks(getCol(row, 12), 1.0));
        q.setLanguage(getCol(row, 13, "Bangla"));
        q.setExplanation(getCol(row, 14));
        q.setStatus(Question.QuestionStatus.PENDING);

        Question savedQ = questionRepository.save(q);
        for (QuestionOption opt : options) {
            opt.setQuestion(savedQ);
            optionRepository.save(opt);
        }

        // Store correct answer text
        options.stream().filter(QuestionOption::isCorrect).findFirst()
                .ifPresent(opt -> {
                    savedQ.setCorrectAnswer(opt.getOptionText());
                    questionRepository.save(savedQ);
                });
    }

    private void processCqRow(String[] row) {
        // Headers: Stem, Ques A, B, C, D, Marks A, B, C, D, Class, Subject, Chapter,
        // Topic, Difficulty, Language
        // Indices: 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14

        Question q = new Question();
        q.setType(Question.QuestionType.CQ.name());
        q.setStimulus(getCol(row, 0));

        // For CQ, we combine questions into questionText for now or use a specific
        // format
        StringBuilder sb = new StringBuilder();
        sb.append("(ক) ").append(getCol(row, 1)).append("\n");
        sb.append("(খ) ").append(getCol(row, 2)).append("\n");
        sb.append("(গ) ").append(getCol(row, 3)).append("\n");
        sb.append("(ঘ) ").append(getCol(row, 4));
        q.setQuestionText(sb.toString());

        // Marks total
        double total = parseMarks(getCol(row, 5), 1) + parseMarks(getCol(row, 6), 2)
                + parseMarks(getCol(row, 7), 3) + parseMarks(getCol(row, 8), 4);
        q.setMarks(total);

        resolveAcademicMetadata(q, row, 9, 10, 11, 12);

        q.setDifficulty(parseDifficulty(getCol(row, 13)));
        q.setLanguage(getCol(row, 14, "Bangla"));
        q.setStatus(Question.QuestionStatus.PENDING);

        questionRepository.save(q);
    }

    private void processShortRow(String[] row) {
        // Headers: Stimulus, Ques, Ans, Class, Subject, Chapter, Topic, Difficulty,
        // Marks, Language, Explanation
        // Indices: 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10

        Question q = new Question();
        q.setType(Question.QuestionType.SHORT.name());
        q.setStimulus(getCol(row, 0));
        q.setQuestionText(getCol(row, 1));
        q.setExplanation("Answer: " + getCol(row, 2) + "\n" + getCol(row, 10));

        resolveAcademicMetadata(q, row, 3, 4, 5, 6);

        q.setDifficulty(parseDifficulty(getCol(row, 7)));
        q.setMarks(parseMarks(getCol(row, 8), 1.0));
        q.setLanguage(getCol(row, 9, "Bangla"));
        q.setStatus(Question.QuestionStatus.PENDING);

        questionRepository.save(q);
    }

    private final AcademicClassRepository academicClassRepository;
    private final SubjectRepository subjectRepository;
    private final AcademicSessionRepository sessionRepository; // Auto-injected via @RequiredArgsConstructor

    private void resolveAcademicMetadata(Question q, String[] row, int clsIdx, int subIdx, int chalIdx, int topicIdx) {
        String tenantId = TenantContext.getTenantId();
        String className = getCol(row, clsIdx);
        String subjectName = getCol(row, subIdx);
        String chapterName = getCol(row, chalIdx);
        String topicName = getCol(row, topicIdx);

        if (className != null && !className.isEmpty() && subjectName != null && !subjectName.isEmpty()) {

            // Find Active Session
            AcademicSession session = sessionRepository.findByIsActiveTrue()
                    .orElseThrow(() -> new RuntimeException("No active academic session found for import"));

            // 1. Create or Find Academic Class
            AcademicClass academicClass = academicClassRepository.findByTenantIdAndNameIgnoreCase(tenantId, className)
                    .orElseGet(() -> {
                        AcademicClass newClass = new AcademicClass();
                        newClass.setName(className);
                        newClass.setTenantId(tenantId);
                        newClass.setOrder(99);
                        return academicClassRepository.save(newClass);
                    });

            // 2. Create or Find Subject
            Subject subject = subjectRepository.findByTenantIdAndNameIgnoreCase(tenantId, subjectName)
                    .orElseGet(() -> {
                        Subject newSubject = new Subject();
                        newSubject.setName(subjectName);
                        // Make unique code using subject name & some random string
                        newSubject.setCode((subjectName.length() >= 3 ? subjectName.substring(0, 3).toUpperCase()
                                : subjectName.toUpperCase()) + "-" + UUID.randomUUID().toString().substring(0, 4));
                        newSubject.setTenantId(tenantId);
                        return subjectRepository.save(newSubject);
                    });

            // 3. Create or Find ClassSubject Mapping
            ClassSubject classSubject = classSubjectRepository
                    .findByAcademicClassAndSubjectAndSession(academicClass, subject, session)
                    .orElseGet(() -> {
                        ClassSubject newCs = new ClassSubject();
                        newCs.setAcademicClass(academicClass);
                        newCs.setSubject(subject);
                        newCs.setSession(session);
                        newCs.setTenantId(tenantId);
                        newCs.setActive(true);
                        return classSubjectRepository.save(newCs);
                    });

            q.setClassSubject(classSubject);

            // Handle Chapters
            if (chapterName != null && !chapterName.isEmpty()) {
                Chapter chapter = chapterRepository.findByTenantIdAndNameIgnoreCase(tenantId, chapterName)
                        .orElseGet(() -> {
                            Chapter newChap = new Chapter();
                            newChap.setName(chapterName);
                            newChap.setClassSubject(classSubject);
                            newChap.setTenantId(tenantId);
                            newChap.setIsActive(true);
                            return chapterRepository.save(newChap);
                        });
                q.setChapter(chapter);

                // Handle Topics
                if (topicName != null && !topicName.isEmpty()) {
                    Topic topic = topicRepository.findByTenantIdAndNameIgnoreCase(tenantId, topicName)
                            .orElseGet(() -> {
                                Topic newTopic = new Topic();
                                newTopic.setName(topicName);
                                newTopic.setChapter(chapter);
                                newTopic.setTenantId(tenantId);
                                return topicRepository.save(newTopic);
                            });
                    q.setTopic(topic);
                }
            }
        }
    }

    private String getCol(String[] row, int idx) {
        return (idx < row.length) ? row[idx].trim() : "";
    }

    private String getCol(String[] row, int idx, String fallback) {
        String val = getCol(row, idx);
        return (val == null || val.isEmpty()) ? fallback : val;
    }

    private Question.DifficultyLevel parseDifficulty(String diff) {
        try {
            return Question.DifficultyLevel.valueOf(diff.toUpperCase());
        } catch (Exception e) {
            return Question.DifficultyLevel.MEDIUM;
        }
    }

    private Double parseMarks(String marks, double fallback) {
        try {
            return Double.parseDouble(marks);
        } catch (Exception e) {
            return fallback;
        }
    }
}
