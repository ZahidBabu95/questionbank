package com.testshaper.service.impl;

import com.testshaper.dto.PdfDownloadOptions;
import com.testshaper.entity.*;
import com.testshaper.repository.ExamRepository;
import com.testshaper.repository.QuestionOptionRepository;
import com.testshaper.security.TenantContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.xwpf.usermodel.*;
import org.jsoup.Jsoup;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class ExamWordService {

    private final ExamRepository examRepository;
    private final QuestionOptionRepository questionOptionRepository;

    private static final String BANGLA_FONT = "Kalpurush";

    @Transactional(readOnly = true)
    public byte[] generateWord(UUID examId, PdfDownloadOptions opts) {
        Exam exam = examRepository.findById(examId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Exam not found"));

        boolean isSuperAdmin = false;
        try {
            org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
            if (auth != null) {
                isSuperAdmin = auth.getAuthorities().stream()
                        .anyMatch(a -> a.getAuthority().equals("ROLE_SUPER_ADMIN") || a.getAuthority().equals("SUPER_ADMIN"));
            }
        } catch (Exception ignored) {}

        if (!isSuperAdmin && !exam.getTenantId().equals(TenantContext.getTenantId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }

        log.info("Generating Word doc for exam={} tenant={} options={}", examId, TenantContext.getTenantId(), opts);

        List<ExamQuestion> examQuestions = new ArrayList<>(exam.getExamQuestions());
        if (opts.isShuffleQuestions())
            Collections.shuffle(examQuestions, new Random());

        try {
            return buildDocx(exam, examQuestions, opts);
        } catch (Exception e) {
            log.error("Word generation failed for exam={}", examId, e);
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "Word generation failed: " + e.getMessage());
        }
    }

    private byte[] buildDocx(Exam exam, List<ExamQuestion> examQuestions, PdfDownloadOptions opts) throws Exception {
        try (XWPFDocument document = new XWPFDocument();
                ByteArrayOutputStream baos = new ByteArrayOutputStream()) {

            int fontSize = opts.getFontSize() > 0 ? (int) opts.getFontSize() : 11;

            // ── EXAM HEADER BLOCK ──────────────────────────────────────────────────
            renderHeader(document, exam);

            // ── STUDENT INFO BLOCK ─────────────────────────────────────────────────
            renderStudentInfo(document);

            // ── INSTRUCTIONS ───────────────────────────────────────────────────────
            if (exam.getInstructions() != null && !exam.getInstructions().isBlank()) {
                renderInstructions(document, exam.getInstructions(), fontSize);
            }

            // ── QUESTIONS ──────────────────────────────────────────────────────────
            Map<String, List<ExamQuestion>> grouped = groupBySection(examQuestions);
            int globalOrder = 1;

            for (Map.Entry<String, List<ExamQuestion>> entry : grouped.entrySet()) {
                String sectionName = entry.getKey();
                List<ExamQuestion> sectionQs = entry.getValue();

                renderSectionTitle(document, sectionName, fontSize + 1);

                for (ExamQuestion eq : sectionQs) {
                    Question q = eq.getQuestion();
                    boolean isAlternative = eq.getAlternativeToId() != null;
                    int displayOrder = isAlternative ? (globalOrder - 1) : globalOrder;

                    if (isAlternative) {
                        renderAlternativeSeparator(document, fontSize);
                    }

                    renderQuestion(document, q, eq.getMarks(), displayOrder, isAlternative, fontSize, opts);

                    if (!isAlternative) {
                        globalOrder++;
                    }
                }
            }

            // ── ANSWER KEY ─────────────────────────────────────────────────────────
            if (opts.isIncludeAnswerSheet()) {
                renderAnswerKey(document, examQuestions, fontSize, opts);
            }

            document.write(baos);
            return baos.toByteArray();
        }
    }

    private void renderHeader(XWPFDocument document, Exam exam) {
        // Institute Name
        if (exam.getInstituteName() != null && !exam.getInstituteName().isBlank()) {
            XWPFParagraph instPara = document.createParagraph();
            instPara.setAlignment(ParagraphAlignment.CENTER);
            XWPFRun instRun = instPara.createRun();
            instRun.setText(exam.getInstituteName());
            instRun.setBold(true);
            instRun.setFontSize(16);
            instRun.setFontFamily(BANGLA_FONT);
        }

        // Title
        XWPFParagraph titlePara = document.createParagraph();
        titlePara.setAlignment(ParagraphAlignment.CENTER);
        XWPFRun titleRun = titlePara.createRun();
        titleRun.setText(exam.getTitle());
        titleRun.setBold(true);
        titleRun.setFontSize(14);
        titleRun.setFontFamily(BANGLA_FONT);

        // Header Text
        if (exam.getHeaderText() != null && !exam.getHeaderText().isBlank()) {
            XWPFParagraph subPara = document.createParagraph();
            subPara.setAlignment(ParagraphAlignment.CENTER);
            XWPFRun subRun = subPara.createRun();
            subRun.setText(stripHtml(exam.getHeaderText()));
            subRun.setFontSize(11);
            subRun.setFontFamily(BANGLA_FONT);
        }

        // Meta Info (Subject, Class, Time, Marks)
        XWPFParagraph metaPara = document.createParagraph();
        metaPara.setAlignment(ParagraphAlignment.CENTER);
        XWPFRun metaRun = metaPara.createRun();

        String subjectName = exam.getClassSubject() != null && exam.getClassSubject().getSubject() != null
                ? exam.getClassSubject().getSubject().getName()
                : "—";
        String className = exam.getClassSubject() != null && exam.getClassSubject().getAcademicClass() != null
                ? exam.getClassSubject().getAcademicClass().getName()
                : "—";

        String timeText = formatDuration(exam.getDurationMinutes(), exam.getLanguage());
        String metaText = String.format("বিষয়: %s | শ্রেণি: %s | সময়: %s | পূর্ণমান: %s",
                subjectName, className, timeText, String.valueOf(exam.getTotalMarks().intValue()));
        metaRun.setText(metaText);
        metaRun.setBold(true);
        metaRun.setFontSize(11);
        metaRun.setFontFamily(BANGLA_FONT);

        XWPFParagraph datePara = document.createParagraph();
        datePara.setAlignment(ParagraphAlignment.RIGHT);
        XWPFRun dateRun = datePara.createRun();
        dateRun.setText("তারিখ: " + LocalDate.now().format(DateTimeFormatter.ofPattern("dd-MM-yyyy")));
        dateRun.setFontSize(10);
        dateRun.setFontFamily(BANGLA_FONT);

        addDivider(document);
    }

    private String toBengaliNumber(String numberStr) {
        if (numberStr == null) return "";
        StringBuilder sb = new StringBuilder();
        for (char c : numberStr.toCharArray()) {
            if (c >= '0' && c <= '9') {
                sb.append((char) (c - '0' + '০'));
            } else {
                sb.append(c);
            }
        }
        return sb.toString();
    }

    private String formatDuration(Integer minutes, String language) {
        if (minutes == null) return "";
        int mins = minutes;
        int hours = mins / 60;
        int remainingMins = mins % 60;
        boolean isEnglish = language != null && (language.equalsIgnoreCase("ENGLISH") || language.equalsIgnoreCase("English"));

        if (isEnglish) {
            if (hours > 0 && remainingMins > 0) {
                String hStr = hours == 1 ? "Hour" : "Hours";
                String mStr = remainingMins == 1 ? "Minute" : "Minutes";
                return String.format("%d %s %d %s", hours, hStr, remainingMins, mStr);
            } else if (hours > 0) {
                String hStr = hours == 1 ? "Hour" : "Hours";
                return String.format("%d %s", hours, hStr);
            } else {
                String mStr = remainingMins == 1 ? "Minute" : "Minutes";
                return String.format("%d %s", remainingMins, mStr);
            }
        } else {
            if (hours > 0 && remainingMins > 0) {
                return String.format("%s ঘণ্টা %s মিনিট", toBengaliNumber(String.valueOf(hours)), toBengaliNumber(String.valueOf(remainingMins)));
            } else if (hours > 0) {
                return String.format("%s ঘণ্টা", toBengaliNumber(String.valueOf(hours)));
            } else {
                return String.format("%s মিনিট", toBengaliNumber(String.valueOf(remainingMins)));
            }
        }
    }

    private void renderStudentInfo(XWPFDocument document) {
        XWPFParagraph p = document.createParagraph();
        XWPFRun r = p.createRun();
        r.setText("ছাত্র/ছাত্রীর নাম: ________________________   রোল: __________   রেজি নং: __________");
        r.setFontFamily(BANGLA_FONT);
        addDivider(document);
    }

    private void renderInstructions(XWPFDocument document, String instructions, int fontSize) {
        XWPFParagraph p = document.createParagraph();
        XWPFRun boldRun = p.createRun();
        boldRun.setText("নির্দেশনা:");
        boldRun.setBold(true);
        boldRun.setFontFamily(BANGLA_FONT);
        boldRun.setFontSize(fontSize);
        boldRun.addBreak();

        XWPFRun textRun = p.createRun();
        textRun.setText(stripHtml(instructions));
        textRun.setFontFamily(BANGLA_FONT);
        textRun.setFontSize(fontSize);
    }

    private void renderSectionTitle(XWPFDocument document, String title, int fontSize) {
        XWPFParagraph p = document.createParagraph();
        p.setSpacingBefore(200);
        XWPFRun r = p.createRun();
        r.setText(title);
        r.setBold(true);
        r.setFontSize(fontSize);
        r.setFontFamily(BANGLA_FONT);
    }

    private void renderQuestion(XWPFDocument document, Question q, Double marks, int order, boolean isAlternative, int fontSize,
            PdfDownloadOptions opts) {
        XWPFParagraph qPara = document.createParagraph();
        qPara.setSpacingBefore(100);

        if (isAlternative) {
            qPara.setIndentationLeft(400);

            XWPFRun textRun = qPara.createRun();
            textRun.setText(stripHtml(q.getQuestionText()));
            textRun.setFontSize(fontSize);
            textRun.setFontFamily(BANGLA_FONT);
        } else {
            XWPFRun numRun = qPara.createRun();
            numRun.setText(order + ". ");
            numRun.setBold(true);
            numRun.setFontSize(fontSize);

            XWPFRun textRun = qPara.createRun();
            textRun.setText(stripHtml(q.getQuestionText()));
            textRun.setFontSize(fontSize);
            textRun.setFontFamily(BANGLA_FONT);

            if (marks != null) {
                XWPFRun marksRun = qPara.createRun();
                marksRun.setText(" [" + formatMarks(marks) + "]");
                marksRun.setBold(true);
                marksRun.setFontSize(fontSize - 1);
                marksRun.setFontFamily(BANGLA_FONT);
            }
        }

        if (q.getStimulus() != null && !q.getStimulus().isBlank()) {
            XWPFParagraph stimPara = document.createParagraph();
            stimPara.setIndentationLeft(400);
            XWPFRun stimRun = stimPara.createRun();
            stimRun.setText(stripHtml(q.getStimulus()));
            stimRun.setItalic(true);
            stimRun.setFontSize(fontSize);
            stimRun.setFontFamily(BANGLA_FONT);
        }

        if (q.getType().equals(Question.QuestionType.MCQ.name())) {
            renderMcqOptions(document, q, fontSize, opts);
        } else if (q.getType().equals(Question.QuestionType.CQ.name())) {
            renderCqSubQuestions(document, q, fontSize, opts);
        }
    }

    private void renderMcqOptions(XWPFDocument document, Question q, int fontSize, PdfDownloadOptions opts) {
        List<QuestionOption> options = questionOptionRepository.findByQuestionIdOrderByOptionLabelAsc(q.getId());
        if (opts.isShuffleOptions())
            Collections.shuffle(options, new Random());

        if (options.isEmpty())
            return;

        boolean useTable = options.size() <= 4;

        if (useTable) {
            // Options side by side using a borderless table
            XWPFTable table = document.createTable(1, Math.min(options.size(), 4));
            table.removeBorders();
            XWPFTableRow row = table.getRow(0);

            for (int i = 0; i < Math.min(options.size(), 4); i++) {
                QuestionOption opt = options.get(i);
                XWPFTableCell cell = row.getCell(i);
                if (cell == null)
                    cell = row.createCell();
                XWPFParagraph p = cell.getParagraphArray(0);
                p.setSpacingAfter(0);
                XWPFRun r = p.createRun();
                r.setText(opt.getOptionLabel() + ") " + stripHtml(opt.getOptionText()));
                r.setFontSize(fontSize);
                r.setFontFamily(BANGLA_FONT);
                if (opts.isIncludeAnswers() && opt.isCorrect()) {
                    r.setBold(true);
                    r.setText(" \u2713"); // Checkmark
                }
            }
        } else {
            // Vertical list
            for (QuestionOption opt : options) {
                XWPFParagraph p = document.createParagraph();
                p.setIndentationLeft(400);
                p.setSpacingAfter(0);
                XWPFRun r = p.createRun();
                r.setText(opt.getOptionLabel() + ") " + stripHtml(opt.getOptionText()));
                r.setFontSize(fontSize);
                r.setFontFamily(BANGLA_FONT);
                if (opts.isIncludeAnswers() && opt.isCorrect()) {
                    r.setBold(true);
                    r.setText(" \u2713");
                }
            }
        }
    }

    private void renderCqSubQuestions(XWPFDocument document, Question q, int fontSize, PdfDownloadOptions opts) {
        String[] cqLabels = { "ক", "খ", "গ", "ঘ" };
        double[] cqMarks = { 1.0, 2.0, 3.0, 4.0 };
        List<QuestionOption> subQs = questionOptionRepository.findByQuestionIdOrderByOptionLabelAsc(q.getId());

        for (int i = 0; i < Math.min(subQs.size(), 4); i++) {
            QuestionOption sub = subQs.get(i);
            XWPFParagraph p = document.createParagraph();
            p.setIndentationLeft(400);
            p.setSpacingAfter(0);

            XWPFRun r = p.createRun();
            r.setText(cqLabels[i] + ") " + stripHtml(sub.getOptionText()));
            r.setFontSize(fontSize);
            r.setFontFamily(BANGLA_FONT);

            XWPFRun m = p.createRun();
            m.setText("  [" + (int) cqMarks[i] + "]");
            m.setFontSize(fontSize - 2);
        }
    }

    private void renderAnswerKey(XWPFDocument document, List<ExamQuestion> questions, int fontSize,
            PdfDownloadOptions opts) {
        // Page break
        XWPFParagraph pageBreak = document.createParagraph();
        pageBreak.setPageBreak(true);

        XWPFRun titleRun = pageBreak.createRun();
        titleRun.setText("উত্তর পত্র / Answer Key");
        titleRun.setBold(true);
        titleRun.setFontSize(fontSize + 2);
        titleRun.setFontFamily(BANGLA_FONT);
        addDivider(document);

        List<ExamQuestion> mcqQuestions = questions.stream()
                .filter(eq -> eq.getQuestion().getType().equals(Question.QuestionType.MCQ.name()))
                .toList();

        XWPFTable table = document.createTable();
        // table.removeBorders();

        int cols = 4;
        int rows = (int) Math.ceil((double) mcqQuestions.size() / cols);

        for (int r = 0; r < rows; r++) {
            XWPFTableRow row = r == 0 ? table.getRow(0) : table.createRow();
            for (int c = 0; c < cols; c++) {
                int idx = r + (c * rows);
                XWPFTableCell cell = c < row.getTableCells().size() ? row.getCell(c) : row.createCell();
                if (idx < mcqQuestions.size()) {
                    ExamQuestion eq = mcqQuestions.get(idx);
                    Optional<QuestionOption> correctOpt = questionOptionRepository
                            .findByQuestionIdOrderByOptionLabelAsc(eq.getQuestion().getId())
                            .stream().filter(QuestionOption::isCorrect).findFirst();

                    String ans = correctOpt.map(QuestionOption::getOptionLabel).orElse("?");
                    XWPFParagraph p = cell.getParagraphArray(0);
                    if (p == null)
                        p = cell.addParagraph();
                    XWPFRun run = p.createRun();
                    run.setText((idx + 1) + ". " + ans);
                    run.setFontSize(fontSize);
                }
            }
        }
    }

    private Map<String, List<ExamQuestion>> groupBySection(List<ExamQuestion> questions) {
        Map<String, List<ExamQuestion>> result = new LinkedHashMap<>();
        for (ExamQuestion eq : questions) {
            String sectionName = eq.getSection() != null
                    ? eq.getSection().getSectionName()
                    : getSectionByType(eq.getQuestion().getType());
            result.computeIfAbsent(sectionName, k -> new ArrayList<>()).add(eq);
        }
        return result;
    }

    private String getSectionByType(String type) {
        if ("MCQ".equals(type)) return "বিভাগ ক — বহুনির্বাচনি প্রশ্ন";
        if ("SHORT".equals(type)) return "বিভাগ খ — সংক্ষিপ্ত প্রশ্ন";
        if ("CQ".equals(type)) return "বিভাগ গ — সৃজনশীল প্রশ্ন";
        if ("TRUE_FALSE".equals(type)) return "বিভাগ ঘ — সত্য/মিথ্যা";
        return "অন্যান্য";
    }

    private void renderAlternativeSeparator(XWPFDocument document, int fontSize) {
        XWPFParagraph p = document.createParagraph();
        p.setAlignment(ParagraphAlignment.CENTER);
        p.setSpacingBefore(100);
        p.setSpacingAfter(50);
        
        XWPFRun r = p.createRun();
        r.setText("--- অথবা / OR ---");
        r.setBold(true);
        r.setFontSize(fontSize - 1);
        r.setFontFamily(BANGLA_FONT);
    }

    private void addDivider(XWPFDocument document) {
        XWPFParagraph dividerPara = document.createParagraph();
        dividerPara.setBorderBottom(Borders.SINGLE);
    }

    private String stripHtml(String html) {
        if (html == null)
            return "";
        return Jsoup.parse(html).text();
    }

    private String formatMarks(Double marks) {
        if (marks == null)
            return "?";
        return marks == Math.floor(marks) ? String.valueOf(marks.intValue()) : String.valueOf(marks);
    }
}
