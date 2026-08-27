package com.traineta.backend.repository;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

@Entity
@Table(name = "prediction_history")
public class PredictionHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    private String trainNumber;
    private String currentLocation;
    private String nextStation;
    private double currentSpeed;
    private double currentDelay;
    private double futureDelay;
    private double etaMinutes;
    private double confidenceScore;
    private String predictedEta;
    private String delayAlert;
    private LocalDateTime createdAt;

    public PredictionHistory() {
    }

    public Integer getId() {
        return id;
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

    public String getNextStation() {
        return nextStation;
    }

    public void setNextStation(String nextStation) {
        this.nextStation = nextStation;
    }

    public double getCurrentSpeed() {
        return currentSpeed;
    }

    public void setCurrentSpeed(double currentSpeed) {
        this.currentSpeed = currentSpeed;
    }

    public double getCurrentDelay() {
        return currentDelay;
    }

    public void setCurrentDelay(double currentDelay) {
        this.currentDelay = currentDelay;
    }

    public double getFutureDelay() {
        return futureDelay;
    }

    public void setFutureDelay(double futureDelay) {
        this.futureDelay = futureDelay;
    }

    public double getEtaMinutes() {
        return etaMinutes;
    }

    public void setEtaMinutes(double etaMinutes) {
        this.etaMinutes = etaMinutes;
    }

    public double getConfidenceScore() {
        return confidenceScore;
    }

    public void setConfidenceScore(double confidenceScore) {
        this.confidenceScore = confidenceScore;
    }

    public String getPredictedEta() {
        return predictedEta;
    }

    public void setPredictedEta(String predictedEta) {
        this.predictedEta = predictedEta;
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

    @PrePersist
    public void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
