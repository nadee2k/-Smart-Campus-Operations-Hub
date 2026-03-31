package com.smartcampus.activity.controller;

import com.smartcampus.activity.service.ActivityLogService;
import com.smartcampus.common.dto.PageResponse;
import com.smartcampus.config.security.AuthUtil;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/activity")
public class ActivityLogController {

    private final ActivityLogService activityLogService;

    public ActivityLogController(ActivityLogService activityLogService) {
        this.activityLogService = activityLogService;
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<PageResponse<Map<String, Object>>> getAll(
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(PageResponse.of(activityLogService.getAll(pageable)));
    }

    @GetMapping("/my")
    public ResponseEntity<PageResponse<Map<String, Object>>> getMyActivity(
            @PageableDefault(size = 20) Pageable pageable) {
        Long userId = AuthUtil.getCurrentUserId();
        return ResponseEntity.ok(PageResponse.of(activityLogService.getByUser(userId, pageable)));
    }
}
