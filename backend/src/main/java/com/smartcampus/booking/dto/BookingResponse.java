package com.smartcampus.booking.dto;

import com.smartcampus.booking.entity.BookingStatus;
import java.time.LocalDateTime;

public record BookingResponse(
        Long id,
        Long resourceId,
        String resourceName,
        Long userId,
        String userName,
        LocalDateTime startTime,
        LocalDateTime endTime,
        String purpose,
        Integer expectedAttendees,
        BookingStatus status,
        String adminComment,
        String cancellationReason,
        Boolean checkedIn,
        LocalDateTime checkedInAt,
        LocalDateTime createdAt
) {}
