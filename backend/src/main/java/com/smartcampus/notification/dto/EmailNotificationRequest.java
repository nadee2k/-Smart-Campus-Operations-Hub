package com.smartcampus.notification.dto;

import java.util.List;

/**
 * DTO for email notification requests
 */
public record EmailNotificationRequest(
    String subject,
    String message,
    List<Long> userIds
) {}
