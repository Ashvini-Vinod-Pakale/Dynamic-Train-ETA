package com.traineta.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.traineta.backend.TrainStatus;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Component
public class RailRadarDataMapper {

    private final ObjectMapper objectMapper =
            new ObjectMapper();

    public TrainStatus mapToTrainStatus(
            String response,
            String routeResponse) {

        try {

            JsonNode root =
                    objectMapper.readTree(response);

            JsonNode data =
                    root.path("data");

            JsonNode train =
                    data.path("train");

            JsonNode currentLocation =
                    data.path("currentLocation");

            JsonNode nextHalt =
                    data.path("nextHalt");

            TrainStatus trainStatus =
                    new TrainStatus();

            // =====================================================
            // BASIC TRAIN INFORMATION
            // =====================================================

            trainStatus.setTrainNumber(
                    data.path("trainNumber")
                            .asText("")
            );

            trainStatus.setCurrentLocation(
                    currentLocation
                            .path("stationName")
                            .asText("")
            );

            // =====================================================
            // TRAIN STATUS
            // =====================================================

            trainStatus.setTrainStatus(
                    data.path("status")
                            .asText("")
            );

            // =====================================================
            // LIVE SPEED
            // =====================================================

            double currentSpeed =
                    currentLocation
                            .path("speedKmh")
                            .asDouble(0.0);

            trainStatus.setCurrentSpeed(
                    currentSpeed
            );

            // =====================================================
            // AVERAGE SPEED
            // =====================================================

            double averageSpeed =
                    train.path("avgSpeed")
                            .asDouble(0.0);

            trainStatus.setAverageSpeed(
                    averageSpeed
            );

            // =====================================================
            // CURRENT DELAY
            // =====================================================

            double currentDelay =
                    data.path("delayMinutes")
                            .asDouble(0.0);

            trainStatus.setCurrentDelay(
                    currentDelay
            );

            /*
             * Previous delay will be replaced
             * by MySQL value in RailRadarService.
             */

            trainStatus.setPreviousDelay(
                    currentDelay
            );

            // =====================================================
            // NEXT STATION
            // =====================================================

            trainStatus.setNextStation(
                    nextHalt
                            .path("stationName")
                            .asText("")
            );

            // =====================================================
            // REMAINING ROUTE DISTANCE
            // =====================================================

            double totalRouteDistance =
                    train.path("distance")
                            .asDouble(0.0);

            double distanceFromOrigin =
                    currentLocation
                            .path("distanceFromOriginKm")
                            .asDouble(0.0);

            double remainingDistance =
                    Math.max(
                            0.0,
                            totalRouteDistance
                                    - distanceFromOrigin
                    );

            trainStatus.setRouteDistance(
                    remainingDistance
            );

            // =====================================================
            // GPS POSITION
            // =====================================================

            Double latitude = null;
            Double longitude = null;

            /*
             * First try exact coordinates if
             * RailRadar provides them.
             */

            JsonNode currentCoordinates =
                    currentLocation
                            .path("coordinates");

            if (currentCoordinates.isObject()) {

                if (currentCoordinates.has("lat")
                        && currentCoordinates.has("lng")) {

                    latitude =
                            currentCoordinates
                                    .path("lat")
                                    .asDouble();

                    longitude =
                            currentCoordinates
                                    .path("lng")
                                    .asDouble();
                }

                else if (currentCoordinates.has("latitude")
                        && currentCoordinates.has("longitude")) {

                    latitude =
                            currentCoordinates
                                    .path("latitude")
                                    .asDouble();

                    longitude =
                            currentCoordinates
                                    .path("longitude")
                                    .asDouble();
                }
            }

            /*
             * Try direct latitude / longitude fields.
             */

            if (latitude == null
                    || longitude == null) {

                if (currentLocation.has("latitude")
                        && currentLocation.has("longitude")) {

                    latitude =
                            currentLocation
                                    .path("latitude")
                                    .asDouble();

                    longitude =
                            currentLocation
                                    .path("longitude")
                                    .asDouble();
                }
            }

            /*
             * If exact coordinates are not available,
             * calculate estimated position using:
             *
             * current station
             * next station
             * segmentProgress
             * RailRadar route geometry
             */

            if (latitude == null
                    || longitude == null) {

                double[] estimatedPosition =
                        calculateEstimatedPosition(
                                routeResponse,
                                currentLocation,
                                nextHalt
                        );

                if (estimatedPosition != null) {

                    latitude =
                            estimatedPosition[0];

                    longitude =
                            estimatedPosition[1];
                }
            }

            trainStatus.setLatitude(
                    latitude
            );

            trainStatus.setLongitude(
                    longitude
            );

            // =====================================================
            // WEATHER / RAILWAY OPERATIONAL FACTOR
            // =====================================================

            /*
             * Weather is handled separately by WeatherService.
             *
             * Railway operational impact is derived from
             * live train-specific signals:
             *
             * 1. Current delay
             * 2. Current speed compared with average speed
             *
             * trafficFactor:
             *
             * 0 = Normal operational condition
             * 1 = Possible operational impact
             */

            trainStatus.setWeatherFactor(
                    0
            );

            int operationalFactor =
                    calculateOperationalFactor(
                            currentSpeed,
                            currentDelay,
                            averageSpeed
                    );

            trainStatus.setTrafficFactor(
                    operationalFactor
            );

            // =====================================================
            // PREDICTION FIELDS
            // =====================================================

            trainStatus.setFutureDelay(
                    null
            );

            trainStatus.setPredictedEta(
                    null
            );

            trainStatus.setConfidenceScore(
                    null
            );

            trainStatus.setDelayAlert(
                    null
            );

            // =====================================================
            // TIMESTAMP
            // =====================================================

            trainStatus.setCreatedAt(
                    LocalDateTime.now()
            );

            // =====================================================
            // DEBUG INFORMATION
            // =====================================================

            System.out.println(
                    "RAILWAY OPERATIONAL FACTOR → "
                            + operationalFactor
            );

            System.out.println(
                    "CURRENT SPEED → "
                            + currentSpeed
                            + " km/h"
            );

            System.out.println(
                    "AVERAGE SPEED → "
                            + averageSpeed
                            + " km/h"
            );

            System.out.println(
                    "CURRENT DELAY → "
                            + currentDelay
                            + " min"
            );

            return trainStatus;

        } catch (Exception e) {

            throw new RuntimeException(
                    "Failed to map RailRadar response",
                    e
            );
        }
    }

