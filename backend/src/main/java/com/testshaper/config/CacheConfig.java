package com.testshaper.config;

import com.github.benmanes.caffeine.cache.Caffeine;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.CachingConfigurer;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.cache.interceptor.CacheErrorHandler;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;
import org.springframework.data.redis.serializer.StringRedisSerializer;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.TimeUnit;

/**
 * Hybrid & Fail-Safe Cache Configuration for Question Shaper.
 *
 * Mode 1: Distributed Redis Cache (Active when Redis server is reachable)
 * Mode 2: In-Memory Caffeine Cache (Automatic Fallback if Redis is offline/unreachable)
 */
@Configuration
@EnableCaching
public class CacheConfig implements CachingConfigurer {

    private static final Logger log = LoggerFactory.getLogger(CacheConfig.class);

    @Value("${app.redis.enabled:true}")
    private boolean redisEnabled;

    @Bean
    @Primary
    public CacheManager cacheManager(RedisConnectionFactory connectionFactory) {
        if (redisEnabled && isRedisAvailable(connectionFactory)) {
            try {
                log.info("⚡ Connecting to Redis Distributed Cache...");
                return buildRedisCacheManager(connectionFactory);
            } catch (Exception e) {
                log.warn("⚠️ Redis initialization failed ({}), falling back to Caffeine In-Memory Cache.", e.getMessage());
            }
        } else {
            log.info("ℹ️ Redis is offline or disabled. Initializing Caffeine In-Memory Cache...");
        }

        return buildCaffeineCacheManager();
    }

    private boolean isRedisAvailable(RedisConnectionFactory connectionFactory) {
        try {
            var connection = connectionFactory.getConnection();
            String ping = connection.ping();
            connection.close();
            return "PONG".equalsIgnoreCase(ping);
        } catch (Exception e) {
            log.warn("⚠️ Redis Health Check Failed: {}", e.getMessage());
            return false;
        }
    }

    private CacheManager buildRedisCacheManager(RedisConnectionFactory connectionFactory) {
        RedisCacheConfiguration defaultConfig = RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(Duration.ofMinutes(10))
                .disableCachingNullValues()
                .serializeKeysWith(RedisSerializationContext.SerializationPair.fromSerializer(new StringRedisSerializer()))
                .serializeValuesWith(RedisSerializationContext.SerializationPair.fromSerializer(new GenericJackson2JsonRedisSerializer()));

        Map<String, RedisCacheConfiguration> cacheConfigurations = new HashMap<>();
        cacheConfigurations.put("aiSettings", defaultConfig.entryTtl(Duration.ofSeconds(60)));
        cacheConfigurations.put("apiKeyPool", defaultConfig.entryTtl(Duration.ofSeconds(30)));
        cacheConfigurations.put("academicHierarchy", defaultConfig.entryTtl(Duration.ofMinutes(5)));
        cacheConfigurations.put("questionStats", defaultConfig.entryTtl(Duration.ofMinutes(15)));
        cacheConfigurations.put("sourceTags", defaultConfig.entryTtl(Duration.ofSeconds(120)));
        cacheConfigurations.put("scrapeResultCache", defaultConfig.entryTtl(Duration.ofHours(1)));
        cacheConfigurations.put("exams", defaultConfig.entryTtl(Duration.ofMinutes(10)));

        return RedisCacheManager.builder(connectionFactory)
                .cacheDefaults(defaultConfig)
                .withInitialCacheConfigurations(cacheConfigurations)
                .transactionAware()
                .build();
    }

    private CacheManager buildCaffeineCacheManager() {
        CaffeineCacheManager manager = new CaffeineCacheManager();

        manager.registerCustomCache("aiSettings",
            Caffeine.newBuilder().expireAfterWrite(60, TimeUnit.SECONDS).maximumSize(10).recordStats().build());

        manager.registerCustomCache("apiKeyPool",
            Caffeine.newBuilder().expireAfterWrite(30, TimeUnit.SECONDS).maximumSize(1).recordStats().build());

        manager.registerCustomCache("academicHierarchy",
            Caffeine.newBuilder().expireAfterWrite(300, TimeUnit.SECONDS).maximumSize(200).recordStats().build());

        manager.registerCustomCache("questionStats",
            Caffeine.newBuilder().expireAfterWrite(15, TimeUnit.MINUTES).maximumSize(500).recordStats().build());

        manager.registerCustomCache("sourceTags",
            Caffeine.newBuilder().expireAfterWrite(120, TimeUnit.SECONDS).maximumSize(500).recordStats().build());

        manager.registerCustomCache("scrapeResultCache",
            Caffeine.newBuilder().expireAfterWrite(3600, TimeUnit.SECONDS).maximumSize(50).recordStats().build());

        manager.registerCustomCache("exams",
            Caffeine.newBuilder().expireAfterWrite(600, TimeUnit.SECONDS).maximumSize(1000).recordStats().build());

        return manager;
    }

    /**
     * Graceful Cache Error Handler:
     * If Redis goes down at runtime during a read/write, log the error and bypass cache
     * so that the application fetches directly from MySQL database without crashing.
     */
    @Override
    public CacheErrorHandler errorHandler() {
        return new CacheErrorHandler() {
            @Override
            public void handleCacheGetError(RuntimeException exception, Cache cache, Object key) {
                log.warn("Cache GET failed for key '{}' in cache '{}': {}. Falling back to DB.", key, cache.getName(), exception.getMessage());
            }

            @Override
            public void handleCachePutError(RuntimeException exception, Cache cache, Object key, Object value) {
                log.warn("Cache PUT failed for key '{}' in cache '{}': {}", key, cache.getName(), exception.getMessage());
            }

            @Override
            public void handleCacheEvictError(RuntimeException exception, Cache cache, Object key) {
                log.warn("Cache EVICT failed for key '{}' in cache '{}': {}", key, cache.getName(), exception.getMessage());
            }

            @Override
            public void handleCacheClearError(RuntimeException exception, Cache cache) {
                log.warn("Cache CLEAR failed for cache '{}': {}", cache.getName(), exception.getMessage());
            }
        };
    }
}
