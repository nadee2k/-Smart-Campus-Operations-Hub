package com.smartcampus.activity.repository;

import com.smartcampus.activity.entity.ActivityLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ActivityLogRepository extends JpaRepository<ActivityLog, Long> {

    Page<ActivityLog> findAllByOrderByCreatedAtDesc(Pageable pageable);

    Page<ActivityLog> findByActorIdOrderByCreatedAtDesc(Long actorId, Pageable pageable);

    Page<ActivityLog> findByActionInOrderByCreatedAtDesc(java.util.List<String> actions, Pageable pageable);
}
