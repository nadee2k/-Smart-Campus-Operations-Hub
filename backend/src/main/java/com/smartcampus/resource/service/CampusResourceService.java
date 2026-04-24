package com.smartcampus.resource.service;

import com.smartcampus.resource.dto.ResourceRequest;
import com.smartcampus.resource.dto.ResourceResponse;
import com.smartcampus.resource.dto.WeeklyResourceReportResponse;
import com.smartcampus.resource.entity.ResourceStatus;
import com.smartcampus.resource.entity.ResourceType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface CampusResourceService {

    ResourceResponse create(ResourceRequest request);

    ResourceResponse getById(Long id);

    WeeklyResourceReportResponse getWeeklyReport(Long id);

    byte[] generateWeeklyReportPdf(Long id);

    Page<ResourceResponse> getAll(Pageable pageable);

    Page<ResourceResponse> search(ResourceType type, ResourceStatus status, String query, Pageable pageable);

    ResourceResponse update(Long id, ResourceRequest request);

    ResourceResponse cloneResource(Long id);

    ResourceResponse toggleStatus(Long id);

    void delete(Long id);
}
