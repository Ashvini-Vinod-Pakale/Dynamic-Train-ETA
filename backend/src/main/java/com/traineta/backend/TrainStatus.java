
package com.traineta.backend;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "train_status")
public class TrainStatus {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    // =====================================================
    // TRAIN INFORMATION
    // =====================================================

    @Column(name = "train_number")
    private String trainNumber;

    @Column(name = "current_location")
    private String currentLocation;

    // =====================================================
    // GPS LOCATION
    // =====================================================

    @Column(name = "latitude")
    private Double latitude;

    @Column(name = "longitude")
    private Double longitude;

    // =====================================================
    // TRAIN STATUS
    // =====================================================

    @Column(name = "current_speed")
    private Double currentSpeed;

    @Column(name = "current_delay")
    private Double currentDelay;

    @Column(name = "previous_delay")
    private Double previousDelay;

    @Column(name = "weather_factor")
    private Integer weatherFactor;

    @Column(name = "traffic_factor")
    private Integer trafficFactor;

    @Column(name = "next_station")
    private String nextStation;

    // =====================================================
    // PREDICTION
    // =====================================================

    @Column(name = "future_delay")
    private Double futureDelay;

    @Column(name = "predicted_eta")
    private String predictedEta;

    @Column(name = "confidence_score")
    private Double confidenceScore;

    @Column(name = "delay_alert")
    private String delayAlert;

    // =====================================================
    // TIMESTAMP
    // =====================================================

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    // =====================================================
    // CONSTRUCTOR
    // =====================================================

    public TrainStatus() {
    }

    // =====================================================
    // GETTERS AND SETTERS
    // =====================================================

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
