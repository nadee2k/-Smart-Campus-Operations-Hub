package com.smartcampus.analytics.controller;

import com.smartcampus.analytics.dto.DashboardStats;
import com.smartcampus.analytics.dto.DayOfWeekPatternData;
import com.smartcampus.analytics.dto.HourlyPatternData;
import com.smartcampus.analytics.dto.MostBookedResource;
import com.smartcampus.analytics.dto.PeakHourData;
import com.smartcampus.analytics.service.AnalyticsService;
import com.smartcampus.analytics.service.BookingPatternsService;
import com.smartcampus.config.security.AuthUtil;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/analytics")
public class AnalyticsController {

    private final AnalyticsService analyticsService;
    private final BookingPatternsService bookingPatternsService;

    public AnalyticsController(AnalyticsService analyticsService,
                               BookingPatternsService bookingPatternsService) {
        this.analyticsService = analyticsService;
        this.bookingPatternsService = bookingPatternsService;
    }

    @GetMapping("/dashboard")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<DashboardStats> getDashboard() {
        return ResponseEntity.ok(analyticsService.getDashboardStats());
    }

    @GetMapping("/bookings/peak-hours")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<PeakHourData>> getPeakHours() {
        return ResponseEntity.ok(analyticsService.getPeakHours());
    }

    @GetMapping("/resources/most-booked")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<MostBookedResource>> getMostBooked() {
        return ResponseEntity.ok(analyticsService.getMostBookedResources());
    }

    @GetMapping("/tickets/resolution-time")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> getResolutionTime() {
        return ResponseEntity.ok(analyticsService.getResolutionTimeStats());
    }

    @GetMapping("/technician/{id}/stats")
    @PreAuthorize("hasAnyRole('ADMIN', 'TECHNICIAN')")
    public ResponseEntity<Map<String, Object>> getTechnicianStats(@PathVariable Long id) {
        return ResponseEntity.ok(analyticsService.getTechnicianStats(id));
    }

    @GetMapping("/my-stats")
    public ResponseEntity<Map<String, Object>> getMyStats() {
        Long userId = AuthUtil.getCurrentUserId();
        return ResponseEntity.ok(analyticsService.getMyStats(userId));
    }

    @GetMapping("/sla-breaches")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> getSlaBreaches() {
        return ResponseEntity.ok(analyticsService.getSlaBreaches());
    }

    @GetMapping("/satisfaction-summary")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> getSatisfactionSummary() {
        return ResponseEntity.ok(analyticsService.getSatisfactionSummary());
    }

    @GetMapping("/technician-leaderboard")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<Map<String, Object>>> getTechnicianLeaderboard() {
        return ResponseEntity.ok(analyticsService.getTechnicianLeaderboard());
    }

    // New endpoints for smart time slot suggestion patterns

    @GetMapping("/resources/{resourceId}/patterns/hourly")
    public ResponseEntity<List<HourlyPatternData>> getHourlyPatterns(@PathVariable Long resourceId) {
        return ResponseEntity.ok(bookingPatternsService.getHourlyPatterns(resourceId));
    }

    @GetMapping("/resources/{resourceId}/patterns/day-of-week")
    public ResponseEntity<List<DayOfWeekPatternData>> getDayOfWeekPatterns(@PathVariable Long resourceId) {
        return ResponseEntity.ok(bookingPatternsService.getDayOfWeekPatterns(resourceId));
    }

    @GetMapping("/resources/{resourceId}/patterns/statistics")
    public ResponseEntity<Map<String, Object>> getBookingStatistics(@PathVariable Long resourceId) {
        return ResponseEntity.ok(bookingPatternsService.getBookingStatistics(resourceId));
    }
}
