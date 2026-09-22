package com.traineta.backend;

import org.springframework.stereotype.Service;

@Service
public class TrainDataProcessor {

    public ProcessedTrainData process(LiveTrainData data) {

        // Validate and clean speed
        double speed = data.getCurrentSpeed();

        if (speed < 0) {
            speed = 0;
        }

        if (speed > 160) {
            speed = 160;
        }

        // Validate current delay
        double currentDelay = data.getCurrentDelay();

        if (currentDelay < 0) {
            currentDelay = 0;
        }

        // Validate train number
        String trainNumber = data.getTrainNumber();

        if (trainNumber == null || trainNumber.isBlank()) {
            trainNumber = "UNKNOWN";
        }

        // Validate location
        String location = data.getCurrentLocation();

        if (location == null || location.isBlank()) {
            location = "Unknown";
        }

        // Validate next station
        String nextStation = data.getNextStation();

        if (nextStation == null || nextStation.isBlank()) {
            nextStation = "Unknown";
        }

        return new ProcessedTrainData(
                trainNumber,
                location,
                speed,
                currentDelay,
                nextStation
        );
    }

    public record ProcessedTrainData(
            String trainNumber,
            String currentLocation,
            double currentSpeed,
            double currentDelay,
            String nextStation
    ) {}
}