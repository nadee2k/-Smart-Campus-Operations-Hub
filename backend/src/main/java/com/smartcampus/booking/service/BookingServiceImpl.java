package com.smartcampus.booking.service;

import com.smartcampus.activity.service.ActivityLogService;
import com.smartcampus.auth.entity.User;
import com.smartcampus.auth.service.UserService;
import com.smartcampus.booking.dto.BookingRequest;
import com.smartcampus.booking.dto.BookingResponse;
import com.smartcampus.booking.entity.Booking;
import com.smartcampus.booking.entity.BookingStatus;
import com.smartcampus.booking.repository.BookingRepository;
import com.smartcampus.common.exception.BadRequestException;
import com.smartcampus.common.exception.ConflictException;
import com.smartcampus.common.exception.ResourceNotFoundException;
import com.smartcampus.notification.service.NotificationService;
import com.smartcampus.resource.entity.CampusResource;
import com.smartcampus.resource.repository.CampusResourceRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class BookingServiceImpl implements BookingService {

    private final BookingRepository bookingRepository;
    private final CampusResourceRepository resourceRepository;
    private final UserService userService;
    private final NotificationService notificationService;
    private final ActivityLogService activityLogService;

    public BookingServiceImpl(BookingRepository bookingRepository,
                              CampusResourceRepository resourceRepository,
                              UserService userService,
                              NotificationService notificationService,
                              ActivityLogService activityLogService) {
        this.bookingRepository = bookingRepository;
        this.resourceRepository = resourceRepository;
        this.userService = userService;
        this.notificationService = notificationService;
        this.activityLogService = activityLogService;
    }

    @Override
    @Transactional
    public BookingResponse create(BookingRequest request, Long userId) {
        if (request.getEndTime().isBefore(request.getStartTime()) ||
            request.getEndTime().isEqual(request.getStartTime())) {
            throw new BadRequestException("End time must be after start time");
        }

        CampusResource resource = resourceRepository.findById(request.getResourceId())
                .orElseThrow(() -> new ResourceNotFoundException("Resource", request.getResourceId()));

        if (resource.getDeleted()) {
            throw new ResourceNotFoundException("Resource", request.getResourceId());
        }

        List<Booking> conflicts = bookingRepository.findConflicting(
                resource.getId(), request.getStartTime(), request.getEndTime());
        if (!conflicts.isEmpty()) {
            throw new ConflictException("Time slot conflicts with an existing booking");
        }

        User user = userService.findById(userId);

        Booking booking = new Booking();
        booking.setResource(resource);
        booking.setUser(user);
        booking.setStartTime(request.getStartTime());
        booking.setEndTime(request.getEndTime());
        booking.setPurpose(request.getPurpose());
        booking.setExpectedAttendees(request.getExpectedAttendees());
        booking.setStatus(BookingStatus.PENDING);

        Booking saved = bookingRepository.save(booking);
        activityLogService.log(userId, user.getName(), "BOOKING_CREATED", "BOOKING", saved.getId(), "Booked " + resource.getName());
        return toResponse(saved);
    }

    @Override
    @Transactional
    public BookingResponse update(Long id, BookingRequest request, Long userId) {
        Booking booking = findById(id);

        if (!booking.getUser().getId().equals(userId)) {
            throw new com.smartcampus.common.exception.AccessDeniedException("You can only edit your own bookings");
        }
        if (booking.getStatus() != BookingStatus.PENDING) {
            throw new BadRequestException("Only pending bookings can be edited");
        }
        if (request.getEndTime().isBefore(request.getStartTime()) ||
            request.getEndTime().isEqual(request.getStartTime())) {
            throw new BadRequestException("End time must be after start time");
        }

        CampusResource resource = resourceRepository.findById(request.getResourceId())
                .orElseThrow(() -> new ResourceNotFoundException("Resource", request.getResourceId()));
        if (resource.getDeleted()) {
            throw new ResourceNotFoundException("Resource", request.getResourceId());
        }

        List<Booking> conflicts = bookingRepository.findConflicting(
                resource.getId(), request.getStartTime(), request.getEndTime());
        conflicts.removeIf(c -> c.getId().equals(id));
        if (!conflicts.isEmpty()) {
            throw new ConflictException("Time slot conflicts with an existing booking");
        }

        booking.setResource(resource);
        booking.setStartTime(request.getStartTime());
        booking.setEndTime(request.getEndTime());
        booking.setPurpose(request.getPurpose());
        booking.setExpectedAttendees(request.getExpectedAttendees());

        Booking saved = bookingRepository.save(booking);
        activityLogService.log(userId, booking.getUser().getName(), "BOOKING_UPDATED", "BOOKING", saved.getId(), "Updated booking for " + resource.getName());
        return toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public BookingResponse getById(Long id) {
        Booking booking = findById(id);
        return toResponse(booking);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<BookingResponse> getAll(Pageable pageable) {
        return bookingRepository.findAll(pageable).map(this::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<BookingResponse> getByUser(Long userId, Pageable pageable) {
        return bookingRepository.findByUserId(userId, pageable).map(this::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<BookingResponse> getFiltered(BookingStatus status, Long resourceId,
                                             LocalDateTime startDate, LocalDateTime endDate,
                                             Pageable pageable) {
        String statusStr = status != null ? status.name() : null;
        return bookingRepository.findFiltered(statusStr, resourceId, startDate, endDate, pageable)
                .map(this::toResponse);
    }

    @Override
    @Transactional
    public BookingResponse approve(Long id, String adminComment) {
        Booking booking = findById(id);
        validateTransition(booking, BookingStatus.APPROVED);
        booking.setStatus(BookingStatus.APPROVED);
        booking.setAdminComment(adminComment);
        Booking saved = bookingRepository.save(booking);
        activityLogService.log(null, "Admin", "BOOKING_APPROVED", "BOOKING", saved.getId(), "Approved booking for " + booking.getResource().getName());

        notificationService.sendNotification(
                booking.getUser().getId(),
                "BOOKING_APPROVED",
                "Your booking for " + booking.getResource().getName() + " has been approved.",
                "BOOKING", booking.getId());

        return toResponse(saved);
    }

    @Override
    @Transactional
    public BookingResponse reject(Long id, String adminComment) {
        Booking booking = findById(id);
        validateTransition(booking, BookingStatus.REJECTED);
        booking.setStatus(BookingStatus.REJECTED);
        booking.setAdminComment(adminComment);
        Booking saved = bookingRepository.save(booking);
        activityLogService.log(null, "Admin", "BOOKING_REJECTED", "BOOKING", saved.getId(), "Rejected booking for " + booking.getResource().getName());

        notificationService.sendNotification(
                booking.getUser().getId(),
                "BOOKING_REJECTED",
                "Your booking for " + booking.getResource().getName() + " has been rejected.",
                "BOOKING", booking.getId());

        return toResponse(saved);
    }

    @Override
    @Transactional
    public BookingResponse cancel(Long id, Long userId, String reason) {
        Booking booking = findById(id);
        if (!booking.getUser().getId().equals(userId)) {
            throw new com.smartcampus.common.exception.AccessDeniedException("You can only cancel your own bookings");
        }
        validateTransition(booking, BookingStatus.CANCELLED);
        booking.setStatus(BookingStatus.CANCELLED);
        if (reason != null && !reason.isBlank()) {
            booking.setCancellationReason(reason);
        }
        Booking saved = bookingRepository.save(booking);
        activityLogService.log(userId, booking.getUser().getName(), "BOOKING_CANCELLED", "BOOKING", saved.getId(), "Cancelled booking for " + booking.getResource().getName());
        return toResponse(saved);
    }

    @Override
    @Transactional
    public BookingResponse checkIn(Long id, Long userId) {
        Booking booking = findById(id);
        if (!booking.getUser().getId().equals(userId)) {
            throw new com.smartcampus.common.exception.AccessDeniedException("You can only check in to your own bookings");
        }
        if (booking.getStatus() != BookingStatus.APPROVED) {
            throw new com.smartcampus.common.exception.BadRequestException("Can only check in to approved bookings");
        }
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime earliest = booking.getStartTime().minusMinutes(15);
        if (now.isBefore(earliest)) {
            throw new com.smartcampus.common.exception.BadRequestException("Check-in opens 15 minutes before start time");
        }
        booking.setCheckedIn(true);
        booking.setCheckedInAt(now);
        Booking saved = bookingRepository.save(booking);
        activityLogService.log(userId, booking.getUser().getName(), "BOOKING_CHECKED_IN", "BOOKING", saved.getId(), "Checked in to " + booking.getResource().getName());
        return toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<BookingResponse> getCalendar(Long resourceId, LocalDateTime start, LocalDateTime end) {
        return bookingRepository.findByResourceIdAndStartTimeBetween(resourceId, start, end)
                .stream().map(this::toResponse).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getSuggestions(Long resourceId, java.time.LocalDate date, int durationMinutes) {
        List<Map<String, Object>> suggestions = new ArrayList<>();
        for (int dayOffset = 0; dayOffset < 3 && suggestions.size() < 5; dayOffset++) {
            java.time.LocalDate checkDate = date.plusDays(dayOffset);
            LocalDateTime dayStart = checkDate.atTime(8, 0);
            LocalDateTime dayEnd = checkDate.atTime(22, 0);

            List<Booking> existing = bookingRepository.findByResourceIdAndStartTimeBetween(
                    resourceId, dayStart, dayEnd);
            existing.sort((a, b) -> a.getStartTime().compareTo(b.getStartTime()));

            LocalDateTime slotStart = dayStart;
            for (Booking b : existing) {
                if (b.getStatus() == BookingStatus.CANCELLED || b.getStatus() == BookingStatus.REJECTED) continue;
                LocalDateTime slotEnd = slotStart.plusMinutes(durationMinutes);
                if (!slotEnd.isAfter(b.getStartTime()) && !slotEnd.isAfter(dayEnd)) {
                    Map<String, Object> slot = new HashMap<>();
                    slot.put("start", slotStart.toString());
                    slot.put("end", slotEnd.toString());
                    slot.put("date", checkDate.toString());
                    suggestions.add(slot);
                    if (suggestions.size() >= 5) break;
                }
                slotStart = b.getEndTime();
            }
            if (suggestions.size() < 5) {
                LocalDateTime slotEnd = slotStart.plusMinutes(durationMinutes);
                if (!slotEnd.isAfter(dayEnd)) {
                    Map<String, Object> slot = new HashMap<>();
                    slot.put("start", slotStart.toString());
                    slot.put("end", slotEnd.toString());
                    slot.put("date", checkDate.toString());
                    suggestions.add(slot);
                }
            }
        }
        return suggestions;
    }

    private void validateTransition(Booking booking, BookingStatus target) {
        BookingStatus current = booking.getStatus();
        boolean valid = switch (target) {
            case APPROVED, REJECTED -> current == BookingStatus.PENDING;
            case CANCELLED -> current == BookingStatus.PENDING || current == BookingStatus.APPROVED;
            default -> false;
        };
        if (!valid) {
            throw new BadRequestException(
                    "Cannot transition from " + current + " to " + target);
        }
    }

    private Booking findById(Long id) {
        return bookingRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Booking", id));
    }

    private BookingResponse toResponse(Booking b) {
        return new BookingResponse(
                b.getId(),
                b.getResource().getId(),
                b.getResource().getName(),
                b.getUser().getId(),
                b.getUser().getName(),
                b.getStartTime(),
                b.getEndTime(),
                b.getPurpose(),
                b.getExpectedAttendees(),
                b.getStatus(),
                b.getAdminComment(),
                b.getCancellationReason(),
                b.getCheckedIn(),
                b.getCheckedInAt(),
                b.getCreatedAt()
        );
    }
}
