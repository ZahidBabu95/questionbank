package com.testshaper.config;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * SPA Fallback Controller — Infinite Loop Safe
 * 
 * Instead of using complex regex that might accidentally intercept 
 * Spring's /error path and cause an infinite forward loop when a 
 * static file (like favicon.ico) is missing, we explicitly map ONLY 
 * the known frontend routes.
 */
@Controller
public class SpaController {

    @GetMapping({
        "/",
        "/login",
        "/signup",
        "/dashboard/**",
        "/profile/**",
        "/users/**",
        "/institutes/**",
        "/exams/**",
        "/lectures/**",
        "/reports/**",
        "/billing/**",
        "/settings/**",
        "/admin/**",
        "/questions/**",
        "/ai/**",
        "/cms/**",
        "/blog/**",
        "/support/**",
        "/notifications/**"
    })
    public String frontendRoutes() {
        return "forward:/index.html";
    }
}

