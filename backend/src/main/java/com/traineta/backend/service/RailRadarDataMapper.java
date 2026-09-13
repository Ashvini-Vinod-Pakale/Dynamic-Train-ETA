package com.traineta.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.traineta.backend.TrainStatus;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Component
public class RailRadarDataMapper {

    private final ObjectMapper objectMapper = new ObjectMapper();

    public TrainStatus mapToTrainStatus(String response) {

        try {

            JsonNode root = objectMapper.readTree(response);
            JsonNode data = root.path("data");

            JsonNode train = data.path("train");
            JsonNode currentLocation = data.path("currentLocation");
            JsonNode nextHalt = data.path("nextHalt");

            TrainStatus trainStatus = new TrainStatus();

            // =====================================================
            // BASIC TRAIN INFORMATION
            // =====================================================

            trainStatus.setTrainNumber(
                    data.path("trainNumber").asText("")
            );

            trainStatus.setCurrentLocation(
                    currentLocation.path("stationName").asText("")
            );

            // =====================================================
            // TRAIN STATUS
            // =====================================================

            trainStatus.setTrainStatus(
                    data.path("status").asText("")
            );

            // =====================================================
            // LIVE SPEED
            // =====================================================

            trainStatus.setCurrentSpeed(
                    currentLocation.path("speedKmh").asDouble(0.0)
            );

            // =====================================================
            // AVERAGE SPEED
            // =====================================================

            double averageSpeed =
                    train.path("avgSpeed").asDouble(0.0);

            trainStatus.setAverageSpeed(averageSpeed);

            // =====================================================
            // CURRENT DELAY
            // =====================================================

            double currentDelay =
                    data.path("delayMinutes").asDouble(0.0);

            trainStatus.setCurrentDelay(currentDelay);

            // Temporary previous delay.
            // Actual previous delay will be loaded
            // from MySQL by RailRadarService.

            trainStatus.setPreviousDelay(currentDelay);

            // =====================================================
            // NEXT STATION
            // =====================================================

            trainStatus.setNextStation(
                    nextHalt.path("stationName").asText("")
            );

            // =====================================================
            // REMAINING ROUTE DISTANCE
            // =====================================================

            double totalRouteDistance =
                    train.path("distance").asDouble(0.0);

            double distanceFromOrigin =
                    currentLocation
                            .path("distanceFromOriginKm")
                            .asDouble(0.0);

            double remainingDistance =
                    Math.max(
                            0.0,
                            totalRouteDistance - distanceFromOrigin
                    );

            trainStatus.setRouteDistance(remainingDistance);

            // =====================================================
            // GPS
            // =====================================================

            /*
             * RailRadar currently does not provide
             * exact live train GPS coordinates
             * in this response.
             *
             * Therefore we do not use source coordinates
             * as current train coordinates.
             */

            trainStatus.setLatitude(null);
            trainStatus.setLongitude(null);

            // =====================================================
            // WEATHER / TRAFFIC
            // =====================================================

            /*
             * These are temporary values.
             * Real external data will be connected later.
             *
             * 0 = normal
             */

            trainStatus.setWeatherFactor(0);
            trainStatus.setTrafficFactor(0);

            // =====================================================
            // PREDICTION FIELDS
            // =====================================================

            /*
             * These will be calculated in
             * Phase 5 and Phase 6.
             */

            trainStatus.setFutureDelay(null);
            trainStatus.setPredictedEta(null);
            trainStatus.setConfidenceScore(null);
            trainStatus.setDelayAlert(null);

            // =====================================================
            // TIMESTAMP
            // =====================================================

            trainStatus.setCreatedAt(
                    LocalDateTime.now()
            );

            return trainStatus;

        } catch (Exception e) {

            throw new RuntimeException(
                    "Failed to map RailRadar response",
                    e
            );
        }
    }
}