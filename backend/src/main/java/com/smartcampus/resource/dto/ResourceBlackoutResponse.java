package com.smartcampus.resource.dto;

import java.time.LocalDateTime;

public record ResourceBlackoutResponse(
        Long id,
        Long resourceId,
        String resourceName,
        String title,
        String reason,
        LocalDateTime startTime,
        LocalDateTime endTime,
        LocalDateTime createdAt
) {}
