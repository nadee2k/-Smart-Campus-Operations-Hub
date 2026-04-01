package com.smartcampus.ticket.service;

import com.smartcampus.activity.service.ActivityLogService;
import com.smartcampus.auth.entity.Role;
import com.smartcampus.auth.entity.User;
import com.smartcampus.auth.service.UserService;
import com.smartcampus.common.exception.AccessDeniedException;
import com.smartcampus.common.exception.BadRequestException;
import com.smartcampus.common.exception.ResourceNotFoundException;
import com.smartcampus.notification.service.NotificationService;
import com.smartcampus.resource.entity.CampusResource;
import com.smartcampus.resource.repository.CampusResourceRepository;
import com.smartcampus.ticket.dto.*;
import com.smartcampus.ticket.entity.*;
import com.smartcampus.ticket.repository.TicketAttachmentRepository;
import com.smartcampus.ticket.repository.TicketCommentRepository;
import com.smartcampus.ticket.repository.TicketRepository;
import com.smartcampus.upload.FileStorageService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class TicketServiceImpl implements TicketService {

    private static final int MAX_ATTACHMENTS = 3;

    private final TicketRepository ticketRepository;
    private final TicketAttachmentRepository attachmentRepository;
    private final TicketCommentRepository commentRepository;
    private final CampusResourceRepository resourceRepository;
    private final UserService userService;
    private final FileStorageService fileStorageService;
    private final NotificationService notificationService;
    private final ActivityLogService activityLogService;

    public TicketServiceImpl(TicketRepository ticketRepository,
                             TicketAttachmentRepository attachmentRepository,
                             TicketCommentRepository commentRepository,
                             CampusResourceRepository resourceRepository,
                             UserService userService,
                             FileStorageService fileStorageService,
                             NotificationService notificationService,
                             ActivityLogService activityLogService) {
        this.ticketRepository = ticketRepository;
        this.attachmentRepository = attachmentRepository;
        this.commentRepository = commentRepository;
        this.resourceRepository = resourceRepository;
        this.userService = userService;
        this.fileStorageService = fileStorageService;
        this.notificationService = notificationService;
        this.activityLogService = activityLogService;
    }

    @Override
    @Transactional
    public TicketResponse create(TicketRequest request, Long userId) {
        CampusResource resource = resourceRepository.findById(request.getResourceId())
                .orElseThrow(() -> new ResourceNotFoundException("Resource", request.getResourceId()));

        User user = userService.findById(userId);

        Ticket ticket = new Ticket();
        ticket.setResource(resource);
        ticket.setCreatedBy(user);
        ticket.setCategory(request.getCategory());
        ticket.setDescription(request.getDescription());
        ticket.setPriority(request.getPriority() != null ? request.getPriority() : TicketPriority.MEDIUM);

        // SLA deadline based on priority
        LocalDateTime sla = switch (ticket.getPriority()) {
            case HIGH -> LocalDateTime.now().plusHours(4);
            case MEDIUM -> LocalDateTime.now().plusHours(24);
            case LOW -> LocalDateTime.now().plusHours(72);
        };
        ticket.setSlaDeadline(sla);

        Ticket saved = ticketRepository.save(ticket);
        activityLogService.log(userId, user.getName(), "TICKET_CREATED", "TICKET", saved.getId(), "Created ticket: " + request.getCategory());
        return toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public TicketResponse getById(Long id) {
        Ticket ticket = findById(id);
        return toResponse(ticket);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<TicketResponse> getAll(TicketStatus status, TicketPriority priority,
                                       Long resourceId, Pageable pageable) {
        String statusStr = status != null ? status.name() : null;
        String priorityStr = priority != null ? priority.name() : null;
        return ticketRepository.findFiltered(statusStr, priorityStr, resourceId, pageable)
                .map(this::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<TicketResponse> getByUser(Long userId, Pageable pageable) {
        return ticketRepository.findByCreatedById(userId, pageable).map(this::toResponse);
    }

    @Override
    @Transactional
    public TicketResponse update(Long id, TicketRequest request, Long userId) {
        Ticket ticket = findById(id);
        if (!ticket.getCreatedBy().getId().equals(userId)) {
            throw new AccessDeniedException("You can only edit your own tickets");
        }
        if (ticket.getStatus() != TicketStatus.OPEN) {
            throw new BadRequestException("Can only edit tickets in OPEN status");
        }

        ticket.setCategory(request.getCategory());
        ticket.setDescription(request.getDescription());
        if (request.getPriority() != null) {
            ticket.setPriority(request.getPriority());
        }

        Ticket saved = ticketRepository.save(ticket);
        return toResponse(saved);
    }

    @Override
    @Transactional
    public TicketResponse updateStatus(Long id, TicketStatusRequest request) {
        Ticket ticket = findById(id);
        validateStatusTransition(ticket.getStatus(), request.getStatus());
        ticket.setStatus(request.getStatus());

        if (request.getResolutionNotes() != null) {
            ticket.setResolutionNotes(request.getResolutionNotes());
        }

        Ticket saved = ticketRepository.save(ticket);
        activityLogService.log(null, "System", "TICKET_STATUS_CHANGED", "TICKET", saved.getId(), "Status changed to " + request.getStatus());

        notificationService.sendNotification(
                ticket.getCreatedBy().getId(),
                "TICKET_STATUS_CHANGED",
                formatTicketNumber(ticket.getId()) + " status changed to " + request.getStatus(),
                "TICKET", ticket.getId());

        return toResponse(saved);
    }

    @Override
    @Transactional
    public TicketResponse assign(Long id, Long technicianId) {
        Ticket ticket = findById(id);
        User technician = userService.findById(technicianId);
        if (technician.getRole() != Role.TECHNICIAN && technician.getRole() != Role.ADMIN) {
            throw new BadRequestException("User is not a technician");
        }

        ticket.setAssignedTechnician(technician);
        if (ticket.getStatus() == TicketStatus.OPEN) {
            ticket.setStatus(TicketStatus.IN_PROGRESS);
        }

        Ticket saved = ticketRepository.save(ticket);
        activityLogService.log(null, "Admin", "TICKET_ASSIGNED", "TICKET", saved.getId(), "Assigned to " + technician.getName());

        notificationService.sendNotification(
                technicianId, "TICKET_ASSIGNED",
                formatTicketNumber(ticket.getId()) + " has been assigned to you.",
                "TICKET", ticket.getId());

        return toResponse(saved);
    }

    @Override
    @Transactional
    public AttachmentResponse addAttachment(Long ticketId, MultipartFile file, Long userId) {
        Ticket ticket = findById(ticketId);
        if (!ticket.getCreatedBy().getId().equals(userId)) {
            throw new AccessDeniedException("Only the ticket creator can add attachments");
        }

        long currentCount = attachmentRepository.countByTicketId(ticketId);
        if (currentCount >= MAX_ATTACHMENTS) {
            throw new BadRequestException("Maximum of " + MAX_ATTACHMENTS + " attachments per ticket");
        }

        String filePath = fileStorageService.store(file, ticketId);

        TicketAttachment attachment = new TicketAttachment();
        attachment.setTicket(ticket);
        attachment.setFilePath(filePath);
        attachment.setFileName(file.getOriginalFilename());
        attachment.setContentType(file.getContentType());
        attachment.setFileSize(file.getSize());

        TicketAttachment saved = attachmentRepository.save(attachment);
        return toAttachmentResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public byte[] getAttachmentFile(Long ticketId, Long attachmentId) {
        TicketAttachment attachment = attachmentRepository.findById(attachmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Attachment", attachmentId));
        if (!attachment.getTicket().getId().equals(ticketId)) {
            throw new ResourceNotFoundException("Attachment", attachmentId);
        }
        return fileStorageService.load(attachment.getFilePath());
    }

    @Override
    @Transactional(readOnly = true)
    public String getAttachmentContentType(Long ticketId, Long attachmentId) {
        TicketAttachment attachment = attachmentRepository.findById(attachmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Attachment", attachmentId));
        if (!attachment.getTicket().getId().equals(ticketId)) {
            throw new ResourceNotFoundException("Attachment", attachmentId);
        }
        return attachment.getContentType();
    }

    @Override
    @Transactional(readOnly = true)
    public Page<CommentResponse> getComments(Long ticketId, Pageable pageable) {
        findById(ticketId);
        var currentUser = com.smartcampus.config.security.AuthUtil.getCurrentUser();
        boolean isStaff = currentUser.getRole() == Role.ADMIN || currentUser.getRole() == Role.TECHNICIAN;
        Page<CommentResponse> page = commentRepository.findByTicketIdOrderByCreatedAtAsc(ticketId, pageable)
                .map(this::toCommentResponse);
        if (!isStaff) {
            var filtered = page.getContent().stream()
                    .filter(c -> c.isInternal() == null || !c.isInternal())
                    .toList();
            return new org.springframework.data.domain.PageImpl<>(filtered, pageable, page.getTotalElements());
        }
        return page;
    }

    @Override
    @Transactional
    public CommentResponse addComment(Long ticketId, CommentRequest request, Long userId) {
        Ticket ticket = findById(ticketId);
        User user = userService.findById(userId);

        TicketComment comment = new TicketComment();
        comment.setTicket(ticket);
        comment.setUser(user);
        comment.setContent(request.getContent());
        if (request.getIsInternal() != null && request.getIsInternal()) {
            if (user.getRole() == Role.ADMIN || user.getRole() == Role.TECHNICIAN) {
                comment.setIsInternal(true);
            }
        }

        TicketComment saved = commentRepository.save(comment);
        activityLogService.log(userId, user.getName(), "TICKET_COMMENTED", "TICKET", ticketId, "Added comment on ticket #" + ticketId);

        if (!ticket.getCreatedBy().getId().equals(userId)) {
            notificationService.sendNotification(
                    ticket.getCreatedBy().getId(),
                    "NEW_COMMENT",
                    user.getName() + " commented on Ticket #" + ticketId,
                    "TICKET", ticketId);
        }

        return toCommentResponse(saved);
    }

    @Override
    @Transactional
    public CommentResponse updateComment(Long ticketId, Long commentId, CommentRequest request, Long userId) {
        TicketComment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new ResourceNotFoundException("Comment", commentId));
        if (!comment.getTicket().getId().equals(ticketId)) {
            throw new ResourceNotFoundException("Comment", commentId);
        }
        if (!comment.getUser().getId().equals(userId)) {
            throw new AccessDeniedException("You can only edit your own comments");
        }

        comment.setContent(request.getContent());
        TicketComment saved = commentRepository.save(comment);
        return toCommentResponse(saved);
    }

    @Override
    @Transactional
    public void deleteComment(Long ticketId, Long commentId, Long userId) {
        TicketComment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new ResourceNotFoundException("Comment", commentId));
        if (!comment.getTicket().getId().equals(ticketId)) {
            throw new ResourceNotFoundException("Comment", commentId);
        }
        if (!comment.getUser().getId().equals(userId)) {
            throw new AccessDeniedException("You can only delete your own comments");
        }
        commentRepository.delete(comment);
    }

    @Override
    @Transactional
    public TicketResponse rate(Long ticketId, Integer rating, Long userId) {
        Ticket ticket = findById(ticketId);
        if (!ticket.getCreatedBy().getId().equals(userId)) {
            throw new AccessDeniedException("Only the ticket creator can rate");
        }
        if (ticket.getStatus() != TicketStatus.RESOLVED && ticket.getStatus() != TicketStatus.CLOSED) {
            throw new BadRequestException("Can only rate resolved or closed tickets");
        }
        if (rating < 1 || rating > 5) {
            throw new BadRequestException("Rating must be between 1 and 5");
        }
        ticket.setSatisfactionRating(rating);
        ticket.setRatedAt(LocalDateTime.now());
        
        if (ticket.getStatus() == TicketStatus.RESOLVED) {
            ticket.setStatus(TicketStatus.CLOSED);
            activityLogService.log(userId, ticket.getCreatedBy().getName(), "TICKET_CLOSED", "TICKET", ticketId, "User closed and rated ticket");
        }
        
        Ticket saved = ticketRepository.save(ticket);
        return toResponse(saved);
    }

    @Override
    @Transactional
    public TicketResponse updateResolutionNotes(Long ticketId, String notes) {
        Ticket ticket = findById(ticketId);
        ticket.setResolutionNotes(notes);
        Ticket saved = ticketRepository.save(ticket);
        return toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<TicketResponse> getResourceHistory(Long resourceId, Pageable pageable) {
        return ticketRepository.findByResourceId(resourceId, pageable).map(this::toResponse);
    }

    @Override
    @Transactional
    public TicketResponse reopen(Long ticketId, Long userId) {
        Ticket ticket = findById(ticketId);
        if (!ticket.getCreatedBy().getId().equals(userId)) {
            throw new AccessDeniedException("Only the ticket creator can reopen");
        }
        if (ticket.getStatus() != TicketStatus.RESOLVED && ticket.getStatus() != TicketStatus.CLOSED) {
            throw new BadRequestException("Can only reopen resolved or closed tickets");
        }
        if (ticket.getUpdatedAt() != null &&
                ticket.getUpdatedAt().plusDays(14).isBefore(LocalDateTime.now())) {
            throw new BadRequestException("Reopen window has expired (14 days)");
        }
        ticket.setStatus(TicketStatus.OPEN);
        ticket.setSatisfactionRating(null);
        ticket.setRatedAt(null);
        Ticket saved = ticketRepository.save(ticket);

        activityLogService.log(userId, ticket.getCreatedBy().getName(), "TICKET_REOPENED", "TICKET", ticketId, "Reopened ticket #" + ticketId);

        if (ticket.getAssignedTechnician() != null) {
            notificationService.sendNotification(
                    ticket.getAssignedTechnician().getId(),
                    "TICKET_STATUS_CHANGED",
                    formatTicketNumber(ticketId) + " has been reopened by the requester.",
                    "TICKET", ticketId);
        }

        return toResponse(saved);
    }

    private void validateStatusTransition(TicketStatus current, TicketStatus target) {
        boolean valid = switch (target) {
            case IN_PROGRESS -> current == TicketStatus.OPEN;
            case RESOLVED -> current == TicketStatus.IN_PROGRESS;
            case CLOSED -> current == TicketStatus.RESOLVED;
            case REJECTED -> current == TicketStatus.OPEN;
            default -> false;
        };
        if (!valid) {
            throw new BadRequestException("Cannot transition from " + current + " to " + target);
        }
    }

    private Ticket findById(Long id) {
        return ticketRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket", id));
    }

    private String formatTicketNumber(Long id) {
        return "TKT-" + String.format("%04d", id);
    }

    private TicketResponse toResponse(Ticket t) {
        List<AttachmentResponse> attachments = attachmentRepository.findByTicketId(t.getId())
                .stream().map(this::toAttachmentResponse).toList();

        return new TicketResponse(
                t.getId(),
                formatTicketNumber(t.getId()),
                t.getResource().getId(),
                t.getResource().getName(),
                t.getCreatedBy().getId(),
                t.getCreatedBy().getName(),
                t.getCategory(),
                t.getDescription(),
                t.getPriority(),
                t.getStatus(),
                t.getAssignedTechnician() != null ? t.getAssignedTechnician().getId() : null,
                t.getAssignedTechnician() != null ? t.getAssignedTechnician().getName() : null,
                t.getResolutionNotes(),
                t.getSlaDeadline(),
                t.getSatisfactionRating(),
                t.getRatedAt(),
                attachments,
                t.getCreatedAt(),
                t.getUpdatedAt()
        );
    }

    private AttachmentResponse toAttachmentResponse(TicketAttachment a) {
        return new AttachmentResponse(a.getId(), a.getFileName(), a.getContentType(), a.getFileSize(), a.getCreatedAt());
    }

    private CommentResponse toCommentResponse(TicketComment c) {
        return new CommentResponse(
                c.getId(), c.getTicket().getId(), c.getUser().getId(),
                c.getUser().getName(), c.getUser().getPictureUrl(),
                c.getUser().getRole() != null ? c.getUser().getRole().name() : null,
                c.getContent(), c.getIsInternal(),
                c.getCreatedAt(), c.getUpdatedAt()
        );
    }
}
