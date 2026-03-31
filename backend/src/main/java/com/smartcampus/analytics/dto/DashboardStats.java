package com.smartcampus.analytics.dto;

import java.util.List;
import java.util.Map;

public record DashboardStats(
        long totalResources,
        long totalBookings,
        long pendingBookings,
        long totalTickets,
        long openTickets,
        long totalUsers,
        List<Map<String, Object>> ticketsByStatus,
        Double avgResolutionTimeHours
) {}
