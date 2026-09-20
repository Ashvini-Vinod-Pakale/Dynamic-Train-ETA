package com.traineta.backend.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class StationStopDTO {

    private Integer sequence;
    private String stationCode;
    private String stationName;
    private String scheduledArrival;
    private String scheduledDeparture;
    private String actualArrival;
    private String actualDeparture;
    private Double latitude;
    private Double longitude;
    private Double distanceFromOrigin;
    private String status; // "completed", "current", "upcoming"
    private Boolean isHalt;
    private String platform;

    public StationStopDTO() {
    }

    public StationStopDTO(
            Integer sequence,
            String stationCode,
            String stationName,
            String scheduledArrival,
            String scheduledDeparture,
            String actualArrival,
            String actualDeparture,
            Double latitude,
            Double longitude,
            Double distanceFromOrigin,
            String status,
            Boolean isHalt,
            String platform) {
        this.sequence = sequence;
        this.stationCode = stationCode;
        this.stationName = stationName;
        this.scheduledArrival = scheduledArrival;
        this.scheduledDeparture = scheduledDeparture;
        this.actualArrival = actualArrival;
        this.actualDeparture = actualDeparture;
        this.latitude = latitude;
        this.longitude = longitude;
        this.distanceFromOrigin = distanceFromOrigin;
        this.status = status;
        this.isHalt = isHalt;
        this.platform = platform;
    }

    public Integer getSequence() {
        return sequence;
    }

    public void setSequence(Integer sequence) {
        this.sequence = sequence;
    }

    public String getStationCode() {
        return stationCode;
    }

    public void setStationCode(String stationCode) {
        this.stationCode = stationCode;
    }

    public String getStationName() {
        return stationName;
    }

    public void setStationName(String stationName) {
        this.stationName = stationName;
    }

    public String getScheduledArrival() {
        return scheduledArrival;
    }

    public void setScheduledArrival(String scheduledArrival) {
        this.scheduledArrival = scheduledArrival;
    }

    public String getScheduledDeparture() {
        return scheduledDeparture;
    }

    public void setScheduledDeparture(String scheduledDeparture) {
        this.scheduledDeparture = scheduledDeparture;
    }

    public String getActualArrival() {
        return actualArrival;
    }

    public void setActualArrival(String actualArrival) {
        this.actualArrival = actualArrival;
    }

    public String getActualDeparture() {
        return actualDeparture;
    }

    public void setActualDeparture(String actualDeparture) {
        this.actualDeparture = actualDeparture;
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

    public Double getDistanceFromOrigin() {
        return distanceFromOrigin;
    }

    public void setDistanceFromOrigin(Double distanceFromOrigin) {
        this.distanceFromOrigin = distanceFromOrigin;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Boolean getIsHalt() {
        return isHalt;
    }

    public void setIsHalt(Boolean isHalt) {
        this.isHalt = isHalt;
    }

    public String getPlatform() {
        return platform;
    }

    public void setPlatform(String platform) {
        this.platform = platform;
    }
}
