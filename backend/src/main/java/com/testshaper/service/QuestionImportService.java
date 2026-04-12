package com.testshaper.service;

import org.springframework.web.multipart.MultipartFile;
import java.util.Map;

public interface QuestionImportService {
    Map<String, Object> importQuestions(MultipartFile file, String type);
}
