package com.smartcampus.auth.service;

import com.smartcampus.auth.dto.UserResponse;
import com.smartcampus.auth.entity.Role;
import com.smartcampus.auth.entity.User;
import com.smartcampus.auth.repository.UserRepository;
import com.smartcampus.booking.repository.BookingRepository;
import com.smartcampus.common.exception.BadRequestException;
import com.smartcampus.common.exception.ResourceNotFoundException;
import com.smartcampus.ticket.repository.TicketRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final BookingRepository bookingRepository;
    private final TicketRepository ticketRepository;

    public UserServiceImpl(UserRepository userRepository, PasswordEncoder passwordEncoder,
                           BookingRepository bookingRepository, TicketRepository ticketRepository) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.bookingRepository = bookingRepository;
        this.ticketRepository = ticketRepository;
    }

    @Override
    @Transactional
    public User findOrCreateUser(String email, String name, String pictureUrl, String providerId) {
        return userRepository.findByEmail(email)
                .map(existing -> {
                    existing.setName(name);
                    existing.setPictureUrl(pictureUrl);
                    return userRepository.save(existing);
                })
                .orElseGet(() -> {
                    User newUser = new User(email, name, pictureUrl, providerId);
                    return userRepository.save(newUser);
                });
    }

    @Override
    public Optional<User> findByEmail(String email) {
        return userRepository.findByEmail(email);
    }

    @Override
    public User findById(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", id));
    }

    @Override
    public UserResponse toResponse(User user) {
        return new UserResponse(
                user.getId(),
                user.getEmail(),
                user.getName(),
                user.getPictureUrl(),
                user.getRole(),
                user.getCreatedAt()
        );
    }

    @Override
    @Transactional(readOnly = true)
    public User authenticate(String email, String password) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BadRequestException("Invalid email or password"));

        if (user.getPasswordHash() == null) {
            throw new BadRequestException("This account uses Google sign-in. Please use the Google login button.");
        }

        if (!passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new BadRequestException("Invalid email or password");
        }

        return user;
    }

    @Override
    @Transactional
    public User registerLocalUser(String email, String password, String name) {
        if (userRepository.existsByEmail(email)) {
            throw new BadRequestException("An account with this email already exists");
        }

        User user = new User();
        user.setEmail(email);
        user.setName(name);
        user.setPasswordHash(passwordEncoder.encode(password));
        user.setProvider("LOCAL");
        user.setProviderId(null);

        return userRepository.save(user);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<UserResponse> findAll(Pageable pageable, String search, Role roleFilter) {
        String roleStr = roleFilter != null ? roleFilter.name() : null;
        return userRepository.searchUsers(search, roleStr, pageable).map(this::toResponse);
    }

    @Override
    @Transactional
    public UserResponse updateRole(Long userId, Role role) {
        User user = findById(userId);
        user.setRole(role);
        User saved = userRepository.save(user);
        return toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Map<String, Object>> findTechniciansWithWorkload() {
        List<User> technicians = userRepository.findByRole(Role.TECHNICIAN);
        List<Map<String, Object>> result = new ArrayList<>();
        for (User tech : technicians) {
            Map<String, Object> map = new HashMap<>();
            map.put("id", tech.getId());
            map.put("name", tech.getName());
            map.put("email", tech.getEmail());
            map.put("pictureUrl", tech.getPictureUrl());
            long assignedCount = ticketRepository.findByAssignedTechnicianId(tech.getId(),
                    org.springframework.data.domain.Pageable.unpaged()).getTotalElements();
            map.put("assignedTickets", assignedCount);
            result.add(map);
        }
        return result;
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> getProfile(Long userId) {
        User user = findById(userId);
        Map<String, Object> profile = new HashMap<>();
        profile.put("id", user.getId());
        profile.put("email", user.getEmail());
        profile.put("name", user.getName());
        profile.put("pictureUrl", user.getPictureUrl());
        profile.put("role", user.getRole());
        profile.put("createdAt", user.getCreatedAt());

        long bookingCount = bookingRepository.findByUserId(userId,
                org.springframework.data.domain.Pageable.unpaged()).getTotalElements();
        long ticketCount = ticketRepository.findByCreatedById(userId,
                org.springframework.data.domain.Pageable.unpaged()).getTotalElements();
        profile.put("totalBookings", bookingCount);
        profile.put("totalTickets", ticketCount);

        return profile;
    }

    @Override
    @Transactional
    public UserResponse updateProfile(Long userId, String name) {
        User user = findById(userId);
        user.setName(name);
        User saved = userRepository.save(user);
        return toResponse(saved);
    }
}
