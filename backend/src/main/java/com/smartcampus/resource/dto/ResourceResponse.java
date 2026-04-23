package com.smartcampus.resource.dto;

import com.smartcampus.resource.entity.ResourceStatus;
import com.smartcampus.resource.entity.ResourceType;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

public record ResourceResponse(
        Long id,
        String name,
        ResourceType type,
        Integer capacity,
        String location,
        String description,
        List<String> amenities,
        List<String> photoUrls,
        String layoutMapUrl,
        String view360Url,
        String ownerName,
        String department,
        Integer maintenanceScore,
        LocalTime availabilityStartTime,
        LocalTime availabilityEndTime,
        ResourceStatus status,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {}
