package com.smartcampus.notification.service;

import com.smartcampus.auth.entity.User;
import com.smartcampus.auth.service.UserService;
import com.smartcampus.common.exception.AccessDeniedException;
import com.smartcampus.common.exception.ResourceNotFoundException;
import com.smartcampus.notification.dto.NotificationResponse;
import com.smartcampus.notification.entity.Notification;
import com.smartcampus.notification.repository.NotificationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {

    @Mock private NotificationRepository notificationRepository;
    @Mock private UserService userService;

    @InjectMocks
    private NotificationServiceImpl service;

    private User user;
    private Notification notification;

    @BeforeEach
    void setUp() {
        user = new User("test@example.com", "Test", null, "gid-1");
        user.setId(1L);

        notification = new Notification();
        notification.setId(1L);
        notification.setUser(user);
        notification.setType("BOOKING_APPROVED");
        notification.setMessage("Your booking has been approved");
        notification.setIsRead(false);
        notification.setReferenceType("BOOKING");
        notification.setReferenceId(10L);
        notification.setCreatedAt(LocalDateTime.now());
    }

    @Test
    void sendNotification_shouldCreateNotification() {
        when(userService.findById(1L)).thenReturn(user);
        when(notificationRepository.save(any(Notification.class))).thenReturn(notification);

        service.sendNotification(1L, "BOOKING_APPROVED", "Approved", "BOOKING", 10L);

        verify(notificationRepository).save(any(Notification.class));
    }

    @Test
    void getByUser_shouldReturnNotifications() {
        Page<Notification> page = new PageImpl<>(List.of(notification));
        when(notificationRepository.findByUserIdOrderByCreatedAtDesc(eq(1L), any()))
                .thenReturn(page);

        Page<NotificationResponse> result = service.getByUser(1L, PageRequest.of(0, 20));

        assertThat(result.getTotalElements()).isEqualTo(1);
        assertThat(result.getContent().get(0).type()).isEqualTo("BOOKING_APPROVED");
    }

    @Test
    void getUnreadCount_shouldReturnCount() {
        when(notificationRepository.countByUserIdAndIsReadFalse(1L)).thenReturn(5L);

        long count = service.getUnreadCount(1L);

        assertThat(count).isEqualTo(5);
    }

    @Test
    void markAsRead_shouldMarkNotificationAsRead() {
        when(notificationRepository.findById(1L)).thenReturn(Optional.of(notification));

        service.markAsRead(1L, 1L);

        verify(notificationRepository).save(argThat(n -> n.getIsRead()));
    }

    @Test
    void markAsRead_shouldThrowForWrongUser() {
        when(notificationRepository.findById(1L)).thenReturn(Optional.of(notification));

        assertThatThrownBy(() -> service.markAsRead(1L, 999L))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void markAsRead_shouldThrowForNotFound() {
        when(notificationRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.markAsRead(99L, 1L))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void markAllAsRead_shouldDelegateToRepository() {
        service.markAllAsRead(1L);
        verify(notificationRepository).markAllAsRead(1L);
    }
}
