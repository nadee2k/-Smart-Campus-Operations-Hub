package com.smartcampus.ticket.controller;

import com.smartcampus.auth.entity.Role;
import com.smartcampus.common.dto.PageResponse;
import com.smartcampus.config.security.AuthUtil;
import com.smartcampus.ticket.dto.*;
import com.smartcampus.ticket.entity.TicketPriority;
import com.smartcampus.ticket.entity.TicketStatus;
import com.smartcampus.ticket.service.TicketService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/tickets")
public class TicketController {

    private final TicketService ticketService;

    public TicketController(TicketService ticketService) {
        this.ticketService = ticketService;
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<TicketResponse> create(@Valid @RequestBody TicketRequest request) {
        Long userId = AuthUtil.getCurrentUserId();
        return ResponseEntity.status(HttpStatus.CREATED).body(ticketService.create(request, userId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<TicketResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ticketService.getById(id));
    }

    @GetMapping
    public ResponseEntity<PageResponse<TicketResponse>> getAll(
            @RequestParam(required = false) TicketStatus status,
            @RequestParam(required = false) TicketPriority priority,
            @RequestParam(required = false) Long resourceId,
            @PageableDefault(size = 10) Pageable pageable) {

        var currentUser = AuthUtil.getCurrentUser();
        Page<TicketResponse> page;
        if (currentUser.getRole() == Role.USER) {
            Pageable userPageable = org.springframework.data.domain.PageRequest.of(
                    pageable.getPageNumber(), pageable.getPageSize(),
                    org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "createdAt"));
            page = ticketService.getByUser(currentUser.getId(), userPageable);
        } else {
            Pageable nativePageable = org.springframework.data.domain.PageRequest.of(
                    pageable.getPageNumber(), pageable.getPageSize(),
                    org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "created_at"));
            page = ticketService.getAll(status, priority, resourceId, nativePageable);
        }
        return ResponseEntity.ok(PageResponse.of(page));
    }

    @PutMapping("/{id}")
    public ResponseEntity<TicketResponse> update(@PathVariable Long id,
                                                 @Valid @RequestBody TicketRequest request) {
        Long userId = AuthUtil.getCurrentUserId();
        return ResponseEntity.ok(ticketService.update(id, request, userId));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN', 'TECHNICIAN')")
    public ResponseEntity<TicketResponse> updateStatus(@PathVariable Long id,
                                                       @Valid @RequestBody TicketStatusRequest request) {
        return ResponseEntity.ok(ticketService.updateStatus(id, request));
    }

    @PatchMapping("/{id}/assign")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<TicketResponse> assign(@PathVariable Long id,
                                                 @Valid @RequestBody TicketAssignRequest request) {
        return ResponseEntity.ok(ticketService.assign(id, request.getTechnicianId()));
    }

    @PostMapping("/{id}/attachments")
    public ResponseEntity<AttachmentResponse> addAttachment(@PathVariable Long id,
                                                            @RequestParam("file") MultipartFile file) {
        Long userId = AuthUtil.getCurrentUserId();
        return ResponseEntity.status(HttpStatus.CREATED).body(ticketService.addAttachment(id, file, userId));
    }

    @GetMapping("/{id}/attachments/{attachmentId}")
    public ResponseEntity<byte[]> getAttachment(@PathVariable Long id,
                                                @PathVariable Long attachmentId) {
        byte[] data = ticketService.getAttachmentFile(id, attachmentId);
        String contentType = ticketService.getAttachmentContentType(id, attachmentId);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_TYPE, contentType)
                .body(data);
    }

    @GetMapping("/{id}/comments")
    public ResponseEntity<PageResponse<CommentResponse>> getComments(
            @PathVariable Long id,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(PageResponse.of(ticketService.getComments(id, pageable)));
    }

    @PostMapping("/{id}/comments")
    public ResponseEntity<CommentResponse> addComment(@PathVariable Long id,
                                                      @Valid @RequestBody CommentRequest request) {
        Long userId = AuthUtil.getCurrentUserId();
        return ResponseEntity.status(HttpStatus.CREATED).body(ticketService.addComment(id, request, userId));
    }

    @PutMapping("/{id}/comments/{commentId}")
    public ResponseEntity<CommentResponse> updateComment(@PathVariable Long id,
                                                         @PathVariable Long commentId,
                                                         @Valid @RequestBody CommentRequest request) {
        Long userId = AuthUtil.getCurrentUserId();
        return ResponseEntity.ok(ticketService.updateComment(id, commentId, request, userId));
    }

    @DeleteMapping("/{id}/comments/{commentId}")
    public ResponseEntity<Void> deleteComment(@PathVariable Long id,
                                              @PathVariable Long commentId) {
        Long userId = AuthUtil.getCurrentUserId();
        ticketService.deleteComment(id, commentId, userId);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/rate")
    public ResponseEntity<TicketResponse> rate(@PathVariable Long id,
                                               @RequestBody java.util.Map<String, Integer> body) {
        Long userId = AuthUtil.getCurrentUserId();
        return ResponseEntity.ok(ticketService.rate(id, body.get("rating"), userId));
    }

    @PatchMapping("/{id}/resolution-notes")
    @PreAuthorize("hasAnyRole('ADMIN', 'TECHNICIAN')")
    public ResponseEntity<TicketResponse> updateResolutionNotes(@PathVariable Long id,
                                                                 @RequestBody java.util.Map<String, String> body) {
        return ResponseEntity.ok(ticketService.updateResolutionNotes(id, body.get("resolutionNotes")));
    }

    @PatchMapping("/{id}/reopen")
    public ResponseEntity<TicketResponse> reopen(@PathVariable Long id) {
        Long userId = AuthUtil.getCurrentUserId();
        return ResponseEntity.ok(ticketService.reopen(id, userId));
    }

    @GetMapping("/resource/{resourceId}/history")
    public ResponseEntity<PageResponse<TicketResponse>> getResourceHistory(
            @PathVariable Long resourceId,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(PageResponse.of(ticketService.getResourceHistory(resourceId, pageable)));
    }
}
