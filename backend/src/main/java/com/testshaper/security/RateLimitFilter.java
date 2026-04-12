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
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;

@Component
@RequiredArgsConstructor
public class RateLimitFilter extends OncePerRequestFilter {

    private final SecuritySettingService securityService;

    // IP -> {Timestamp, Count}
    private final Map<String, UserRequestCounter> requestCounts = new ConcurrentHashMap<>();

    // Localhost IPs are exempt from rate limiting (dev machine / internal calls)
    private static final Set<String> EXEMPT_IPS = Set.of("127.0.0.1", "::1", "0:0:0:0:0:0:0:1");

    // Paths that are batch/cascade API calls and deserve a higher internal multiplier
    private static final Set<String> BULK_PREFIXES = Set.of(
        "/api/v1/academic/",
        "/api/v1/ai/upload-history",
        "/api/v1/ai/processing-jobs",
        "/api/v1/notifications/"
    );

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String path = request.getRequestURI();
        if (!path.startsWith("/api/")) {
            filterChain.doFilter(request, response);
            return;
        }

        String clientIp = getClientIp(request);

        // ── Exempt localhost entirely (development & internal server calls) ──
        if (EXEMPT_IPS.contains(clientIp)) {
            filterChain.doFilter(request, response);
            return;
        }

        UserRequestCounter counter = requestCounts.computeIfAbsent(clientIp, k -> new UserRequestCounter());

        long now = System.currentTimeMillis();
        long windowStart = counter.windowStart.get();

        // 1 Minute Window — reset on expiry
        if (now - windowStart > 60000) {
            counter.windowStart.set(now);
            counter.count.set(0);
        }

        int requests = counter.count.incrementAndGet();

        // Fetch configured limit (default: 300 — raised from 100 to handle
        // legitimate cascading academic hierarchy calls in the admin panel)
        int limit = 300;
        try {
            String val = securityService.getGlobalSettings().getOrDefault("API_RATE_LIMIT_PER_MINUTE", "300");
            limit = Integer.parseInt(val);
        } catch (Exception e) {
            // ignore, keep default
        }

        // Bulk/poll endpoints (academic hierarchy, upload history, notifications)
        // are called many times per user interaction. Give them a 3× headroom.
        boolean isBulkPath = BULK_PREFIXES.stream().anyMatch(path::startsWith);
        int effectiveLimit = isBulkPath ? limit * 3 : limit;

        if (requests > effectiveLimit) {
            response.setStatus(429);
            response.setHeader("Retry-After", "60");
            response.setContentType("application/json");
            response.getWriter().write("{\"error\":\"Too many requests\",\"retryAfterSeconds\":60}");
            return;
        }

        filterChain.doFilter(request, response);
    }

    private String getClientIp(HttpServletRequest request) {
        String xfHeader = request.getHeader("X-Forwarded-For");
        if (xfHeader == null) {
            return request.getRemoteAddr();
        }
        return xfHeader.split(",")[0].trim();
    }

    private static class UserRequestCounter {
        AtomicLong windowStart = new AtomicLong(System.currentTimeMillis());
        AtomicInteger count = new AtomicInteger(0);
    }
}
