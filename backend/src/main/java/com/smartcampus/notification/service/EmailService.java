package com.smartcampus.notification.service;

import com.smartcampus.booking.entity.Booking;

public interface EmailService {

    void sendBookingApprovedEmail(Booking booking);

    void sendEmail(String to, String subject, String body);

    void sendEmailOrThrow(String to, String subject, String body);
}
