package com.smartcampus.resource.dto;

import com.smartcampus.resource.entity.ResourceStatus;
import com.smartcampus.resource.entity.ResourceType;

import java.time.LocalDateTime;
import java.time.LocalTime;

public record ResourceResponse(
        Long id,
        String name,
        ResourceType type,
        Integer capacity,
        String location,
        LocalTime availabilityStartTime,
        LocalTime availabilityEndTime,
        ResourceStatus status,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {}
