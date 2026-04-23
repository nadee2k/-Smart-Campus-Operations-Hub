package com.smartcampus.resource.entity;

import jakarta.persistence.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.util.ArrayList;
import java.util.List;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Entity
@Table(name = "resources")
@EntityListeners(AuditingEntityListener.class)
public class CampusResource {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ResourceType type;

    @Column(nullable = false)
    private Integer capacity = 0;

    private String location;

    @ElementCollection
    @CollectionTable(name = "resource_amenities", joinColumns = @JoinColumn(name = "resource_id"))
    @Column(name = "amenity", nullable = false)
    private List<String> amenities = new ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "resource_photos", joinColumns = @JoinColumn(name = "resource_id"))
    @Column(name = "photo_url", nullable = false)
    private List<String> photoUrls = new ArrayList<>();

    @Column(name = "layout_map_url")
    private String layoutMapUrl;

    @Column(name = "view_360_url")
    private String view360Url;

    @Column(name = "owner_name")
    private String ownerName;

    private String department;

    @Column(name = "maintenance_score", nullable = false)
    private Integer maintenanceScore = 100;

    @Column(name = "availability_start_time", nullable = false)
    private LocalTime availabilityStartTime = LocalTime.of(8, 0);

    @Column(name = "availability_end_time", nullable = false)
    private LocalTime availabilityEndTime = LocalTime.of(18, 0);

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ResourceStatus status = ResourceStatus.ACTIVE;

    @Column(nullable = false)
    private Boolean deleted = false;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public CampusResource() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
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
    public Boolean getDeleted() { return deleted; }
    public void setDeleted(Boolean deleted) { this.deleted = deleted; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
