package com.smartcampus.analytics.service;

import com.smartcampus.analytics.dto.ResourceReportCardSummary;
import com.smartcampus.analytics.entity.ResourceReportCard;
import com.smartcampus.analytics.repository.ResourceReportCardRepository;
import com.smartcampus.auth.entity.Role;
import com.smartcampus.auth.entity.User;
import com.smartcampus.auth.repository.UserRepository;
import com.smartcampus.booking.entity.Booking;
import com.smartcampus.booking.entity.BookingStatus;
import com.smartcampus.booking.repository.BookingRepository;
import com.smartcampus.common.exception.ResourceNotFoundException;
import com.smartcampus.notification.service.NotificationService;
import com.smartcampus.resource.entity.CampusResource;
import com.smartcampus.resource.repository.CampusResourceRepository;
import com.smartcampus.ticket.entity.Ticket;
import com.smartcampus.ticket.entity.TicketStatus;
import com.smartcampus.ticket.repository.TicketRepository;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
public class ResourceReportCardService {

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("MMM d, yyyy");

    private final CampusResourceRepository resourceRepository;
    private final BookingRepository bookingRepository;
    private final TicketRepository ticketRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final ResourceReportCardRepository resourceReportCardRepository;

    public ResourceReportCardService(CampusResourceRepository resourceRepository,
                                     BookingRepository bookingRepository,
                                     TicketRepository ticketRepository,
                                     UserRepository userRepository,
                                     NotificationService notificationService,
                                     ResourceReportCardRepository resourceReportCardRepository) {
        this.resourceRepository = resourceRepository;
        this.bookingRepository = bookingRepository;
        this.ticketRepository = ticketRepository;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
        this.resourceReportCardRepository = resourceReportCardRepository;
    }

    @Transactional
    public ResourceReportCardSummary getWeeklyReportCard(Long resourceId, LocalDate weekStartDate) {
        LocalDate effectiveStart = normalizeWeekStart(weekStartDate);
        return resourceReportCardRepository.findByResourceIdAndWeekStartDate(resourceId, effectiveStart)
                .map(this::toSummary)
                .orElseGet(() -> toSummary(generateAndPersistReport(resourceId, effectiveStart)));
    }

    @Transactional
    public byte[] getWeeklyReportCardPdf(Long resourceId, LocalDate weekStartDate) {
        LocalDate effectiveStart = normalizeWeekStart(weekStartDate);
        return resourceReportCardRepository.findByResourceIdAndWeekStartDate(resourceId, effectiveStart)
                .map(ResourceReportCard::getPdfContent)
                .orElseGet(() -> generateAndPersistReport(resourceId, effectiveStart).getPdfContent());
    }

    @Scheduled(cron = "0 0 6 * * MON")
    @Transactional
    public void generateWeeklyReportCards() {
        LocalDate weekStartDate = LocalDate.now().minusWeeks(1).with(DayOfWeek.MONDAY);
        List<CampusResource> resources = resourceRepository.findByDeletedFalse();
        List<User> admins = userRepository.findByRole(Role.ADMIN);

        for (CampusResource resource : resources) {
            ResourceReportCard reportCard = generateAndPersistReport(resource.getId(), weekStartDate);
            ResourceReportCardSummary summary = toSummary(reportCard);
            String message = String.format(
                    "Weekly report card ready for %s (%s - %s): score %d/100, bookings %d, tickets %d.",
                    summary.resourceName(),
                    summary.weekStartDate().format(DATE_FMT),
                    summary.weekEndDate().format(DATE_FMT),
                    summary.resourceScore(),
                    summary.totalBookings(),
                    summary.ticketsOpened());
            for (User admin : admins) {
                notificationService.sendNotification(
                        admin.getId(),
                        "RESOURCE_REPORT_CARD",
                        message,
                        "RESOURCE",
                        summary.resourceId());
            }
        }
    }

    @Transactional
    ResourceReportCard generateAndPersistReport(Long resourceId, LocalDate weekStartDate) {
        CampusResource resource = resourceRepository.findById(resourceId)
                .orElseThrow(() -> new ResourceNotFoundException("Resource", resourceId));
        LocalDate effectiveStart = normalizeWeekStart(weekStartDate);
        LocalDate weekEndDate = effectiveStart.plusDays(6);

        ResourceReportCardSummary summary = buildSummary(resource, effectiveStart, weekEndDate);
        byte[] pdfContent = buildPdf(summary);

        ResourceReportCard reportCard = resourceReportCardRepository
                .findByResourceIdAndWeekStartDate(resourceId, effectiveStart)
                .orElseGet(ResourceReportCard::new);

        reportCard.setResource(resource);
        reportCard.setWeekStartDate(summary.weekStartDate());
        reportCard.setWeekEndDate(summary.weekEndDate());
        reportCard.setTotalBookings(summary.totalBookings());
        reportCard.setApprovedBookings(summary.approvedBookings());
        reportCard.setCancelledBookings(summary.cancelledBookings());
        reportCard.setBookedHours(summary.bookedHours());
        reportCard.setTicketsOpened(summary.ticketsOpened());
        reportCard.setTicketsResolved(summary.ticketsResolved());
        reportCard.setAverageResolutionHours(summary.averageResolutionHours());
        reportCard.setResourceScore(summary.resourceScore());
        reportCard.setPdfContent(pdfContent);
        reportCard.setGeneratedAt(LocalDateTime.now());

        return resourceReportCardRepository.save(reportCard);
    }

