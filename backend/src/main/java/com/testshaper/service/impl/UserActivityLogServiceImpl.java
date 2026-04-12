package com.testshaper.service.impl;

import com.testshaper.entity.UserActivityLog;
import com.testshaper.repository.UserActivityLogRepository;
import com.testshaper.service.UserActivityLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserActivityLogServiceImpl implements UserActivityLogService {

    private final UserActivityLogRepository repo;

    @Override
    @Async
    public void log(UUID actorId, String actorName, UUID targetUserId, String targetUserName,
                    String action, String description, String ipAddress) {
        UserActivityLog log = new UserActivityLog();
        log.setActorId(actorId);
        log.setActorName(actorName);
        log.setTargetUserId(targetUserId);
        log.setTargetUserName(targetUserName);
        log.setAction(action);
        log.setDescription(description);
        log.setIpAddress(ipAddress);
        repo.save(log);
    }

    @Override
    public Page<UserActivityLog> getLogsForUser(UUID targetUserId, Pageable pageable) {
        return repo.findByTargetUserIdOrderByCreatedAtDesc(targetUserId, pageable);
    }

    @Override
    public Page<UserActivityLog> getAllLogs(Pageable pageable) {
        return repo.findAllByOrderByCreatedAtDesc(pageable);
    }
}
