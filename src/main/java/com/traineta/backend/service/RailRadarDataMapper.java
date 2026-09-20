package com.traineta.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.traineta.backend.TrainStatus;
import com.traineta.backend.dto.StationStopDTO;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Component
public class RailRadarDataMapper {

    private static final Logger logger = LoggerFactory.getLogger(RailRadarDataMapper.class);

    private final ObjectMapper objectMapper = new ObjectMapper();

    private Double getDoubleOrNull(JsonNode node, String... fieldNames) {
        if (node == null) {
            return null;
        }

        for (String fieldName : fieldNames) {
            if (node.hasNonNull(fieldName)) {
                return node.get(fieldName).asDouble();
            }
        }

        return null;
    }

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

            String trainName = train.path("name").asText(
                    train.path("trainName").asText("")
            );
            trainStatus.setTrainName(trainName);

            trainStatus.setCurrentLocation(
                    currentLocation.path("stationName").asText("")
            );

            // Origin / Destination extraction
            String origin = "";
            if (train.has("source")) {
                JsonNode srcNode = train.get("source");
                origin = srcNode.isObject() ? srcNode.path("name").asText(srcNode.path("code").asText("")) : srcNode.asText("");
            } else if (train.has("origin")) {
                JsonNode origNode = train.get("origin");
                origin = origNode.isObject() ? origNode.path("name").asText(origNode.path("code").asText("")) : origNode.asText("");
            }

            String destination = "";
            if (train.has("destination")) {
                JsonNode destNode = train.get("destination");
                destination = destNode.isObject() ? destNode.path("name").asText(destNode.path("code").asText("")) : destNode.asText("");
            } else if (train.has("dest")) {
                JsonNode destNode = train.get("dest");
                destination = destNode.isObject() ? destNode.path("name").asText(destNode.path("code").asText("")) : destNode.asText("");
            }

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
            // REAL ROUTE / STATION STOPS PARSING
            // =====================================================

            JsonNode routeNode = data.has("route") ? data.get("route")
                    : (data.has("stations") ? data.get("stations") : null);

            List<StationStopDTO> routeStops = new ArrayList<>();
            String currentStationName = trainStatus.getCurrentLocation() != null ? trainStatus.getCurrentLocation().trim() : "";
            int matchedCurrentIndex = -1;

            if (routeNode != null && routeNode.isArray()) {
                int idx = 0;
                for (JsonNode item : routeNode) {
                    idx++;
                    int seq = item.path("sequence").asInt(item.path("seq").asInt(idx));

                    String stnCode = item.path("stationCode").asText(
                            item.path("code").asText(
                                    item.path("station").path("code").asText("")
                            )
                    );

                    String stnName = item.path("stationName").asText(
                            item.path("name").asText(
                                    item.path("station").path("name").asText("")
                            )
                    );

                    String scheduledArrival = item.hasNonNull("scheduledArrival") ? item.path("scheduledArrival").asText()
                            : (item.hasNonNull("arrival") ? item.path("arrival").asText()
                            : (item.hasNonNull("schArrival") ? item.path("schArrival").asText(null) : null));

                    String scheduledDeparture = item.hasNonNull("scheduledDeparture") ? item.path("scheduledDeparture").asText()
                            : (item.hasNonNull("departure") ? item.path("departure").asText()
                            : (item.hasNonNull("schDeparture") ? item.path("schDeparture").asText(null) : null));

                    String actualArrival = item.hasNonNull("actualArrival") ? item.path("actualArrival").asText()
                            : (item.hasNonNull("actArrival") ? item.path("actArrival").asText(null) : null);

                    String actualDeparture = item.hasNonNull("actualDeparture") ? item.path("actualDeparture").asText()
                            : (item.hasNonNull("actDeparture") ? item.path("actDeparture").asText(null) : null);

                    Double lat = getDoubleOrNull(item, "lat", "latitude");
                    Double lng = getDoubleOrNull(item, "lng", "longitude");
                    Double dist = getDoubleOrNull(item, "distanceFromOriginKm", "distance");

                    Boolean isHalt = item.has("isHalt") ? item.path("isHalt").asBoolean()
                            : (item.has("halt") ? item.path("halt").asBoolean() : true);

                    String platform = item.hasNonNull("platform") ? item.path("platform").asText() : null;
                    String itemStatus = item.hasNonNull("status") ? item.path("status").asText() : null;

                    StationStopDTO stop = new StationStopDTO(
                            seq,
                            stnCode,
                            stnName,
                            scheduledArrival,
                            scheduledDeparture,
                            actualArrival,
                            actualDeparture,
                            lat,
                            lng,
                            dist,
                            itemStatus,
                            isHalt,
                            platform
                    );

                    routeStops.add(stop);

                    if (!currentStationName.isEmpty() && matchedCurrentIndex == -1) {
                        if (stnName.equalsIgnoreCase(currentStationName)
                                || (!stnCode.isEmpty() && stnCode.equalsIgnoreCase(currentStationName))) {
                            matchedCurrentIndex = routeStops.size() - 1;
                        }
                    }
                }

                // Populate statuses if not supplied
                for (int i = 0; i < routeStops.size(); i++) {
                    StationStopDTO s = routeStops.get(i);
                    if (s.getStatus() == null || s.getStatus().isEmpty()) {
                        if (matchedCurrentIndex >= 0) {
                            if (i < matchedCurrentIndex) {
                                s.setStatus("completed");
                            } else if (i == matchedCurrentIndex) {
                                s.setStatus("current");
                            } else {
                                s.setStatus("upcoming");
                            }
                        } else {
                            s.setStatus(i == 0 ? "completed" : "upcoming");
                        }
                    }
                }

                if (origin.isEmpty() && !routeStops.isEmpty()) {
                    origin = routeStops.get(0).getStationName();
                }
                if (destination.isEmpty() && !routeStops.isEmpty()) {
                    destination = routeStops.get(routeStops.size() - 1).getStationName();
                }
            }

            trainStatus.setOrigin(origin);
            trainStatus.setDestination(destination);
            trainStatus.setRoute(routeStops);

            // =====================================================
            // GPS COORDINATES
            // =====================================================

            Double liveLat = null;
            Double liveLng = null;

            if (currentLocation.hasNonNull("lat")) {
                liveLat = currentLocation.path("lat").asDouble();
            } else if (currentLocation.hasNonNull("latitude")) {
                liveLat = currentLocation.path("latitude").asDouble();
            }

            if (currentLocation.hasNonNull("lng")) {
                liveLng = currentLocation.path("lng").asDouble();
            } else if (currentLocation.hasNonNull("longitude")) {
                liveLng = currentLocation.path("longitude").asDouble();
            }

            // If coordinates not directly in currentLocation, use matched route station
            if (liveLat == null && matchedCurrentIndex >= 0 && matchedCurrentIndex < routeStops.size()) {
                StationStopDTO currStop = routeStops.get(matchedCurrentIndex);
                if (currStop.getLatitude() != null && currStop.getLongitude() != null) {
                    liveLat = currStop.getLatitude();
                    liveLng = currStop.getLongitude();
                }
            }

            trainStatus.setLatitude(liveLat);
            trainStatus.setLongitude(liveLng);

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
            logger.error("Failed to map RailRadar response: {}", e.getMessage(), e);
            throw new RuntimeException(
                    "Failed to map RailRadar response: " + e.getMessage(),
                    e
            );
        }
    }
}
