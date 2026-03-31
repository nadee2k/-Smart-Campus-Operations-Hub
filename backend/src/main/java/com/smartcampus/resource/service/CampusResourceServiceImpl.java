package com.smartcampus.resource.service;

import com.smartcampus.activity.service.ActivityLogService;
import com.smartcampus.common.exception.ResourceNotFoundException;
import com.smartcampus.resource.dto.ResourceRequest;
import com.smartcampus.resource.dto.ResourceResponse;
import com.smartcampus.resource.entity.CampusResource;
import com.smartcampus.resource.entity.ResourceStatus;
import com.smartcampus.resource.entity.ResourceType;
import com.smartcampus.resource.repository.CampusResourceRepository;
import org.modelmapper.ModelMapper;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CampusResourceServiceImpl implements CampusResourceService {

    private final CampusResourceRepository repository;
    private final ModelMapper modelMapper;
    private final ActivityLogService activityLogService;

    public CampusResourceServiceImpl(CampusResourceRepository repository, ModelMapper modelMapper, ActivityLogService activityLogService) {
        this.repository = repository;
        this.modelMapper = modelMapper;
        this.activityLogService = activityLogService;
    }

    @Override
    @Transactional
    @CacheEvict(value = "resources", allEntries = true)
    public ResourceResponse create(ResourceRequest request) {
        CampusResource resource = modelMapper.map(request, CampusResource.class);
        if (resource.getStatus() == null) {
            resource.setStatus(ResourceStatus.ACTIVE);
        }
        CampusResource saved = repository.save(resource);
        activityLogService.log(null, "Admin", "RESOURCE_CREATED", "RESOURCE", saved.getId(), "Created resource: " + saved.getName());
        return toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public ResourceResponse getById(Long id) {
        CampusResource resource = findActiveById(id);
        return toResponse(resource);
    }

    @Override
    @Transactional(readOnly = true)
    @Cacheable(value = "resources")
    public Page<ResourceResponse> getAll(Pageable pageable) {
        return repository.findByDeletedFalse(pageable).map(this::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ResourceResponse> search(ResourceType type, ResourceStatus status, String query, Pageable pageable) {
        String typeStr = type != null ? type.name() : null;
        String statusStr = status != null ? status.name() : null;
        return repository.search(typeStr, statusStr, query, pageable).map(this::toResponse);
    }

    @Override
    @Transactional
    @CacheEvict(value = "resources", allEntries = true)
    public ResourceResponse update(Long id, ResourceRequest request) {
        CampusResource resource = findActiveById(id);
        modelMapper.map(request, resource);
        CampusResource saved = repository.save(resource);
        activityLogService.log(null, "Admin", "RESOURCE_UPDATED", "RESOURCE", saved.getId(), "Updated resource: " + saved.getName());
        return toResponse(saved);
    }

    @Override
    @Transactional
    @CacheEvict(value = "resources", allEntries = true)
    public void delete(Long id) {
        CampusResource resource = findActiveById(id);
        resource.setDeleted(true);
        repository.save(resource);
        activityLogService.log(null, "Admin", "RESOURCE_DELETED", "RESOURCE", resource.getId(), "Deleted resource: " + resource.getName());
    }

    private CampusResource findActiveById(Long id) {
        CampusResource resource = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Resource", id));
        if (resource.getDeleted()) {
            throw new ResourceNotFoundException("Resource", id);
        }
        return resource;
    }

    private ResourceResponse toResponse(CampusResource r) {
        return new ResourceResponse(
                r.getId(), r.getName(), r.getType(), r.getCapacity(),
                r.getLocation(), r.getAvailabilityStartTime(), r.getAvailabilityEndTime(),
                r.getStatus(), r.getCreatedAt(), r.getUpdatedAt()
        );
    }
}
