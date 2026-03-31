package com.smartcampus.notification.service;

import com.smartcampus.notification.dto.NotificationResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface NotificationService {

    void sendNotification(Long userId, String type, String message,
                          String referenceType, Long referenceId);

    Page<NotificationResponse> getByUser(Long userId, Pageable pageable);

    long getUnreadCount(Long userId);

    void markAsRead(Long notificationId, Long userId);

    void markAllAsRead(Long userId);

    void deleteNotification(Long notificationId, Long userId);
}
