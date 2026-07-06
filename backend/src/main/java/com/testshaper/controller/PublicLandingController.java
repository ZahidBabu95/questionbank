package com.testshaper.controller;

import com.testshaper.dto.cms.CmsSectionDTO;
import com.testshaper.service.CmsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import com.testshaper.service.DynamicStorageService;

import com.testshaper.service.GeneralSettingService;
import com.testshaper.entity.GeneralSetting;
import com.testshaper.repository.InstituteRepository;
import java.util.Map;
import java.util.List;

import com.testshaper.service.AcademicService;
import com.testshaper.dto.ExamDTO;
import com.testshaper.service.impl.ExamGenerationServiceImpl;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/public")
@RequiredArgsConstructor
public class PublicLandingController {

    private final CmsService cmsService;
    private final GeneralSettingService generalSettingService;
    private final InstituteRepository instituteRepository;
    private final DynamicStorageService dynamicStorageService;
    private final com.testshaper.service.BillingPackageService packageService;
    private final ExamGenerationServiceImpl examGenerationService;
    private final AcademicService academicService;

    @GetMapping("/classes")
    public ResponseEntity<List<com.testshaper.entity.AcademicClass>> getPublicClasses() {
        return ResponseEntity.ok(academicService.getAllClasses());
    }

    @GetMapping("/hierarchy")
    public ResponseEntity<?> getPublicHierarchy() {
        return ResponseEntity.ok(academicService.getFullHierarchy(true));
    }

    @GetMapping("/exams/{examId}")
    public ResponseEntity<Map<String, Object>> getPublicExam(@PathVariable UUID examId) {
        ExamDTO exam = examGenerationService.getPublicExam(examId);
        return ResponseEntity.ok(Map.of("success", true, "data", exam));
    }

    @GetMapping("/landing")
    public ResponseEntity<List<CmsSectionDTO>> getLandingData() {
        return ResponseEntity.ok(cmsService.getPublicLandingData());
    }

    @GetMapping("/sections/{key}")
    public ResponseEntity<CmsSectionDTO> getSectionByKey(@PathVariable("key") String key) {
        return ResponseEntity.ok(cmsService.getSectionByKey(key));
    }

    @GetMapping("/packages")
    public ResponseEntity<List<com.testshaper.dto.billing.BillingPackageDTO>> getPublicPackages() {
        // Return active packages to the public landing page
        return ResponseEntity.ok(packageService.getAllPackages().stream()
                .filter(p -> "ACTIVE".equals(p.getStatus()))
                .collect(java.util.stream.Collectors.toList()));
    }

    @GetMapping("/branding")
    public ResponseEntity<Map<String, String>> getPublicBranding() {
        Map<String, String> branding = generalSettingService
                .getGlobalSettings(GeneralSetting.SettingCategory.BRANDING);

        // Logical Fallback: If global branding is empty or missing a logo, try to find
        // any institute branding.
        // This handles cases where a Super Admin is associated with an institute and
        // saves branding there.
        if (branding.isEmpty() || !branding.containsKey("logo_url") || branding.get("logo_url") == null) {
            List<com.testshaper.entity.Institute> institutes = instituteRepository.findAll();
            if (!institutes.isEmpty()) {
                String firstTenantId = institutes.get(0).getId().toString();
                Map<String, String> instBranding = generalSettingService.getInstituteSettings(firstTenantId,
                        GeneralSetting.SettingCategory.BRANDING);

                if (!instBranding.isEmpty()) {
                    branding.putAll(instBranding);
                }
            }
        }
        return ResponseEntity.ok(branding);
    }

    @GetMapping("/settings/languages")
    public ResponseEntity<Map<String, String>> getPublicLanguages() {
        Map<String, String> generalSettings = generalSettingService
                .getGlobalSettings(GeneralSetting.SettingCategory.GENERAL);
        
        Map<String, String> response = new java.util.HashMap<>();
        response.put("defaultLanguage", generalSettings.getOrDefault("landing_default_language", "en"));
        response.put("enabledLanguages", generalSettings.getOrDefault("landing_enabled_languages", "en,bn"));
        return ResponseEntity.ok(response);
    }

    // --- Image Proxy (solves CORS for canvas operations) ---
    @GetMapping("/proxy-image")
    public ResponseEntity<byte[]> proxyImage(@RequestParam("url") String imageUrl) {
        try {
            if (imageUrl == null || !imageUrl.startsWith("https://")) {
                return ResponseEntity.badRequest().build();
            }

            byte[] imageBytes = dynamicStorageService.loadFileBytes(imageUrl);

            String ct = "image/jpeg";
            String lower = imageUrl.toLowerCase();
            if (lower.contains(".png"))  ct = "image/png";
            else if (lower.contains(".webp")) ct = "image/webp";
            else if (lower.contains(".gif"))  ct = "image/gif";
            else if (lower.contains(".pdf"))  ct = "application/pdf";

            HttpHeaders headers = new HttpHeaders();
            headers.set(HttpHeaders.CONTENT_TYPE, ct);
            headers.set(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, "*");
            headers.set(HttpHeaders.CACHE_CONTROL, "public, max-age=86400");

            return new ResponseEntity<>(imageBytes, headers, HttpStatus.OK);
        } catch (Exception e) {
            System.err.println("[ImageProxy] Failed to fetch: " + imageUrl + " — " + e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY).build();
        }
    }

}
