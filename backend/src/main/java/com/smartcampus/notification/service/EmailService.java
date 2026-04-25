package com.smartcampus.notification.service;

import com.smartcampus.booking.entity.Booking;

public interface EmailService {

    void sendBookingApprovedEmail(Booking booking);
}
