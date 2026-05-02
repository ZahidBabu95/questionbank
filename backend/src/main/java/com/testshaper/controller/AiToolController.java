package com.testshaper.controller;

import com.testshaper.common.ApiResponse;
import com.testshaper.entity.AiTool;
import com.testshaper.repository.AiToolRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

import com.testshaper.service.AiToolScannerService;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/ai/tools")
@RequiredArgsConstructor
public class AiToolController {

    private final AiToolRepository aiToolRepository;
    private final AiToolScannerService aiToolScannerService;

    // Get all active tools for the frontend '+ Tools' menu
    @GetMapping("/active")
    public ResponseEntity<ApiResponse<List<AiTool>>> getActiveTools() {
        List<AiTool> tools = aiToolRepository.findAllByIsActiveTrue();
        return ResponseEntity.ok(ApiResponse.success(tools, "Active tools retrieved"));
    }

    // Admin endpoints
    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<List<AiTool>>> getAllTools() {
        return ResponseEntity.ok(ApiResponse.success(aiToolRepository.findAll(), "All tools retrieved"));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<AiTool>> createOrUpdateTool(@RequestBody AiTool aiTool) {
        AiTool savedTool = aiToolRepository.save(aiTool);
        return ResponseEntity.ok(ApiResponse.success(savedTool, "Tool saved successfully"));
    }

    @PostMapping("/scan-generate")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<String>> scanAndGenerate(@RequestBody Map<String, String> request) {
        String frontendPath = request.get("frontendPath");
        String customPrompt = request.get("customPrompt");
        String sampleJson = request.get("sampleJson");
        String schema = aiToolScannerService.generateSchemaForRoute(frontendPath, customPrompt, sampleJson);
        return ResponseEntity.ok(ApiResponse.success(schema, "Schema generated successfully"));
    }

    @GetMapping("/endpoints")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<List<Map<String, String>>>> getAvailableEndpoints() {
        return ResponseEntity.ok(ApiResponse.success(aiToolScannerService.getBackendEndpointsList(), "Endpoints retrieved successfully"));
    }
}
