package com.smartcampus.resource.dto;

import com.smartcampus.resource.entity.ResourceStatus;
import com.smartcampus.resource.entity.ResourceType;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalTime;

public class ResourceRequest {

    @NotBlank(message = "Name is required")
    private String name;

    @NotNull(message = "Type is required")
    private ResourceType type;

    @NotNull(message = "Capacity is required")
    @Min(value = 0, message = "Capacity must be non-negative")
    private Integer capacity;

    private String location;

    private LocalTime availabilityStartTime;

    private LocalTime availabilityEndTime;

    private ResourceStatus status;

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public ResourceType getType() { return type; }
    public void setType(ResourceType type) { this.type = type; }
    public Integer getCapacity() { return capacity; }
    public void setCapacity(Integer capacity) { this.capacity = capacity; }
    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }
    public LocalTime getAvailabilityStartTime() { return availabilityStartTime; }
    public void setAvailabilityStartTime(LocalTime availabilityStartTime) { this.availabilityStartTime = availabilityStartTime; }
    public LocalTime getAvailabilityEndTime() { return availabilityEndTime; }
    public void setAvailabilityEndTime(LocalTime availabilityEndTime) { this.availabilityEndTime = availabilityEndTime; }
    public ResourceStatus getStatus() { return status; }
    public void setStatus(ResourceStatus status) { this.status = status; }
}
