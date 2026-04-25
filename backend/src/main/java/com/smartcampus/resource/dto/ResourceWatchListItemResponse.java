package com.smartcampus.resource.dto;

import java.time.LocalDateTime;

public record ResourceWatchListItemResponse(
        Long resourceId,
        String resourceName,
        String resourceType,
        String location,
        String status,
        Integer capacity,
        String description,
        long watcherCount,
        LocalDateTime watchedAt
) {
}
