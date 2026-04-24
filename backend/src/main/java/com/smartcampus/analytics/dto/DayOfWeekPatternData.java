package com.smartcampus.analytics.dto;

/**
 * Data for day-of-week booking pattern
 */
public record DayOfWeekPatternData(
        String dayName,
        int dayOfWeek,
        double utilizationRate,
        int bookingCount
) {}
