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
import com.smartcampus.common.exception.BadRequestException;
import com.smartcampus.common.exception.ConflictException;
import com.smartcampus.common.exception.ResourceNotFoundException;
import com.smartcampus.notification.service.NotificationService;
import com.smartcampus.resource.entity.CampusResource;
import com.smartcampus.resource.entity.ResourceType;
import com.smartcampus.resource.repository.CampusResourceRepository;
import com.smartcampus.resource.service.ResourceWatchService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BookingServiceTest {

    @Mock private BookingRepository bookingRepository;
    @Mock private CampusResourceRepository resourceRepository;
    @Mock private UserService userService;
    @Mock private NotificationService notificationService;
    @Mock private ResourceWatchService resourceWatchService;
    @Mock private ActivityLogService activityLogService;

    @InjectMocks
    private BookingServiceImpl service;

    private User user;
    private CampusResource resource;
    private Booking booking;
    private BookingRequest request;

    @BeforeEach
    void setUp() {
        user = new User("test@example.com", "Test User", null, "google-123");
        user.setId(1L);
        user.setRole(Role.USER);

        resource = new CampusResource();
        resource.setId(1L);
        resource.setName("Lab Room 1");
        resource.setType(ResourceType.LAB);
        resource.setDeleted(false);

        booking = new Booking();
        booking.setId(1L);
        booking.setResource(resource);
        booking.setUser(user);
        booking.setStartTime(LocalDateTime.now().plusDays(1));
        booking.setEndTime(LocalDateTime.now().plusDays(1).plusHours(2));
        booking.setPurpose("Team meeting");
        booking.setExpectedAttendees(5);
        booking.setStatus(BookingStatus.PENDING);
        booking.setCreatedAt(LocalDateTime.now());

        request = new BookingRequest();
        request.setResourceId(1L);
        request.setStartTime(LocalDateTime.now().plusDays(1));
        request.setEndTime(LocalDateTime.now().plusDays(1).plusHours(2));
        request.setPurpose("Team meeting");
        request.setExpectedAttendees(5);
    }

    @Test
    void create_shouldCreateBooking() {
        when(resourceRepository.findById(1L)).thenReturn(Optional.of(resource));
        when(bookingRepository.findConflicting(anyLong(), any(), any())).thenReturn(Collections.emptyList());
        when(userService.findById(1L)).thenReturn(user);
        when(bookingRepository.save(any(Booking.class))).thenReturn(booking);

        BookingResponse result = service.create(request, 1L);

        assertThat(result).isNotNull();
        assertThat(result.status()).isEqualTo(BookingStatus.PENDING);
        verify(bookingRepository).save(any(Booking.class));
    }

    @Test
    void create_shouldThrowWhenEndBeforeStart() {
        request.setEndTime(request.getStartTime().minusHours(1));

        assertThatThrownBy(() -> service.create(request, 1L))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("End time must be after start time");
    }

    @Test
    void create_shouldThrowWhenConflict() {
        when(resourceRepository.findById(1L)).thenReturn(Optional.of(resource));
        when(bookingRepository.findConflicting(anyLong(), any(), any()))
                .thenReturn(List.of(booking));

        assertThatThrownBy(() -> service.create(request, 1L))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("conflicts");
    }

    @Test
    void create_shouldThrowWhenResourceNotFound() {
        when(resourceRepository.findById(99L)).thenReturn(Optional.empty());
        request.setResourceId(99L);

        assertThatThrownBy(() -> service.create(request, 1L))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void approve_shouldChangeStatusToApproved() {
        when(bookingRepository.findById(1L)).thenReturn(Optional.of(booking));
        when(bookingRepository.findConflicting(anyLong(), any(), any())).thenReturn(Collections.emptyList());
        when(bookingRepository.save(any(Booking.class))).thenReturn(booking);

        service.approve(1L, "Approved");

        verify(notificationService).sendNotification(
                anyLong(), eq("BOOKING_APPROVED"), any(), eq("BOOKING"), eq(1L));
    }

    @Test
    void approve_shouldThrowWhenOverlapsAnotherActiveBooking() {
        Booking other = new Booking();
        other.setId(2L);
        other.setStatus(BookingStatus.APPROVED);
        when(bookingRepository.findById(1L)).thenReturn(Optional.of(booking));
        when(bookingRepository.findConflicting(anyLong(), any(), any())).thenReturn(List.of(other));

        assertThatThrownBy(() -> service.approve(1L, "OK"))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("overlaps");
    }

    @Test
    void getById_shouldAllowOwner() {
        when(bookingRepository.findById(1L)).thenReturn(Optional.of(booking));

        BookingResponse result = service.getById(1L, 1L, Role.USER);

        assertThat(result.id()).isEqualTo(1L);
    }

    @Test
    void getById_shouldAllowAdmin() {
        when(bookingRepository.findById(1L)).thenReturn(Optional.of(booking));

        BookingResponse result = service.getById(1L, 99L, Role.ADMIN);

        assertThat(result.id()).isEqualTo(1L);
    }

    @Test
    void getById_shouldDenyOtherUser() {
        when(bookingRepository.findById(1L)).thenReturn(Optional.of(booking));

        assertThatThrownBy(() -> service.getById(1L, 99L, Role.USER))
                .isInstanceOf(com.smartcampus.common.exception.AccessDeniedException.class);
    }

    @Test
    void approve_shouldThrowWhenNotPending() {
        booking.setStatus(BookingStatus.REJECTED);
        when(bookingRepository.findById(1L)).thenReturn(Optional.of(booking));

        assertThatThrownBy(() -> service.approve(1L, ""))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Cannot transition");
    }

    @Test
    void reject_shouldChangeStatusToRejected() {
        when(bookingRepository.findById(1L)).thenReturn(Optional.of(booking));
        when(bookingRepository.save(any(Booking.class))).thenReturn(booking);

        service.reject(1L, "Not available");

        verify(notificationService).sendNotification(
                anyLong(), eq("BOOKING_REJECTED"), any(), eq("BOOKING"), eq(1L));
        verify(resourceWatchService).notifyWatchersResourceAvailable(any(Booking.class));
    }

    @Test
    void reject_shouldThrowWhenReasonMissing() {
        assertThatThrownBy(() -> service.reject(1L, null))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("reason");

        assertThatThrownBy(() -> service.reject(1L, "   "))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void cancel_shouldOnlyAllowOwner() {
        when(bookingRepository.findById(1L)).thenReturn(Optional.of(booking));

        assertThatThrownBy(() -> service.cancel(1L, 999L, ""))
                .isInstanceOf(com.smartcampus.common.exception.AccessDeniedException.class);
    }

    @Test
    void cancel_shouldSucceedForOwner() {
        when(bookingRepository.findById(1L)).thenReturn(Optional.of(booking));
        when(bookingRepository.save(any(Booking.class))).thenReturn(booking);

        BookingResponse result = service.cancel(1L, 1L, "User requested cancellation");

        verify(bookingRepository).save(any(Booking.class));
        verify(resourceWatchService).notifyWatchersResourceAvailable(any(Booking.class));
    }
}
