package com.smartcampus.resource.service;

import com.smartcampus.auth.entity.User;
import com.smartcampus.auth.service.UserService;
import com.smartcampus.booking.entity.Booking;
import com.smartcampus.booking.entity.BookingStatus;
import com.smartcampus.common.exception.ResourceNotFoundException;
import com.smartcampus.notification.service.NotificationService;
import com.smartcampus.resource.dto.ResourceWatchStatusResponse;
import com.smartcampus.resource.entity.CampusResource;
import com.smartcampus.resource.entity.ResourceWatch;
import com.smartcampus.resource.repository.CampusResourceRepository;
import com.smartcampus.resource.repository.ResourceWatchRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;

@Service
public class ResourceWatchServiceImpl implements ResourceWatchService {

    private static final DateTimeFormatter WATCH_TIME_FORMAT =
            DateTimeFormatter.ofPattern("EEE, MMM d h:mm a", Locale.US);

    private final ResourceWatchRepository resourceWatchRepository;
    private final CampusResourceRepository resourceRepository;
    private final UserService userService;
    private final NotificationService notificationService;

    public ResourceWatchServiceImpl(ResourceWatchRepository resourceWatchRepository,
                                    CampusResourceRepository resourceRepository,
                                    UserService userService,
                                    NotificationService notificationService) {
        this.resourceWatchRepository = resourceWatchRepository;
        this.resourceRepository = resourceRepository;
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
        if (booking.getStatus() != BookingStatus.CANCELLED && booking.getStatus() != BookingStatus.REJECTED) {
            return;
        }

        Long resourceId = booking.getResource().getId();
        List<ResourceWatch> watches = resourceWatchRepository.findByResourceId(resourceId);
        if (watches.isEmpty()) {
            return;
        }

        String start = booking.getStartTime() != null ? booking.getStartTime().format(WATCH_TIME_FORMAT) : "an upcoming time";
        String end = booking.getEndTime() != null ? booking.getEndTime().format(WATCH_TIME_FORMAT) : "later";
        String message = booking.getResource().getName() + " may now be free from " + start + " to " + end + ".";

        for (ResourceWatch watch : watches) {
            notificationService.sendNotification(
                    watch.getUser().getId(),
                    "RESOURCE_AVAILABLE",
                    message,
                    "RESOURCE",
                    resourceId
            );
        }

        resourceWatchRepository.deleteByResourceId(resourceId);
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
