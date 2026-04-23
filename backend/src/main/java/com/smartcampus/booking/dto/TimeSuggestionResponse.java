package com.smartcampus.booking.dto;

import java.time.LocalDateTime;

/**
 * Response DTO for smart time slot suggestions.
 * Includes scoring and reasoning for why a slot is recommended.
 */
public record TimeSuggestionResponse(
        LocalDateTime start,
        LocalDateTime end,
        String date,
        double score,
        String reasoning,
        int rank
) {
    /**
     * Create a suggestion from a Map response
     */
    public static TimeSuggestionResponse fromMap(java.util.Map<String, Object> map, int rank) {
        return new TimeSuggestionResponse(
                (LocalDateTime) map.get("start"),
                (LocalDateTime) map.get("end"),
                (String) map.get("date"),
                ((Number) map.getOrDefault("score", 0)).doubleValue(),
                (String) map.getOrDefault("reasoning", ""),
                rank
        );
    }
}
