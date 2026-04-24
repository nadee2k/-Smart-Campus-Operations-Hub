package com.smartcampus.resource.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record WeeklyResourceReportResponse(
        Long resourceId,
        String resourceName,
        String resourceType,
        String location,
        String department,
        Integer maintenanceScore,
        LocalDate weekStart,
        LocalDate weekEnd,
        LocalDateTime generatedAt,
        long totalBookings,
        long approvedBookings,
        long pendingBookings,
        long cancelledBookings,
        long rejectedBookings,
        long checkedInBookings,
        long totalExpectedAttendees,
        double averageAttendees,
        double totalReservedHours,
        double checkInRate,
        String busiestDay,
        String busiestTimeRange,
        long ticketsOpened,
        long ticketsResolved,
        long openTickets,
        String utilizationBand,
        String operationalSummary
) {
}
