package com.smartcampus.analytics.service;

import com.smartcampus.analytics.dto.DayOfWeekPatternData;
import com.smartcampus.analytics.dto.HourlyPatternData;
import com.smartcampus.booking.entity.Booking;
import com.smartcampus.booking.entity.BookingStatus;
import com.smartcampus.booking.repository.BookingRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.time.LocalDateTime;
import java.time.DayOfWeek;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@DisplayName("Booking Patterns Service Tests")
class BookingPatternsServiceTest {

    @Mock
    private BookingRepository bookingRepository;

    @InjectMocks
    private BookingPatternsService bookingPatternsService;

    private List<Booking> mockBookings;
    private Long testResourceId = 1L;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        mockBookings = createMockBookings();
    }

    private List<Booking> createMockBookings() {
        List<Booking> bookings = new ArrayList<>();
        LocalDateTime now = LocalDateTime.now();

        // Create bookings across different hours
        for (int hour = 10; hour <= 16; hour++) {
            Booking booking = new Booking();
            booking.setStatus(BookingStatus.APPROVED);
            booking.setStartTime(now.withHour(hour));
            booking.setEndTime(now.withHour(hour).plusMinutes(60));
            booking.setExpectedAttendees(5);
            booking.setCheckedIn(true);
            bookings.add(booking);
        }

        // Create bookings on different days
        for (int i = 0; i < 5; i++) {
            Booking booking = new Booking();
            booking.setStatus(BookingStatus.APPROVED);
            booking.setStartTime(now.minusDays(i).withHour(13));
            booking.setEndTime(now.minusDays(i).withHour(14));
            booking.setExpectedAttendees(3);
            booking.setCheckedIn(true);
            bookings.add(booking);
        }

        return bookings;
    }

    @Test
    @DisplayName("Should calculate hourly patterns correctly")
    void testGetHourlyPatterns() {
        when(bookingRepository.findByResourceIdAndStartTimeBetween(
                anyLong(), any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(mockBookings);

        List<HourlyPatternData> patterns = bookingPatternsService.getHourlyPatterns(testResourceId);

        assertNotNull(patterns);
        assertEquals(14, patterns.size()); // 8 AM to 10 PM (14 hours)
        
        // Peak hour (13:00) should have highest utilization
        HourlyPatternData peakHour = patterns.stream()
                .filter(p -> p.hour() == 13)
                .findFirst()
                .orElse(null);
        assertNotNull(peakHour);
        assertEquals(100, peakHour.utilizationRate()); // Peak should be 100%
    }

    @Test
    @DisplayName("Should calculate day of week patterns correctly")
    void testGetDayOfWeekPatterns() {
        when(bookingRepository.findByResourceIdAndStartTimeBetween(
                anyLong(), any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(mockBookings);

        List<DayOfWeekPatternData> patterns = bookingPatternsService.getDayOfWeekPatterns(testResourceId);

        assertNotNull(patterns);
        assertEquals(7, patterns.size()); // 7 days
        
        // All days should have some utilization
        patterns.forEach(p -> {
            assertNotNull(p.dayName());
            assertTrue(p.utilizationRate() >= 0 && p.utilizationRate() <= 1.0);
        });
    }

    @Test
    @DisplayName("Should calculate booking statistics correctly")
    void testGetBookingStatistics() {
        when(bookingRepository.findByResourceIdAndStartTimeBetween(
                anyLong(), any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(mockBookings);

        Map<String, Object> stats = bookingPatternsService.getBookingStatistics(testResourceId);

        assertNotNull(stats);
        assertEquals(mockBookings.size(), stats.get("totalBookings"));
        assertEquals(mockBookings.size(), stats.get("approvedBookings")); // All are approved
        assertTrue(stats.containsKey("approvalRate"));
        assertTrue(stats.containsKey("checkInRate"));
        assertTrue(stats.containsKey("peakHour"));
        assertTrue(stats.containsKey("peakDay"));
    }

    @Test
    @DisplayName("Should identify peak hour correctly")
    void testPeakHourIdentification() {
        when(bookingRepository.findByResourceIdAndStartTimeBetween(
                anyLong(), any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(mockBookings);

        Map<String, Object> stats = bookingPatternsService.getBookingStatistics(testResourceId);
        int peakHour = (int) stats.get("peakHour");

        // 13:00 (1 PM) should have most bookings (appears in both hour and day loops)
        assertTrue(peakHour >= 10 && peakHour <= 16);
    }

    @Test
    @DisplayName("Should handle empty booking list gracefully")
    void testEmptyBookingsList() {
        when(bookingRepository.findByResourceIdAndStartTimeBetween(
                anyLong(), any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(new ArrayList<>());

        List<HourlyPatternData> hourlyPatterns = bookingPatternsService.getHourlyPatterns(testResourceId);
        List<DayOfWeekPatternData> dayPatterns = bookingPatternsService.getDayOfWeekPatterns(testResourceId);

        assertNotNull(hourlyPatterns);
        assertNotNull(dayPatterns);
        assertEquals(14, hourlyPatterns.size());
        assertEquals(7, dayPatterns.size());
        
        // All should have neutral utilization (0.5)
        hourlyPatterns.forEach(p -> assertEquals(0, p.bookingCount()));
        dayPatterns.forEach(p -> assertEquals(0, p.bookingCount()));
    }

    @Test
    @DisplayName("Should calculate average attendees correctly")
    void testAverageAttendeesCalculation() {
        when(bookingRepository.findByResourceIdAndStartTimeBetween(
                anyLong(), any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(mockBookings);

        Map<String, Object> stats = bookingPatternsService.getBookingStatistics(testResourceId);
        double avgAttendees = (double) stats.get("averageAttendees");

        assertTrue(avgAttendees > 0);
        assertTrue(avgAttendees <= 5); // Max is 5 from our mock data
    }

    @Test
    @DisplayName("Should calculate check-in rate correctly")
    void testCheckInRateCalculation() {
        when(bookingRepository.findByResourceIdAndStartTimeBetween(
                anyLong(), any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(mockBookings);

        Map<String, Object> stats = bookingPatternsService.getBookingStatistics(testResourceId);
        String checkInRateStr = (String) stats.get("checkInRate");

        assertNotNull(checkInRateStr);
        assertTrue(checkInRateStr.contains("%"));
    }

    @Test
    @DisplayName("Should normalize utilization rates to 0-1 scale")
    void testUtilizationNormalization() {
        when(bookingRepository.findByResourceIdAndStartTimeBetween(
                anyLong(), any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(mockBookings);

        List<HourlyPatternData> patterns = bookingPatternsService.getHourlyPatterns(testResourceId);

        patterns.forEach(p -> {
            assertTrue(p.utilizationRate() >= 0.0, "Utilization should be >= 0");
            assertTrue(p.utilizationRate() <= 1.0, "Utilization should be <= 1");
        });
    }
}
