package com.smartcampus.resource.service;

import com.smartcampus.common.exception.ResourceNotFoundException;
import com.smartcampus.resource.dto.ResourceRequest;
import com.smartcampus.resource.dto.ResourceResponse;
import com.smartcampus.resource.entity.CampusResource;
import com.smartcampus.resource.entity.ResourceStatus;
import com.smartcampus.resource.entity.ResourceType;
import com.smartcampus.resource.repository.CampusResourceRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.modelmapper.ModelMapper;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CampusResourceServiceTest {

    @Mock
    private CampusResourceRepository repository;

    @Mock
    private ModelMapper modelMapper;

    @InjectMocks
    private CampusResourceServiceImpl service;

    private CampusResource resource;
    private ResourceRequest request;

    @BeforeEach
    void setUp() {
        resource = new CampusResource();
        resource.setId(1L);
        resource.setName("Main Hall");
        resource.setType(ResourceType.LECTURE_HALL);
        resource.setCapacity(200);
        resource.setLocation("Building A");
        resource.setAvailabilityStartTime(LocalTime.of(8, 0));
        resource.setAvailabilityEndTime(LocalTime.of(18, 0));
        resource.setStatus(ResourceStatus.ACTIVE);
        resource.setDeleted(false);
        resource.setCreatedAt(LocalDateTime.now());
        resource.setUpdatedAt(LocalDateTime.now());

        request = new ResourceRequest();
        request.setName("Main Hall");
        request.setType(ResourceType.LECTURE_HALL);
        request.setCapacity(200);
        request.setLocation("Building A");
    }

    @Test
    void create_shouldReturnCreatedResource() {
        when(modelMapper.map(any(ResourceRequest.class), eq(CampusResource.class))).thenReturn(resource);
        when(repository.save(any(CampusResource.class))).thenReturn(resource);

        ResourceResponse result = service.create(request);

        assertThat(result).isNotNull();
        assertThat(result.name()).isEqualTo("Main Hall");
        assertThat(result.type()).isEqualTo(ResourceType.LECTURE_HALL);
        verify(repository).save(any(CampusResource.class));
    }

    @Test
    void getById_shouldReturnResource() {
        when(repository.findById(1L)).thenReturn(Optional.of(resource));

        ResourceResponse result = service.getById(1L);

        assertThat(result).isNotNull();
        assertThat(result.id()).isEqualTo(1L);
    }

    @Test
    void getById_shouldThrowWhenNotFound() {
        when(repository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getById(99L))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void getById_shouldThrowWhenDeleted() {
        resource.setDeleted(true);
        when(repository.findById(1L)).thenReturn(Optional.of(resource));

        assertThatThrownBy(() -> service.getById(1L))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void getAll_shouldReturnPagedResults() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<CampusResource> page = new PageImpl<>(List.of(resource));
        when(repository.findByDeletedFalse(pageable)).thenReturn(page);

        Page<ResourceResponse> result = service.getAll(pageable);

        assertThat(result.getTotalElements()).isEqualTo(1);
    }

    @Test
    void update_shouldUpdateAndReturnResource() {
        when(repository.findById(1L)).thenReturn(Optional.of(resource));
        doNothing().when(modelMapper).map(any(ResourceRequest.class), any(CampusResource.class));
        when(repository.save(any(CampusResource.class))).thenReturn(resource);

        ResourceResponse result = service.update(1L, request);

        assertThat(result).isNotNull();
        verify(repository).save(any(CampusResource.class));
    }

    @Test
    void delete_shouldSoftDeleteResource() {
        when(repository.findById(1L)).thenReturn(Optional.of(resource));
        when(repository.save(any(CampusResource.class))).thenReturn(resource);

        service.delete(1L);

        verify(repository).save(argThat(r -> r.getDeleted()));
    }

    @Test
    void search_shouldDelegateToRepository() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<CampusResource> page = new PageImpl<>(List.of(resource));
        when(repository.search(any(), any(), any(), any())).thenReturn(page);

        Page<ResourceResponse> result = service.search(ResourceType.LECTURE_HALL, null, "Main", pageable);

        assertThat(result.getTotalElements()).isEqualTo(1);
    }
}
