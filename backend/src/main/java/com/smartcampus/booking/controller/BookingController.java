package com.smartcampus.booking.controller;

import com.smartcampus.auth.entity.User;
import com.smartcampus.booking.dto.BookingActionRequest;
import com.smartcampus.booking.dto.BookingRequest;
import com.smartcampus.booking.dto.BookingResponse;
import com.smartcampus.booking.entity.BookingStatus;
import com.smartcampus.booking.service.BookingService;
import com.smartcampus.common.dto.PageResponse;
import com.smartcampus.config.security.AuthUtil;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/bookings")
public class BookingController {

    private final BookingService bookingService;

    public BookingController(BookingService bookingService) {
        this.bookingService = bookingService;
    }

    @PostMapping
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<BookingResponse> create(@Valid @RequestBody BookingRequest request) {
        Long userId = AuthUtil.getCurrentUserId();
        BookingResponse created = bookingService.create(request, userId);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @GetMapping("/{id}")
    public ResponseEntity<BookingResponse> getById(@PathVariable Long id) {
        User viewer = AuthUtil.getCurrentUser();
        return ResponseEntity.ok(bookingService.getById(id, viewer.getId(), viewer.getRole()));
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<PageResponse<BookingResponse>> getAll(
            @RequestParam(required = false) BookingStatus status,
            @RequestParam(required = false) Long resourceId,
            @RequestParam(required = false) LocalDateTime startDate,
            @RequestParam(required = false) LocalDateTime endDate,
            @PageableDefault(size = 10, sort = "created_at") Pageable pageable) {
        return ResponseEntity.ok(PageResponse.of(
                bookingService.getFiltered(status, resourceId, startDate, endDate, pageable)));
    }

    @GetMapping("/my")
    public ResponseEntity<PageResponse<BookingResponse>> getMyBookings(
            @PageableDefault(size = 10, sort = "createdAt") Pageable pageable) {
        Long userId = AuthUtil.getCurrentUserId();
        return ResponseEntity.ok(PageResponse.of(bookingService.getByUser(userId, pageable)));
    }

    @PatchMapping("/{id}/approve")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<BookingResponse> approve(@PathVariable Long id,
                                                   @RequestBody(required = false) BookingActionRequest request) {
        String comment = request != null ? request.getAdminComment() : null;
        return ResponseEntity.ok(bookingService.approve(id, comment));
    }

    @PatchMapping("/{id}/reject")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<BookingResponse> reject(@PathVariable Long id,
                                                  @RequestBody(required = false) BookingActionRequest request) {
        String comment = request != null ? request.getAdminComment() : null;
        return ResponseEntity.ok(bookingService.reject(id, comment));
    }

    @PatchMapping("/{id}/cancel")
    public ResponseEntity<BookingResponse> cancel(@PathVariable Long id,
                                                  @RequestBody(required = false) java.util.Map<String, String> body) {
        Long userId = AuthUtil.getCurrentUserId();
        String reason = body != null ? body.get("reason") : null;
        return ResponseEntity.ok(bookingService.cancel(id, userId, reason));
    }

    @PatchMapping("/{id}/check-in")
    public ResponseEntity<BookingResponse> checkIn(@PathVariable Long id) {
        Long userId = AuthUtil.getCurrentUserId();
        return ResponseEntity.ok(bookingService.checkIn(id, userId));
    }

    @GetMapping("/calendar")
    public ResponseEntity<java.util.List<BookingResponse>> getCalendar(
            @RequestParam Long resourceId,
            @RequestParam @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
            @RequestParam @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE_TIME) LocalDateTime end) {
        return ResponseEntity.ok(bookingService.getCalendar(resourceId, start, end));
    }

    @GetMapping("/suggestions")
    public ResponseEntity<java.util.List<java.util.Map<String, Object>>> getSuggestions(
            @RequestParam Long resourceId,
            @RequestParam @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) java.time.LocalDate date,
            @RequestParam(defaultValue = "60") int duration) {
        return ResponseEntity.ok(bookingService.getSuggestions(resourceId, date, duration));
    }
}
