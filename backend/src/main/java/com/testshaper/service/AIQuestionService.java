package com.testshaper.service;

import org.springframework.web.multipart.MultipartFile;
import java.util.List;
import java.util.Map;

public interface AIQuestionService {

    /**
     * Extract questions from an uploaded PDF or image file using AI Vision API
     */
    List<Map<String, Object>> scrapeQuestions(MultipartFile file, String questionType) throws Exception;

    /**
     * Extract questions WITH metadata (class, subject, chapter, source) from uploaded file.
     * knownContext = user-provided metadata (className, subject, chapter, topic) to inject into prompt.
     */
    Map<String, Object> scrapeWithMetadata(MultipartFile file, String questionType,
                                            Map<String, String> knownContext) throws Exception;

    /** Backward-compatible overload (no known context) */
    Map<String, Object> scrapeWithMetadata(MultipartFile file, String questionType) throws Exception;

    /**
     * Extract questions using pre-extracted text (fast mode) and/or fallback image parts (Image mode),
     * optionally returning imageURLs in the prompt.
     */
    Map<String, Object> scrapeWithMetadataAndText(MultipartFile file, String extractedText, String questionType,
                                                  Map<String, String> knownContext) throws Exception;

    /**
     * Generate new questions from a topic description and/or uploaded reference material
     */
    List<Map<String, Object>> generateQuestions(MultipartFile file, String topic, String questionType,
                                                 int count, String difficulty, String bloomLevel) throws Exception;

    /**
     * Generate raw text analysis from a provided text prompt and optional file (image/pdf).
     */
    String generateRawCompletion(String prompt, MultipartFile file) throws Exception;
}
