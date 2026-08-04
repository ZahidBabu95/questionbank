---
name: custom-api-builder
description: Build, categorize, secure, and expose custom public/mobile/integration REST APIs in Question Shaper adhering to strict architecture, X-APP-SECRET-KEY headers, System API Manager categorizations, dynamic domain URL resolutions, and Bengali language standards.
---

# Custom API Builder Skill

When building or modifying custom REST APIs, mobile public sharing endpoints, or integration APIs in Question Shaper, follow the master architecture guidelines defined in [custom_api_development_guide.md](file:///g:/Dev-Pro/Question%20Shaper/docs/custom_api_development_guide.md).

## Mandatory Execution Steps

1. **Security & Header Validation (`X-APP-SECRET-KEY`)**:
   - Enforce `@RequestHeader(value = "X-APP-SECRET-KEY", required = false) String requestSecretKey` check in backend controller.
   - Return `401 Unauthorized` if invalid or missing.
   - Default key: `QS-MOBILE-SEC-849201` via `@Value("${testshaper.mobile.app-secret-key:QS-MOBILE-SEC-849201}")`.

2. **Categorization & Scanner (`AiToolScannerService.java`)**:
   - Add controller bean check at top of `getCategoryFromController()` in [AiToolScannerService.java](file:///g:/Dev-Pro/Question%20Shaper/backend/src/main/java/com/testshaper/service/AiToolScannerService.java#L125).
   - Assign star-prefixed category name: `⭐ কাস্টম এপিআই ফর শেয়ার`.

3. **Response Packaging (`ApiResponse`)**:
   - Import `com.testshaper.common.ApiResponse` (NOT `com.testshaper.dto`).
   - Wrap payload in `ResponseEntity.ok(ApiResponse.success(dataMap, "Message"))`.
   - Ensure `isCorrect: true` boolean is present on MCQ options for mobile quiz auto-grading.

4. **Security Whitelisting (`SecurityConfig.java`)**:
   - Add endpoint paths under `.requestMatchers("/api/v1/public/**").permitAll()` in [SecurityConfig.java](file:///g:/Dev-Pro/Question%20Shaper/backend/src/main/java/com/testshaper/config/SecurityConfig.java).

5. **UI & API Manager Sync ([ApiManager.jsx](file:///g:/Dev-Pro/Question%20Shaper/frontend/src/pages/admin/Settings/ApiManager.jsx))**:
   - Support `window.location.origin` dynamic live domain resolution.
   - Include `-H "X-APP-SECRET-KEY: QS-MOBILE-SEC-849201"` in `generateCurl`.
   - Render `Live Full URL` box and `[ 📋 Copy Full API URL ]` button.

6. **Language Rule**:
   - Communication, plans, and walkthroughs MUST be in Bengali (বাংলা).
