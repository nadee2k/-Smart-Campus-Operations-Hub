package com.smartcampus.auth.service;

import com.smartcampus.auth.dto.UserResponse;
import com.smartcampus.auth.entity.Role;
import com.smartcampus.auth.entity.User;
import com.smartcampus.auth.repository.UserRepository;
import com.smartcampus.common.exception.ResourceNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock private UserRepository userRepository;

    @InjectMocks
    private UserServiceImpl service;

    private User user;

    @BeforeEach
    void setUp() {
        user = new User("test@example.com", "Test User", "http://pic.url", "google-123");
        user.setId(1L);
        user.setRole(Role.USER);
        user.setCreatedAt(LocalDateTime.now());
    }

    @Test
    void findOrCreateUser_shouldCreateNewUser() {
        when(userRepository.findByEmail("new@test.com")).thenReturn(Optional.empty());
        when(userRepository.save(any(User.class))).thenReturn(user);

        User result = service.findOrCreateUser("new@test.com", "New", null, "gid");

        assertThat(result).isNotNull();
        verify(userRepository).save(any(User.class));
    }

    @Test
    void findOrCreateUser_shouldUpdateExistingUser() {
        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(user));
        when(userRepository.save(any(User.class))).thenReturn(user);

        User result = service.findOrCreateUser("test@example.com", "Updated Name", null, "gid");

        assertThat(result).isNotNull();
        verify(userRepository).save(any(User.class));
    }

    @Test
    void findById_shouldReturnUser() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));

        User result = service.findById(1L);

        assertThat(result.getEmail()).isEqualTo("test@example.com");
    }

    @Test
    void findById_shouldThrowWhenNotFound() {
        when(userRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.findById(99L))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void toResponse_shouldMapCorrectly() {
        UserResponse response = service.toResponse(user);

        assertThat(response.email()).isEqualTo("test@example.com");
        assertThat(response.role()).isEqualTo(Role.USER);
    }
}
