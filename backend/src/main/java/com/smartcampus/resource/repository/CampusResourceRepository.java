package com.smartcampus.resource.repository;

import com.smartcampus.resource.entity.CampusResource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface CampusResourceRepository extends JpaRepository<CampusResource, Long> {

    @Query(value = "SELECT * FROM resources r WHERE r.deleted = false " +
           "AND (CAST(:type AS VARCHAR) IS NULL OR r.type = CAST(:type AS VARCHAR)) " +
           "AND (CAST(:status AS VARCHAR) IS NULL OR r.status = CAST(:status AS VARCHAR)) " +
           "AND (CAST(:query AS VARCHAR) IS NULL OR LOWER(r.name) LIKE LOWER(CONCAT('%', CAST(:query AS VARCHAR), '%')) " +
           "     OR LOWER(r.location) LIKE LOWER(CONCAT('%', CAST(:query AS VARCHAR), '%')) " +
           "     OR LOWER(COALESCE(r.department, '')) LIKE LOWER(CONCAT('%', CAST(:query AS VARCHAR), '%')) " +
           "     OR LOWER(COALESCE(r.owner_name, '')) LIKE LOWER(CONCAT('%', CAST(:query AS VARCHAR), '%')))",
           countQuery = "SELECT COUNT(*) FROM resources r WHERE r.deleted = false " +
           "AND (CAST(:type AS VARCHAR) IS NULL OR r.type = CAST(:type AS VARCHAR)) " +
           "AND (CAST(:status AS VARCHAR) IS NULL OR r.status = CAST(:status AS VARCHAR)) " +
           "AND (CAST(:query AS VARCHAR) IS NULL OR LOWER(r.name) LIKE LOWER(CONCAT('%', CAST(:query AS VARCHAR), '%')) " +
           "     OR LOWER(r.location) LIKE LOWER(CONCAT('%', CAST(:query AS VARCHAR), '%')) " +
           "     OR LOWER(COALESCE(r.department, '')) LIKE LOWER(CONCAT('%', CAST(:query AS VARCHAR), '%')) " +
           "     OR LOWER(COALESCE(r.owner_name, '')) LIKE LOWER(CONCAT('%', CAST(:query AS VARCHAR), '%')))",
           nativeQuery = true)
    Page<CampusResource> search(
            @Param("type") String type,
            @Param("status") String status,
            @Param("query") String query,
            Pageable pageable);

    Page<CampusResource> findByDeletedFalse(Pageable pageable);

    java.util.List<CampusResource> findByDeletedFalse();
}
