package com.smartcampus.resource.dto;

import java.time.LocalDateTime;

public record ResourceReviewResponse(
        Long id,
        Long resourceId,
        Long userId,
        String userName,
        String userPictureUrl,
        Integer rating,
        String comment,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {}
