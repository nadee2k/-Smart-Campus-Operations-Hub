package com.smartcampus.notification.event;

public record TicketCreatedEmailEvent(
        Long ticketId,
        String ticketNumber,
        String raisedByName,
        String raisedByEmail,
        String category,
        String priority,
        String resourceName,
        String description
) {
}
