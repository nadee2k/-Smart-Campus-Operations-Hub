package com.smartcampus.resource.scheduler;

import com.smartcampus.resource.service.ResourceWatchService;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class ResourceWatchScheduler {

    private final ResourceWatchService resourceWatchService;

    public ResourceWatchScheduler(ResourceWatchService resourceWatchService) {
        this.resourceWatchService = resourceWatchService;
    }

    @Scheduled(fixedRateString = "${app.watchlist.alert-check-ms:900000}")
    public void processAvailabilityAlerts() {
        resourceWatchService.processScheduledAvailabilityAlerts();
    }
}
