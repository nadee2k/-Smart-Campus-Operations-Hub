package com.smartcampus.booking.repository;

import com.smartcampus.booking.entity.Booking;
import com.smartcampus.booking.entity.BookingStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface BookingRepository extends JpaRepository<Booking, Long> {

    Page<Booking> findByUserId(Long userId, Pageable pageable);

    Page<Booking> findByStatus(BookingStatus status, Pageable pageable);

    @Query(value = "SELECT * FROM bookings b WHERE b.resource_id = :resourceId " +
           "AND b.status IN ('PENDING', 'APPROVED') " +
           "AND b.start_time < :endTime AND b.end_time > :startTime",
           nativeQuery = true)
    List<Booking> findConflicting(
            @Param("resourceId") Long resourceId,
            @Param("startTime") LocalDateTime startTime,
            @Param("endTime") LocalDateTime endTime);

    List<Booking> findByResourceIdAndStartTimeBetween(Long resourceId, LocalDateTime start, LocalDateTime end);

    long countByResourceIdAndStatusInAndStartTimeBetween(Long resourceId, List<BookingStatus> statuses, LocalDateTime start, LocalDateTime end);

    long countByUserId(Long userId);

    @Query(value = "SELECT COUNT(*) FROM bookings WHERE user_id = :userId AND status = 'APPROVED'",
           nativeQuery = true)
    long countApprovedByUserId(@Param("userId") Long userId);

    @Query(value = "SELECT * FROM bookings b " +
           "WHERE (CAST(:status AS VARCHAR) IS NULL OR b.status = CAST(:status AS VARCHAR)) " +
           "AND (CAST(:resourceId AS BIGINT) IS NULL OR b.resource_id = CAST(:resourceId AS BIGINT)) " +
           "AND (CAST(:startDate AS TIMESTAMP) IS NULL OR b.start_time >= CAST(:startDate AS TIMESTAMP)) " +
           "AND (CAST(:endDate AS TIMESTAMP) IS NULL OR b.end_time <= CAST(:endDate AS TIMESTAMP))",
           countQuery = "SELECT COUNT(*) FROM bookings b " +
           "WHERE (CAST(:status AS VARCHAR) IS NULL OR b.status = CAST(:status AS VARCHAR)) " +
           "AND (CAST(:resourceId AS BIGINT) IS NULL OR b.resource_id = CAST(:resourceId AS BIGINT)) " +
           "AND (CAST(:startDate AS TIMESTAMP) IS NULL OR b.start_time >= CAST(:startDate AS TIMESTAMP)) " +
           "AND (CAST(:endDate AS TIMESTAMP) IS NULL OR b.end_time <= CAST(:endDate AS TIMESTAMP))",
           nativeQuery = true)
    Page<Booking> findFiltered(
            @Param("status") String status,
            @Param("resourceId") Long resourceId,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate,
            Pageable pageable);

    @Query(value = "SELECT EXTRACT(HOUR FROM b.start_time) as hour, COUNT(b.*) as cnt " +
           "FROM bookings b WHERE b.status = 'APPROVED' GROUP BY EXTRACT(HOUR FROM b.start_time)",
           nativeQuery = true)
    List<Object[]> countByHour();

    @Query(value = "SELECT b.resource_id, r.name, COUNT(*) as cnt " +
           "FROM bookings b JOIN resources r ON b.resource_id = r.id " +
           "WHERE b.status = 'APPROVED' " +
           "GROUP BY b.resource_id, r.name ORDER BY cnt DESC",
           nativeQuery = true)
    List<Object[]> findMostBooked();
}
