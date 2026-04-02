package com.smartcampus.auth.service;

import com.smartcampus.auth.dto.UserResponse;
import com.smartcampus.auth.entity.Role;
import com.smartcampus.auth.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Map;
import java.util.Optional;

public interface UserService {

    User findOrCreateUser(String email, String name, String pictureUrl, String providerId);

    Optional<User> findByEmail(String email);

    User findById(Long id);

    UserResponse toResponse(User user);

    User authenticate(String email, String password);

    User registerLocalUser(String email, String password, String name);

    UserResponse createByAdmin(String email, String password, String name, Role role);

    Page<UserResponse> findAll(Pageable pageable, String search, Role roleFilter);

    UserResponse updateRole(Long userId, Role role);

    List<Map<String, Object>> findTechniciansWithWorkload();

    Map<String, Object> getProfile(Long userId);

    UserResponse updateProfile(Long userId, String name);
}
