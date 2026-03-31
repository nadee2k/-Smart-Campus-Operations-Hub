package com.smartcampus.notification.controller;

import com.smartcampus.common.dto.PageResponse;
import com.smartcampus.config.security.AuthUtil;
import com.smartcampus.notification.dto.NotificationResponse;
import com.smartcampus.notification.service.NotificationService;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping
    public ResponseEntity<PageResponse<NotificationResponse>> getAll(
            @PageableDefault(size = 20) Pageable pageable) {
        Long userId = AuthUtil.getCurrentUserId();
        return ResponseEntity.ok(PageResponse.of(notificationService.getByUser(userId, pageable)));
    }

    @GetMapping("/unread-count")
    public ResponseEntity<Map<String, Long>> getUnreadCount() {
        Long userId = AuthUtil.getCurrentUserId();
        long count = notificationService.getUnreadCount(userId);
        return ResponseEntity.ok(Map.of("count", count));
    }

    @PatchMapping("/{id}/read")
    public ResponseEntity<Void> markAsRead(@PathVariable Long id) {
        Long userId = AuthUtil.getCurrentUserId();
        notificationService.markAsRead(id, userId);
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/read-all")
    public ResponseEntity<Void> markAllAsRead() {
        Long userId = AuthUtil.getCurrentUserId();
        notificationService.markAllAsRead(userId);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        Long userId = AuthUtil.getCurrentUserId();
        notificationService.deleteNotification(id, userId);
        return ResponseEntity.noContent().build();
    }
}
