package com.traineta.backend.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.stream.Collectors;

@Service
public class RailRadarPollingService {

    private static final Logger logger = LoggerFactory.getLogger(RailRadarPollingService.class);

    private final RailRadarService railRadarService;
    private final AtomicBoolean isPolling = new AtomicBoolean(false);

    @Value("${railradar.monitored-trains:}")
    private String monitoredTrainsConfig;

    @Value("${railradar.stagger-interval-ms:1000}")
    private long staggerIntervalMs;

    public RailRadarPollingService(RailRadarService railRadarService) {
        this.railRadarService = railRadarService;
    }

    /**
     * Periodically polls RailRadar API for all configured real monitored trains.
     * Prevents overlapping executions and isolates errors per train.
     */
    @Scheduled(
            initialDelayString = "${railradar.initial-delay-ms:5000}",
            fixedDelayString = "${railradar.poll-interval-ms:60000}"
    )
    public void pollMonitoredTrains() {
        if (!isPolling.compareAndSet(false, true)) {
            logger.warn("Previous RailRadar polling cycle is still active. Skipping this cycle.");
            return;
        }

        try {
            List<String> trainList = parseTrainList(monitoredTrainsConfig);

            if (trainList.isEmpty()) {
                logger.info("No monitored trains configured in 'railradar.monitored-trains'. Scheduled polling is idle.");
                return;
            }

            logger.info("Starting scheduled RailRadar polling cycle for {} monitored train(s).", trainList.size());

            for (int i = 0; i < trainList.size(); i++) {
                String trainNumber = trainList.get(i);

                try {
                    logger.info("Polling real-time RailRadar status for train [{}]", trainNumber);
                    railRadarService.getLiveTrainData(trainNumber);
                } catch (Exception ex) {
                    logger.warn("Failed to update real-time status for train [{}]: {}", trainNumber, ex.getMessage());
                }

                // Stagger requests to avoid hitting RailRadar API rate limits
                if (i < trainList.size() - 1 && staggerIntervalMs > 0) {
                    try {
                        Thread.sleep(staggerIntervalMs);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        logger.warn("Polling cycle sleep interrupted.");
                        break;
                    }
                }
            }

            logger.info("Completed scheduled RailRadar polling cycle.");

        } finally {
            isPolling.set(false);
        }
    }

    private List<String> parseTrainList(String rawConfig) {
        if (rawConfig == null || rawConfig.trim().isEmpty()) {
            return Collections.emptyList();
        }

        return Arrays.stream(rawConfig.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toList());
    }
}
