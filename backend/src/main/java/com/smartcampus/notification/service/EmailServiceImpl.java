package com.smartcampus.notification.service;

import com.smartcampus.booking.entity.Booking;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.format.DateTimeFormatter;
import java.util.Locale;

@Service
public class EmailServiceImpl implements EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailServiceImpl.class);
    private static final DateTimeFormatter DATE_TIME_FORMATTER =
            DateTimeFormatter.ofPattern("EEE, MMM d yyyy 'at' h:mm a", Locale.US);

    private final ObjectProvider<JavaMailSender> mailSenderProvider;
    private final String fromAddress;

    public EmailServiceImpl(ObjectProvider<JavaMailSender> mailSenderProvider,
                            @Value("${app.mail.from:}") String fromAddress) {
        this.mailSenderProvider = mailSenderProvider;
        this.fromAddress = fromAddress;
    }

    @Override
    public void sendBookingApprovedEmail(Booking booking) {
        if (booking == null || booking.getUser() == null || !StringUtils.hasText(booking.getUser().getEmail())) {
            return;
        }

        JavaMailSender mailSender = mailSenderProvider.getIfAvailable();
        if (mailSender == null) {
            log.debug("Skipping booking approval email because JavaMailSender is not configured");
            return;
        }

        SimpleMailMessage message = new SimpleMailMessage();
        if (StringUtils.hasText(fromAddress)) {
            message.setFrom(fromAddress);
        }
        message.setTo(booking.getUser().getEmail());
        message.setSubject("Booking Approved: " + booking.getResource().getName());
        message.setText(buildBookingApprovedBody(booking));

        try {
            mailSender.send(message);
        } catch (MailException exception) {
            log.warn("Failed to send booking approval email for booking {}", booking.getId(), exception);
        }
    }

    @Override
    public void sendEmail(String to, String subject, String body) {
        try {
            sendEmailOrThrow(to, subject, body);
        } catch (Exception e) {
            log.warn("Failed to send email to {}: {}", to, e.getMessage());
        }
    }

    @Override
    public void sendEmailOrThrow(String to, String subject, String body) {
        JavaMailSender mailSender = mailSenderProvider.getIfAvailable();
        if (mailSender == null) {
            log.debug("Skipping email to {} because JavaMailSender is not configured", to);
            return;
        }
        SimpleMailMessage message = new SimpleMailMessage();
        if (StringUtils.hasText(fromAddress)) {
            message.setFrom(fromAddress);
        }
        message.setTo(to);
        message.setSubject(subject);
        message.setText(body);
        mailSender.send(message);
    }

    private String buildBookingApprovedBody(Booking booking) {
        return """
                Hello %s,

                Your booking has been approved.

                Resource: %s
                Start: %s
                End: %s
                Purpose: %s
                Expected attendees: %d

                %s

                UniOps Smart Campus
                """.formatted(
                booking.getUser().getName(),
                booking.getResource().getName(),
                booking.getStartTime().format(DATE_TIME_FORMATTER),
                booking.getEndTime().format(DATE_TIME_FORMATTER),
                booking.getPurpose(),
                booking.getExpectedAttendees() != null ? booking.getExpectedAttendees() : 0,
                StringUtils.hasText(booking.getAdminComment())
                        ? "Admin note: " + booking.getAdminComment()
                        : "No additional admin notes were added."
        );
    }
}
