package com.testshaper.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

@Component
public class RateLimitingFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(RateLimitingFilter.class);

    @Value("${app.ratelimit.enabled:true}")
    private boolean enabled;

    @Value("${app.ratelimit.public-limit:120}")
    private int publicLimit;

    @Value("${app.ratelimit.auth-limit:300}")
    private int authLimit;

    private final RedisTemplate<String, Object> redisTemplate;
    
    // In-memory fallback tracking map when Redis is unavailable
    private final Map<String, AtomicInteger> fallbackMemoryStore = new ConcurrentHashMap<>();
    private final Map<String, Long> fallbackExpiryStore = new ConcurrentHashMap<>();

    public RateLimitingFilter(RedisTemplate<String, Object> redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    @Override
    protected boolean shouldNotFilter(@NonNull HttpServletRequest request) {
        String path = request.getRequestURI();
        // Only apply rate limiting to /api/** endpoints
        return !path.startsWith("/api/");
    }

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain filterChain) throws ServletException, IOException {

        if (!enabled) {
            filterChain.doFilter(request, response);
            return;
        }

        String clientIp = getClientIp(request);
        if ("127.0.0.1".equals(clientIp) || "0:0:0:0:0:0:0:1".equals(clientIp) || "::1".equals(clientIp) || "localhost".equals(clientIp)) {
            filterChain.doFilter(request, response);
            return;
        }

        String authHeader = request.getHeader("Authorization");
        boolean isAuthenticated = authHeader != null && authHeader.startsWith("Bearer ");

        String clientIdentifier = getClientIdentifier(request, isAuthenticated, authHeader);
        int maxLimit = isAuthenticated ? authLimit : publicLimit;

        long currentCount = incrementRequestCount(clientIdentifier, isAuthenticated);

        long remaining = Math.max(0, maxLimit - currentCount);
        response.setHeader("X-RateLimit-Limit", String.valueOf(maxLimit));
        response.setHeader("X-RateLimit-Remaining", String.valueOf(remaining));
        response.setHeader("X-RateLimit-Reset", "60");

        if (currentCount > maxLimit) {
            log.warn("🚨 Rate limit exceeded for [{}] - Count: {}/{}", clientIdentifier, currentCount, maxLimit);
            response.setStatus(429); // 429 Too Many Requests
            response.setContentType("application/json;charset=UTF-8");
            response.getWriter().write(
                "{" +
                "\"status\":429," +
                "\"error\":\"Too Many Requests\"," +
                "\"message\":\"নিরাপত্তা সতর্কতা: ১ মিনিটে অতিরিক্ত রিকোয়েস্ট পাঠানো হয়েছে। অনুগ্রহ করে ১ মিনিট পর আবার চেষ্টা করুন।\"" +
                "}"
            );
            return;
        }

        filterChain.doFilter(request, response);
    }

    private String getClientIp(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("CF-Connecting-IP"); // Cloudflare Real IP
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getRemoteAddr();
        } else if (ip.contains(",")) {
            ip = ip.split(",")[0].trim();
        }
        return ip != null ? ip : "unknown";
    }

    private String getClientIdentifier(HttpServletRequest request, boolean isAuthenticated, String authHeader) {
        if (isAuthenticated && authHeader.length() > 20) {
            // Hash authorization token prefix as user identifier
            return "user:" + Math.abs(authHeader.substring(7, 25).hashCode());
        }
        return "ip:" + getClientIp(request);
    }

    private long incrementRequestCount(String identifier, boolean isAuthenticated) {
        String key = "ratelimit:" + identifier;
        
        // Tier 1: Redis Rate Limiter
        try {
            if (redisTemplate != null) {
                Long count = redisTemplate.opsForValue().increment(key, 1);
                if (count != null && count == 1) {
                    redisTemplate.expire(key, 60, TimeUnit.SECONDS);
                }
                if (count != null) {
                    return count;
                }
            }
        } catch (Exception e) {
            log.debug("Redis rate limit check failed ({}), falling back to in-memory store.", e.getMessage());
        }

        // Tier 2: In-Memory Fallback Rate Limiter
        long now = System.currentTimeMillis();
        Long expiry = fallbackExpiryStore.get(key);
        
        if (expiry == null || now > expiry) {
            fallbackMemoryStore.put(key, new AtomicInteger(1));
            fallbackExpiryStore.put(key, now + 60000);
            return 1;
        } else {
            AtomicInteger counter = fallbackMemoryStore.computeIfAbsent(key, k -> new AtomicInteger(0));
            return counter.incrementAndGet();
        }
    }
}
