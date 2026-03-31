package com.smartcampus.ticket.dto;

import com.smartcampus.ticket.entity.TicketPriority;
import com.smartcampus.ticket.entity.TicketStatus;

import java.time.LocalDateTime;
import java.util.List;

public record TicketResponse(
        Long id,
        String ticketNumber,
        Long resourceId,
        String resourceName,
        Long createdById,
        String createdByName,
        String category,
        String description,
        TicketPriority priority,
        TicketStatus status,
        Long assignedTechnicianId,
        String assignedTechnicianName,
        String resolutionNotes,
        LocalDateTime slaDeadline,
        Integer satisfactionRating,
        LocalDateTime ratedAt,
        List<AttachmentResponse> attachments,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {}
