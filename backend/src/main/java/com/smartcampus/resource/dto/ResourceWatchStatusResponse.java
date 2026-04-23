package com.smartcampus.resource.dto;

public record ResourceWatchStatusResponse(
        Long resourceId,
        boolean watching,
        long watcherCount
) {
}
