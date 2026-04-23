package com.smartcampus.notification.service;

import com.smartcampus.auth.entity.User;
import com.smartcampus.auth.service.UserService;
import com.smartcampus.common.exception.AccessDeniedException;
import com.smartcampus.common.exception.ResourceNotFoundException;
import com.smartcampus.notification.dto.NotificationResponse;
import com.smartcampus.notification.entity.Notification;
import com.smartcampus.notification.entity.Priority;
import com.smartcampus.notification.repository.NotificationRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@Service
public class NotificationServiceImpl implements NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserService userService;
    private final EmailService emailService;
    private final SmsService smsService;
    private final Map<Long, List<SseEmitter>> emitters = new ConcurrentHashMap<>();

    public NotificationServiceImpl(NotificationRepository notificationRepository,
                                   UserService userService,
                                   EmailService emailService,
                                   SmsService smsService) {
        this.notificationRepository = notificationRepository;
        this.userService = userService;
        this.emailService = emailService;
        this.smsService = smsService;
    }

    @Override
    @Transactional
    public void sendNotification(Long userId, String type, String message,
                                 String referenceType, Long referenceId) {
        sendNotification(userId, type, message, Priority.NORMAL,
                        referenceType, referenceId, null);
    }

    @Override
    @Transactional
    public void sendNotification(Long userId, String type, String message,
                                 Priority priority, String referenceType,
                                 Long referenceId, String link) {
        User user = userService.findById(userId);
        Notification notification = new Notification();
        notification.setUser(user);
        notification.setType(type);
        notification.setMessage(message);
        notification.setPriority(priority);
        notification.setReferenceType(referenceType);
        notification.setReferenceId(referenceId);
        notification.setLink(link);
        Notification saved = notificationRepository.save(notification);

        // Send email for HIGH and URGENT priority notifications
        if (priority == Priority.HIGH || priority == Priority.URGENT) {
            try {
                emailService.sendEmail(user.getEmail(),
                    "Smart Campus Hub - " + type.replace("_", " "),
                    message + (link != null ? "\n\nView details: " + link : ""));
            } catch (Exception e) {
                // Log error but don't fail the notification
                System.err.println("Failed to send email: " + e.getMessage());
            }
        }

        // Send SMS for URGENT priority notifications
        if (priority == Priority.URGENT && user.getPhone() != null && !user.getPhone().isEmpty()) {
            try {
                smsService.sendSms(user.getPhone(), message);
            } catch (Exception e) {
                // Log error but don't fail the notification
                System.err.println("Failed to send SMS: " + e.getMessage());
            }
        }

        // Broadcast to connected clients
        NotificationResponse response = toResponse(saved);
        broadcastNotification(userId, response);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<NotificationResponse> getByUser(Long userId, Pageable pageable) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable)
                .map(this::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public long getUnreadCount(Long userId) {
        return notificationRepository.countByUserIdAndIsReadFalse(userId);
    }

    @Override
    @Transactional
    public void markAsRead(Long notificationId, Long userId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ResourceNotFoundException("Notification", notificationId));
        if (!notification.getUser().getId().equals(userId)) {
            throw new AccessDeniedException("Cannot mark another user's notification as read");
        }
        notification.setIsRead(true);
        notificationRepository.save(notification);

        // Broadcast unread count update
        broadcastUnreadCount(userId);
    }

    @Override
    @Transactional
    public void markAllAsRead(Long userId) {
        notificationRepository.markAllAsRead(userId);
        // Broadcast unread count update
        broadcastUnreadCount(userId);
    }

    @Override
    @Transactional
    public void deleteNotification(Long notificationId, Long userId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ResourceNotFoundException("Notification", notificationId));
        if (!notification.getUser().getId().equals(userId)) {
            throw new AccessDeniedException("Cannot delete another user's notification");
        }
        notificationRepository.delete(notification);

        // Broadcast unread count update
        broadcastUnreadCount(userId);
    }

    @Override
    public void registerEmitter(Long userId, SseEmitter emitter) {
        emitters.computeIfAbsent(userId, k -> new CopyOnWriteArrayList<>()).add(emitter);
    }

    @Override
    public void removeEmitter(Long userId, SseEmitter emitter) {
        List<SseEmitter> userEmitters = emitters.get(userId);
        if (userEmitters != null) {
            userEmitters.remove(emitter);
            if (userEmitters.isEmpty()) {
                emitters.remove(userId);
            }
        }
    }

    @Override
    public void broadcastNotification(Long userId, NotificationResponse notification) {
        List<SseEmitter> userEmitters = emitters.get(userId);
        if (userEmitters != null) {
            List<SseEmitter> deadEmitters = new CopyOnWriteArrayList<>();
            for (SseEmitter emitter : userEmitters) {
                try {
                    emitter.send(SseEmitter.event()
                            .name("notification")
                            .data(notification));
                } catch (IOException e) {
                    deadEmitters.add(emitter);
                }
            }
            // Remove dead emitters
            userEmitters.removeAll(deadEmitters);
        }
        // Also broadcast unread count update
        broadcastUnreadCount(userId);
    }

    private void broadcastUnreadCount(Long userId) {
        List<SseEmitter> userEmitters = emitters.get(userId);
        if (userEmitters != null) {
            long unreadCount = getUnreadCount(userId);
            List<SseEmitter> deadEmitters = new CopyOnWriteArrayList<>();
            for (SseEmitter emitter : userEmitters) {
                try {
                    emitter.send(SseEmitter.event()
                            .name("unread-count")
                            .data(Map.of("count", unreadCount)));
                } catch (IOException e) {
                    deadEmitters.add(emitter);
                }
            }
            // Remove dead emitters
            userEmitters.removeAll(deadEmitters);
        }
    }

    private NotificationResponse toResponse(Notification n) {
        return new NotificationResponse(
                n.getId(), n.getType(), n.getMessage(), n.getPriority(), n.getIsRead(),
                n.getReferenceType(), n.getReferenceId(), n.getLink(), n.getCreatedAt()
        );
    }
}
