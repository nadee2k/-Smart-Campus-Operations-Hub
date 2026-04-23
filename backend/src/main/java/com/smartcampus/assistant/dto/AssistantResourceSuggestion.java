package com.smartcampus.assistant.dto;

public record AssistantResourceSuggestion(
        Long id,
        String name,
        String type,
        Integer capacity,
        String location,
        String status,
        String reason,
        String bookingUrl
) {
}
