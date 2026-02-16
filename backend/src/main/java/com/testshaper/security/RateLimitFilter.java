package com.testshaper.security;

import com.testshaper.service.SecuritySettingService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;

@Component
@RequiredArgsConstructor
public class RateLimitFilter extends OncePerRequestFilter {

    private final SecuritySettingService securityService;

    // IP -> {Timestamp, Count}
    // Simple window counter reset every minute
    private final Map<String, UserRequestCounter> requestCounts = new ConcurrentHashMap<>();

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        // Skip static resources or public endpoints if needed, but for now apply to API
        String path = request.getRequestURI();
        if (!path.startsWith("/api/")) {
            filterChain.doFilter(request, response);
            return;
        }

        String clientIp = getClientIp(request);

        // Clean up old entries periodically or just logic here (lazy expiration)
        // For simplicity:
        UserRequestCounter counter = requestCounts.computeIfAbsent(clientIp, k -> new UserRequestCounter());

        long now = System.currentTimeMillis();
        long windowStart = counter.windowStart.get();

        // 1 Minute Window
        if (now - windowStart > 60000) {
            counter.windowStart.set(now);
            counter.count.set(0);
        }

        int requests = counter.count.incrementAndGet();

        // Get Limit (Global likely, as we might not know tenant yet)
        // Optimization: Cache this value or use service (service caches)
        // Default 100 requests per minute
        // Ideally fetch based on Tenant if possible (e.g. from header), but mostly IP
        // based is global.
        int limit = 100;
        try {
            // We use a safe default if service fails or DB is down, to not block everyone
            // "API_RATE_LIMIT_PER_MINUTE"
            String val = securityService.getGlobalSettings().getOrDefault("API_RATE_LIMIT_PER_MINUTE", "100");
            limit = Integer.parseInt(val);
        } catch (Exception e) {
            // ignore
        }

        if (requests > limit) {
            response.setStatus(429);
            response.getWriter().write("Too many requests");
            return;
        }

        filterChain.doFilter(request, response);
    }

    private String getClientIp(HttpServletRequest request) {
        String xfHeader = request.getHeader("X-Forwarded-For");
        if (xfHeader == null) {
            return request.getRemoteAddr();
        }
        return xfHeader.split(",")[0];
    }

    private static class UserRequestCounter {
        AtomicLong windowStart = new AtomicLong(System.currentTimeMillis());
        AtomicInteger count = new AtomicInteger(0);
    }
}
