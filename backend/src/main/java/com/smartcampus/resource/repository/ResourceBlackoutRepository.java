package com.smartcampus.resource.repository;

import com.smartcampus.resource.entity.ResourceBlackout;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface ResourceBlackoutRepository extends JpaRepository<ResourceBlackout, Long> {

    @Query("""
            select blackout
            from ResourceBlackout blackout
            where blackout.resource.id = :resourceId
              and blackout.startTime < :endTime
              and blackout.endTime > :startTime
            order by blackout.startTime asc
            """)
    List<ResourceBlackout> findOverlapping(
            @Param("resourceId") Long resourceId,
            @Param("startTime") LocalDateTime startTime,
            @Param("endTime") LocalDateTime endTime
    );

    List<ResourceBlackout> findByResourceIdOrderByStartTimeAsc(Long resourceId);

    Optional<ResourceBlackout> findByIdAndResourceId(Long id, Long resourceId);
}
