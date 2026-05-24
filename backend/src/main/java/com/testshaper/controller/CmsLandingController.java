package com.testshaper.controller;

import com.testshaper.dto.cms.CmsSectionDTO;
import com.testshaper.dto.cms.CmsSectionRequest;
import com.testshaper.service.CmsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/cms/landing")
@RequiredArgsConstructor
public class CmsLandingController {

    private final CmsService cmsService;
    private final com.testshaper.service.AIQuestionService aiQuestionService;

    @GetMapping("/sections")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<List<CmsSectionDTO>> getAllSections() {
        return ResponseEntity.ok(cmsService.getAllSections());
    }

    @PutMapping("/sections/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<CmsSectionDTO> updateSection(@PathVariable UUID id, @RequestBody CmsSectionRequest request) {
        return ResponseEntity.ok(cmsService.updateSection(id, request));
    }

    @PatchMapping("/sections/{id}/status")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<CmsSectionDTO> updateStatus(@PathVariable UUID id, @RequestBody Map<String, String> payload) {
        return ResponseEntity.ok(cmsService.updateStatus(id, payload.get("status")));
    }

    @PostMapping("/translate")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<Map<String, String>> translate(@RequestBody Map<String, String> payload) {
        String text = payload.get("text");
        String targetLang = payload.get("targetLang");
        if (text == null || text.isBlank() || targetLang == null || targetLang.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        try {
            String targetLangName = getLanguageName(targetLang);
            String prompt = String.format("Translate the following marketing/educational text to %s. Detect the source language automatically. Output ONLY the translated text, do not include any explanations, surrounding quotes, or conversational phrases.\n\nText: \"%s\"", targetLangName, text);
            String translated = aiQuestionService.generateRawCompletion(prompt, null);
            if (translated != null) {
                translated = translated.trim();
                // Strip leading/trailing quotes if the model added them
                if (translated.startsWith("\"") && translated.endsWith("\"")) {
                    translated = translated.substring(1, translated.length() - 1);
                }
            }
            return ResponseEntity.ok(Map.of("translation", translated));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    private String getLanguageName(String langCode) {
        if (langCode == null) return "English";
        switch (langCode.toLowerCase()) {
            case "bn": return "Bengali";
            case "hi": return "Hindi";
            case "ar": return "Arabic";
            case "es": return "Spanish";
            default: return langCode;
        }
    }
}
