package com.smartcampus.auth.repository;

import com.smartcampus.auth.entity.Role;
import com.smartcampus.auth.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    Optional<User> findByProviderId(String providerId);

    List<User> findByRole(Role role);

    boolean existsByEmail(String email);

    @Query(value = "SELECT * FROM users u WHERE " +
           "(CAST(:search AS VARCHAR) IS NULL OR LOWER(u.name) LIKE LOWER(CONCAT('%', CAST(:search AS VARCHAR), '%')) OR LOWER(u.email) LIKE LOWER(CONCAT('%', CAST(:search AS VARCHAR), '%'))) " +
           "AND (CAST(:role AS VARCHAR) IS NULL OR u.role = CAST(:role AS VARCHAR))",
           countQuery = "SELECT COUNT(*) FROM users u WHERE " +
           "(CAST(:search AS VARCHAR) IS NULL OR LOWER(u.name) LIKE LOWER(CONCAT('%', CAST(:search AS VARCHAR), '%')) OR LOWER(u.email) LIKE LOWER(CONCAT('%', CAST(:search AS VARCHAR), '%'))) " +
           "AND (CAST(:role AS VARCHAR) IS NULL OR u.role = CAST(:role AS VARCHAR))",
           nativeQuery = true)
    Page<User> searchUsers(@Param("search") String search, @Param("role") String role, Pageable pageable);
}
