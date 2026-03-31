package com.smartcampus.auth.controller;

import com.smartcampus.auth.dto.UserResponse;
import com.smartcampus.auth.entity.Role;
import com.smartcampus.auth.service.UserService;
import com.smartcampus.common.dto.PageResponse;
import com.smartcampus.config.security.AuthUtil;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<PageResponse<UserResponse>> getAll(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Role role,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(PageResponse.of(userService.findAll(pageable, search, role)));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(userService.getProfile(id));
    }

    @PatchMapping("/{id}/role")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserResponse> updateRole(@PathVariable Long id, @RequestBody Map<String, String> body) {
        Role role = Role.valueOf(body.get("role"));
        return ResponseEntity.ok(userService.updateRole(id, role));
    }

    @GetMapping("/technicians")
    @PreAuthorize("hasAnyRole('ADMIN', 'TECHNICIAN')")
    public ResponseEntity<List<Map<String, Object>>> getTechnicians() {
        return ResponseEntity.ok(userService.findTechniciansWithWorkload());
    }

    @GetMapping("/me/profile")
    public ResponseEntity<Map<String, Object>> getMyProfile() {
        Long userId = AuthUtil.getCurrentUserId();
        return ResponseEntity.ok(userService.getProfile(userId));
    }

    @PutMapping("/me/profile")
    public ResponseEntity<UserResponse> updateMyProfile(@RequestBody Map<String, String> body) {
        Long userId = AuthUtil.getCurrentUserId();
        return ResponseEntity.ok(userService.updateProfile(userId, body.get("name")));
    }
}
