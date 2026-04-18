package com.testshaper.controller;

import org.springframework.boot.web.servlet.error.ErrorController;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;

import jakarta.servlet.RequestDispatcher;
import jakarta.servlet.http.HttpServletRequest;

@Controller
public class SpaErrorController implements ErrorController {

    @RequestMapping("/error")
    public Object handleError(HttpServletRequest request) {
        Object status = request.getAttribute(RequestDispatcher.ERROR_STATUS_CODE);
        String errorPath = (String) request.getAttribute("jakarta.servlet.error.request_uri");
        
        if (status != null) {
            int statusCode = Integer.parseInt(status.toString());
            
            // If resource not found (404), forward to React's index.html
            // Allows React Router to handle the URL client-side
            if (statusCode == HttpStatus.NOT_FOUND.value()) {
                if (errorPath != null && !errorPath.startsWith("/api/") && !errorPath.startsWith("/ws-live-updates")) {
                    return "forward:/index.html";
                }
            }
        }
        
        // For other non-API UI errors, fallback to index.html
        if (errorPath != null && !errorPath.startsWith("/api/") && !errorPath.startsWith("/ws-live-updates")) {
            return "forward:/index.html"; 
        }
        
        // For API errors, return basic JSON instead of a view
        return org.springframework.http.ResponseEntity
                .status(status != null ? Integer.parseInt(status.toString()) : 500)
                .body(java.util.Map.of(
                        "error", "Error", 
                        "message", "Request failed or resource not found",
                        "path", errorPath != null ? errorPath : "unknown"
                ));
    }
}
