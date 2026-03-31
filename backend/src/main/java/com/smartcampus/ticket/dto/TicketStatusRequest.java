package com.smartcampus.ticket.dto;

import com.smartcampus.ticket.entity.TicketStatus;
import jakarta.validation.constraints.NotNull;

public class TicketStatusRequest {

    @NotNull(message = "Status is required")
    private TicketStatus status;

    private String resolutionNotes;

    public TicketStatus getStatus() { return status; }
    public void setStatus(TicketStatus status) { this.status = status; }
    public String getResolutionNotes() { return resolutionNotes; }
    public void setResolutionNotes(String resolutionNotes) { this.resolutionNotes = resolutionNotes; }
}
