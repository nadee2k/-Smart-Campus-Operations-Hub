package com.smartcampus.auth.dto;

import com.smartcampus.auth.entity.Role;
import java.time.LocalDateTime;

public record UserResponse(
        Long id,
        String email,
        String name,
        String pictureUrl,
        Role role,
        LocalDateTime createdAt
) {}
