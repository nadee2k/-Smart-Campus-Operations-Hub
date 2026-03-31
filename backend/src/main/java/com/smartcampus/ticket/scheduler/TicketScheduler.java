package com.smartcampus.ticket.scheduler;

import com.smartcampus.notification.service.NotificationService;
import com.smartcampus.ticket.entity.Ticket;
import com.smartcampus.ticket.entity.TicketStatus;
import com.smartcampus.ticket.repository.TicketRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Component
public class TicketScheduler {

    private static final Logger log = LoggerFactory.getLogger(TicketScheduler.class);

    private final TicketRepository ticketRepository;
    private final NotificationService notificationService;

    public TicketScheduler(TicketRepository ticketRepository,
                           NotificationService notificationService) {
        this.ticketRepository = ticketRepository;
        this.notificationService = notificationService;
    }

    @Scheduled(fixedRate = 3600000) // every hour
    @Transactional
    public void checkSlaBreaches() {
        LocalDateTime now = LocalDateTime.now();

        List<Ticket> openBreaches = ticketRepository
                .findByStatusAndSlaDeadlineBeforeAndSlaDeadlineIsNotNull(TicketStatus.OPEN, now);
        List<Ticket> inProgressBreaches = ticketRepository
                .findByStatusAndSlaDeadlineBeforeAndSlaDeadlineIsNotNull(TicketStatus.IN_PROGRESS, now);

        openBreaches.addAll(inProgressBreaches);

        for (Ticket ticket : openBreaches) {
            try {
                if (ticket.getAssignedTechnician() != null) {
                    notificationService.sendNotification(
                            ticket.getAssignedTechnician().getId(),
                            "SLA_BREACH",
                            "SLA breached on TKT-" + String.format("%04d", ticket.getId()) + " — " + ticket.getCategory(),
                            "TICKET", ticket.getId());
                }
            } catch (Exception e) {
                log.warn("Failed to send SLA breach notification for ticket {}", ticket.getId(), e);
            }
        }

        if (!openBreaches.isEmpty()) {
            log.info("SLA breach check: {} ticket(s) past deadline", openBreaches.size());
        }
    }

    @Scheduled(cron = "0 0 2 * * *") // daily at 2 AM
    @Transactional
    public void autoCloseResolvedTickets() {
        LocalDateTime sevenDaysAgo = LocalDateTime.now().minusDays(7);
        List<Ticket> tickets = ticketRepository.findByStatusAndUpdatedAtBefore(TicketStatus.RESOLVED, sevenDaysAgo);

        for (Ticket ticket : tickets) {
            ticket.setStatus(TicketStatus.CLOSED);
            ticketRepository.save(ticket);

            try {
                notificationService.sendNotification(
                        ticket.getCreatedBy().getId(),
                        "TICKET_STATUS_CHANGED",
                        "TKT-" + String.format("%04d", ticket.getId()) + " was auto-closed after 7 days of inactivity.",
                        "TICKET", ticket.getId());
            } catch (Exception e) {
                log.warn("Failed to send auto-close notification for ticket {}", ticket.getId(), e);
            }
        }

        if (!tickets.isEmpty()) {
            log.info("Auto-closed {} resolved ticket(s)", tickets.size());
        }
    }
}
