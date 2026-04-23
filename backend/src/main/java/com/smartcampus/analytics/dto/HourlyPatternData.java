package com.smartcampus.analytics.dto;

/**
 * Data for hourly booking pattern across the week
 */
public record HourlyPatternData(
        int hour,
        double utilizationRate,
        int bookingCount
) {}
