package com.traineta.backend;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "train_status")
public class TrainStatus {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    private String trainNumber;
    private String currentLocation;

    // GPS Location
    private Double latitude;
    private Double longitude;

    private Double currentSpeed;
    private Double currentDelay;
    private Double previousDelay;
    private Integer weatherFactor;
    private Integer trafficFactor;
    private String nextStation;
    private Double futureDelay;
    private String predictedEta;
    private Double confidenceScore;
    private String delayAlert;

    private LocalDateTime createdAt;

    public TrainStatus() {
    }

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public String getTrainNumber() {
        return trainNumber;
    }

    public void setTrainNumber(String trainNumber) {
        this.trainNumber = trainNumber;
    }

    public String getCurrentLocation() {
        return currentLocation;
    }

    public void setCurrentLocation(String currentLocation) {
        this.currentLocation = currentLocation;
    }

    public Double getLatitude() {
        return latitude;
    }

    public void setLatitude(Double latitude) {
        this.latitude = latitude;
    }

    public Double getLongitude() {
        return longitude;
    }

    public void setLongitude(Double longitude) {
        this.longitude = longitude;
    }

    public Double getCurrentSpeed() {
        return currentSpeed;
    }

    public void setCurrentSpeed(Double currentSpeed) {
        this.currentSpeed = currentSpeed;
    }

    public Double getCurrentDelay() {
        return currentDelay;
    }

    public void setCurrentDelay(Double currentDelay) {
        this.currentDelay = currentDelay;
    }

    public Double getPreviousDelay() {
        return previousDelay;
    }

    public void setPreviousDelay(Double previousDelay) {
        this.previousDelay = previousDelay;
    }

    public Integer getWeatherFactor() {
        return weatherFactor;
    }

    public void setWeatherFactor(Integer weatherFactor) {
        this.weatherFactor = weatherFactor;
    }

    public Integer getTrafficFactor() {
        return trafficFactor;
    }

    public void setTrafficFactor(Integer trafficFactor) {
        this.trafficFactor = trafficFactor;
    }

    public String getNextStation() {
        return nextStation;
    }

    public void setNextStation(String nextStation) {
        this.nextStation = nextStation;
    }

    public Double getFutureDelay() {
        return futureDelay;
    }

    public void setFutureDelay(Double futureDelay) {
        this.futureDelay = futureDelay;
    }

    public String getPredictedEta() {
        return predictedEta;
    }

    public void setPredictedEta(String predictedEta) {
        this.predictedEta = predictedEta;
    }

    public Double getConfidenceScore() {
        return confidenceScore;
    }

    public void setConfidenceScore(Double confidenceScore) {
        this.confidenceScore = confidenceScore;
    }

    public String getDelayAlert() {
        return delayAlert;
    }

    public void setDelayAlert(String delayAlert) {
        this.delayAlert = delayAlert;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}