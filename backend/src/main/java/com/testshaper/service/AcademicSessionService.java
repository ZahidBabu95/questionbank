package com.testshaper.service;

import com.testshaper.entity.AcademicSession;
import java.util.List;
import java.util.UUID;
import java.util.Optional;

public interface AcademicSessionService {
    AcademicSession createSession(AcademicSession session);

    AcademicSession updateSession(UUID id, AcademicSession session); // For setting active status or renaming

    List<AcademicSession> getAllSessions();

    Optional<AcademicSession> getActiveSession(); // Changed to Optional as there might be no active session initially

    void deleteSession(UUID id);

    void setActiveSession(UUID id);
}
