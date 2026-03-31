package com.smartcampus.ticket.dto;

import java.time.LocalDateTime;

public record CommentResponse(
        Long id,
        Long ticketId,
        Long userId,
        String userName,
        String userPictureUrl,
        String userRole,
        String content,
        Boolean isInternal,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {}
