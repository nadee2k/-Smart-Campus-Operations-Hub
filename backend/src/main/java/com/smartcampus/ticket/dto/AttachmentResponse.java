package com.smartcampus.ticket.dto;

import java.time.LocalDateTime;

public record AttachmentResponse(
        Long id,
        String fileName,
        String contentType,
        Long fileSize,
        LocalDateTime createdAt
) {}