    // =============================================================
    // RAILWAY OPERATIONAL FACTOR
    // =============================================================

    private int calculateOperationalFactor(
            double currentSpeed,
            double currentDelay,
            double averageSpeed) {

        /*
         * Significant current delay indicates
         * possible operational disruption.
         */

        if (currentDelay >= 10.0) {

            return 1;
        }

        /*
         * If the train is moving considerably slower
         * than its normal average speed, mark it as
         * possible operational impact.
         *
         * Speed condition is ignored when current speed
         * is zero because the train may simply be
         * standing at a station.
         */

        if (currentSpeed > 0.0
                && averageSpeed > 0.0) {

            double speedRatio =
                    currentSpeed / averageSpeed;

            if (speedRatio < 0.50) {

                return 1;
            }
        }

        return 0;
    }

    // =============================================================
    // ESTIMATED GPS CALCULATION
    // =============================================================

    private double[] calculateEstimatedPosition(
            String routeResponse,
            JsonNode currentLocation,
            JsonNode nextHalt) {

        try {

            JsonNode routeRoot =
                    objectMapper.readTree(
                            routeResponse
                    );

            JsonNode routeData =
                    routeRoot.path("data");

            JsonNode stops =
                    routeData.path("stops");

            JsonNode coordinates =
                    routeData
                            .path("geojson")
                            .path("geometry")
                            .path("coordinates");

            if (!stops.isArray()
                    || !coordinates.isArray()
                    || coordinates.isEmpty()) {

                return null;
            }

            int currentSequence =
                    currentLocation
                            .path("sequence")
                            .asInt(0);

            int nextSequence =
                    nextHalt
                            .path("sequence")
                            .asInt(0);

            double segmentProgress =
                    currentLocation
                            .path("segmentProgress")
                            .asDouble(0.0);

            /*
             * Keep progress between 0 and 1.
             */

            segmentProgress =
                    Math.max(
                            0.0,
                            Math.min(
                                    1.0,
                                    segmentProgress
                            )
                    );

            /*
             * If current sequence is unavailable,
             * GPS estimation cannot continue.
             */

            if (currentSequence <= 0) {

                return null;
            }

            /*
             * If train is at final station or
             * next station is unavailable,
             * use current station coordinates.
             */

            if (nextSequence <= 0
                    || currentSequence >= nextSequence) {

                return findStationCoordinates(
                        stops,
                        currentSequence
                );
            }

            /*
             * Find coordinates of current station.
             */

            double[] currentStation =
                    findStationCoordinates(
                            stops,
                            currentSequence
                    );

            /*
             * Find coordinates of next station.
             */

            double[] nextStation =
                    findStationCoordinates(
                            stops,
                            nextSequence
                    );

            if (currentStation == null
                    || nextStation == null) {

                return null;
            }

            /*
             * Find nearest points on the actual
             * RailRadar LineString geometry.
             */

            int startIndex =
                    findNearestGeometryPoint(
                            coordinates,
                            currentStation[0],
                            currentStation[1]
                    );

            int endIndex =
                    findNearestGeometryPoint(
                            coordinates,
                            nextStation[0],
                            nextStation[1]
                    );

            if (startIndex < 0
                    || endIndex < 0) {

                return interpolateStations(
                        currentStation,
                        nextStation,
                        segmentProgress
                );
            }

            /*
             * Make sure geometry direction is correct.
             */

            if (endIndex < startIndex) {

                return interpolateStations(
                        currentStation,
                        nextStation,
                        segmentProgress
                );
            }

            /*
             * Calculate distance along the actual
             * railway geometry between the stations.
             */

            List<Double> cumulativeDistances =
                    new ArrayList<>();

            double totalDistance = 0.0;

            cumulativeDistances.add(
                    0.0
            );

            for (int i = startIndex + 1;
                 i <= endIndex;
                 i++) {

                JsonNode previous =
                        coordinates.get(i - 1);

                JsonNode current =
                        coordinates.get(i);

                double previousLng =
                        previous.get(0)
                                .asDouble();

                double previousLat =
                        previous.get(1)
                                .asDouble();

                double currentLng =
                        current.get(0)
                                .asDouble();

                double currentLat =
                        current.get(1)
                                .asDouble();

                double distance =
                        haversineDistance(
                                previousLat,
                                previousLng,
                                currentLat,
                                currentLng
                        );

                totalDistance += distance;

                cumulativeDistances.add(
                        totalDistance
                );
            }

            /*
             * If geometry segment is invalid,
             * fall back to simple interpolation.
             */

            if (totalDistance <= 0.0) {

                return interpolateStations(
                        currentStation,
                        nextStation,
                        segmentProgress
                );
            }

            /*
             * Target distance according to
             * segmentProgress.
             */

            double targetDistance =
                    totalDistance
                            * segmentProgress;

            /*
             * Find geometry point containing
             * target distance.
             */

            for (int i = 1;
                 i < cumulativeDistances.size();
                 i++) {

                double previousDistance =
                        cumulativeDistances.get(i - 1);

                double currentDistance =
                        cumulativeDistances.get(i);

                if (targetDistance
                        <= currentDistance) {

                    JsonNode pointA =
                            coordinates.get(
                                    startIndex + i - 1
                            );

                    JsonNode pointB =
                            coordinates.get(
                                    startIndex + i
                            );

                    double segmentDistance =
                            currentDistance
                                    - previousDistance;

                    double localProgress;

                    if (segmentDistance <= 0.0) {

                        localProgress = 0.0;

                    } else {

                        localProgress =
                                (targetDistance
                                        - previousDistance)
                                        / segmentDistance;
                    }

                    localProgress =
                            Math.max(
                                    0.0,
                                    Math.min(
                                            1.0,
                                            localProgress
                                    )
                            );

                    double latA =
                            pointA.get(1)
                                    .asDouble();

                    double lngA =
                            pointA.get(0)
                                    .asDouble();

                    double latB =
                            pointB.get(1)
                                    .asDouble();

                    double lngB =
                            pointB.get(0)
                                    .asDouble();

                    double estimatedLat =
                            latA
                                    + (latB - latA)
                                    * localProgress;

                    double estimatedLng =
                            lngA
                                    + (lngB - lngA)
                                    * localProgress;

                    return new double[]{
                            estimatedLat,
                            estimatedLng
                    };
                }
            }

            /*
             * If target is at the very end,
             * return final geometry point.
             */

            JsonNode finalPoint =
                    coordinates.get(endIndex);

            return new double[]{
                    finalPoint.get(1)
                            .asDouble(),

                    finalPoint.get(0)
                            .asDouble()
            };

        } catch (Exception e) {

            System.out.println(
                    "GPS ESTIMATION FAILED → "
                            + e.getMessage()
            );

            return null;
        }
    }

