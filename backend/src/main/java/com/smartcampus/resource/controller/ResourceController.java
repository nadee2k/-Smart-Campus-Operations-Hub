package com.smartcampus.resource.controller;

import com.smartcampus.common.dto.PageResponse;
import com.smartcampus.config.security.AuthUtil;
import com.smartcampus.resource.dto.ResourceRequest;
import com.smartcampus.resource.dto.ResourceResponse;
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

    @GetMapping("/{id}/watch-status")
    public ResponseEntity<ResourceWatchStatusResponse> getWatchStatus(@PathVariable Long id) {
        return ResponseEntity.ok(resourceWatchService.getStatus(id, AuthUtil.getCurrentUserId()));
    }

    @PostMapping("/{id}/watch")
    public ResponseEntity<ResourceWatchStatusResponse> watch(@PathVariable Long id) {
        return ResponseEntity.ok(resourceWatchService.watch(id, AuthUtil.getCurrentUserId()));
    }

    @DeleteMapping("/{id}/watch")
    public ResponseEntity<Void> unwatch(@PathVariable Long id) {
        resourceWatchService.unwatch(id, AuthUtil.getCurrentUserId());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/weekly-report")
    public ResponseEntity<WeeklyResourceReportResponse> getWeeklyReport(@PathVariable Long id) {
        return ResponseEntity.ok(resourceService.getWeeklyReport(id));
    }

    @GetMapping("/{id}/weekly-report.pdf")
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
