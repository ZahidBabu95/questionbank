package com.testshaper.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

import com.testshaper.entity.User;
import com.testshaper.repository.UserRepository;
import com.testshaper.service.SecuritySettingService;
import org.springframework.beans.factory.annotation.Autowired;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Component
public class JwtTokenProvider {

    @Value("${app.jwt-secret}")
    private String jwtSecret;

    @Value("${app.jwt-expiration-milliseconds}")
    private long jwtExpirationDate;

    @Autowired
    private SecuritySettingService securityService;
    @Autowired
    private UserRepository userRepository;

    public String generateToken(Authentication authentication) {
        String username = authentication.getName();

        // Fetch Tenant ID for dynamic expiry
        String tenantId = null;
        try {
            User user = userRepository.findByEmail(username).orElse(null);
            if (user != null && user.getInstitute() != null) {
                tenantId = user.getInstitute().getId().toString();
            }
        } catch (Exception e) {
            // Log error or fallback
        }

        long expiryMinutes = securityService.getAccessTokenExpiryMinutes(tenantId);
        Date currentDate = new Date();
        Date expireDate = new Date(currentDate.getTime() + (expiryMinutes * 60 * 1000));

        SecretKey key = Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));

        return Jwts.builder()
                .setSubject(username)
                .setIssuedAt(new Date())
                .setExpiration(expireDate)
                .signWith(key, SignatureAlgorithm.HS256)
                .compact();
    }

    public String getUsername(String token) {
        SecretKey key = Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));

        Claims claims = Jwts.parserBuilder()
                .setSigningKey(key)
                .build()
                .parseClaimsJws(token)
                .getBody();
        return claims.getSubject();
    }

    public boolean validateToken(String token) {
        try {
            SecretKey key = Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
            Jwts.parserBuilder()
                    .setSigningKey(key)
                    .build()
                    .parseClaimsJws(token);
            return true;
        } catch (MalformedJwtException ex) {
            // Invalid JWT token
        } catch (ExpiredJwtException ex) {
            // Expired JWT token
        } catch (UnsupportedJwtException ex) {
            // Unsupported JWT token
        } catch (IllegalArgumentException ex) {
            // JWT claims string is empty
        } catch (io.jsonwebtoken.security.SignatureException ex) {
            // JWT signature does not match
        }
        return false;
    }
}
