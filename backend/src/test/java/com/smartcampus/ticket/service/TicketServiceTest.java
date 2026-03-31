package com.smartcampus.ticket.service;

import com.smartcampus.auth.entity.Role;
import com.smartcampus.auth.entity.User;
import com.smartcampus.auth.service.UserService;
import com.smartcampus.common.exception.AccessDeniedException;
import com.smartcampus.common.exception.BadRequestException;
import com.smartcampus.common.exception.ResourceNotFoundException;
import com.smartcampus.notification.service.NotificationService;
import com.smartcampus.resource.entity.CampusResource;
import com.smartcampus.resource.entity.ResourceType;
import com.smartcampus.resource.repository.CampusResourceRepository;
import com.smartcampus.ticket.dto.*;
import com.smartcampus.ticket.entity.*;
import com.smartcampus.ticket.repository.TicketAttachmentRepository;
import com.smartcampus.ticket.repository.TicketCommentRepository;
import com.smartcampus.ticket.repository.TicketRepository;
import com.smartcampus.upload.FileStorageService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TicketServiceTest {

    @Mock private TicketRepository ticketRepository;
    @Mock private TicketAttachmentRepository attachmentRepository;
    @Mock private TicketCommentRepository commentRepository;
    @Mock private CampusResourceRepository resourceRepository;
    @Mock private UserService userService;
    @Mock private FileStorageService fileStorageService;
    @Mock private NotificationService notificationService;

    @InjectMocks
    private TicketServiceImpl service;

    private User user;
    private User technician;
    private CampusResource resource;
    private Ticket ticket;

    @BeforeEach
    void setUp() {
        user = new User("user@test.com", "Test User", null, "gid-1");
        user.setId(1L);
        user.setRole(Role.USER);

        technician = new User("tech@test.com", "Tech User", null, "gid-2");
        technician.setId(2L);
        technician.setRole(Role.TECHNICIAN);

        resource = new CampusResource();
        resource.setId(1L);
        resource.setName("Projector A");
        resource.setType(ResourceType.EQUIPMENT);

        ticket = new Ticket();
        ticket.setId(1L);
        ticket.setResource(resource);
        ticket.setCreatedBy(user);
        ticket.setCategory("Hardware");
        ticket.setDescription("Projector not working");
        ticket.setPriority(TicketPriority.HIGH);
        ticket.setStatus(TicketStatus.OPEN);
        ticket.setCreatedAt(LocalDateTime.now());
        ticket.setUpdatedAt(LocalDateTime.now());
    }

    @Test
    void create_shouldCreateTicketWithSla() {
        TicketRequest req = new TicketRequest();
        req.setResourceId(1L);
        req.setCategory("Hardware");
        req.setDescription("Broken");
        req.setPriority(TicketPriority.HIGH);

        when(resourceRepository.findById(1L)).thenReturn(Optional.of(resource));
        when(userService.findById(1L)).thenReturn(user);
        when(ticketRepository.save(any(Ticket.class))).thenReturn(ticket);
        when(attachmentRepository.findByTicketId(1L)).thenReturn(Collections.emptyList());

        TicketResponse result = service.create(req, 1L);

        assertThat(result).isNotNull();
        assertThat(result.priority()).isEqualTo(TicketPriority.HIGH);
        verify(ticketRepository).save(any(Ticket.class));
    }

    @Test
    void updateStatus_shouldTransitionOpenToInProgress() {
        TicketStatusRequest req = new TicketStatusRequest();
        req.setStatus(TicketStatus.IN_PROGRESS);

        when(ticketRepository.findById(1L)).thenReturn(Optional.of(ticket));
        when(ticketRepository.save(any(Ticket.class))).thenReturn(ticket);
        when(attachmentRepository.findByTicketId(1L)).thenReturn(Collections.emptyList());

        service.updateStatus(1L, req);

        verify(notificationService).sendNotification(
                eq(1L), eq("TICKET_STATUS_CHANGED"), any(), eq("TICKET"), eq(1L));
    }

    @Test
    void updateStatus_shouldRejectInvalidTransition() {
        ticket.setStatus(TicketStatus.CLOSED);
        TicketStatusRequest req = new TicketStatusRequest();
        req.setStatus(TicketStatus.IN_PROGRESS);

        when(ticketRepository.findById(1L)).thenReturn(Optional.of(ticket));

        assertThatThrownBy(() -> service.updateStatus(1L, req))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Cannot transition");
    }

    @Test
    void assign_shouldAssignTechnician() {
        when(ticketRepository.findById(1L)).thenReturn(Optional.of(ticket));
        when(userService.findById(2L)).thenReturn(technician);
        when(ticketRepository.save(any(Ticket.class))).thenReturn(ticket);
        when(attachmentRepository.findByTicketId(1L)).thenReturn(Collections.emptyList());

        service.assign(1L, 2L);

        verify(notificationService).sendNotification(
                eq(2L), eq("TICKET_ASSIGNED"), any(), eq("TICKET"), eq(1L));
    }

    @Test
    void assign_shouldRejectNonTechnician() {
        User regularUser = new User("regular@test.com", "Regular", null, "gid-3");
        regularUser.setId(3L);
        regularUser.setRole(Role.USER);

        when(ticketRepository.findById(1L)).thenReturn(Optional.of(ticket));
        when(userService.findById(3L)).thenReturn(regularUser);

        assertThatThrownBy(() -> service.assign(1L, 3L))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("not a technician");
    }

    @Test
    void update_shouldOnlyAllowOwner() {
        TicketRequest req = new TicketRequest();
        req.setCategory("Updated");
        req.setDescription("Updated desc");
        req.setResourceId(1L);

        when(ticketRepository.findById(1L)).thenReturn(Optional.of(ticket));

        assertThatThrownBy(() -> service.update(1L, req, 999L))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void addComment_shouldCreateAndNotify() {
        CommentRequest req = new CommentRequest();
        req.setContent("Test comment");

        TicketComment comment = new TicketComment();
        comment.setId(1L);
        comment.setTicket(ticket);
        comment.setUser(technician);
        comment.setContent("Test comment");
        comment.setCreatedAt(LocalDateTime.now());
        comment.setUpdatedAt(LocalDateTime.now());

        when(ticketRepository.findById(1L)).thenReturn(Optional.of(ticket));
        when(userService.findById(2L)).thenReturn(technician);
        when(commentRepository.save(any(TicketComment.class))).thenReturn(comment);

        CommentResponse result = service.addComment(1L, req, 2L);

        assertThat(result.content()).isEqualTo("Test comment");
        verify(notificationService).sendNotification(
                eq(1L), eq("NEW_COMMENT"), any(), eq("TICKET"), eq(1L));
    }

    @Test
    void deleteComment_shouldOnlyAllowOwner() {
        TicketComment comment = new TicketComment();
        comment.setId(10L);
        comment.setTicket(ticket);
        comment.setUser(user);

        when(commentRepository.findById(10L)).thenReturn(Optional.of(comment));

        assertThatThrownBy(() -> service.deleteComment(1L, 10L, 999L))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void getByUser_shouldReturnUserTickets() {
        Page<Ticket> page = new PageImpl<>(List.of(ticket));
        when(ticketRepository.findByCreatedById(eq(1L), any())).thenReturn(page);
        when(attachmentRepository.findByTicketId(1L)).thenReturn(Collections.emptyList());

        Page<TicketResponse> result = service.getByUser(1L, PageRequest.of(0, 10));

        assertThat(result.getTotalElements()).isEqualTo(1);
    }
}
