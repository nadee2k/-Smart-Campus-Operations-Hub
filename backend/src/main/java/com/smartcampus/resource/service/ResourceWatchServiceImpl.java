package com.smartcampus.resource.service;

import com.smartcampus.auth.entity.User;
import com.smartcampus.auth.service.UserService;
import com.smartcampus.booking.entity.Booking;
import com.smartcampus.booking.entity.BookingStatus;
import com.smartcampus.booking.repository.BookingRepository;
import com.smartcampus.common.exception.ResourceNotFoundException;
import com.smartcampus.notification.service.NotificationService;
import com.smartcampus.resource.dto.ResourceWatchListItemResponse;
import com.smartcampus.resource.dto.ResourceWatchStatusResponse;
import com.smartcampus.resource.entity.CampusResource;
import com.smartcampus.resource.entity.ResourceWatch;
import com.smartcampus.resource.repository.CampusResourceRepository;
import com.smartcampus.resource.repository.ResourceWatchRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class ResourceWatchServiceImpl implements ResourceWatchService {

    private static final Logger log = LoggerFactory.getLogger(ResourceWatchServiceImpl.class);
    private static final DateTimeFormatter WATCH_TIME_FORMAT =
            DateTimeFormatter.ofPattern("EEE, MMM d h:mm a", Locale.US);

    private final ResourceWatchRepository resourceWatchRepository;
    private final CampusResourceRepository resourceRepository;
    private final BookingRepository bookingRepository;
    private final UserService userService;
    private final NotificationService notificationService;

    public ResourceWatchServiceImpl(ResourceWatchRepository resourceWatchRepository,
                                    CampusResourceRepository resourceRepository,
                                    BookingRepository bookingRepository,
                                    UserService userService,
                                    NotificationService notificationService) {
        this.resourceWatchRepository = resourceWatchRepository;
        this.resourceRepository = resourceRepository;
        this.bookingRepository = bookingRepository;
        this.userService = userService;
        this.notificationService = notificationService;
    }

    @Override
    @Transactional(readOnly = true)
    public ResourceWatchStatusResponse getStatus(Long resourceId, Long userId) {
        CampusResource resource = findActiveResource(resourceId);
        return new ResourceWatchStatusResponse(
                resource.getId(),
                resourceWatchRepository.existsByResourceIdAndUserId(resourceId, userId),
                resourceWatchRepository.countByResourceId(resourceId)
        );
    }

    @Override
    @Transactional(readOnly = true)
    public List<ResourceWatchListItemResponse> getMyWatchlist(Long userId) {
        return resourceWatchRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(watch -> new ResourceWatchListItemResponse(
                        watch.getResource().getId(),
                        watch.getResource().getName(),
                        watch.getResource().getType() != null ? watch.getResource().getType().name().replace('_', ' ') : null,
                        watch.getResource().getLocation(),
                        watch.getResource().getStatus() != null ? watch.getResource().getStatus().name().replace('_', ' ') : null,
                        watch.getResource().getCapacity(),
                        watch.getResource().getDescription(),
                        resourceWatchRepository.countByResourceId(watch.getResource().getId()),
                        watch.getCreatedAt()
                ))
                .toList();
    }

    @Override
    @Transactional
    public ResourceWatchStatusResponse watch(Long resourceId, Long userId) {
        CampusResource resource = findActiveResource(resourceId);
        if (!resourceWatchRepository.existsByResourceIdAndUserId(resourceId, userId)) {
            User user = userService.findById(userId);
            ResourceWatch watch = new ResourceWatch();
            watch.setResource(resource);
            watch.setUser(user);
            resourceWatchRepository.save(watch);
        }
        return new ResourceWatchStatusResponse(
                resource.getId(),
                true,
                resourceWatchRepository.countByResourceId(resourceId)
        );
    }

    @Override
    @Transactional
    public void unwatch(Long resourceId, Long userId) {
        findActiveResource(resourceId);
        resourceWatchRepository.deleteByResourceIdAndUserId(resourceId, userId);
    }

    @Override
    @Transactional
    public void notifyWatchersResourceAvailable(Booking booking) {
        if (booking == null || booking.getResource() == null || booking.getResource().getId() == null) {
            return;
        }
        if (booking.getStatus() != BookingStatus.CANCELLED) {
            return;
        }

        Long resourceId = booking.getResource().getId();
        List<ResourceWatch> watches = resourceWatchRepository.findByResourceId(resourceId);
        if (watches.isEmpty()) {
            return;
        }

        String start = booking.getStartTime() != null ? booking.getStartTime().format(WATCH_TIME_FORMAT) : "an upcoming time";
        String end = booking.getEndTime() != null ? booking.getEndTime().format(WATCH_TIME_FORMAT) : "later";
        String message = booking.getResource().getName() + " now has an open slot from " + start + " to " + end + " because a booking was cancelled.";

        for (ResourceWatch watch : watches) {
            notificationService.sendNotification(
                    watch.getUser().getId(),
                    "RESOURCE_AVAILABILITY_ALERT",
                    message,
                    "RESOURCE",
                    resourceId
            );
        }

        resourceWatchRepository.deleteByResourceId(resourceId);
    }

    @Override
    @Transactional
    public void processScheduledAvailabilityAlerts() {
        List<ResourceWatch> watches = resourceWatchRepository.findAll();
        if (watches.isEmpty()) {
            return;
        }

        LocalDateTime now = LocalDateTime.now();
        Map<Long, List<ResourceWatch>> watchesByResource = watches.stream()
                .filter(watch -> watch.getResource() != null && watch.getResource().getId() != null)
                .collect(Collectors.groupingBy(watch -> watch.getResource().getId()));

        int alertedResources = 0;
        for (Map.Entry<Long, List<ResourceWatch>> entry : watchesByResource.entrySet()) {
            Long resourceId = entry.getKey();
            List<ResourceWatch> resourceWatches = entry.getValue();
            if (resourceWatches.isEmpty()) {
                continue;
            }

            long activeBookingCount = bookingRepository.countByResourceIdAndStatusInAndStartTimeLessThanAndEndTimeGreaterThan(
                    resourceId,
                    List.of(BookingStatus.PENDING, BookingStatus.APPROVED),
                    now,
                    now
            );

            if (activeBookingCount > 0) {
                continue;
            }

            CampusResource resource = resourceWatches.get(0).getResource();
            String message = resource.getName() + " is currently free and available to book.";

            for (ResourceWatch watch : resourceWatches) {
                try {
                    notificationService.sendNotification(
                            watch.getUser().getId(),
                            "RESOURCE_AVAILABLE",
                            message,
                            "RESOURCE",
                            resourceId
                    );
                } catch (Exception exception) {
                    log.warn("Failed to send scheduled watchlist alert for resource {}", resourceId, exception);
                }
            }

            resourceWatchRepository.deleteByResourceId(resourceId);
            alertedResources++;
        }

        if (alertedResources > 0) {
            log.info("Processed watchlist scheduler alerts for {} resource(s)", alertedResources);
        }
    }

    private CampusResource findActiveResource(Long resourceId) {
        CampusResource resource = resourceRepository.findById(resourceId)
                .orElseThrow(() -> new ResourceNotFoundException("Resource", resourceId));
        if (Boolean.TRUE.equals(resource.getDeleted())) {
            throw new ResourceNotFoundException("Resource", resourceId);
        }
        return resource;
    }
}