    // =============================================================
    // FIND STATION COORDINATES
    // =============================================================

    private double[] findStationCoordinates(
            JsonNode stops,
            int sequence) {

        for (JsonNode stop : stops) {

            if (stop.path("sequence")
                    .asInt(-1) == sequence) {

                double lat =
                        stop.path("lat")
                                .asDouble();

                double lng =
                        stop.path("lng")
                                .asDouble();

                return new double[]{
                        lat,
                        lng
                };
            }
        }

        return null;
    }

    // =============================================================
    // FIND NEAREST GEOMETRY POINT
    // =============================================================

    private int findNearestGeometryPoint(
            JsonNode coordinates,
            double latitude,
            double longitude) {

        int nearestIndex = -1;

        double smallestDistance =
                Double.MAX_VALUE;

        for (int i = 0;
             i < coordinates.size();
             i++) {

            JsonNode point =
                    coordinates.get(i);

            if (!point.isArray()
                    || point.size() < 2) {

                continue;
            }

            double lng =
                    point.get(0)
                            .asDouble();

            double lat =
                    point.get(1)
                            .asDouble();

            double distance =
                    haversineDistance(
                            latitude,
                            longitude,
                            lat,
                            lng
                    );

            if (distance < smallestDistance) {

                smallestDistance =
                        distance;

                nearestIndex = i;
            }
        }

        return nearestIndex;
    }

