package com.testshaper.config;

import com.meilisearch.sdk.Client;
import com.meilisearch.sdk.Config;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class MeilisearchConfig {

    private static final Logger log = LoggerFactory.getLogger(MeilisearchConfig.class);

    @Value("${app.meilisearch.host:http://localhost:7700}")
    private String host;

    @Value("${app.meilisearch.api-key:masterKey}")
    private String apiKey;

    @Bean
    public Client meilisearchClient() {
        log.info("🔍 Initializing Meilisearch Client for Host: {}", host);
        return new Client(new Config(host, apiKey));
    }
}
