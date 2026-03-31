package com.smartcampus.notification.dto;

import java.time.LocalDateTime;

public record NotificationResponse(
        Long id,
        String type,
        String message,
        Boolean isRead,
        String referenceType,
        Long referenceId,
        LocalDateTime createdAt
) {}
