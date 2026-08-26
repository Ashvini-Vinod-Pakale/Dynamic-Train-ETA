
    
package com.traineta.backend;

import java.time.LocalDateTime;

public class LiveTrainData {

    private String trainNumber;
    private String currentLocation;
    private double currentSpeed;
    private double currentDelay;
    private String nextStation;
    private LocalDateTime timestamp;

    public LiveTrainData(
            String trainNumber,
            String currentLocation,
            double currentSpeed,
            double currentDelay,
            String nextStation) {

        this.trainNumber = trainNumber;
        this.currentLocation = currentLocation;
        this.currentSpeed = currentSpeed;
        this.currentDelay = currentDelay;
        this.nextStation = nextStation;
        this.timestamp = LocalDateTime.now();
    }

    public String getTrainNumber() {
        return trainNumber;
    }

    public String getCurrentLocation() {
        return currentLocation;
    }

    public double getCurrentSpeed() {
        return currentSpeed;
    }

    public double getCurrentDelay() {
        return currentDelay;
    }

    public String getNextStation() {
        return nextStation;
    }

    public LocalDateTime getTimestamp() {
        return timestamp;
    }
}
