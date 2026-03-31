package com.smartcampus.ticket.dto;

import jakarta.validation.constraints.NotNull;

public class TicketAssignRequest {

    @NotNull(message = "Technician ID is required")
    private Long technicianId;

    public Long getTechnicianId() { return technicianId; }
    public void setTechnicianId(Long technicianId) { this.technicianId = technicianId; }
}
