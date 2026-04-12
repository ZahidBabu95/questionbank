package com.testshaper.dto;

import lombok.Data;

@Data
public class PdfDownloadOptions {
    private boolean includeAnswers = false;
    private boolean includeAnswerSheet = false;
    private boolean includeWatermark = false;
    private boolean shuffleQuestions = false;
    private boolean shuffleOptions = false;
    private String paperSize = "A4"; // A4 | LETTER
    private String template = "default"; // default | compact | elegant
    private float fontSize = 11f;
}
