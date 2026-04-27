package com.smartcampus.booking.service;

import com.smartcampus.activity.service.ActivityLogService;
import com.smartcampus.auth.entity.Role;
import com.smartcampus.auth.entity.User;
import com.smartcampus.auth.service.UserService;
import com.smartcampus.booking.dto.BookingRequest;
import com.smartcampus.booking.dto.BookingResponse;
import com.smartcampus.booking.entity.Booking;
import com.smartcampus.booking.entity.BookingStatus;
import com.smartcampus.booking.repository.BookingRepository;
import com.smartcampus.common.exception.AccessDeniedException;
import com.smartcampus.common.exception.BadRequestException;
import com.smartcampus.common.exception.ConflictException;
import com.smartcampus.common.exception.ResourceNotFoundException;
import com.smartcampus.notification.service.EmailService;
import com.smartcampus.notification.service.NotificationService;
import com.smartcampus.resource.entity.CampusResource;
import com.smartcampus.resource.entity.ResourceBlackout;
import com.smartcampus.resource.entity.ResourceStatus;
import com.smartcampus.resource.repository.CampusResourceRepository;
import com.smartcampus.resource.repository.ResourceBlackoutRepository;
import com.smartcampus.resource.service.ResourceWatchService;
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
    private final ResourceBlackoutRepository blackoutRepository;
    private final UserService userService;
    private final NotificationService notificationService;
    private final EmailService emailService;
    private final ResourceWatchService resourceWatchService;
    private final ActivityLogService activityLogService;

    public BookingServiceImpl(BookingRepository bookingRepository,
                              CampusResourceRepository resourceRepository,
                              ResourceBlackoutRepository blackoutRepository,
                              UserService userService,
                              NotificationService notificationService,
                              EmailService emailService,
                              ResourceWatchService resourceWatchService,
                              ActivityLogService activityLogService) {
        this.bookingRepository = bookingRepository;
        this.resourceRepository = resourceRepository;
        this.blackoutRepository = blackoutRepository;
        this.userService = userService;
        this.notificationService = notificationService;
        this.emailService = emailService;
        this.resourceWatchService = resourceWatchService;
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
        validateBookingRules(resource, request);

        List<Booking> conflicts = bookingRepository.findConflicting(
                resource.getId(), request.getStartTime(), request.getEndTime());

        List<ResourceBlackout> blackoutConflicts = blackoutRepository.findOverlapping(
                resource.getId(),
                request.getStartTime(),
                request.getEndTime()
        );
        if (!blackoutConflicts.isEmpty()) {
            throw new ConflictException("Time slot falls within a blocked blackout period");
        }

        User user = userService.findById(userId);

        Booking booking = new Booking();
        booking.setResource(resource);
        booking.setUser(user);
        booking.setStartTime(request.getStartTime());
        booking.setEndTime(request.getEndTime());
        booking.setPurpose(request.getPurpose());
        booking.setExpectedAttendees(request.getExpectedAttendees());

        if (!conflicts.isEmpty()) {
            if (!Boolean.TRUE.equals(request.getJoinWaitlist())) {
                throw new ConflictException("Time slot conflicts with an existing booking");
            }
            booking.setStatus(BookingStatus.WAITLISTED);
            Booking saved = bookingRepository.save(booking);
            int position = (int) bookingRepository.countWaitlistAheadOf(
                    resource.getId(), request.getStartTime(), request.getEndTime(), saved.getCreatedAt()) + 1;
            notificationService.sendNotification(userId, "WAITLIST_JOINED",
                    "You've joined the waitlist for " + resource.getName() + " (position #" + position + "). We'll notify you when a slot opens.",
                    "BOOKING", saved.getId());
            activityLogService.log(userId, user.getName(), "WAITLIST_JOINED", "BOOKING", saved.getId(),
                    "Joined waitlist for " + resource.getName());
            return toResponse(saved);
        }

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
    public BookingResponse getById(Long id, Long viewerUserId, Role viewerRole) {
        Booking booking = findById(id);
        boolean owner = booking.getUser().getId().equals(viewerUserId);
        boolean admin = viewerRole == Role.ADMIN;
        if (!owner && !admin) {
            throw new AccessDeniedException("You can only view your own bookings");
        }
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
        List<Booking> conflicts = bookingRepository.findConflicting(
                booking.getResource().getId(), booking.getStartTime(), booking.getEndTime());
        boolean overlapsOther = conflicts.stream().anyMatch(c -> !c.getId().equals(booking.getId()));
        if (overlapsOther) {
            throw new ConflictException("Cannot approve: time slot overlaps another active booking");
        }
        booking.setStatus(BookingStatus.APPROVED);
        booking.setAdminComment(adminComment);
        Booking saved = bookingRepository.save(booking);
        activityLogService.log(null, "Admin", "BOOKING_APPROVED", "BOOKING", saved.getId(), "Approved booking for " + booking.getResource().getName());

        notificationService.sendNotification(
                booking.getUser().getId(),
                "BOOKING_APPROVED",
                "Your booking for " + booking.getResource().getName() + " has been approved.",
                "BOOKING", booking.getId());
        emailService.sendBookingApprovedEmail(saved);

        return toResponse(saved);
    }

    @Override
    @Transactional
    public BookingResponse reject(Long id, String adminComment) {
        if (adminComment == null || adminComment.isBlank()) {
            throw new BadRequestException("A reason is required when rejecting a booking");
        }
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
        resourceWatchService.notifyWatchersResourceAvailable(saved);

        return toResponse(saved);
    }

    @Override
    @Transactional
    public BookingResponse cancel(Long id, Long userId, String reason) {
        Booking booking = findById(id);
        if (!booking.getUser().getId().equals(userId)) {
            throw new AccessDeniedException("You can only cancel your own bookings");
        }
        validateTransition(booking, BookingStatus.CANCELLED);
        booking.setStatus(BookingStatus.CANCELLED);
        if (reason != null && !reason.isBlank()) {
            booking.setCancellationReason(reason);
        }
        Booking saved = bookingRepository.save(booking);
        activityLogService.log(userId, booking.getUser().getName(), "BOOKING_CANCELLED", "BOOKING", saved.getId(), "Cancelled booking for " + booking.getResource().getName());
        resourceWatchService.notifyWatchersResourceAvailable(saved);
        promoteFromWaitlist(saved);
        return toResponse(saved);
    }

    @Override
    @Transactional
    public BookingResponse checkIn(Long id, Long userId) {
        Booking booking = findById(id);
        if (!booking.getUser().getId().equals(userId)) {
            throw new AccessDeniedException("You can only check in to your own bookings");
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
        List<Map<String, Object>> allSlots = new ArrayList<>();

        CampusResource resource = resourceRepository.findById(resourceId)
                .orElseThrow(() -> new ResourceNotFoundException("Resource", resourceId));
        if (resource.getDeleted()) {
            throw new ResourceNotFoundException("Resource", resourceId);
        }
        if (resource.getStatus() != ResourceStatus.ACTIVE) {
            throw new BadRequestException("Suggestions are only available for active resources");
        }
        if (durationMinutes <= 0) {
            throw new BadRequestException("Duration must be greater than 0 minutes");
        }
        
        // Collect all available slots across next 3 days
        for (int dayOffset = 0; dayOffset < 3; dayOffset++) {
            java.time.LocalDate checkDate = date.plusDays(dayOffset);
            LocalDateTime dayStart = checkDate.atTime(resource.getAvailabilityStartTime());
            LocalDateTime dayEnd = checkDate.atTime(resource.getAvailabilityEndTime());

            List<Booking> existing = bookingRepository.findConflicting(resourceId, dayStart, dayEnd);
            List<ResourceBlackout> blackouts = blackoutRepository.findOverlapping(resourceId, dayStart, dayEnd);

            List<TimeWindow> blockedWindows = new ArrayList<>();
            for (Booking booking : existing) {
                if (booking.getStatus() == BookingStatus.CANCELLED || booking.getStatus() == BookingStatus.REJECTED) {
                    continue;
                }
                blockedWindows.add(new TimeWindow(booking.getStartTime(), booking.getEndTime()));
            }
            for (ResourceBlackout blackout : blackouts) {
                blockedWindows.add(new TimeWindow(
                        maxDateTime(dayStart, blackout.getStartTime()),
                        minDateTime(dayEnd, blackout.getEndTime())
                ));
            }

            blockedWindows.sort((left, right) -> left.start().compareTo(right.start()));

            LocalDateTime slotCursor = dayStart;
            for (TimeWindow blockedWindow : blockedWindows) {
                if (blockedWindow.start().isAfter(slotCursor)) {
                    addSlotIfAvailable(allSlots, slotCursor, blockedWindow.start(), dayEnd, durationMinutes, checkDate);
                }
                if (blockedWindow.end().isAfter(slotCursor)) {
                    slotCursor = blockedWindow.end();
                }
            }
            addSlotIfAvailable(allSlots, slotCursor, dayEnd, dayEnd, durationMinutes, checkDate);
        }
        
        // Calculate historical patterns for scoring
        Map<Integer, Double> hourlyUtilization = calculateHourlyUtilization(resourceId);
        Map<Integer, Double> dayOfWeekUtilization = calculateDayOfWeekUtilization(resourceId);
        
        // Score and rank all slots
        for (Map<String, Object> slot : allSlots) {
            LocalDateTime startTime = (LocalDateTime) slot.get("start");
            int hour = startTime.getHour();
            int dayOfWeek = startTime.getDayOfWeek().getValue();
            
            // Calculate score based on multiple factors
            double score = calculateSlotScore(
                    hour, 
                    dayOfWeek,
                    hourlyUtilization,
                    dayOfWeekUtilization,
                    resourceId,
                    durationMinutes
            );
            
            slot.put("score", score);
            slot.put("start", startTime.toString());
            slot.put("end", ((LocalDateTime) slot.get("end")).toString());
            slot.put("date", slot.get("date").toString());
            slot.put("reasoning", generateReasoning(hour, dayOfWeek, hourlyUtilization, dayOfWeekUtilization));
        }
        
        // Sort by score (highest first) and return top 5
        return allSlots.stream()
                .sorted((a, b) -> Double.compare((Double)b.get("score"), (Double)a.get("score")))
                .limit(5)
                .toList();
    }

    /**
     * Calculate hourly utilization patterns based on historical bookings
     */
    private Map<Integer, Double> calculateHourlyUtilization(Long resourceId) {
        Map<Integer, Double> hourlyStats = new HashMap<>();
        List<Booking> allBookings = bookingRepository.findByResourceIdAndStartTimeBetween(
                resourceId,
                LocalDateTime.now().minusDays(90),
                LocalDateTime.now()
        );
        
        // Count bookings per hour
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
        
        // Normalize to 0-1 scale
        int maxCount = hourCounts.values().stream().max(Integer::compareTo).orElse(1);
        for (int i = 8; i < 22; i++) {
            hourlyStats.put(i, maxCount > 0 ? (double) hourCounts.get(i) / maxCount : 0.5);
        }
        
        return hourlyStats;
    }

    /**
     * Calculate day-of-week utilization patterns based on historical bookings
     */
    private Map<Integer, Double> calculateDayOfWeekUtilization(Long resourceId) {
        Map<Integer, Double> dayStats = new HashMap<>();
        List<Booking> allBookings = bookingRepository.findByResourceIdAndStartTimeBetween(
                resourceId,
                LocalDateTime.now().minusDays(90),
                LocalDateTime.now()
        );
        
        // Count bookings per day of week (1=Monday, 7=Sunday)
        Map<Integer, Integer> dayCounts = new HashMap<>();
        for (int i = 1; i <= 7; i++) dayCounts.put(i, 0);
        
        for (Booking b : allBookings) {
            if (b.getStatus() == BookingStatus.APPROVED || b.getStatus() == BookingStatus.PENDING) {
                int dayOfWeek = b.getStartTime().getDayOfWeek().getValue();
                dayCounts.put(dayOfWeek, dayCounts.get(dayOfWeek) + 1);
            }
        }
        
        // Normalize to 0-1 scale
        int maxCount = dayCounts.values().stream().max(Integer::compareTo).orElse(1);
        for (int i = 1; i <= 7; i++) {
            dayStats.put(i, maxCount > 0 ? (double) dayCounts.get(i) / maxCount : 0.5);
        }
        
        return dayStats;
    }

    /**
     * Calculate desirability score for a time slot based on historical patterns.
     * Higher score means better time slot (based on demand patterns and utilization)
     */
    private double calculateSlotScore(int hour, int dayOfWeek, 
                                      Map<Integer, Double> hourlyUtilization,
                                      Map<Integer, Double> dayOfWeekUtilization,
                                      Long resourceId, int durationMinutes) {
        double score = 0.0;
        
        // Factor 1: Hourly pattern (40% weight) - prefer moderately busy times
        double hourlyScore = hourlyUtilization.getOrDefault(hour, 0.5);
        // Prefer times with moderate utilization (0.3-0.7), not too empty or too crowded
        double hourlyDesirability = 1.0 - Math.abs(hourlyScore - 0.5) * 0.5;
        score += hourlyDesirability * 0.40;
        
        // Factor 2: Day-of-week pattern (30% weight)
        double dayScore = dayOfWeekUtilization.getOrDefault(dayOfWeek, 0.5);
        double dayDesirability = 1.0 - Math.abs(dayScore - 0.5) * 0.5;
        score += dayDesirability * 0.30;
        
        // Factor 3: Time preference (20% weight) - prefer mid-day slots (10 AM - 4 PM)
        double timePreference = 0.0;
        if (hour >= 10 && hour <= 16) {
            timePreference = 1.0 - (Math.abs(hour - 13) / 6.0); // Peak at 1 PM
        } else if (hour >= 8 && hour <= 22) {
            timePreference = 0.3; // Other hours still acceptable
        }
        score += timePreference * 0.20;
        
        // Factor 4: Availability bonus (10% weight)
        // Slots that are moderately filled are more available (less competition)
        double availabilityBonus = 0.2;
        score += availabilityBonus * 0.10;
        
        // Normalize to 0-100 scale
        return Math.min(100.0, score * 100);
    }

    /**
     * Generate a human-readable reasoning for why this slot is recommended
     */
    private String generateReasoning(int hour, int dayOfWeek,
                                    Map<Integer, Double> hourlyUtilization,
                                    Map<Integer, Double> dayOfWeekUtilization) {
        StringBuilder reasoning = new StringBuilder();
        
        String dayName = getDayName(dayOfWeek);
        double hourUtil = hourlyUtilization.getOrDefault(hour, 0.5);
        double dayUtil = dayOfWeekUtilization.getOrDefault(dayOfWeek, 0.5);
        
        reasoning.append(dayName).append(" at ");
        reasoning.append(String.format("%02d:00 - ", hour));
        
        // Add insights
        if (hour >= 10 && hour <= 16) {
            reasoning.append("Peak business hours with good availability");
        } else if (hour >= 8 && hour < 10) {
            reasoning.append("Early morning slot, likely available");
        } else if (hour > 16) {
            reasoning.append("Late afternoon/evening, typically less busy");
        }
        
        if (hourUtil < 0.4) {
            reasoning.append(". Historically under-utilized time.");
        } else if (hourUtil > 0.7) {
            reasoning.append(". Popular time slot.");
        }
        
        return reasoning.toString();
    }

    private String getDayName(int dayOfWeek) {
        return switch (dayOfWeek) {
            case 1 -> "Monday";
            case 2 -> "Tuesday";
            case 3 -> "Wednesday";
            case 4 -> "Thursday";
            case 5 -> "Friday";
            case 6 -> "Saturday";
            case 7 -> "Sunday";
            default -> "Unknown";
        };
    }

    @Override
    @Transactional(readOnly = true)
    public org.springframework.data.domain.Page<BookingResponse> getMyWaitlistedBookings(Long userId, org.springframework.data.domain.Pageable pageable) {
        return bookingRepository.findByUserIdAndStatus(userId, BookingStatus.WAITLISTED, pageable)
                .map(this::toResponse);
    }

    @Override
    @Transactional
    public BookingResponse leaveWaitlist(Long bookingId, Long userId) {
        Booking booking = findById(bookingId);
        if (!booking.getUser().getId().equals(userId)) {
            throw new AccessDeniedException("You can only leave your own waitlist");
        }
        if (booking.getStatus() != BookingStatus.WAITLISTED) {
            throw new BadRequestException("Booking is not on the waitlist");
        }
        booking.setStatus(BookingStatus.CANCELLED);
        booking.setCancellationReason("Left waitlist");
        Booking saved = bookingRepository.save(booking);
        activityLogService.log(userId, booking.getUser().getName(), "WAITLIST_LEFT", "BOOKING", saved.getId(),
                "Left waitlist for " + booking.getResource().getName());
        return toResponse(saved);
    }

    private void promoteFromWaitlist(Booking freed) {
        List<Booking> waitlisted = bookingRepository.findWaitlistedByResourceAndTime(
                freed.getResource().getId(), freed.getStartTime(), freed.getEndTime());
        if (!waitlisted.isEmpty()) {
            Booking first = waitlisted.get(0);
            first.setStatus(BookingStatus.PENDING);
            bookingRepository.save(first);
            notificationService.sendNotification(
                    first.getUser().getId(),
                    "WAITLIST_PROMOTED",
                    "A slot opened up! Your waitlisted booking for " + freed.getResource().getName() +
                    " is now Pending — awaiting admin approval.",
                    "BOOKING", first.getId());
            activityLogService.log(first.getUser().getId(), first.getUser().getName(),
                    "WAITLIST_PROMOTED", "BOOKING", first.getId(),
                    "Promoted from waitlist to PENDING for " + freed.getResource().getName());
        }
    }

    private void addSlotIfAvailable(List<Map<String, Object>> allSlots,
                                    LocalDateTime windowStart,
                                    LocalDateTime windowEnd,
                                    LocalDateTime dayEnd,
                                    int durationMinutes,
                                    java.time.LocalDate checkDate) {
        LocalDateTime slotEnd = windowStart.plusMinutes(durationMinutes);
        if (!slotEnd.isAfter(windowEnd) && !slotEnd.isAfter(dayEnd)) {
            Map<String, Object> slot = new HashMap<>();
            slot.put("start", windowStart);
            slot.put("end", slotEnd);
            slot.put("date", checkDate);
            allSlots.add(slot);
        }
    }

    private LocalDateTime maxDateTime(LocalDateTime first, LocalDateTime second) {
        return first.isAfter(second) ? first : second;
    }

    private LocalDateTime minDateTime(LocalDateTime first, LocalDateTime second) {
        return first.isBefore(second) ? first : second;
    }

    private record TimeWindow(LocalDateTime start, LocalDateTime end) {}
    private void validateTransition(Booking booking, BookingStatus target) {
        BookingStatus current = booking.getStatus();
        boolean valid = switch (target) {
            case APPROVED, REJECTED -> current == BookingStatus.PENDING;
            case CANCELLED -> current == BookingStatus.PENDING || current == BookingStatus.APPROVED || current == BookingStatus.WAITLISTED;
            default -> false;
        };
        if (!valid) {
            throw new BadRequestException(
                    "Cannot transition from " + current + " to " + target);
        }
    }

    private void validateBookingRules(CampusResource resource, BookingRequest request) {
        if (resource.getStatus() != ResourceStatus.ACTIVE) {
            throw new BadRequestException("This resource is currently out of service and cannot be booked");
        }

        if (request.getExpectedAttendees() != null
                && resource.getCapacity() != null
                && request.getExpectedAttendees() > resource.getCapacity()) {
            throw new BadRequestException("Expected attendees exceed the resource capacity");
        }

        if (!request.getStartTime().toLocalDate().equals(request.getEndTime().toLocalDate())) {
            throw new BadRequestException("Bookings must start and end on the same day");
        }

        if (resource.getAvailabilityStartTime() != null && request.getStartTime().toLocalTime().isBefore(resource.getAvailabilityStartTime())) {
            throw new BadRequestException("Booking start time is outside the resource availability window");
        }

        if (resource.getAvailabilityEndTime() != null && request.getEndTime().toLocalTime().isAfter(resource.getAvailabilityEndTime())) {
            throw new BadRequestException("Booking end time is outside the resource availability window");
        }
    }

    private Booking findById(Long id) {
        return bookingRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Booking", id));
    }

    private BookingResponse toResponse(Booking b) {
        Integer waitlistPosition = null;
        if (b.getStatus() == BookingStatus.WAITLISTED && b.getCreatedAt() != null) {
            waitlistPosition = (int) bookingRepository.countWaitlistAheadOf(
                    b.getResource().getId(), b.getStartTime(), b.getEndTime(), b.getCreatedAt()) + 1;
        }
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
                b.getCreatedAt(),
                waitlistPosition
        );
    }
}
