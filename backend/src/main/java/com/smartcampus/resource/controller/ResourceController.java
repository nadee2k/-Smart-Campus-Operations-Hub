package com.smartcampus.resource.controller;

import com.smartcampus.common.dto.PageResponse;
import com.smartcampus.config.security.AuthUtil;
import com.smartcampus.auth.entity.Role;
import com.smartcampus.resource.dto.ResourceRequest;
import com.smartcampus.resource.dto.ResourceBlackoutRequest;
import com.smartcampus.resource.dto.ResourceBlackoutResponse;
import com.smartcampus.resource.dto.ResourceReviewRequest;
import com.smartcampus.resource.dto.ResourceReviewResponse;
import com.smartcampus.resource.dto.ResourceResponse;
import com.smartcampus.resource.dto.ResourceWatchListItemResponse;
import com.smartcampus.resource.dto.ResourceWatchStatusResponse;
import com.smartcampus.resource.dto.WeeklyResourceReportResponse;
import com.smartcampus.resource.entity.ResourceStatus;
import com.smartcampus.resource.entity.ResourceType;
import com.smartcampus.resource.service.CampusResourceService;
import com.smartcampus.resource.service.ResourceWatchService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/resources")
public class ResourceController {

    private final CampusResourceService resourceService;
    private final ResourceWatchService resourceWatchService;

    public ResourceController(CampusResourceService resourceService,
                              ResourceWatchService resourceWatchService) {
        this.resourceService = resourceService;
        this.resourceWatchService = resourceWatchService;
    }

    @GetMapping
    public ResponseEntity<PageResponse<ResourceResponse>> getAll(
            @PageableDefault(size = 10, sort = "createdAt") Pageable pageable) {
        return ResponseEntity.ok(PageResponse.of(resourceService.getAll(pageable)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ResourceResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(resourceService.getById(id));
    }

    @GetMapping("/{id}/blackouts")
    public ResponseEntity<List<ResourceBlackoutResponse>> getBlackouts(@PathVariable Long id) {
        return ResponseEntity.ok(resourceService.getBlackouts(id));
    }

    @GetMapping("/{id}/reviews")
    public ResponseEntity<List<ResourceReviewResponse>> getReviews(@PathVariable Long id) {
        return ResponseEntity.ok(resourceService.getReviews(id));
    }

    @PostMapping("/{id}/reviews")
    public ResponseEntity<ResourceReviewResponse> createOrUpdateReview(@PathVariable Long id,
                                                                       @Valid @RequestBody ResourceReviewRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(resourceService.upsertReview(id, request, AuthUtil.getCurrentUserId()));
    }

    @DeleteMapping("/{id}/reviews/{reviewId}")
    public ResponseEntity<Void> deleteReview(@PathVariable Long id,
                                             @PathVariable Long reviewId) {
        var currentUser = AuthUtil.getCurrentUser();
        resourceService.deleteReview(id, reviewId, currentUser.getId(), currentUser.getRole() == Role.ADMIN);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/blackouts")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ResourceBlackoutResponse> createBlackout(@PathVariable Long id,
                                                                   @Valid @RequestBody ResourceBlackoutRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(resourceService.createBlackout(id, request));
    }

    @DeleteMapping("/{id}/blackouts/{blackoutId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteBlackout(@PathVariable Long id, @PathVariable Long blackoutId) {
        resourceService.deleteBlackout(id, blackoutId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/watchlist/my")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<List<ResourceWatchListItemResponse>> getMyWatchlist() {
        return ResponseEntity.ok(resourceWatchService.getMyWatchlist(AuthUtil.getCurrentUserId()));
    }

    @GetMapping("/{id}/watch-status")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<ResourceWatchStatusResponse> getWatchStatus(@PathVariable Long id) {
        return ResponseEntity.ok(resourceWatchService.getStatus(id, AuthUtil.getCurrentUserId()));
    }

    @PostMapping("/{id}/watch")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<ResourceWatchStatusResponse> watch(@PathVariable Long id) {
        return ResponseEntity.ok(resourceWatchService.watch(id, AuthUtil.getCurrentUserId()));
    }

    @DeleteMapping("/{id}/watch")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<Void> unwatch(@PathVariable Long id) {
        resourceWatchService.unwatch(id, AuthUtil.getCurrentUserId());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/weekly-report")
    @PreAuthorize("hasAnyRole('ADMIN', 'TECHNICIAN')")
    public ResponseEntity<WeeklyResourceReportResponse> getWeeklyReport(@PathVariable Long id) {
        return ResponseEntity.ok(resourceService.getWeeklyReport(id));
    }

    @GetMapping("/{id}/weekly-report.pdf")
    @PreAuthorize("hasAnyRole('ADMIN', 'TECHNICIAN')")
    public ResponseEntity<byte[]> downloadWeeklyReportPdf(@PathVariable Long id) {
        WeeklyResourceReportResponse report = resourceService.getWeeklyReport(id);
        byte[] pdf = resourceService.generateWeeklyReportPdf(id);
        String safeName = report.resourceName().replaceAll("[^a-zA-Z0-9-_]+", "-").toLowerCase();

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + safeName + "-weekly-report.pdf\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdf);
    }

    @GetMapping("/search")
    public ResponseEntity<PageResponse<ResourceResponse>> search(
            @RequestParam(required = false) ResourceType type,
            @RequestParam(required = false) ResourceStatus status,
            @RequestParam(required = false) String q,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(PageResponse.of(resourceService.search(type, status, q, pageable)));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ResourceResponse> create(@Valid @RequestBody ResourceRequest request) {
        ResourceResponse created = resourceService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ResourceResponse> update(@PathVariable Long id,
                                                   @Valid @RequestBody ResourceRequest request) {
        return ResponseEntity.ok(resourceService.update(id, request));
    }

    @PostMapping("/{id}/clone")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ResourceResponse> cloneResource(@PathVariable Long id) {
        ResourceResponse cloned = resourceService.cloneResource(id);
        return ResponseEntity.status(HttpStatus.CREATED).body(cloned);
    }

    @PatchMapping("/{id}/toggle-status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ResourceResponse> toggleStatus(@PathVariable Long id) {
        return ResponseEntity.ok(resourceService.toggleStatus(id));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        resourceService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
