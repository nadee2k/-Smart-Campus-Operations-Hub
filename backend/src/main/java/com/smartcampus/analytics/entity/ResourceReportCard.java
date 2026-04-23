package com.smartcampus.analytics.entity;

import com.smartcampus.resource.entity.CampusResource;
import jakarta.persistence.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "resource_report_cards",
        uniqueConstraints = @UniqueConstraint(columnNames = {"resource_id", "week_start_date"}))
public class ResourceReportCard {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "resource_id", nullable = false)
    private CampusResource resource;

    @Column(name = "week_start_date", nullable = false)
    private LocalDate weekStartDate;

    @Column(name = "week_end_date", nullable = false)
    private LocalDate weekEndDate;

    @Column(name = "total_bookings", nullable = false)
    private Long totalBookings;

    @Column(name = "approved_bookings", nullable = false)
    private Long approvedBookings;

    @Column(name = "cancelled_bookings", nullable = false)
    private Long cancelledBookings;

    @Column(name = "booked_hours", nullable = false)
    private Double bookedHours;

    @Column(name = "tickets_opened", nullable = false)
    private Long ticketsOpened;

    @Column(name = "tickets_resolved", nullable = false)
    private Long ticketsResolved;

    @Column(name = "average_resolution_hours", nullable = false)
    private Double averageResolutionHours;

    @Column(name = "resource_score", nullable = false)
    private Integer resourceScore;

    @Lob
    @Column(name = "pdf_content", nullable = false)
    private byte[] pdfContent;

    @Column(name = "generated_at", nullable = false)
    private LocalDateTime generatedAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public CampusResource getResource() { return resource; }
    public void setResource(CampusResource resource) { this.resource = resource; }
    public LocalDate getWeekStartDate() { return weekStartDate; }
    public void setWeekStartDate(LocalDate weekStartDate) { this.weekStartDate = weekStartDate; }
    public LocalDate getWeekEndDate() { return weekEndDate; }
    public void setWeekEndDate(LocalDate weekEndDate) { this.weekEndDate = weekEndDate; }
    public Long getTotalBookings() { return totalBookings; }
    public void setTotalBookings(Long totalBookings) { this.totalBookings = totalBookings; }
    public Long getApprovedBookings() { return approvedBookings; }
    public void setApprovedBookings(Long approvedBookings) { this.approvedBookings = approvedBookings; }
    public Long getCancelledBookings() { return cancelledBookings; }
    public void setCancelledBookings(Long cancelledBookings) { this.cancelledBookings = cancelledBookings; }
    public Double getBookedHours() { return bookedHours; }
    public void setBookedHours(Double bookedHours) { this.bookedHours = bookedHours; }
    public Long getTicketsOpened() { return ticketsOpened; }
    public void setTicketsOpened(Long ticketsOpened) { this.ticketsOpened = ticketsOpened; }
    public Long getTicketsResolved() { return ticketsResolved; }
    public void setTicketsResolved(Long ticketsResolved) { this.ticketsResolved = ticketsResolved; }
    public Double getAverageResolutionHours() { return averageResolutionHours; }
    public void setAverageResolutionHours(Double averageResolutionHours) { this.averageResolutionHours = averageResolutionHours; }
    public Integer getResourceScore() { return resourceScore; }
    public void setResourceScore(Integer resourceScore) { this.resourceScore = resourceScore; }
    public byte[] getPdfContent() { return pdfContent; }
    public void setPdfContent(byte[] pdfContent) { this.pdfContent = pdfContent; }
    public LocalDateTime getGeneratedAt() { return generatedAt; }
    public void setGeneratedAt(LocalDateTime generatedAt) { this.generatedAt = generatedAt; }
}
