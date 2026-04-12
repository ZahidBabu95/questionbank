package com.testshaper.service;

import com.testshaper.entity.UserActivityLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface UserActivityLogService {
    void log(UUID actorId, String actorName, UUID targetUserId, String targetUserName,
             String action, String description, String ipAddress);

    Page<UserActivityLog> getLogsForUser(UUID targetUserId, Pageable pageable);
    Page<UserActivityLog> getAllLogs(Pageable pageable);
}
