package com.smartcampus.analytics.service;

import com.smartcampus.analytics.dto.DashboardStats;
import com.smartcampus.analytics.dto.MostBookedResource;
import com.smartcampus.analytics.dto.PeakHourData;
import com.smartcampus.auth.entity.Role;
import com.smartcampus.auth.entity.User;
import com.smartcampus.auth.repository.UserRepository;
import com.smartcampus.booking.entity.BookingStatus;
import com.smartcampus.booking.repository.BookingRepository;
import com.smartcampus.resource.repository.CampusResourceRepository;
import com.smartcampus.ticket.entity.TicketStatus;
import com.smartcampus.ticket.repository.TicketRepository;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class AnalyticsService {

    private final BookingRepository bookingRepository;
    private final TicketRepository ticketRepository;
    private final CampusResourceRepository resourceRepository;
    private final UserRepository userRepository;

    public AnalyticsService(BookingRepository bookingRepository,
                            TicketRepository ticketRepository,
                            CampusResourceRepository resourceRepository,
                            UserRepository userRepository) {
        this.bookingRepository = bookingRepository;
        this.ticketRepository = ticketRepository;
        this.resourceRepository = resourceRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    @Cacheable(value = "analytics-dashboard")
    public DashboardStats getDashboardStats() {
        long totalResources = resourceRepository.count();
        long totalBookings = bookingRepository.count();
        long pendingBookings = bookingRepository.findByStatus(BookingStatus.PENDING,
                org.springframework.data.domain.Pageable.unpaged()).getTotalElements();
        long totalTickets = ticketRepository.count();
        long openTickets = ticketRepository.findFiltered("OPEN", null, null,
                org.springframework.data.domain.Pageable.unpaged()).getTotalElements();
        long totalUsers = userRepository.count();

        List<Map<String, Object>> ticketsByStatus = ticketRepository.countByStatus().stream()
                .map(row -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("status", row[0].toString());
                    map.put("count", ((Number) row[1]).longValue());
                    return map;
                }).toList();

        Double avgResolutionSeconds = ticketRepository.averageResolutionTimeSeconds();
        Double avgResolutionHours = avgResolutionSeconds != null ? avgResolutionSeconds / 3600 : null;

        return new DashboardStats(
                totalResources, totalBookings, pendingBookings,
                totalTickets, openTickets, totalUsers,
                ticketsByStatus, avgResolutionHours
        );
    }

    @Transactional(readOnly = true)
    @Cacheable(value = "analytics-peak-hours")
    public List<PeakHourData> getPeakHours() {
        return bookingRepository.countByHour().stream()
                .map(row -> new PeakHourData(
                        ((Number) row[0]).intValue(),
                        ((Number) row[1]).longValue()))
                .toList();
    }

    @Transactional(readOnly = true)
    @Cacheable(value = "analytics-most-booked")
    public List<MostBookedResource> getMostBookedResources() {
        return bookingRepository.findMostBooked().stream()
                .map(row -> new MostBookedResource(
                        ((Number) row[0]).longValue(),
                        (String) row[1],
                        ((Number) row[2]).longValue()))
                .limit(10)
                .toList();
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getResolutionTimeStats() {
        Double avg = ticketRepository.averageResolutionTimeSeconds();
        Map<String, Object> stats = new HashMap<>();
        stats.put("averageResolutionTimeHours", avg != null ? avg / 3600 : 0);
        return stats;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getTechnicianStats(Long techId) {
        long assigned = ticketRepository.countOpenByTechnicianId(techId);
        long resolved = ticketRepository.countResolvedByTechnicianId(techId);
        Double avgSeconds = ticketRepository.averageResolutionTimeSeconds();
        double avgHours = avgSeconds != null ? avgSeconds / 3600.0 : 0;
        long total = assigned + resolved;
        double slaCompliance = total > 0 ? ((double) resolved / total) * 100 : 100;

        Map<String, Object> stats = new HashMap<>();
        stats.put("assignedCount", assigned);
        stats.put("resolvedCount", resolved);
        stats.put("avgResolutionHours", Math.round(avgHours * 10.0) / 10.0);
        stats.put("slaCompliancePercent", Math.round(slaCompliance * 10.0) / 10.0);
        return stats;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getMyStats(Long userId) {
        long totalBookings = bookingRepository.countByUserId(userId);
        long approvedBookings = bookingRepository.countApprovedByUserId(userId);
        long totalTickets = ticketRepository.countByCreatedById(userId);
        Double avgSatisfaction = ticketRepository.averageSatisfactionRating();

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalBookings", totalBookings);
        stats.put("approvedBookings", approvedBookings);
        stats.put("totalTickets", totalTickets);
        stats.put("avgSatisfaction", avgSatisfaction != null ? Math.round(avgSatisfaction * 10.0) / 10.0 : null);
        return stats;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getSlaBreaches() {
        long count = ticketRepository.countSlaBreaches();
        Map<String, Object> result = new HashMap<>();
        result.put("breachCount", count);
        return result;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getSatisfactionSummary() {
        Double avg = ticketRepository.averageSatisfactionRating();
        Map<String, Object> result = new HashMap<>();
        result.put("averageRating", avg != null ? Math.round(avg * 10.0) / 10.0 : null);
        return result;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getTechnicianLeaderboard() {
        List<User> technicians = userRepository.findByRole(Role.TECHNICIAN);
        return technicians.stream().map(tech -> {
            long resolved = ticketRepository.countResolvedByTechnicianId(tech.getId());
            long open = ticketRepository.countOpenByTechnicianId(tech.getId());
            Map<String, Object> entry = new HashMap<>();
            entry.put("id", tech.getId());
            entry.put("name", tech.getName());
            entry.put("resolved", resolved);
            entry.put("open", open);
            entry.put("total", resolved + open);
            return entry;
        }).sorted((a, b) -> Long.compare((Long) b.get("resolved"), (Long) a.get("resolved"))).toList();
    }
}