    // =============================================================
    // FALLBACK: SIMPLE STATION INTERPOLATION
    // =============================================================

    private double[] interpolateStations(
            double[] currentStation,
            double[] nextStation,
            double progress) {

        double latitude =
                currentStation[0]
                        + (nextStation[0]
                        - currentStation[0])
                        * progress;

        double longitude =
                currentStation[1]
                        + (nextStation[1]
                        - currentStation[1])
                        * progress;

        return new double[]{
                latitude,
                longitude
        };
    }

    // =============================================================
    // HAVERSINE DISTANCE
    // =============================================================

    private double haversineDistance(
            double lat1,
            double lon1,
            double lat2,
            double lon2) {

        final double EARTH_RADIUS_KM =
                6371.0;

        double dLat =
                Math.toRadians(
                        lat2 - lat1
                );

        double dLon =
                Math.toRadians(
                        lon2 - lon1
                );

        double a =
                Math.sin(dLat / 2)
                        * Math.sin(dLat / 2)
                        + Math.cos(
                                Math.toRadians(lat1)
                        )
                        * Math.cos(
                                Math.toRadians(lat2)
                        )
                        * Math.sin(dLon / 2)
                        * Math.sin(dLon / 2);

        double c =
                2 * Math.atan2(
                        Math.sqrt(a),
                        Math.sqrt(1 - a)
                );

        return EARTH_RADIUS_KM * c;
    }
}