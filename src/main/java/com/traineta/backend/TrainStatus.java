package com.traineta.backend;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.List;
import com.traineta.backend.dto.StationStopDTO;

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

    @Column(name = "train_status")
    private String trainStatus;

    @Column(name = "current_speed")
    private Double currentSpeed;

    @Column(name = "average_speed")
    private Double averageSpeed;

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
    // ROUTE DISTANCE
    // =====================================================

    @Column(name = "route_distance")
    private Double routeDistance;

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
    // REAL ROUTE & TIMETABLE METADATA (TRANSIENT - NOT STORED IN MYSQL)
    // =====================================================

    @Transient
    private String trainName;

    @Transient
    private String origin;

    @Transient
    private String destination;

    @Transient
    private List<StationStopDTO> route;

    @Transient
    private Double finalArrivalDelay;

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

    public String getTrainStatus() {
        return trainStatus;
    }

    public void setTrainStatus(String trainStatus) {
        this.trainStatus = trainStatus;
    }

    public Double getCurrentSpeed() {
        return currentSpeed;
    }

    public void setCurrentSpeed(Double currentSpeed) {
        this.currentSpeed = currentSpeed;
    }

    public Double getAverageSpeed() {
        return averageSpeed;
    }

    public void setAverageSpeed(Double averageSpeed) {
        this.averageSpeed = averageSpeed;
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

    public Double getRouteDistance() {
        return routeDistance;
    }

    public void setRouteDistance(Double routeDistance) {
        this.routeDistance = routeDistance;
    }

    public Double getFutureDelay() {
        return futureDelay;
    }

    public void setFutureDelay(Double futureDelay) {
        this.futureDelay = futureDelay;
    }

    @Transient
    public Double getFinalArrivalDelay() {
        return finalArrivalDelay;
    }

    public void setFinalArrivalDelay(Double finalArrivalDelay) {
        this.finalArrivalDelay = finalArrivalDelay;
    }

    @Transient
    public Double getTotalDelay() {
        // For COMPLETED journeys:
        // When a finalArrivalDelay is resolved from destination timestamps (actualArrival - scheduledArrival),
        // expectedDelay and totalDelay become destination-result-specific, reflecting finalArrivalDelay.
        // currentDelay remains telemetry-specific (latest physical checkpoint delay).
        if (finalArrivalDelay != null) {
            return finalArrivalDelay;
        }
        if (currentDelay == null && futureDelay == null) return 0.0;
        return Math.round(((currentDelay != null ? currentDelay : 0.0) + (futureDelay != null ? futureDelay : 0.0)) * 100.0) / 100.0;
    }

    @Transient
    public Double getExpectedDelay() {
        return getTotalDelay();
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

    public String getTrainName() {
        return trainName;
    }

    public void setTrainName(String trainName) {
        this.trainName = trainName;
    }

    public String getOrigin() {
        return origin;
    }

    public void setOrigin(String origin) {
        this.origin = origin;
    }

    public String getDestination() {
        return destination;
    }

    public void setDestination(String destination) {
        this.destination = destination;
    }

    public List<StationStopDTO> getRoute() {
        return route;
    }

    public void setRoute(List<StationStopDTO> route) {
        this.route = route;
    }
}
