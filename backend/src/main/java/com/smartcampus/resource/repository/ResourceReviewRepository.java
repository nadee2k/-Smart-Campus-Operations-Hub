package com.smartcampus.resource.repository;

import com.smartcampus.resource.entity.ResourceReview;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface ResourceReviewRepository extends JpaRepository<ResourceReview, Long> {

    List<ResourceReview> findByResourceIdOrderByUpdatedAtDescCreatedAtDesc(Long resourceId);

    Optional<ResourceReview> findByIdAndResourceId(Long id, Long resourceId);

    Optional<ResourceReview> findByResourceIdAndUserId(Long resourceId, Long userId);

    long countByResourceId(Long resourceId);

    @Query("select avg(review.rating) from ResourceReview review where review.resource.id = :resourceId")
    Double averageRatingByResourceId(Long resourceId);
}
