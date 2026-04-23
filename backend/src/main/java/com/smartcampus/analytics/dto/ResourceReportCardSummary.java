package com.smartcampus.analytics.dto;

import java.time.LocalDate;

public record ResourceReportCardSummary(
        Long resourceId,
        String resourceName,
        LocalDate weekStartDate,
        LocalDate weekEndDate,
        long totalBookings,
        long approvedBookings,
        long cancelledBookings,
        double bookedHours,
        long ticketsOpened,
        long ticketsResolved,
        double averageResolutionHours,
        int resourceScore
) {
}
