package com.smartcampus.analytics.service;

import com.smartcampus.analytics.dto.DayOfWeekPatternData;
import com.smartcampus.analytics.dto.HourlyPatternData;
import com.smartcampus.booking.entity.Booking;
import com.smartcampus.booking.entity.BookingStatus;
import com.smartcampus.booking.repository.BookingRepository;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

/**
 * Service for analyzing booking patterns and providing insights for smart time slot suggestions.
 */
@Service
public class BookingPatternsService {

    private final BookingRepository bookingRepository;

    public BookingPatternsService(BookingRepository bookingRepository) {
        this.bookingRepository = bookingRepository;
    }

    /**
     * Get hourly utilization patterns for a resource over the past 90 days
     */
    @Transactional(readOnly = true)
    @Cacheable(value = "hourly-patterns", key = "#resourceId")
    public List<HourlyPatternData> getHourlyPatterns(Long resourceId) {
        List<Booking> allBookings = bookingRepository.findByResourceIdAndStartTimeBetween(
                resourceId,
                LocalDateTime.now().minusDays(90),
                LocalDateTime.now()
        );

        Map<Integer, Integer> hourCounts = new HashMap<>();
        for (int i = 8; i < 22; i++) hourCounts.put(i, 0);

        for (Booking b : allBookings) {
            if (b.getStatus() == BookingStatus.APPROVED || b.getStatus() == BookingStatus.PENDING) {
                int hour = b.getStartTime().getHour();
                if (hour >= 8 && hour < 22) {
                    hourCounts.put(hour, hourCounts.get(hour) + 1);
                }
            }
        }

        int maxCount = hourCounts.values().stream().max(Integer::compareTo).orElse(1);
        List<HourlyPatternData> result = new ArrayList<>();
        for (int i = 8; i < 22; i++) {
            double utilizationRate = maxCount > 0 ? (double) hourCounts.get(i) / maxCount : 0.5;
            result.add(new HourlyPatternData(i, utilizationRate, hourCounts.get(i)));
        }

        return result;
    }

    /**
     * Get day-of-week utilization patterns for a resource over the past 90 days
     */
    @Transactional(readOnly = true)
    @Cacheable(value = "day-patterns", key = "#resourceId")
    public List<DayOfWeekPatternData> getDayOfWeekPatterns(Long resourceId) {
        List<Booking> allBookings = bookingRepository.findByResourceIdAndStartTimeBetween(
                resourceId,
                LocalDateTime.now().minusDays(90),
                LocalDateTime.now()
        );

        Map<Integer, Integer> dayCounts = new HashMap<>();
        for (int i = 1; i <= 7; i++) dayCounts.put(i, 0);

        for (Booking b : allBookings) {
            if (b.getStatus() == BookingStatus.APPROVED || b.getStatus() == BookingStatus.PENDING) {
                int dayOfWeek = b.getStartTime().getDayOfWeek().getValue();
                dayCounts.put(dayOfWeek, dayCounts.get(dayOfWeek) + 1);
            }
        }

        int maxCount = dayCounts.values().stream().max(Integer::compareTo).orElse(1);
        List<DayOfWeekPatternData> result = new ArrayList<>();
        String[] dayNames = {"", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"};
        
        for (int i = 1; i <= 7; i++) {
            double utilizationRate = maxCount > 0 ? (double) dayCounts.get(i) / maxCount : 0.5;
            result.add(new DayOfWeekPatternData(dayNames[i], i, utilizationRate, dayCounts.get(i)));
        }

        return result;
    }

    /**
     * Get overall statistics for a resource's booking patterns
     */
    @Transactional(readOnly = true)
    @Cacheable(value = "booking-stats", key = "#resourceId")
    public Map<String, Object> getBookingStatistics(Long resourceId) {
        List<Booking> allBookings = bookingRepository.findByResourceIdAndStartTimeBetween(
                resourceId,
                LocalDateTime.now().minusDays(90),
                LocalDateTime.now()
        );

        long totalBookings = allBookings.size();
        long approvedBookings = allBookings.stream()
                .filter(b -> b.getStatus() == BookingStatus.APPROVED)
                .count();
        long pendingBookings = allBookings.stream()
                .filter(b -> b.getStatus() == BookingStatus.PENDING)
                .count();
        long cancelledBookings = allBookings.stream()
                .filter(b -> b.getStatus() == BookingStatus.CANCELLED)
                .count();
        long rejectedBookings = allBookings.stream()
                .filter(b -> b.getStatus() == BookingStatus.REJECTED)
                .count();

        long checkedInBookings = allBookings.stream()
                .filter(b -> b.getStatus() == BookingStatus.APPROVED && b.getCheckedIn())
                .count();

        double approvalRate = totalBookings > 0 ? ((double) approvedBookings / totalBookings) * 100 : 0;
        double checkInRate = approvedBookings > 0 ? ((double) checkedInBookings / approvedBookings) * 100 : 0;
        double cancellationRate = totalBookings > 0 ? ((double) cancelledBookings / totalBookings) * 100 : 0;

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalBookings", totalBookings);
        stats.put("approvedBookings", approvedBookings);
        stats.put("pendingBookings", pendingBookings);
        stats.put("cancelledBookings", cancelledBookings);
        stats.put("rejectedBookings", rejectedBookings);
        stats.put("checkedInBookings", checkedInBookings);
        stats.put("approvalRate", String.format("%.1f%%", approvalRate));
        stats.put("checkInRate", String.format("%.1f%%", checkInRate));
        stats.put("cancellationRate", String.format("%.1f%%", cancellationRate));
        stats.put("peakDay", getPeakDay(allBookings));
        stats.put("peakHour", getPeakHour(allBookings));
        stats.put("averageAttendees", calculateAverageAttendees(allBookings));

        return stats;
    }

    /**
     * Find the day of week with most bookings
     */
    private String getPeakDay(List<Booking> bookings) {
        Map<Integer, Integer> dayCounts = new HashMap<>();
        for (int i = 1; i <= 7; i++) dayCounts.put(i, 0);

        for (Booking b : bookings) {
            if (b.getStatus() == BookingStatus.APPROVED) {
                int dayOfWeek = b.getStartTime().getDayOfWeek().getValue();
                dayCounts.put(dayOfWeek, dayCounts.get(dayOfWeek) + 1);
            }
        }

        int maxDay = dayCounts.entrySet().stream()
                .max(Map.Entry.comparingByValue())
                .map(Map.Entry::getKey)
                .orElse(1);

        String[] dayNames = {"", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"};
        return dayNames[maxDay];
    }

    /**
     * Find the hour with most bookings
     */
    private int getPeakHour(List<Booking> bookings) {
        Map<Integer, Integer> hourCounts = new HashMap<>();
        for (int i = 8; i < 22; i++) hourCounts.put(i, 0);

        for (Booking b : bookings) {
            if (b.getStatus() == BookingStatus.APPROVED) {
                int hour = b.getStartTime().getHour();
                if (hour >= 8 && hour < 22) {
                    hourCounts.put(hour, hourCounts.get(hour) + 1);
                }
            }
        }

        return hourCounts.entrySet().stream()
                .max(Map.Entry.comparingByValue())
                .map(Map.Entry::getKey)
                .orElse(12);
    }

    /**
     * Calculate average number of attendees per booking
     */
    private double calculateAverageAttendees(List<Booking> bookings) {
        if (bookings.isEmpty()) return 0;
        return bookings.stream()
                .mapToInt(Booking::getExpectedAttendees)
                .average()
                .orElse(0);
    }
}
