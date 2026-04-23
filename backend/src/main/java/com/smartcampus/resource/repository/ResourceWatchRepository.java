package com.smartcampus.resource.repository;

import com.smartcampus.resource.entity.ResourceWatch;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ResourceWatchRepository extends JpaRepository<ResourceWatch, Long> {

    boolean existsByResourceIdAndUserId(Long resourceId, Long userId);

    long countByResourceId(Long resourceId);

    List<ResourceWatch> findByResourceId(Long resourceId);

    void deleteByResourceIdAndUserId(Long resourceId, Long userId);

    void deleteByResourceId(Long resourceId);
}
