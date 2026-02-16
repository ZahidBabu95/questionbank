package com.testshaper.controller;

import com.testshaper.entity.AcademicSession;
import com.testshaper.service.AcademicSessionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/academic/sessions")
@RequiredArgsConstructor
public class AcademicSessionController {

    private final AcademicSessionService sessionService;

    @GetMapping
    public ResponseEntity<List<AcademicSession>> getAllSessions() {
        return ResponseEntity.ok(sessionService.getAllSessions());
    }

    @GetMapping("/active")
    public ResponseEntity<AcademicSession> getActiveSession() {
        return sessionService.getActiveSession()
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.noContent().build());
    }

    @PostMapping
    public ResponseEntity<AcademicSession> createSession(@RequestBody AcademicSession session) {
        return ResponseEntity.ok(sessionService.createSession(session));
    }

    @PutMapping("/{id}")
    public ResponseEntity<AcademicSession> updateSession(@PathVariable UUID id, @RequestBody AcademicSession session) {
        return ResponseEntity.ok(sessionService.updateSession(id, session));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteSession(@PathVariable UUID id) {
        sessionService.deleteSession(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/activate")
    public ResponseEntity<Void> setActiveSession(@PathVariable UUID id) {
        sessionService.setActiveSession(id);
        return ResponseEntity.ok().build();
    }
}
