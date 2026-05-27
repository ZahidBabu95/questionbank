package com.testshaper.config;

import com.testshaper.security.JwtAuthenticationFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    /**
     * CORS allowed origins — comma-separated list read from properties.
     * Dev:  application.properties        → http://localhost:5173,http://localhost:3000
     * Prod: application-prod.properties   → https://qb.learningshaper.com,...
     *
     * ✅ Domain বদলাতে হলে শুধু application-prod.properties-এ
     *    "app.cors.allowed-origins" লাইনটি আপডেট করুন — কোনো code পরিবর্তন লাগবে না।
     */
    @Value("${app.cors.allowed-origins:http://localhost:5173,http://localhost:3000}")
    private String corsAllowedOrigins;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(AbstractHttpConfigurer::disable)
                .headers(headers -> headers.frameOptions(frameOptions -> frameOptions.disable()))

                // ── Auth Entry Point ─────────────────────────────────────────────
                // JSON response — prevents Tomcat Whitelabel Error Page on 401
                .exceptionHandling(ex -> ex.authenticationEntryPoint((request, response, authException) -> {
                    response.setStatus(jakarta.servlet.http.HttpServletResponse.SC_UNAUTHORIZED);
                    response.setContentType("application/json;charset=UTF-8");
                    response.getWriter().write(
                            "{\"error\":\"Unauthorized\",\"message\":\"Token is missing or expired\"}"
                    );
                }))

                .authorizeHttpRequests(auth -> auth
                        // ── Public API endpoints ──────────────────────────────────
                        .requestMatchers("/api/v1/auth/**", "/api/v1/public/**", "/ws-live-updates/**", "/api/v1/exams/download/pdf/**", "/api/v1/exams/download/word/**", "/api/v1/exams/download/upload-temp/**").permitAll()
                        .requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll()

                        // ── All other /api/** must be authenticated ───────────────
                        .requestMatchers("/api/**").authenticated()

                        // ── Frontend SPA routes & static assets — always permitted ─
                        // SpaController forwards these to index.html;
                        // React Router + JWT handle auth on the client side.
                        .requestMatchers("/error", "/", "/index.html").permitAll()
                        .requestMatchers("/assets/**", "/static/**", "/*.ico", "/*.json", "/*.png", "/*.svg", "/*.js", "/*.css").permitAll()
                        .requestMatchers(HttpMethod.GET, "/**").permitAll()  // SPA route fallback

                        .anyRequest().authenticated())

                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authenticationConfiguration)
            throws Exception {
        return authenticationConfiguration.getAuthenticationManager();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        // Parse comma-separated origins from properties file
        List<String> origins = Arrays.asList(corsAllowedOrigins.split("\\s*,\\s*"));

        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOriginPatterns(origins);
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList("Authorization", "Content-Type", "X-Requested-With"));
        configuration.setExposedHeaders(List.of("Authorization"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
