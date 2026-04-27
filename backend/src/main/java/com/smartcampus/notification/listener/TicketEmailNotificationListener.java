package com.smartcampus.notification.listener;

import com.smartcampus.notification.event.TicketCreatedEmailEvent;
import com.smartcampus.notification.service.EmailNotificationService;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
public class TicketEmailNotificationListener {

    private final EmailNotificationService emailNotificationService;

    public TicketEmailNotificationListener(EmailNotificationService emailNotificationService) {
        this.emailNotificationService = emailNotificationService;
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onTicketCreated(TicketCreatedEmailEvent event) {
        emailNotificationService.notifyAdmins(
                "New ticket raised: " + event.ticketNumber(),
                "A new ticket has been raised.\n\n" +
                        "Ticket: " + event.ticketNumber() + "\n" +
                        "Raised by: " + event.raisedByName() + " (" + event.raisedByEmail() + ")\n" +
                        "Category: " + event.category() + "\n" +
                        "Priority: " + event.priority() + "\n" +
                        "Resource: " + event.resourceName() + "\n" +
                        "Description: " + event.description()
        );
    }
}
