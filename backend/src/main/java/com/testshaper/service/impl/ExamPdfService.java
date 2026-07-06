package com.testshaper.service.impl;

import com.lowagie.text.*;
import com.lowagie.text.Font;
import com.lowagie.text.Rectangle;
import com.lowagie.text.pdf.*;
import com.lowagie.text.pdf.draw.LineSeparator;
import com.testshaper.dto.PdfDownloadOptions;
import com.testshaper.entity.*;
import com.testshaper.repository.ExamRepository;
import com.testshaper.repository.QuestionOptionRepository;
import com.testshaper.security.TenantContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.jsoup.Jsoup;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class ExamPdfService {

    private final ExamRepository examRepository;
    private final QuestionOptionRepository questionOptionRepository;

    // ── Font sizes ─────────────────────────────────────────────────────────────
    private static final float HEADER_FONT_SIZE = 16f;
    private static final float TITLE_FONT_SIZE = 14f;
    private static final float SECTION_FONT_SIZE = 12f;
    private static final float BODY_FONT_SIZE = 11f;
    private static final float SMALL_FONT_SIZE = 9f;

    // ── Colors ─────────────────────────────────────────────────────────────────
    private static final Color DARK = new Color(15, 23, 42);
    private static final Color ACCENT = new Color(37, 99, 235);
    private static final Color LIGHT_GRAY = new Color(241, 245, 249);
    private static final Color MID_GRAY = new Color(148, 163, 184);
    private static final Color SECTION_BG = new Color(219, 234, 254);

    // ═══════════════════════════════════════════════════════════════════════════
    // PUBLIC ENTRY POINT
    // ═══════════════════════════════════════════════════════════════════════════
    @Transactional(readOnly = true)
    public byte[] generatePdf(UUID examId, PdfDownloadOptions opts) {
        // 1. Load exam
        Exam exam = examRepository.findById(examId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Exam not found"));

        // 2. Tenant isolation
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

        log.info("Generating PDF for exam={} tenant={} options={}", examId, TenantContext.getTenantId(), opts);

        // 3. Get ordered questions
        List<ExamQuestion> examQuestions = new ArrayList<>(exam.getExamQuestions());
        if (opts.isShuffleQuestions())
            Collections.shuffle(examQuestions, new Random());

        // 4. Build PDF
        try {
            return buildPdf(exam, examQuestions, opts);
        } catch (Exception e) {
            log.error("PDF generation failed for exam={}", examId, e);
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "PDF generation failed: " + e.getMessage());
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // CORE PDF BUILDER
    // ═══════════════════════════════════════════════════════════════════════════
    private byte[] buildPdf(Exam exam, List<ExamQuestion> examQuestions, PdfDownloadOptions opts) throws Exception {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();

        // Page size
        Rectangle pageSize = "LETTER".equalsIgnoreCase(opts.getPaperSize())
                ? PageSize.LETTER
                : PageSize.A4;

        Document doc = new Document(pageSize, 50, 50, 60, 50);
        PdfWriter writer = PdfWriter.getInstance(doc, baos);

        // Load fonts
        BaseFont baseFont = loadFont();

        // Header / Footer renderer
        writer.setPageEvent(new ExamHeaderFooter(exam, opts, baseFont));

        doc.open();

        Font titleFont = new Font(baseFont, HEADER_FONT_SIZE, Font.BOLD, DARK);
        Font sectionFont = new Font(baseFont, SECTION_FONT_SIZE, Font.BOLD, ACCENT);
        Font bodyFont = new Font(baseFont, opts.getFontSize() > 0 ? opts.getFontSize() : BODY_FONT_SIZE, Font.NORMAL,
                DARK);
        Font boldFont = new Font(baseFont, opts.getFontSize() > 0 ? opts.getFontSize() : BODY_FONT_SIZE, Font.BOLD,
                DARK);
        Font smallFont = new Font(baseFont, SMALL_FONT_SIZE, Font.NORMAL, MID_GRAY);
        Font optionFont = new Font(baseFont, opts.getFontSize() > 0 ? opts.getFontSize() : BODY_FONT_SIZE, Font.NORMAL,
                DARK);
        Font answerFont = new Font(baseFont, SMALL_FONT_SIZE, Font.BOLD, new Color(5, 150, 105));

        // ── EXAM HEADER BLOCK ──────────────────────────────────────────────────
        renderExamHeader(doc, exam, titleFont, bodyFont, smallFont, baseFont);

        // ── Student Info Block ─────────────────────────────────────────────────
        renderStudentInfoBlock(doc, baseFont, bodyFont, smallFont);

        // ── Instructions ───────────────────────────────────────────────────────
        if (exam.getInstructions() != null && !exam.getInstructions().isBlank()) {
            renderInstructions(doc, exam.getInstructions(), bodyFont, boldFont, baseFont);
        }

        doc.add(new Paragraph(" "));

        // ── Watermark ──────────────────────────────────────────────────────────
        if (opts.isIncludeWatermark()) {
            addWatermark(writer, exam.getTitle(), baseFont);
        }

        // ── Questions — grouped by section ─────────────────────────────────────
        Map<String, List<ExamQuestion>> grouped = groupBySection(examQuestions);
        int globalOrder = 1;

        for (Map.Entry<String, List<ExamQuestion>> entry : grouped.entrySet()) {
            String sectionName = entry.getKey();
            List<ExamQuestion> sectionQs = entry.getValue();

            // Section header
            renderSectionHeader(doc, sectionName, sectionFont, baseFont);

            for (ExamQuestion eq : sectionQs) {
                Question q = eq.getQuestion();
                boolean isAlternative = eq.getAlternativeToId() != null;
                int displayOrder = isAlternative ? (globalOrder - 1) : globalOrder;
                
                if (isAlternative) {
                    renderAlternativeSeparator(doc, boldFont, baseFont);
                }
                
                renderQuestion(doc, q, eq.getMarks(), displayOrder, isAlternative, bodyFont, boldFont, optionFont, answerFont,
                        smallFont, opts);
                
                if (!isAlternative) {
                    globalOrder++;
                }
            }
        }

        // ── Answer Sheet (if enabled) ──────────────────────────────────────────
        if (opts.isIncludeAnswerSheet()) {
            doc.newPage();
            renderAnswerSheet(doc, examQuestions, baseFont, boldFont, bodyFont, smallFont, sectionFont, opts);
        }

        doc.close();
        log.info("PDF generated: {} bytes for exam={}", baos.size(), exam.getId());
        return baos.toByteArray();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // HEADER BLOCK
    // ═══════════════════════════════════════════════════════════════════════════
    private void renderExamHeader(Document doc, Exam exam, Font titleFont, Font bodyFont, Font smallFont, BaseFont bf)
            throws DocumentException {
        // Thick top rule
        LineSeparator rule = new LineSeparator(2f, 100f, ACCENT, Element.ALIGN_CENTER, -5f);
        doc.add(rule);
        doc.add(new Paragraph(" "));

        // Institute name
        if (exam.getInstituteName() != null && !exam.getInstituteName().isBlank()) {
            Paragraph inst = new Paragraph(exam.getInstituteName(),
                    new Font(bf, HEADER_FONT_SIZE + 2, Font.BOLD, DARK));
            inst.setAlignment(Element.ALIGN_CENTER);
            doc.add(inst);
        }

        // Exam Title
        Paragraph title = new Paragraph(exam.getTitle(), titleFont);
        title.setAlignment(Element.ALIGN_CENTER);
        title.setSpacingBefore(4);
        doc.add(title);

        // Header text (if any)
        if (exam.getHeaderText() != null && !exam.getHeaderText().isBlank()) {
            Paragraph sub = new Paragraph(stripHtml(exam.getHeaderText()), bodyFont);
            sub.setAlignment(Element.ALIGN_CENTER);
            sub.setSpacingBefore(3);
            doc.add(sub);
        }

        doc.add(new Paragraph(" "));

        // Metadata table — Subject | Class | Time | Total Marks | Date
        PdfPTable meta = new PdfPTable(5);
        meta.setWidthPercentage(100);
        meta.setWidths(new float[] { 2.5f, 2f, 1.5f, 1.5f, 1.8f });

        String subjectName = exam.getClassSubject() != null && exam.getClassSubject().getSubject() != null
                ? exam.getClassSubject().getSubject().getName()
                : "—";
        String className = exam.getClassSubject() != null && exam.getClassSubject().getAcademicClass() != null
                ? exam.getClassSubject().getAcademicClass().getName()
                : "—";

        addMetaCell(meta, "বিষয়/Subject", subjectName, bf);
        addMetaCell(meta, "শ্রেণী/Class", className, bf);
        addMetaCell(meta, "সময়/Time", formatDuration(exam.getDurationMinutes(), exam.getLanguage()), bf);
        addMetaCell(meta, "মোট নম্বর/Marks", String.valueOf(exam.getTotalMarks().intValue()), bf);
        addMetaCell(meta, "তারিখ/Date", LocalDate.now().format(DateTimeFormatter.ofPattern("dd-MM-yyyy")), bf);
        doc.add(meta);

        // Bottom rule
        doc.add(new Paragraph(" "));
        doc.add(new LineSeparator(1f, 100f, DARK, Element.ALIGN_CENTER, -3f));
        doc.add(new Paragraph(" "));
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

    private void addMetaCell(PdfPTable table, String label, String value, BaseFont bf) {
        PdfPCell cell = new PdfPCell();
        cell.setBorder(PdfPCell.BOX);
        cell.setBorderColor(new Color(203, 213, 225));
        cell.setBackgroundColor(LIGHT_GRAY);
        cell.setPadding(6);

        Paragraph p = new Paragraph();
        p.add(new Chunk(label + "\n", new Font(bf, 8, Font.NORMAL, MID_GRAY)));
        p.add(new Chunk(value, new Font(bf, 10, Font.BOLD, DARK)));
        cell.addElement(p);
        table.addCell(cell);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // STUDENT INFO BLOCK
    // ═══════════════════════════════════════════════════════════════════════════
    private void renderStudentInfoBlock(Document doc, BaseFont bf, Font bodyFont, Font smallFont)
            throws DocumentException {
        PdfPTable table = new PdfPTable(3);
        table.setWidthPercentage(100);
        table.setWidths(new float[] { 3f, 2f, 2f });
        table.setSpacingBefore(8);
        table.setSpacingAfter(8);

        addInputCell(table, "শিক্ষার্থীর নাম / Student Name:", bf);
        addInputCell(table, "রোল নম্বর / Roll No:", bf);
        addInputCell(table, "রেজি. নম্বর / Reg. No:", bf);
        doc.add(table);
    }

    private void addInputCell(PdfPTable table, String label, BaseFont bf) {
        PdfPCell cell = new PdfPCell();
        cell.setBorder(PdfPCell.BOX);
        cell.setBorderColor(new Color(203, 213, 225));
        cell.setPadding(8);

        Paragraph p = new Paragraph();
        p.add(new Chunk(label + "\n", new Font(bf, 8, Font.NORMAL, MID_GRAY)));
        p.add(new Chunk("_________________________________", new Font(bf, 10, Font.NORMAL, DARK)));
        cell.addElement(p);
        table.addCell(cell);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // INSTRUCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    private void renderInstructions(Document doc, String instructions, Font bodyFont, Font boldFont, BaseFont bf)
            throws DocumentException {
        PdfPTable box = new PdfPTable(1);
        box.setWidthPercentage(100);
        box.setSpacingBefore(6);
        box.setSpacingAfter(6);

        PdfPCell cell = new PdfPCell();
        cell.setBorder(PdfPCell.BOX);
        cell.setBorderColor(ACCENT);
        cell.setBackgroundColor(new Color(239, 246, 255));
        cell.setPadding(10);

        Paragraph heading = new Paragraph("নির্দেশনা / Instructions:", boldFont);
        heading.setSpacingAfter(4);
        cell.addElement(heading);

        Paragraph text = new Paragraph(stripHtml(instructions), bodyFont);
        cell.addElement(text);

        box.addCell(cell);
        doc.add(box);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // SECTION HEADER
    // ═══════════════════════════════════════════════════════════════════════════
    private void renderSectionHeader(Document doc, String sectionName, Font sectionFont, BaseFont bf)
            throws DocumentException {
        PdfPTable t = new PdfPTable(1);
        t.setWidthPercentage(100);
        t.setSpacingBefore(14);
        t.setSpacingAfter(8);

        PdfPCell cell = new PdfPCell(new Phrase(sectionName, sectionFont));
        cell.setBackgroundColor(SECTION_BG);
        cell.setBorderColor(ACCENT);
        cell.setBorder(PdfPCell.LEFT | PdfPCell.BOTTOM);
        cell.setBorderWidthLeft(4);
        cell.setPadding(8);
        t.addCell(cell);
        doc.add(t);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // QUESTION RENDERER
    // ═══════════════════════════════════════════════════════════════════════════
    private void renderQuestion(Document doc, Question q, Double marks, int order, boolean isAlternative,
            Font bodyFont, Font boldFont, Font optionFont, Font answerFont,
            Font smallFont, PdfDownloadOptions opts) throws DocumentException {
        // Question stem paragraph
        Paragraph questionPara = new Paragraph();
        questionPara.setSpacingBefore(6);
        questionPara.setSpacingAfter(3);

        if (isAlternative) {
            questionPara.setIndentationLeft(20);
            questionPara.add(new Chunk(stripHtml(q.getQuestionText()), bodyFont));
        } else {
            // Number + marks
            questionPara.add(new Chunk(order + ".  ", boldFont));
            if (marks != null) {
                questionPara.add(new Chunk("[" + formatMarks(marks) + " নম্বর]  ", smallFont));
            }
            questionPara.add(new Chunk(stripHtml(q.getQuestionText()), bodyFont));
        }

        doc.add(questionPara);

        // Stimulus block (for CQ / creative)
        if (q.getStimulus() != null && !q.getStimulus().isBlank()) {
            PdfPTable stimBox = new PdfPTable(1);
            stimBox.setWidthPercentage(95);
            stimBox.setHorizontalAlignment(Element.ALIGN_RIGHT);
            stimBox.setSpacingAfter(4f);

            PdfPCell stimCell = new PdfPCell();
            stimCell.setBackgroundColor(new Color(255, 251, 235));
            stimCell.setBorderColor(new Color(251, 191, 36));
            stimCell.setBorder(PdfPCell.LEFT);
            stimCell.setBorderWidthLeft(3);
            stimCell.setPadding(8);
            stimCell.addElement(new Paragraph(stripHtml(q.getStimulus()), optionFont));
            stimBox.addCell(stimCell);
            doc.add(stimBox);
        }

        // MCQ Options
        if (q.getType().equals(Question.QuestionType.MCQ.name())) {
            renderMcqOptions(doc, q, optionFont, answerFont, opts);
        }

        // CQ Sub-questions (জ্ঞান, অনুধাবন, প্রয়োগ, উচ্চতর দক্ষতা)
        if (q.getType().equals(Question.QuestionType.CQ.name())) {
            renderCqSubQuestions(doc, q, optionFont, answerFont, opts, order);
        }

        // Difficulty badge
        Paragraph badge = new Paragraph();
        badge.setSpacingBefore(1);
        badge.add(new Chunk("  ◆ " + q.getDifficulty() + (q.getBloomLevel() != null ? " | " + q.getBloomLevel() : ""),
                smallFont));
        doc.add(badge);

        // Divider
        doc.add(new LineSeparator(0.3f, 100f, new Color(226, 232, 240), Element.ALIGN_CENTER, -1f));
    }

    private void renderMcqOptions(Document doc, Question q, Font optionFont, Font answerFont, PdfDownloadOptions opts)
            throws DocumentException {
        List<QuestionOption> options = questionOptionRepository.findByQuestionIdOrderByOptionLabelAsc(q.getId());
        if (opts.isShuffleOptions())
            Collections.shuffle(options, new Random());

        boolean useTable = options.size() <= 4;
        if (useTable) {
            PdfPTable optTable = new PdfPTable(Math.min(options.size(), 2));
            optTable.setWidthPercentage(95);
            optTable.setSpacingBefore(3);
            optTable.setSpacingAfter(4);
            optTable.setHorizontalAlignment(Element.ALIGN_RIGHT);

            for (QuestionOption opt : options) {
                PdfPCell cell = new PdfPCell();
                cell.setBorder(PdfPCell.NO_BORDER);
                cell.setPaddingBottom(4);

                Paragraph p = new Paragraph();
                p.add(new Chunk(opt.getOptionLabel() + ")  ",
                        new Font(optionFont.getBaseFont(), optionFont.getSize(), Font.BOLD)));
                p.add(new Chunk(stripHtml(opt.getOptionText()), optionFont));

                // Show answer indicator
                if (opts.isIncludeAnswers() && opt.isCorrect()) {
                    p.add(new Chunk("  ✓", answerFont));
                }
                cell.addElement(p);
                optTable.addCell(cell);
            }
            doc.add(optTable);
        } else {
            for (QuestionOption opt : options) {
                Paragraph p = new Paragraph();
                p.setIndentationLeft(20);
                p.setSpacingAfter(2);
                p.add(new Chunk(opt.getOptionLabel() + ")  ",
                        new Font(optionFont.getBaseFont(), optionFont.getSize(), Font.BOLD)));
                p.add(new Chunk(stripHtml(opt.getOptionText()), optionFont));
                if (opts.isIncludeAnswers() && opt.isCorrect()) {
                    p.add(new Chunk("  ✓", answerFont));
                }
                doc.add(p);
            }
        }
    }

    private void renderCqSubQuestions(Document doc, Question q, Font optionFont, Font answerFont,
            PdfDownloadOptions opts, int order) throws DocumentException {
        // Bangladeshi CQ format: জ্ঞান, অনুধাবন, প্রয়োগ, উচ্চতর দক্ষতা
        String[] cqLabels = { "ক", "খ", "গ", "ঘ" };
        String[] cqTypes = { "জ্ঞানমূলক", "অনুধাবনমূলক", "প্রয়োগমূলক", "উচ্চতর দক্ষতামূলক" };
        double[] cqMarks = { 1.0, 2.0, 3.0, 4.0 };

        List<QuestionOption> subQs = questionOptionRepository.findByQuestionIdOrderByOptionLabelAsc(q.getId());

        PdfPTable cqTable = new PdfPTable(1);
        cqTable.setWidthPercentage(95);
        cqTable.setSpacingBefore(4);
        cqTable.setSpacingAfter(4);
        cqTable.setHorizontalAlignment(Element.ALIGN_RIGHT);

        for (int i = 0; i < Math.min(subQs.size(), 4); i++) {
            QuestionOption sub = subQs.get(i);
            PdfPCell cell = new PdfPCell();
            cell.setBorder(PdfPCell.BOTTOM);
            cell.setBorderColor(new Color(226, 232, 240));
            cell.setPadding(5);

            Paragraph p = new Paragraph();
            String marksStr = " [" + (int) cqMarks[i] + "]";
            p.add(new Chunk(cqLabels[i] + ") ", new Font(optionFont.getBaseFont(), optionFont.getSize(), Font.BOLD)));
            p.add(new Chunk(stripHtml(sub.getOptionText()), optionFont));
            p.add(new Chunk(marksStr, new Font(optionFont.getBaseFont(), 8, Font.NORMAL, MID_GRAY)));
            cell.addElement(p);
            cqTable.addCell(cell);
        }

        // If no sub questions saved, render blank lines
        if (subQs.isEmpty()) {
            for (int i = 0; i < 4; i++) {
                PdfPCell cell = new PdfPCell();
                cell.setBorder(PdfPCell.BOTTOM);
                cell.setBorderColor(new Color(226, 232, 240));
                cell.setPadding(5);
                Paragraph p = new Paragraph();
                p.add(new Chunk(cqLabels[i] + ") ",
                        new Font(optionFont.getBaseFont(), optionFont.getSize(), Font.BOLD)));
                p.add(new Chunk(cqTypes[i] + " প্রশ্ন", optionFont));
                p.add(new Chunk("  [" + (int) cqMarks[i] + "]",
                        new Font(optionFont.getBaseFont(), 8, Font.NORMAL, MID_GRAY)));
                cell.addElement(p);
                cqTable.addCell(cell);
            }
        }

        doc.add(cqTable);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ANSWER SHEET
    // ═══════════════════════════════════════════════════════════════════════════
    private void renderAnswerSheet(Document doc, List<ExamQuestion> questions,
            BaseFont bf, Font boldFont, Font bodyFont, Font smallFont,
            Font sectionFont, PdfDownloadOptions opts) throws DocumentException {
        // Header
        Paragraph heading = new Paragraph("উত্তর পত্র / Answer Sheet", sectionFont);
        heading.setAlignment(Element.ALIGN_CENTER);
        heading.setSpacingAfter(12);
        doc.add(heading);
        doc.add(new LineSeparator(1f, 100f, ACCENT, Element.ALIGN_CENTER, -3f));
        doc.add(new Paragraph(" "));

        // MCQ grid
        List<ExamQuestion> mcqQuestions = questions.stream()
                .filter(eq -> eq.getQuestion().getType().equals(Question.QuestionType.MCQ.name()))
                .toList();

        if (!mcqQuestions.isEmpty()) {
            Paragraph mcqHead = new Paragraph("বহুনির্বাচনি উত্তর / MCQ Answers:", boldFont);
            mcqHead.setSpacingAfter(6);
            doc.add(mcqHead);

            // 5 columns grid
            int cols = 5;
            PdfPTable grid = new PdfPTable(cols);
            grid.setWidthPercentage(100);

            for (int i = 0; i < mcqQuestions.size(); i++) {
                ExamQuestion eq = mcqQuestions.get(i);
                Question q = eq.getQuestion();
                List<QuestionOption> opts2 = questionOptionRepository.findByQuestionIdOrderByOptionLabelAsc(q.getId());

                PdfPCell cell = new PdfPCell();
                cell.setBorder(PdfPCell.BOX);
                cell.setBorderColor(new Color(203, 213, 225));
                cell.setPadding(5);
                cell.setMinimumHeight(40);

                Paragraph p = new Paragraph();
                p.add(new Chunk((i + 1) + ".  ", boldFont));

                for (QuestionOption opt : opts2) {
                    boolean correct = opts.isIncludeAnswers() && opt.isCorrect();
                    Font f = correct
                            ? new Font(bf, 9, Font.BOLD, new Color(5, 150, 105))
                            : new Font(bf, 9, Font.NORMAL, DARK);
                    String bubble = correct ? "●" : "○";
                    p.add(new Chunk(bubble + opt.getOptionLabel() + " ", f));
                }
                cell.addElement(p);
                grid.addCell(cell);
            }

            // Pad to complete row
            int remainder = mcqQuestions.size() % cols;
            if (remainder != 0) {
                for (int i = 0; i < cols - remainder; i++) {
                    PdfPCell empty = new PdfPCell(new Phrase(""));
                    empty.setBorder(PdfPCell.NO_BORDER);
                    grid.addCell(empty);
                }
            }
            doc.add(grid);
        }

        // Short / CQ — blank lines
        List<ExamQuestion> others = questions.stream()
                .filter(eq -> !eq.getQuestion().getType().equals(Question.QuestionType.MCQ.name()))
                .toList();

        if (!others.isEmpty()) {
            doc.add(new Paragraph(" "));
            Paragraph oHead = new Paragraph("লিখিত উত্তর / Written Answers:", boldFont);
            oHead.setSpacingAfter(8);
            oHead.setSpacingBefore(10);
            doc.add(oHead);

            for (int i = 0; i < others.size(); i++) {
                ExamQuestion eq = others.get(i);
                Paragraph qNum = new Paragraph(
                        (mcqQuestions.size() + i + 1) + ".  __________________________________________",
                        new Font(bf, 11, Font.NORMAL, DARK));
                qNum.setSpacingAfter(16);
                doc.add(qNum);
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // WATERMARK
    // ═══════════════════════════════════════════════════════════════════════════
    private void addWatermark(PdfWriter writer, String text, BaseFont bf) throws DocumentException, IOException {
        PdfContentByte canvas = writer.getDirectContentUnder();
        canvas.saveState();
        canvas.setColorFill(new Color(200, 200, 200));
        canvas.setFontAndSize(bf, 60);
        canvas.setTextMatrix(0, 0);
        canvas.showTextAligned(Element.ALIGN_CENTER, text,
                PageSize.A4.getWidth() / 2, PageSize.A4.getHeight() / 2, 45);
        canvas.restoreState();
    }

    private void renderAlternativeSeparator(Document doc, Font boldFont, BaseFont bf) throws DocumentException {
        doc.add(new Paragraph(" "));
        PdfPTable separatorTable = new PdfPTable(3);
        separatorTable.setWidthPercentage(95);
        separatorTable.setWidths(new float[]{4f, 2f, 4f});
        separatorTable.setHorizontalAlignment(Element.ALIGN_RIGHT);
        
        PdfPCell leftLine = new PdfPCell();
        leftLine.setBorder(PdfPCell.BOTTOM);
        leftLine.setBorderColor(new Color(203, 213, 225));
        leftLine.setPaddingBottom(5);
        separatorTable.addCell(leftLine);
        
        PdfPCell textCell = new PdfPCell(new Phrase("অথবা / OR", new Font(bf, 10, Font.BOLD, MID_GRAY)));
        textCell.setBorder(PdfPCell.NO_BORDER);
        textCell.setHorizontalAlignment(Element.ALIGN_CENTER);
        textCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        separatorTable.addCell(textCell);
        
        PdfPCell rightLine = new PdfPCell();
        rightLine.setBorder(PdfPCell.BOTTOM);
        rightLine.setBorderColor(new Color(203, 213, 225));
        rightLine.setPaddingBottom(5);
        separatorTable.addCell(rightLine);
        
        doc.add(separatorTable);
        doc.add(new Paragraph(" "));
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // GROUP BY SECTION
    // ═══════════════════════════════════════════════════════════════════════════
    private Map<String, List<ExamQuestion>> groupBySection(List<ExamQuestion> questions) {
        // Preserve insertion order
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
        if ("MCQ".equals(type)) return "বিভাগ ক — বহুনির্বাচনি প্রশ্ন / Section A — MCQ";
        if ("SHORT".equals(type)) return "বিভাগ খ — সংক্ষিপ্ত প্রশ্ন / Section B — Short Questions";
        if ("CQ".equals(type)) return "বিভাগ গ — সৃজনশীল প্রশ্ন / Section C — Creative Questions";
        if ("TRUE_FALSE".equals(type)) return "বিভাগ ঘ — সত্য/মিথ্যা / Section D — True/False";
        return "অন্যান্য / Others";
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // FONT LOADER — tries Noto Sans Bengali, falls back to Helvetica
    // ═══════════════════════════════════════════════════════════════════════════
    private BaseFont loadFont() {
        // Try to load embedded Noto Sans Bengali from classpath resources/fonts/
        try (InputStream is = getClass().getResourceAsStream("/fonts/NotoSansBengali-Regular.ttf")) {
            if (is != null) {
                byte[] fontBytes = is.readAllBytes();
                return BaseFont.createFont("NotoSansBengali-Regular.ttf",
                        BaseFont.IDENTITY_H, BaseFont.EMBEDDED, true, fontBytes, null);
            }
        } catch (Exception e) {
            log.warn("Noto Sans Bengali font not found in classpath, falling back to Helvetica. " +
                    "Place NotoSansBengali-Regular.ttf in src/main/resources/fonts/ for Bangla support.");
        }

        // Fallback — built-in, no Bangla support
        try {
            return BaseFont.createFont(BaseFont.HELVETICA, BaseFont.CP1252, BaseFont.NOT_EMBEDDED);
        } catch (Exception e) {
            throw new RuntimeException("Cannot load any font", e);
        }
    }

    // ── Util ───────────────────────────────────────────────────────────────────
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

    // ═══════════════════════════════════════════════════════════════════════════
    // HEADER / FOOTER page event
    // ═══════════════════════════════════════════════════════════════════════════
    @RequiredArgsConstructor
    private static class ExamHeaderFooter extends PdfPageEventHelper {
        private final Exam exam;
        private final PdfDownloadOptions opts;
        private final BaseFont bf;
        private PdfTemplate total;

        @Override
        public void onOpenDocument(PdfWriter writer, Document document) {
            total = writer.getDirectContent().createTemplate(30, 16);
        }

        @Override
        public void onEndPage(PdfWriter writer, Document document) {
            if (bf == null)
                return;
            PdfContentByte cb = writer.getDirectContent();

            // Footer — page number
            String footer = "QuestionShaper   |   " + exam.getTitle() + "   |   Page " + writer.getPageNumber();
            cb.saveState();
            cb.setFontAndSize(bf, 8);
            cb.setColorFill(MID_GRAY);
            cb.beginText();
            cb.setTextMatrix(document.leftMargin(), document.bottomMargin() - 10);
            cb.showText(footer);
            cb.endText();

            // Top thin bar
            cb.setColorFill(ACCENT);
            cb.rectangle(document.leftMargin(), document.top() + 10,
                    document.right() - document.leftMargin(), 2);
            cb.fill();
            cb.restoreState();
        }

        @Override
        public void onCloseDocument(PdfWriter writer, Document document) {
            if (total != null && bf != null) {
                try {
                    PdfContentByte cb = new PdfContentByte(writer);
                    cb.addTemplate(total, 0, 0);
                } catch (Exception ignored) {
                }
            }
        }
    }
}
