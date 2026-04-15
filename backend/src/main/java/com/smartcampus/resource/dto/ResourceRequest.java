package com.smartcampus.resource.dto;

import com.smartcampus.resource.entity.ResourceStatus;
import com.smartcampus.resource.entity.ResourceType;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Max;

import java.time.LocalTime;
import java.util.List;

public class ResourceRequest {

    @NotBlank(message = "Name is required")
    private String name;

    @NotNull(message = "Type is required")
    private ResourceType type;

    @NotNull(message = "Capacity is required")
    @Min(value = 0, message = "Capacity must be non-negative")
    private Integer capacity;

    private String location;

    private List<String> amenities;

    private List<String> photoUrls;

    private String layoutMapUrl;

    private String view360Url;

    private String ownerName;

    private String department;

    @Min(value = 0, message = "Maintenance score must be between 0 and 100")
    @Max(value = 100, message = "Maintenance score must be between 0 and 100")
    private Integer maintenanceScore;

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
    public List<String> getAmenities() { return amenities; }
    public void setAmenities(List<String> amenities) { this.amenities = amenities; }
    public List<String> getPhotoUrls() { return photoUrls; }
    public void setPhotoUrls(List<String> photoUrls) { this.photoUrls = photoUrls; }
    public String getLayoutMapUrl() { return layoutMapUrl; }
    public void setLayoutMapUrl(String layoutMapUrl) { this.layoutMapUrl = layoutMapUrl; }
    public String getView360Url() { return view360Url; }
    public void setView360Url(String view360Url) { this.view360Url = view360Url; }
    public String getOwnerName() { return ownerName; }
    public void setOwnerName(String ownerName) { this.ownerName = ownerName; }
    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }
    public Integer getMaintenanceScore() { return maintenanceScore; }
    public void setMaintenanceScore(Integer maintenanceScore) { this.maintenanceScore = maintenanceScore; }
    public LocalTime getAvailabilityStartTime() { return availabilityStartTime; }
    public void setAvailabilityStartTime(LocalTime availabilityStartTime) { this.availabilityStartTime = availabilityStartTime; }
    public LocalTime getAvailabilityEndTime() { return availabilityEndTime; }
    public void setAvailabilityEndTime(LocalTime availabilityEndTime) { this.availabilityEndTime = availabilityEndTime; }
    public ResourceStatus getStatus() { return status; }
    public void setStatus(ResourceStatus status) { this.status = status; }
}
