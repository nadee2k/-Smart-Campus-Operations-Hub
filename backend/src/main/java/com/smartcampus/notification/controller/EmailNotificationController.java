package com.smartcampus.notification.controller;

import com.smartcampus.auth.entity.Role;
import com.smartcampus.notification.dto.EmailNotificationRequest;
import com.smartcampus.notification.service.EmailService;
import com.smartcampus.notification.service.EmailNotificationService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications/email")
@PreAuthorize("hasRole('ADMIN')")
public class EmailNotificationController {

    private final EmailNotificationService emailNotificationService;
    private final EmailService emailService;

    public EmailNotificationController(EmailNotificationService emailNotificationService,
                                       EmailService emailService) {
        this.emailNotificationService = emailNotificationService;
        this.emailService = emailService;
    }

    /**
     * Send email to all admins
     */
    @PostMapping("/admins")
    public ResponseEntity<Map<String, String>> notifyAdmins(
            @RequestBody EmailNotificationRequest request) {
        emailNotificationService.notifyAdmins(request.subject(), request.message());
        return ResponseEntity.ok(Map.of("status", "Email sent to all admins"));
    }

    /**
     * Send email to all technicians
     */
    @PostMapping("/technicians")
    public ResponseEntity<Map<String, String>> notifyTechnicians(
            @RequestBody EmailNotificationRequest request) {
        emailNotificationService.notifyTechnicians(request.subject(), request.message());
        return ResponseEntity.ok(Map.of("status", "Email sent to all technicians"));
    }

    /**
     * Send email to all users
     */
    @PostMapping("/users")
    public ResponseEntity<Map<String, String>> notifyAllUsers(
            @RequestBody EmailNotificationRequest request) {
        emailNotificationService.notifyAllUsers(request.subject(), request.message());
        return ResponseEntity.ok(Map.of("status", "Email sent to all users"));
    }

    /**
     * Send email to all users except the requesting admin
     */
    @PostMapping("/broadcast")
    public ResponseEntity<Map<String, String>> broadcastToAll(
            @RequestBody EmailNotificationRequest request) {
        emailNotificationService.notifyAllExcept(null, request.subject(), request.message());
        return ResponseEntity.ok(Map.of("status", "Broadcast email sent to all users"));
    }

    /**
     * Send email to multiple user IDs
     */
    @PostMapping("/users/batch")
    public ResponseEntity<Map<String, String>> notifySpecificUsers(
            @RequestBody EmailNotificationRequest request) {
        if (request.userIds() != null && !request.userIds().isEmpty()) {
            emailNotificationService.notifyUsersByIds(request.userIds(), request.subject(), request.message());
            return ResponseEntity.ok(Map.of("status", "Email sent to " + request.userIds().size() + " users"));
        }
        return ResponseEntity.badRequest().body(Map.of("error", "userIds list is required"));
    }

    /**
     * Send email to specific role
     */
    @PostMapping("/role/{role}")
    public ResponseEntity<Map<String, String>> notifyByRole(
            @PathVariable String role,
            @RequestBody EmailNotificationRequest request) {
        try {
            Role userRole = Role.valueOf(role.toUpperCase());
            emailNotificationService.notifyByRole(userRole, request.subject(), request.message());
            return ResponseEntity.ok(Map.of("status", "Email sent to all users with role: " + role));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid role: " + role));
        }
    }

    /**
     * Temporary endpoint to test SMTP delivery to a single address.
     */
    @PostMapping("/test")
    public ResponseEntity<Map<String, String>> sendTestEmail(@RequestParam String to) {
        try {
            emailService.sendEmailOrThrow(
                    to,
                    "Smart Campus test email",
                    "This is a temporary SMTP test email sent at " + OffsetDateTime.now() + "."
            );
            return ResponseEntity.ok(Map.of(
                    "status", "Test email sent successfully",
                    "to", to
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(Map.of(
                    "error", "Failed to send test email",
                    "to", to,
                    "message", e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName()
            ));
        }
    }
}
