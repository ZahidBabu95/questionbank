package com.testshaper.controller;

import com.testshaper.dto.cms.AppReleaseDTO;
import com.testshaper.service.AppReleaseService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/public/apps")
@RequiredArgsConstructor
public class PublicAppReleaseController {

    private final AppReleaseService appReleaseService;

    @GetMapping("/latest")
    public ResponseEntity<AppReleaseDTO> getLatestActiveRelease(@RequestParam("platform") String platform) {
        return ResponseEntity.ok(appReleaseService.getLatestActiveRelease(platform));
    }
}
