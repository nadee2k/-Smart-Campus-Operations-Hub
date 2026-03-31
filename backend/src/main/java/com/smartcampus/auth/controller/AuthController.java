package com.smartcampus.auth.controller;

import com.smartcampus.auth.dto.LoginRequest;
import com.smartcampus.auth.dto.RegisterRequest;
import com.smartcampus.auth.dto.UserResponse;
import com.smartcampus.auth.entity.User;
import com.smartcampus.auth.service.JwtService;
import com.smartcampus.auth.service.UserService;
import com.smartcampus.config.security.AuthUtil;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserService userService;
    private final JwtService jwtService;

    public AuthController(UserService userService, JwtService jwtService) {
        this.userService = userService;
        this.jwtService = jwtService;
    }

    @GetMapping("/me")
    public ResponseEntity<UserResponse> getCurrentUser() {
        User user = AuthUtil.getCurrentUser();
        return ResponseEntity.ok(userService.toResponse(user));
    }

    @PostMapping("/login")
    public ResponseEntity<UserResponse> login(@Valid @RequestBody LoginRequest request,
                                              HttpServletResponse response) {
        User user = userService.authenticate(request.getEmail(), request.getPassword());
        setJwtCookie(response, user);
        return ResponseEntity.ok(userService.toResponse(user));
    }

    @PostMapping("/register")
    public ResponseEntity<UserResponse> register(@Valid @RequestBody RegisterRequest request,
                                                 HttpServletResponse response) {
        User user = userService.registerLocalUser(
                request.getEmail(), request.getPassword(), request.getName());
        setJwtCookie(response, user);
        return ResponseEntity.status(HttpStatus.CREATED).body(userService.toResponse(user));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletResponse response) {
        Cookie cookie = new Cookie("jwt", "");
        cookie.setHttpOnly(true);
        cookie.setSecure(false);
        cookie.setPath("/");
        cookie.setMaxAge(0);
        response.addCookie(cookie);
        return ResponseEntity.ok().build();
    }

    private void setJwtCookie(HttpServletResponse response, User user) {
        String token = jwtService.generateToken(user.getEmail(), user.getRole().name());
        Cookie cookie = new Cookie("jwt", token);
        cookie.setHttpOnly(true);
        cookie.setSecure(false);
        cookie.setPath("/");
        cookie.setMaxAge(86400);
        response.addCookie(cookie);
    }
}
