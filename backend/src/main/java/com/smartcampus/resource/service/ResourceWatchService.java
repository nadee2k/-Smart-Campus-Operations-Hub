package com.smartcampus.resource.service;

import com.smartcampus.booking.entity.Booking;
import com.smartcampus.resource.dto.ResourceWatchListItemResponse;
import com.smartcampus.resource.dto.ResourceWatchStatusResponse;

import java.util.List;

public interface ResourceWatchService {

    ResourceWatchStatusResponse getStatus(Long resourceId, Long userId);

    List<ResourceWatchListItemResponse> getMyWatchlist(Long userId);

    ResourceWatchStatusResponse watch(Long resourceId, Long userId);

    void unwatch(Long resourceId, Long userId);

    void notifyWatchersResourceAvailable(Booking booking);

    void processScheduledAvailabilityAlerts();
}
