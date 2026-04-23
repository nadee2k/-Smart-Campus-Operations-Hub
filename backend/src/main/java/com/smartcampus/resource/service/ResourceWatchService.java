package com.smartcampus.resource.service;

import com.smartcampus.booking.entity.Booking;
import com.smartcampus.resource.dto.ResourceWatchStatusResponse;

public interface ResourceWatchService {

    ResourceWatchStatusResponse getStatus(Long resourceId, Long userId);

    ResourceWatchStatusResponse watch(Long resourceId, Long userId);

    void unwatch(Long resourceId, Long userId);

    void notifyWatchersResourceAvailable(Booking booking);
}
