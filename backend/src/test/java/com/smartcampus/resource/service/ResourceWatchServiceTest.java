package com.smartcampus.resource.service;

import com.smartcampus.auth.entity.Role;
import com.smartcampus.auth.entity.User;
import com.smartcampus.auth.service.UserService;
import com.smartcampus.booking.entity.Booking;
import com.smartcampus.booking.entity.BookingStatus;
import com.smartcampus.booking.repository.BookingRepository;
import com.smartcampus.notification.service.NotificationService;
import com.smartcampus.resource.dto.ResourceWatchStatusResponse;
import com.smartcampus.resource.entity.CampusResource;
import com.smartcampus.resource.entity.ResourceWatch;
import com.smartcampus.resource.entity.ResourceType;
import com.smartcampus.resource.repository.CampusResourceRepository;
import com.smartcampus.resource.repository.ResourceWatchRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ResourceWatchServiceTest {

    @Mock
    private ResourceWatchRepository resourceWatchRepository;

    @Mock
    private CampusResourceRepository resourceRepository;

    @Mock
    private BookingRepository bookingRepository;

    @Mock
    private UserService userService;

    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private ResourceWatchServiceImpl service;

    private CampusResource resource;
    private User user;

    @BeforeEach
    void setUp() {
        resource = new CampusResource();
        resource.setId(10L);
        resource.setName("Innovation Hub");
        resource.setType(ResourceType.MEETING_ROOM);
        resource.setDeleted(false);

        user = new User("john@uniops.edu", "John", null, "local-1");
        user.setId(5L);
        user.setRole(Role.USER);
    }

    @Test
    void watch_shouldCreateEntryAndReturnStatus() {
        when(resourceRepository.findById(10L)).thenReturn(Optional.of(resource));
        when(resourceWatchRepository.existsByResourceIdAndUserId(10L, 5L)).thenReturn(false);
        when(resourceWatchRepository.countByResourceId(10L)).thenReturn(1L);
        when(userService.findById(5L)).thenReturn(user);

        ResourceWatchStatusResponse result = service.watch(10L, 5L);

        assertThat(result.watching()).isTrue();
        assertThat(result.watcherCount()).isEqualTo(1);
        verify(resourceWatchRepository).save(any(ResourceWatch.class));
    }

    @Test
    void getMyWatchlist_shouldReturnWatchedResources() {
        ResourceWatch watch = createWatch(resource, user);
        watch.setCreatedAt(LocalDateTime.of(2026, 4, 24, 10, 0));
        resource.setCapacity(16);
        resource.setDescription("Flexible collaboration room.");
        when(resourceWatchRepository.findByUserIdOrderByCreatedAtDesc(5L)).thenReturn(List.of(watch));
        when(resourceWatchRepository.countByResourceId(10L)).thenReturn(3L);

        var result = service.getMyWatchlist(5L);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).resourceName()).isEqualTo("Innovation Hub");
        assertThat(result.get(0).watcherCount()).isEqualTo(3L);
    }

    @Test
    void notifyWatchersResourceAvailable_shouldSendNotificationsAndClearWatches() {
        when(resourceWatchRepository.findByResourceId(10L)).thenReturn(List.of(createWatch(resource, user)));

        Booking booking = new Booking();
        booking.setId(50L);
        booking.setResource(resource);
        booking.setStatus(BookingStatus.CANCELLED);
        booking.setStartTime(LocalDateTime.of(2026, 4, 25, 10, 0));
        booking.setEndTime(LocalDateTime.of(2026, 4, 25, 11, 0));

        service.notifyWatchersResourceAvailable(booking);

        verify(notificationService).sendNotification(
                eq(5L),
                eq("RESOURCE_AVAILABLE"),
                org.mockito.ArgumentMatchers.contains("Innovation Hub"),
                eq("RESOURCE"),
                eq(10L)
        );
        verify(resourceWatchRepository).deleteByResourceId(10L);
    }

    @Test
    void processScheduledAvailabilityAlerts_shouldNotifyAndClearWhenCurrentlyFree() {
        when(resourceWatchRepository.findAll()).thenReturn(List.of(createWatch(resource, user)));
        when(bookingRepository.countByResourceIdAndStatusInAndStartTimeLessThanAndEndTimeGreaterThan(eq(10L), any(), any(), any()))
                .thenReturn(0L);

        service.processScheduledAvailabilityAlerts();

        verify(notificationService).sendNotification(
                eq(5L),
                eq("RESOURCE_AVAILABLE"),
                org.mockito.ArgumentMatchers.contains("currently free"),
                eq("RESOURCE"),
                eq(10L)
        );
        verify(resourceWatchRepository).deleteByResourceId(10L);
    }

    private ResourceWatch createWatch(CampusResource resource, User user) {
        ResourceWatch watch = new ResourceWatch();
        watch.setResource(resource);
        watch.setUser(user);
        return watch;
    }
}
