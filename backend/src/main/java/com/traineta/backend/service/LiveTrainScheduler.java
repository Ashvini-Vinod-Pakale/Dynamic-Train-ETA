package com.traineta.backend.service;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class LiveTrainScheduler {

    private final RailRadarService railRadarService;

    public LiveTrainScheduler(RailRadarService railRadarService) {
        this.railRadarService = railRadarService;
    }

    @Scheduled(fixedRate = 60000)
    public void fetchLiveTrainDataAutomatically() {

        String trainNumber = "12123";

        System.out.println(
                "SCHEDULER → Fetching live data for train "
                        + trainNumber
        );

        try {

            railRadarService.getLiveTrainData(trainNumber);

            System.out.println(
                    "SCHEDULER → Live train data processed successfully"
            );

        } catch (Exception e) {

            System.err.println(
                    "SCHEDULER → Failed to fetch live train data: "
                            + e.getMessage()
            );
        }
    }
}