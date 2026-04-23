package com.smartcampus.analytics.repository;

import com.smartcampus.analytics.entity.ResourceReportCard;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.Optional;

public interface ResourceReportCardRepository extends JpaRepository<ResourceReportCard, Long> {
    Optional<ResourceReportCard> findByResourceIdAndWeekStartDate(Long resourceId, LocalDate weekStartDate);
}
