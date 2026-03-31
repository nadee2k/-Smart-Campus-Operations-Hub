package com.smartcampus.ticket.repository;

import com.smartcampus.ticket.entity.TicketComment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TicketCommentRepository extends JpaRepository<TicketComment, Long> {

    Page<TicketComment> findByTicketIdOrderByCreatedAtAsc(Long ticketId, Pageable pageable);
}