    private ResourceReportCardSummary buildSummary(CampusResource resource, LocalDate weekStartDate, LocalDate weekEndDate) {
        LocalDateTime start = weekStartDate.atStartOfDay();
        LocalDateTime end = weekEndDate.atTime(LocalTime.MAX);

        List<Booking> bookings = bookingRepository.findByResourceIdAndStartTimeBetween(resource.getId(), start, end);
        long approvedBookings = bookings.stream().filter(b -> b.getStatus() == BookingStatus.APPROVED).count();
        long cancelledBookings = bookings.stream().filter(b -> b.getStatus() == BookingStatus.CANCELLED).count();
        double bookedHours = bookings.stream()
                .filter(b -> b.getStatus() == BookingStatus.APPROVED)
                .mapToDouble(b -> Duration.between(b.getStartTime(), b.getEndTime()).toMinutes() / 60.0)
                .sum();

        List<Ticket> tickets = ticketRepository.findByResourceIdAndCreatedAtBetween(resource.getId(), start, end);
        long ticketsResolved = tickets.stream()
                .filter(t -> t.getStatus() == TicketStatus.RESOLVED || t.getStatus() == TicketStatus.CLOSED)
                .count();
        double avgResolutionHours = tickets.stream()
                .filter(t -> t.getStatus() == TicketStatus.RESOLVED || t.getStatus() == TicketStatus.CLOSED)
                .filter(t -> t.getCreatedAt() != null && t.getUpdatedAt() != null)
                .mapToDouble(t -> Duration.between(t.getCreatedAt(), t.getUpdatedAt()).toMinutes() / 60.0)
                .average()
                .orElse(0.0);

        int resourceScore = calculateScore(resource.getMaintenanceScore(), approvedBookings, tickets.size(), ticketsResolved);

        return new ResourceReportCardSummary(
                resource.getId(),
                resource.getName(),
                weekStartDate,
                weekEndDate,
                bookings.size(),
                approvedBookings,
                cancelledBookings,
                round(bookedHours),
                (long) tickets.size(),
                ticketsResolved,
                round(avgResolutionHours),
                resourceScore
        );
    }

    private int calculateScore(Integer maintenanceScore, long approvedBookings, int ticketsOpened, long ticketsResolved) {
        int health = maintenanceScore != null ? maintenanceScore : 70;
        int bookingScore = (int) Math.min(20, approvedBookings * 2);
        int resolutionScore = ticketsOpened == 0 ? 20 : (int) Math.round(((double) ticketsResolved / ticketsOpened) * 20);
        int raw = (int) Math.round((health * 0.6) + bookingScore + resolutionScore);
        return Math.max(0, Math.min(100, raw));
    }

    private byte[] buildPdf(ResourceReportCardSummary summary) {
        try (PDDocument document = new PDDocument();
             ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            PDPage page = new PDPage();
            document.addPage(page);

            try (PDPageContentStream content = new PDPageContentStream(document, page)) {
                content.beginText();
                content.setFont(PDType1Font.HELVETICA_BOLD, 16);
                content.newLineAtOffset(50, 740);
                content.showText("Resource Weekly Report Card");
                content.setFont(PDType1Font.HELVETICA, 12);
                content.newLineAtOffset(0, -30);
                content.showText("Resource: " + summary.resourceName() + " (#" + summary.resourceId() + ")");
                content.newLineAtOffset(0, -20);
                content.showText("Period: " + summary.weekStartDate().format(DATE_FMT) + " - " + summary.weekEndDate().format(DATE_FMT));
                content.newLineAtOffset(0, -20);
                content.showText("Resource score: " + summary.resourceScore() + "/100");
                content.newLineAtOffset(0, -30);
                content.showText("Bookings");
                content.newLineAtOffset(0, -20);
                content.showText("Total bookings: " + summary.totalBookings());
                content.newLineAtOffset(0, -20);
                content.showText("Approved bookings: " + summary.approvedBookings());
                content.newLineAtOffset(0, -20);
                content.showText("Cancelled bookings: " + summary.cancelledBookings());
                content.newLineAtOffset(0, -20);
                content.showText("Approved booked hours: " + summary.bookedHours());
                content.newLineAtOffset(0, -30);
                content.showText("Tickets");
                content.newLineAtOffset(0, -20);
                content.showText("Opened tickets: " + summary.ticketsOpened());
                content.newLineAtOffset(0, -20);
                content.showText("Resolved/Closed tickets: " + summary.ticketsResolved());
                content.newLineAtOffset(0, -20);
                content.showText("Average resolution time (hours): " + summary.averageResolutionHours());
                content.endText();
            }

            document.save(output);
            return output.toByteArray();
        } catch (IOException ex) {
            throw new IllegalStateException("Failed to generate resource report card PDF", ex);
        }
    }

    private LocalDate normalizeWeekStart(LocalDate weekStartDate) {
        LocalDate base = weekStartDate != null ? weekStartDate : LocalDate.now().minusWeeks(1);
        return base.with(DayOfWeek.MONDAY);
    }

    private ResourceReportCardSummary toSummary(ResourceReportCard reportCard) {
        return new ResourceReportCardSummary(
                reportCard.getResource().getId(),
                reportCard.getResource().getName(),
                reportCard.getWeekStartDate(),
                reportCard.getWeekEndDate(),
                reportCard.getTotalBookings(),
                reportCard.getApprovedBookings(),
                reportCard.getCancelledBookings(),
                reportCard.getBookedHours(),
                reportCard.getTicketsOpened(),
                reportCard.getTicketsResolved(),
                reportCard.getAverageResolutionHours(),
                reportCard.getResourceScore()
        );
    }

    private double round(double value) {
        return Math.round(value * 10.0) / 10.0;
    }
}
