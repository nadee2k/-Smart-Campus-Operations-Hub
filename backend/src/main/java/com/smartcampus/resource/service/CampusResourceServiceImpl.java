package com.smartcampus.resource.service;

import com.lowagie.text.Chunk;
import com.lowagie.text.Document;
import com.lowagie.text.DocumentException;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import com.smartcampus.activity.service.ActivityLogService;
import com.smartcampus.booking.entity.Booking;
import com.smartcampus.booking.entity.BookingStatus;
import com.smartcampus.booking.repository.BookingRepository;
import com.smartcampus.common.exception.BadRequestException;
import com.smartcampus.common.exception.ConflictException;
import com.smartcampus.common.exception.ResourceNotFoundException;
import com.smartcampus.resource.dto.ResourceBlackoutRequest;
import com.smartcampus.resource.dto.ResourceBlackoutResponse;
import com.smartcampus.resource.dto.ResourceRequest;
import com.smartcampus.resource.dto.ResourceResponse;
import com.smartcampus.resource.dto.WeeklyResourceReportResponse;
import com.smartcampus.resource.entity.CampusResource;
import com.smartcampus.resource.entity.ResourceBlackout;
import com.smartcampus.resource.entity.ResourceStatus;
import com.smartcampus.resource.entity.ResourceType;
import com.smartcampus.resource.repository.CampusResourceRepository;
import com.smartcampus.resource.repository.ResourceBlackoutRepository;
import com.smartcampus.ticket.entity.Ticket;
import com.smartcampus.ticket.entity.TicketStatus;
import com.smartcampus.ticket.repository.TicketRepository;
import org.modelmapper.ModelMapper;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.time.DayOfWeek;
import java.time.Duration;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class CampusResourceServiceImpl implements CampusResourceService {

    private final CampusResourceRepository repository;
    private final BookingRepository bookingRepository;
    private final ResourceBlackoutRepository blackoutRepository;
    private final TicketRepository ticketRepository;
    private final ModelMapper modelMapper;
    private final ActivityLogService activityLogService;

    public CampusResourceServiceImpl(CampusResourceRepository repository,
                                     BookingRepository bookingRepository,
                                     ResourceBlackoutRepository blackoutRepository,
                                     TicketRepository ticketRepository,
                                     ModelMapper modelMapper,
                                     ActivityLogService activityLogService) {
        this.repository = repository;
        this.bookingRepository = bookingRepository;
        this.blackoutRepository = blackoutRepository;
        this.ticketRepository = ticketRepository;
        this.modelMapper = modelMapper;
        this.activityLogService = activityLogService;
    }

    @Override
    @Transactional
    @CacheEvict(value = "resources", allEntries = true)
    public ResourceResponse create(ResourceRequest request) {
        CampusResource resource = modelMapper.map(request, CampusResource.class);
        if (resource.getStatus() == null) {
            resource.setStatus(ResourceStatus.ACTIVE);
        }
        if (resource.getMaintenanceScore() == null) {
            resource.setMaintenanceScore(100);
        }
        CampusResource saved = repository.save(resource);
        activityLogService.log(null, "Admin", "RESOURCE_CREATED", "RESOURCE", saved.getId(), "Created resource: " + saved.getName());
        return toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public ResourceResponse getById(Long id) {
        CampusResource resource = findActiveById(id);
        return toResponse(resource);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ResourceBlackoutResponse> getBlackouts(Long id) {
        CampusResource resource = findActiveById(id);
        return blackoutRepository.findByResourceIdOrderByStartTimeAsc(resource.getId())
                .stream()
                .map(this::toBlackoutResponse)
                .toList();
    }

    @Override
    @Transactional
    @CacheEvict(value = "resources", allEntries = true)
    public ResourceBlackoutResponse createBlackout(Long id, ResourceBlackoutRequest request) {
        CampusResource resource = findActiveById(id);
        validateBlackoutWindow(request.getStartTime(), request.getEndTime());

        List<ResourceBlackout> overlappingBlackouts = blackoutRepository.findOverlapping(
                resource.getId(),
                request.getStartTime(),
                request.getEndTime()
        );
        if (!overlappingBlackouts.isEmpty()) {
            throw new ConflictException("Blackout period overlaps an existing blackout");
        }

        List<Booking> activeBookings = bookingRepository.findConflicting(
                resource.getId(),
                request.getStartTime(),
                request.getEndTime()
        );
        if (!activeBookings.isEmpty()) {
            throw new ConflictException("Blackout period overlaps an existing booking");
        }

        ResourceBlackout blackout = new ResourceBlackout();
        blackout.setResource(resource);
        blackout.setTitle(request.getTitle().trim());
        blackout.setReason(request.getReason());
        blackout.setStartTime(request.getStartTime());
        blackout.setEndTime(request.getEndTime());

        ResourceBlackout saved = blackoutRepository.save(blackout);
        activityLogService.log(
                null,
                "Admin",
                "RESOURCE_BLACKOUT_CREATED",
                "RESOURCE",
                resource.getId(),
                "Blocked " + resource.getName() + " from " + request.getStartTime() + " to " + request.getEndTime()
        );
        return toBlackoutResponse(saved);
    }

    @Override
    @Transactional
    @CacheEvict(value = "resources", allEntries = true)
    public void deleteBlackout(Long id, Long blackoutId) {
        CampusResource resource = findActiveById(id);
        ResourceBlackout blackout = blackoutRepository.findByIdAndResourceId(blackoutId, resource.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Resource blackout", blackoutId));
        blackoutRepository.delete(blackout);
        activityLogService.log(
                null,
                "Admin",
                "RESOURCE_BLACKOUT_DELETED",
                "RESOURCE",
                resource.getId(),
                "Removed blackout \"" + blackout.getTitle() + "\" from " + resource.getName()
        );
    }

    @Override
    @Transactional(readOnly = true)
    public WeeklyResourceReportResponse getWeeklyReport(Long id) {
        CampusResource resource = findActiveById(id);

        LocalDate today = LocalDate.now();
        LocalDate weekStart = today.with(DayOfWeek.MONDAY);
        LocalDate weekEnd = weekStart.plusDays(6);

        List<Booking> bookings = bookingRepository.findByResourceIdAndStartTimeBetween(
                id,
                weekStart.atStartOfDay(),
                weekEnd.plusDays(1).atStartOfDay()
        );
        List<Ticket> ticketsOpenedThisWeek = ticketRepository.findByResourceIdAndCreatedAtBetween(
                id,
                weekStart.atStartOfDay(),
                weekEnd.plusDays(1).atStartOfDay()
        );

        long approvedBookings = countBookings(bookings, BookingStatus.APPROVED);
        long pendingBookings = countBookings(bookings, BookingStatus.PENDING);
        long cancelledBookings = countBookings(bookings, BookingStatus.CANCELLED);
        long rejectedBookings = countBookings(bookings, BookingStatus.REJECTED);
        long checkedInBookings = bookings.stream()
                .filter(booking -> booking.getStatus() == BookingStatus.APPROVED && Boolean.TRUE.equals(booking.getCheckedIn()))
                .count();
        long totalExpectedAttendees = bookings.stream()
                .map(Booking::getExpectedAttendees)
                .filter(value -> value != null)
                .mapToLong(Integer::longValue)
                .sum();
        double averageAttendees = bookings.stream()
                .map(Booking::getExpectedAttendees)
                .filter(value -> value != null)
                .mapToInt(Integer::intValue)
                .average()
                .orElse(0);
        double totalReservedHours = bookings.stream()
                .filter(booking -> booking.getStartTime() != null && booking.getEndTime() != null)
                .mapToDouble(booking -> Duration.between(booking.getStartTime(), booking.getEndTime()).toMinutes() / 60.0)
                .sum();
        double checkInRate = approvedBookings > 0 ? (checkedInBookings * 100.0) / approvedBookings : 0;

        long ticketsResolved = ticketRepository.countByResourceIdAndStatusInAndUpdatedAtBetween(
                id,
                List.of(TicketStatus.RESOLVED, TicketStatus.CLOSED),
                weekStart.atStartOfDay(),
                weekEnd.plusDays(1).atStartOfDay()
        );
        long openTickets = ticketRepository.countByResourceIdAndStatusNotIn(
                id,
                List.of(TicketStatus.RESOLVED, TicketStatus.CLOSED, TicketStatus.REJECTED)
        );

        return new WeeklyResourceReportResponse(
                resource.getId(),
                resource.getName(),
                resource.getType() != null ? resource.getType().name().replace('_', ' ') : null,
                resource.getLocation(),
                resource.getDepartment(),
                resource.getMaintenanceScore(),
                weekStart,
                weekEnd,
                java.time.LocalDateTime.now(),
                bookings.size(),
                approvedBookings,
                pendingBookings,
                cancelledBookings,
                rejectedBookings,
                checkedInBookings,
                totalExpectedAttendees,
                roundToOneDecimal(averageAttendees),
                roundToOneDecimal(totalReservedHours),
                roundToOneDecimal(checkInRate),
                determineBusiestDay(bookings),
                determineBusiestTimeRange(bookings),
                ticketsOpenedThisWeek.size(),
                ticketsResolved,
                openTickets,
                determineUtilizationBand(bookings.size(), resource.getMaintenanceScore(), openTickets),
                buildOperationalSummary(resource, bookings.size(), approvedBookings, checkedInBookings, ticketsOpenedThisWeek.size(), ticketsResolved, openTickets)
        );
    }

    @Override
    @Transactional(readOnly = true)
    public byte[] generateWeeklyReportPdf(Long id) {
        WeeklyResourceReportResponse report = getWeeklyReport(id);
        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        Document document = new Document();

        try {
            PdfWriter.getInstance(document, outputStream);
            document.open();

            Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18);
            Font sectionFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12);
            Font bodyFont = FontFactory.getFont(FontFactory.HELVETICA, 10);

            document.add(new Paragraph("Resource Report Card", titleFont));
            document.add(new Paragraph(report.resourceName() + " | " + safeValue(report.resourceType()), sectionFont));
            document.add(new Paragraph(
                    "Reporting week: " + report.weekStart() + " to " + report.weekEnd() + " | Generated: " + report.generatedAt(),
                    bodyFont
            ));
            document.add(Chunk.NEWLINE);

            document.add(new Paragraph("Operational Summary", sectionFont));
            document.add(new Paragraph(report.operationalSummary(), bodyFont));
            document.add(Chunk.NEWLINE);

            PdfPTable overviewTable = new PdfPTable(2);
            overviewTable.setWidthPercentage(100);
            overviewTable.setSpacingBefore(8f);
            overviewTable.setSpacingAfter(8f);
            addTableRow(overviewTable, "Location", safeValue(report.location()), bodyFont);
            addTableRow(overviewTable, "Department", safeValue(report.department()), bodyFont);
            addTableRow(overviewTable, "Maintenance Score", safeValue(report.maintenanceScore()), bodyFont);
            addTableRow(overviewTable, "Utilization Band", safeValue(report.utilizationBand()), bodyFont);
            addTableRow(overviewTable, "Busiest Day", safeValue(report.busiestDay()), bodyFont);
            addTableRow(overviewTable, "Peak Time", safeValue(report.busiestTimeRange()), bodyFont);
            document.add(overviewTable);

            document.add(new Paragraph("Weekly Metrics", sectionFont));
            PdfPTable metricsTable = new PdfPTable(2);
            metricsTable.setWidthPercentage(100);
            metricsTable.setSpacingBefore(8f);
            addTableRow(metricsTable, "Total bookings", report.totalBookings(), bodyFont);
            addTableRow(metricsTable, "Approved bookings", report.approvedBookings(), bodyFont);
            addTableRow(metricsTable, "Pending bookings", report.pendingBookings(), bodyFont);
            addTableRow(metricsTable, "Cancelled bookings", report.cancelledBookings(), bodyFont);
            addTableRow(metricsTable, "Rejected bookings", report.rejectedBookings(), bodyFont);
            addTableRow(metricsTable, "Checked-in bookings", report.checkedInBookings(), bodyFont);
            addTableRow(metricsTable, "Check-in rate", formatPercent(report.checkInRate()), bodyFont);
            addTableRow(metricsTable, "Reserved hours", formatDecimal(report.totalReservedHours()) + " hrs", bodyFont);
            addTableRow(metricsTable, "Average attendees", formatDecimal(report.averageAttendees()), bodyFont);
            addTableRow(metricsTable, "Expected attendees", report.totalExpectedAttendees(), bodyFont);
            addTableRow(metricsTable, "Tickets opened", report.ticketsOpened(), bodyFont);
            addTableRow(metricsTable, "Tickets resolved", report.ticketsResolved(), bodyFont);
            addTableRow(metricsTable, "Open tickets", report.openTickets(), bodyFont);
            document.add(metricsTable);
        } catch (DocumentException exception) {
            throw new IllegalStateException("Failed to generate weekly resource report PDF", exception);
        } finally {
            document.close();
        }

        return outputStream.toByteArray();
    }

    @Override
    @Transactional(readOnly = true)
    @Cacheable(value = "resources")
    public Page<ResourceResponse> getAll(Pageable pageable) {
        return repository.findByDeletedFalse(pageable).map(this::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ResourceResponse> search(ResourceType type, ResourceStatus status, String query, Pageable pageable) {
        String typeStr = type != null ? type.name() : null;
        String statusStr = status != null ? status.name() : null;
        return repository.search(typeStr, statusStr, query, pageable).map(this::toResponse);
    }

    @Override
    @Transactional
    @CacheEvict(value = "resources", allEntries = true)
    public ResourceResponse update(Long id, ResourceRequest request) {
        CampusResource resource = findActiveById(id);
        modelMapper.map(request, resource);
        if (resource.getMaintenanceScore() == null) {
            resource.setMaintenanceScore(100);
        }
        CampusResource saved = repository.save(resource);
        activityLogService.log(null, "Admin", "RESOURCE_UPDATED", "RESOURCE", saved.getId(), "Updated resource: " + saved.getName());
        return toResponse(saved);
    }

    @Override
    @Transactional
    @CacheEvict(value = "resources", allEntries = true)
    public ResourceResponse cloneResource(Long id) {
        CampusResource source = findActiveById(id);
        CampusResource clone = new CampusResource();
        clone.setName(source.getName() + " (Copy)");
        clone.setType(source.getType());
        clone.setCapacity(source.getCapacity());
        clone.setLocation(source.getLocation());
        clone.setDescription(source.getDescription());
        clone.setAmenities(copyList(source.getAmenities()));
        clone.setPhotoUrls(copyList(source.getPhotoUrls()));
        clone.setLayoutMapUrl(source.getLayoutMapUrl());
        clone.setView360Url(source.getView360Url());
        clone.setOwnerName(source.getOwnerName());
        clone.setDepartment(source.getDepartment());
        clone.setMaintenanceScore(source.getMaintenanceScore() != null ? source.getMaintenanceScore() : 100);
        clone.setAvailabilityStartTime(source.getAvailabilityStartTime());
        clone.setAvailabilityEndTime(source.getAvailabilityEndTime());
        clone.setStatus(source.getStatus() != null ? source.getStatus() : ResourceStatus.ACTIVE);
        clone.setDeleted(false);

        CampusResource saved = repository.save(clone);
        activityLogService.log(
                null,
                "Admin",
                "RESOURCE_CLONED",
                "RESOURCE",
                saved.getId(),
                "Cloned resource from " + source.getName() + " to " + saved.getName()
        );
        return toResponse(saved);
    }

    @Override
    @Transactional
    @CacheEvict(value = "resources", allEntries = true)
    public ResourceResponse toggleStatus(Long id) {
        CampusResource resource = findActiveById(id);
        ResourceStatus nextStatus = resource.getStatus() == ResourceStatus.OUT_OF_SERVICE
                ? ResourceStatus.ACTIVE
                : ResourceStatus.OUT_OF_SERVICE;
        resource.setStatus(nextStatus);
        CampusResource saved = repository.save(resource);
        activityLogService.log(
                null,
                "Admin",
                "RESOURCE_STATUS_TOGGLED",
                "RESOURCE",
                saved.getId(),
                "Changed resource status to " + saved.getStatus() + " for " + saved.getName()
        );
        return toResponse(saved);
    }

    @Override
    @Transactional
    @CacheEvict(value = "resources", allEntries = true)
    public void delete(Long id) {
        CampusResource resource = findActiveById(id);
        resource.setDeleted(true);
        repository.save(resource);
        activityLogService.log(null, "Admin", "RESOURCE_DELETED", "RESOURCE", resource.getId(), "Deleted resource: " + resource.getName());
    }

    private CampusResource findActiveById(Long id) {
        CampusResource resource = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Resource", id));
        if (resource.getDeleted()) {
            throw new ResourceNotFoundException("Resource", id);
        }
        return resource;
    }

    private ResourceResponse toResponse(CampusResource r) {
        return new ResourceResponse(
                r.getId(), r.getName(), r.getType(), r.getCapacity(),
                r.getLocation(),
                r.getDescription(),
                copyList(r.getAmenities()),
                copyList(r.getPhotoUrls()),
                r.getLayoutMapUrl(),
                r.getView360Url(),
                r.getOwnerName(),
                r.getDepartment(),
                r.getMaintenanceScore(),
                r.getAvailabilityStartTime(), r.getAvailabilityEndTime(),
                r.getStatus(), r.getCreatedAt(), r.getUpdatedAt()
        );
    }

    private List<String> copyList(List<String> values) {
        return values == null ? List.of() : new ArrayList<>(values);
    }

    private long countBookings(List<Booking> bookings, BookingStatus status) {
        return bookings.stream().filter(booking -> booking.getStatus() == status).count();
    }

    private String determineBusiestDay(List<Booking> bookings) {
        return bookings.stream()
                .filter(booking -> booking.getStartTime() != null)
                .collect(java.util.stream.Collectors.groupingBy(
                        booking -> booking.getStartTime().getDayOfWeek(),
                        HashMap::new,
                        java.util.stream.Collectors.counting()
                ))
                .entrySet()
                .stream()
                .max(Map.Entry.comparingByValue())
                .map(entry -> capitalize(entry.getKey().name()))
                .orElse("No bookings yet");
    }

    private String determineBusiestTimeRange(List<Booking> bookings) {
        return bookings.stream()
                .filter(booking -> booking.getStartTime() != null)
                .collect(java.util.stream.Collectors.groupingBy(
                        booking -> booking.getStartTime().getHour(),
                        HashMap::new,
                        java.util.stream.Collectors.counting()
                ))
                .entrySet()
                .stream()
                .max(Map.Entry.comparingByValue())
                .map(entry -> formatHourRange(entry.getKey()))
                .orElse("No booking peak yet");
    }

    private String determineUtilizationBand(long totalBookings, Integer maintenanceScore, long openTickets) {
        int score = maintenanceScore != null ? maintenanceScore : 100;
        if (totalBookings >= 8 && score >= 80 && openTickets == 0) {
            return "High demand, healthy";
        }
        if (totalBookings >= 4 && score >= 60 && openTickets <= 2) {
            return "Steady usage";
        }
        if (openTickets >= 3 || score < 50) {
            return "Needs attention";
        }
        return "Light usage";
    }

    private String buildOperationalSummary(CampusResource resource,
                                           long totalBookings,
                                           long approvedBookings,
                                           long checkedInBookings,
                                           long ticketsOpened,
                                           long ticketsResolved,
                                           long openTickets) {
        String resourceLabel = resource.getName() != null ? resource.getName() : "This resource";
        if (totalBookings == 0 && ticketsOpened == 0 && openTickets == 0) {
            return resourceLabel + " had a quiet week with no bookings or maintenance activity recorded.";
        }

        return String.format(
                Locale.US,
                "%s recorded %d booking%s this week, with %d approved and %d completed check-ins. %d ticket%s were opened, %d resolved, and %d remain active.",
                resourceLabel,
                totalBookings,
                totalBookings == 1 ? "" : "s",
                approvedBookings,
                checkedInBookings,
                ticketsOpened,
                ticketsOpened == 1 ? "" : "s",
                ticketsResolved,
                openTickets
        );
    }

    private ResourceBlackoutResponse toBlackoutResponse(ResourceBlackout blackout) {
        return new ResourceBlackoutResponse(
                blackout.getId(),
                blackout.getResource().getId(),
                blackout.getResource().getName(),
                blackout.getTitle(),
                blackout.getReason(),
                blackout.getStartTime(),
                blackout.getEndTime(),
                blackout.getCreatedAt()
        );
    }

    private void validateBlackoutWindow(java.time.LocalDateTime startTime, java.time.LocalDateTime endTime) {
        if (startTime == null || endTime == null) {
            throw new BadRequestException("Blackout start and end times are required");
        }
        if (!endTime.isAfter(startTime)) {
            throw new BadRequestException("Blackout end time must be after start time");
        }
    }

    private void addTableRow(PdfPTable table, String label, Object value, Font font) {
        PdfPCell labelCell = new PdfPCell(new Phrase(label, font));
        PdfPCell valueCell = new PdfPCell(new Phrase(safeValue(value), font));
        labelCell.setPadding(6f);
        valueCell.setPadding(6f);
        table.addCell(labelCell);
        table.addCell(valueCell);
    }

    private String safeValue(Object value) {
        return value == null || value.toString().isBlank() ? "-" : value.toString();
    }

    private String formatHourRange(int hour) {
        int nextHour = (hour + 1) % 24;
        return String.format(Locale.US, "%s - %s", formatHour(hour), formatHour(nextHour));
    }

    private String formatHour(int hour) {
        int normalizedHour = hour % 24;
        int hour12 = normalizedHour % 12 == 0 ? 12 : normalizedHour % 12;
        String meridiem = normalizedHour >= 12 ? "PM" : "AM";
        return hour12 + ":00 " + meridiem;
    }

    private String capitalize(String value) {
        String lower = value.toLowerCase(Locale.US);
        return Character.toUpperCase(lower.charAt(0)) + lower.substring(1);
    }

    private double roundToOneDecimal(double value) {
        return Math.round(value * 10.0) / 10.0;
    }

    private String formatPercent(double value) {
        return formatDecimal(value) + "%";
    }

    private String formatDecimal(double value) {
        return String.format(Locale.US, "%.1f", value);
    }
}
