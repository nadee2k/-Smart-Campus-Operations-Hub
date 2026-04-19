package com.smartcampus.booking.service;

import com.smartcampus.auth.entity.Role;
import com.smartcampus.booking.dto.BookingRequest;
import com.smartcampus.booking.dto.BookingResponse;
import com.smartcampus.booking.entity.BookingStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

public interface BookingService {

    BookingResponse create(BookingRequest request, Long userId);

    BookingResponse getById(Long id, Long viewerUserId, Role viewerRole);

    Page<BookingResponse> getAll(Pageable pageable);

    Page<BookingResponse> getByUser(Long userId, Pageable pageable);

    Page<BookingResponse> getFiltered(BookingStatus status, Long resourceId,
                                      LocalDateTime startDate, LocalDateTime endDate,
                                      Pageable pageable);

    BookingResponse approve(Long id, String adminComment);

    BookingResponse reject(Long id, String adminComment);

    BookingResponse cancel(Long id, Long userId, String reason);

    BookingResponse checkIn(Long id, Long userId);

    List<BookingResponse> getCalendar(Long resourceId, LocalDateTime start, LocalDateTime end);

    List<Map<String, Object>> getSuggestions(Long resourceId, java.time.LocalDate date, int durationMinutes);
}
