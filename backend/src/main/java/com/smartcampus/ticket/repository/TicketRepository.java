package com.smartcampus.ticket.repository;

import com.smartcampus.ticket.entity.Ticket;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.smartcampus.ticket.entity.TicketStatus;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface TicketRepository extends JpaRepository<Ticket, Long> {

    List<Ticket> findByStatusAndSlaDeadlineBeforeAndSlaDeadlineIsNotNull(TicketStatus status, LocalDateTime deadline);

    List<Ticket> findByStatusAndUpdatedAtBefore(TicketStatus status, LocalDateTime before);

    Page<Ticket> findByCreatedById(Long userId, Pageable pageable);

    @Query(value = "SELECT * FROM tickets t " +
           "WHERE (CAST(:status AS VARCHAR) IS NULL OR t.status = CAST(:status AS VARCHAR)) " +
           "AND (CAST(:priority AS VARCHAR) IS NULL OR t.priority = CAST(:priority AS VARCHAR)) " +
           "AND (CAST(:resourceId AS BIGINT) IS NULL OR t.resource_id = CAST(:resourceId AS BIGINT))",
           countQuery = "SELECT COUNT(*) FROM tickets t " +
           "WHERE (CAST(:status AS VARCHAR) IS NULL OR t.status = CAST(:status AS VARCHAR)) " +
           "AND (CAST(:priority AS VARCHAR) IS NULL OR t.priority = CAST(:priority AS VARCHAR)) " +
           "AND (CAST(:resourceId AS BIGINT) IS NULL OR t.resource_id = CAST(:resourceId AS BIGINT))",
           nativeQuery = true)
    Page<Ticket> findFiltered(
            @Param("status") String status,
            @Param("priority") String priority,
            @Param("resourceId") Long resourceId,
            Pageable pageable);

    @Query(value = "SELECT t.status, COUNT(*) FROM tickets t GROUP BY t.status",
           nativeQuery = true)
    List<Object[]> countByStatus();

    @Query(value = "SELECT AVG(EXTRACT(EPOCH FROM (t.updated_at - t.created_at))) " +
           "FROM tickets t WHERE t.status = 'RESOLVED' OR t.status = 'CLOSED'",
           nativeQuery = true)
    Double averageResolutionTimeSeconds();

    Page<Ticket> findByAssignedTechnicianId(Long technicianId, Pageable pageable);

    Page<Ticket> findByResourceId(Long resourceId, Pageable pageable);

    @Query(value = "SELECT COUNT(*) FROM tickets WHERE sla_deadline < NOW() AND status NOT IN ('RESOLVED', 'CLOSED')",
           nativeQuery = true)
    long countSlaBreaches();

    @Query(value = "SELECT AVG(satisfaction_rating) FROM tickets WHERE satisfaction_rating IS NOT NULL",
           nativeQuery = true)
    Double averageSatisfactionRating();

    @Query(value = "SELECT COUNT(*) FROM tickets WHERE assigned_technician = :techId AND status NOT IN ('RESOLVED', 'CLOSED')",
           nativeQuery = true)
    long countOpenByTechnicianId(@Param("techId") Long techId);

    @Query(value = "SELECT COUNT(*) FROM tickets WHERE assigned_technician = :techId AND status IN ('RESOLVED', 'CLOSED')",
           nativeQuery = true)
    long countResolvedByTechnicianId(@Param("techId") Long techId);

    long countByCreatedById(Long userId);
}
