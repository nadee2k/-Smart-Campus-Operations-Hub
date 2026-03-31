package com.smartcampus.ticket.service;

import com.smartcampus.ticket.dto.*;
import com.smartcampus.ticket.entity.TicketPriority;
import com.smartcampus.ticket.entity.TicketStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.multipart.MultipartFile;

public interface TicketService {

    TicketResponse create(TicketRequest request, Long userId);

    TicketResponse getById(Long id);

    Page<TicketResponse> getAll(TicketStatus status, TicketPriority priority, Long resourceId, Pageable pageable);

    Page<TicketResponse> getByUser(Long userId, Pageable pageable);

    TicketResponse update(Long id, TicketRequest request, Long userId);

    TicketResponse updateStatus(Long id, TicketStatusRequest request);

    TicketResponse assign(Long id, Long technicianId);

    AttachmentResponse addAttachment(Long ticketId, MultipartFile file, Long userId);

    byte[] getAttachmentFile(Long ticketId, Long attachmentId);

    String getAttachmentContentType(Long ticketId, Long attachmentId);

    Page<CommentResponse> getComments(Long ticketId, Pageable pageable);

    CommentResponse addComment(Long ticketId, CommentRequest request, Long userId);

    CommentResponse updateComment(Long ticketId, Long commentId, CommentRequest request, Long userId);

    void deleteComment(Long ticketId, Long commentId, Long userId);

    TicketResponse rate(Long ticketId, Integer rating, Long userId);

    TicketResponse updateResolutionNotes(Long ticketId, String notes);

    Page<TicketResponse> getResourceHistory(Long resourceId, Pageable pageable);

    TicketResponse reopen(Long ticketId, Long userId);
}
