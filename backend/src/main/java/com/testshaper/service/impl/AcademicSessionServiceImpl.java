package com.testshaper.service.impl;

import com.testshaper.entity.AcademicSession;
import com.testshaper.repository.AcademicSessionRepository;
import com.testshaper.service.AcademicSessionService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class AcademicSessionServiceImpl implements AcademicSessionService {

    private final AcademicSessionRepository sessionRepository;

    @Override
    @Transactional
    public AcademicSession createSession(AcademicSession session) {
        if (session.isActive()) {
            deactivateAllOtherSessions(null);
        }
        return sessionRepository.save(session);
    }

    @Override
    @Transactional
    public AcademicSession updateSession(UUID id, AcademicSession sessionDetails) {
        AcademicSession existingSession = sessionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Session not found with ID: " + id));

        existingSession.setName(sessionDetails.getName());
        existingSession.setStartDate(sessionDetails.getStartDate());
        existingSession.setEndDate(sessionDetails.getEndDate());

        if (sessionDetails.isActive() && !existingSession.isActive()) {
            setActiveSession(id);
            existingSession.setActive(true); // Redundant here as setActiveSession handles it, but kept for clarity if
                                             // logic changes
        } else {
            existingSession.setActive(sessionDetails.isActive());
        }

        return sessionRepository.save(existingSession);
    }

    @Override
    public List<AcademicSession> getAllSessions() {
        return sessionRepository.findAll();
    }

    @Override
    public Optional<AcademicSession> getActiveSession() {
        return sessionRepository.findByIsActiveTrue();
    }

    @Override
    @Transactional
    public void deleteSession(UUID id) {
        sessionRepository.deleteById(id);
    }

    @Override
    @Transactional
    public void setActiveSession(UUID id) {
        // Deactivate currently active session
        deactivateAllOtherSessions(id);

        AcademicSession newActiveSession = sessionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Session not found with ID: " + id));
        newActiveSession.setActive(true);
        sessionRepository.save(newActiveSession);
    }

    private void deactivateAllOtherSessions(UUID excludeId) {
        List<AcademicSession> activeSessions = sessionRepository.findAll(); // Optimization: could be filtered query if
                                                                            // needed
        for (AcademicSession session : activeSessions) {
            if (session.isActive() && (excludeId == null || !session.getId().equals(excludeId))) {
                session.setActive(false);
                sessionRepository.save(session);
            }
        }
    }
}
