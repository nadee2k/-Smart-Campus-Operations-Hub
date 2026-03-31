package com.smartcampus.activity.service;

import com.smartcampus.activity.entity.ActivityLog;
import com.smartcampus.activity.repository.ActivityLogRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

@Service
public class ActivityLogService {

    private final ActivityLogRepository repository;

    public ActivityLogService(ActivityLogRepository repository) {
        this.repository = repository;
    }

    @Async
    @Transactional
    public void log(Long actorId, String actorName, String action,
                    String targetType, Long targetId, String description) {
        ActivityLog log = new ActivityLog();
        log.setActorId(actorId);
        log.setActorName(actorName);
        log.setAction(action);
        log.setTargetType(targetType);
        log.setTargetId(targetId);
        log.setDescription(description);
        repository.save(log);
    }

    @Transactional(readOnly = true)
    public Page<Map<String, Object>> getAll(Pageable pageable) {
        return repository.findAllByOrderByCreatedAtDesc(pageable).map(this::toMap);
    }

    @Transactional(readOnly = true)
    public Page<Map<String, Object>> getByUser(Long actorId, Pageable pageable) {
        return repository.findByActorIdOrderByCreatedAtDesc(actorId, pageable).map(this::toMap);
    }

    private Map<String, Object> toMap(ActivityLog log) {
        return Map.of(
                "id", log.getId(),
                "actorId", log.getActorId() != null ? log.getActorId() : 0L,
                "actorName", log.getActorName() != null ? log.getActorName() : "System",
                "action", log.getAction(),
                "targetType", log.getTargetType() != null ? log.getTargetType() : "",
                "targetId", log.getTargetId() != null ? log.getTargetId() : 0L,
                "description", log.getDescription() != null ? log.getDescription() : "",
                "createdAt", log.getCreatedAt().toString()
        );
    }
}
