package com.smartcampus.notification.service;

import com.smartcampus.auth.entity.Role;
import com.smartcampus.auth.entity.User;
import com.smartcampus.auth.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class EmailNotificationService {

    private static final Logger log = LoggerFactory.getLogger(EmailNotificationService.class);
    private final EmailService emailService;
    private final UserRepository userRepository;

    public EmailNotificationService(EmailService emailService, UserRepository userRepository) {
        this.emailService = emailService;
        this.userRepository = userRepository;
    }

    /**
     * Send email to all admins
     */
    @Transactional(readOnly = true)
    public void notifyAdmins(String subject, String message) {
        List<User> admins = userRepository.findByRole(Role.ADMIN);
        for (User admin : admins) {
            try {
                emailService.sendEmail(admin.getEmail(), subject, message);
                log.info("Email sent to admin: {}", admin.getEmail());
            } catch (Exception e) {
                log.error("Failed to send email to admin {}: {}", admin.getEmail(), e.getMessage());
            }
        }
    }

    /**
     * Send email to all technicians
     */
    @Transactional(readOnly = true)
    public void notifyTechnicians(String subject, String message) {
        List<User> technicians = userRepository.findByRole(Role.TECHNICIAN);
        for (User technician : technicians) {
            try {
                emailService.sendEmail(technician.getEmail(), subject, message);
                log.info("Email sent to technician: {}", technician.getEmail());
            } catch (Exception e) {
                log.error("Failed to send email to technician {}: {}", technician.getEmail(), e.getMessage());
            }
        }
    }

    /**
     * Send email to all regular users
     */
    @Transactional(readOnly = true)
    public void notifyAllUsers(String subject, String message) {
        List<User> users = userRepository.findByRole(Role.USER);
        for (User user : users) {
            try {
                emailService.sendEmail(user.getEmail(), subject, message);
                log.info("Email sent to user: {}", user.getEmail());
            } catch (Exception e) {
                log.error("Failed to send email to user {}: {}", user.getEmail(), e.getMessage());
            }
        }
    }

    /**
     * Send email to specific role
     */
    @Transactional(readOnly = true)
    public void notifyByRole(Role role, String subject, String message) {
        List<User> users = userRepository.findByRole(role);
        for (User user : users) {
            try {
                emailService.sendEmail(user.getEmail(), subject, message);
                log.info("Email sent to {} with role {}: {}", user.getName(), role, user.getEmail());
            } catch (Exception e) {
                log.error("Failed to send email to user {}: {}", user.getEmail(), e.getMessage());
            }
        }
    }

    /**
     * Send email to all users except the specified user
     */
    @Transactional(readOnly = true)
    public void notifyAllExcept(Long excludeUserId, String subject, String message) {
        List<User> users = userRepository.findAll();
        for (User user : users) {
            if (!user.getId().equals(excludeUserId)) {
                try {
                    emailService.sendEmail(user.getEmail(), subject, message);
                    log.info("Email sent to user: {}", user.getEmail());
                } catch (Exception e) {
                    log.error("Failed to send email to user {}: {}", user.getEmail(), e.getMessage());
                }
            }
        }
    }

    /**
     * Send email to multiple roles
     */
    @Transactional(readOnly = true)
    public void notifyByRoles(List<Role> roles, String subject, String message) {
        for (Role role : roles) {
            notifyByRole(role, subject, message);
        }
    }

    /**
     * Send email to specific users by IDs
     */
    @Transactional(readOnly = true)
    public void notifyUsersByIds(List<Long> userIds, String subject, String message) {
        for (Long userId : userIds) {
            userRepository.findById(userId).ifPresent(user -> {
                try {
                    emailService.sendEmail(user.getEmail(), subject, message);
                    log.info("Email sent to user: {}", user.getEmail());
                } catch (Exception e) {
                    log.error("Failed to send email to user {}: {}", user.getEmail(), e.getMessage());
                }
            });
        }
    }
}
