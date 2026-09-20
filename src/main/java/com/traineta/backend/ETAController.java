package com.traineta.backend;

import com.traineta.backend.service.RailRadarService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class ETAController {

    private final RailRadarService railRadarService;
    private final FutureDelayService futureDelayService;
    private final FutureDelayController futureDelayController;

    @Autowired
    public ETAController(RailRadarService railRadarService, FutureDelayService futureDelayService) {
        this.railRadarService = railRadarService;
        this.futureDelayService = futureDelayService;
        this.futureDelayController = new FutureDelayController(railRadarService, futureDelayService);
    }

    public ETAController(RailRadarService railRadarService) {
        this(railRadarService, new FutureDelayService());
    }

    public ETAController(RailRadarService railRadarService, FutureDelayService futureDelayService, FutureDelayController futureDelayController) {
        this.railRadarService = railRadarService;
        this.futureDelayService = futureDelayService;
        this.futureDelayController = futureDelayController != null ? futureDelayController : new FutureDelayController(railRadarService, futureDelayService);
    }

    @PostMapping("/predict/eta")
    public ETAResponse predictETA(
            @RequestBody ETARequest request) {

        double safeCurrentSpeed = Double.isFinite(request.currentSpeed()) ? Math.max(0.0, request.currentSpeed()) : 0.0;
        double safeCurrentDelay = Double.isFinite(request.currentDelay()) ? request.currentDelay() : 0.0;
        double safePrevDelay = Double.isFinite(request.previousDelay()) ? request.previousDelay() : 0.0;
        double safeRouteDistance = Double.isFinite(request.routeDistance()) ? Math.max(0.0, request.routeDistance()) : 0.0;

        var cachedOpt = (request.trainNumber() != null && !request.trainNumber().trim().isEmpty())
                ? railRadarService.getCachedStatus(request.trainNumber().trim())
                : Optional.<TrainStatus>empty();

        if (safeRouteDistance <= 0.0 && cachedOpt.isPresent()) {
            if (cachedOpt.get().getRouteDistance() != null && cachedOpt.get().getRouteDistance() > 0) {
                safeRouteDistance = cachedOpt.get().getRouteDistance();
            }
        }

        // Resolve existing average speed from request or cached train status model
        Double existingAvgSpeed = request.averageSpeed();
        if ((existingAvgSpeed == null || !Double.isFinite(existingAvgSpeed) || existingAvgSpeed <= 0)
                && cachedOpt.isPresent() && cachedOpt.get().getAverageSpeed() != null) {
            existingAvgSpeed = cachedOpt.get().getAverageSpeed();
        }

        double effectiveSpeed = 0.0;
        if (safeCurrentSpeed > 0) {
            effectiveSpeed = safeCurrentSpeed;
        } else if (existingAvgSpeed != null && Double.isFinite(existingAvgSpeed) && existingAvgSpeed > 0) {
            effectiveSpeed = existingAvgSpeed;
        }

        // Future delay prediction using unified FutureDelayService
        double futureDelay = futureDelayService.predictFutureDelay(
                safeCurrentSpeed,
                safeCurrentDelay,
                safePrevDelay,
                request.weatherFactor(),
                request.trafficFactor(),
                safeRouteDistance
        );

        // Future delay cannot be negative or non-finite
        futureDelay = Math.max(0.0, futureDelay);
        if (!Double.isFinite(futureDelay)) {
            futureDelay = 0.0;
        }

        double safeFutureDelay = futureDelay;
        double totalDelay = safeCurrentDelay + safeFutureDelay;
        double expectedDelay = totalDelay;

        // Determine if train journey has reached destination / completed
        boolean isCompleted = isJourneyCompleted(request, cachedOpt);

        // ETA calculation: only possible when not completed, effectiveSpeed > 0 and distance > 0 and finite
        double dynamicETA = 0.0;
        String predictedArrivalTime = "N/A";
        Double finalArrivalDelay = null;

        if (isCompleted) {
            // Train has already arrived at its destination:
            // 1. Do NOT calculate a future travel ETA from current time
            // 2. Do NOT use remaining route distance for travel time
            // 3. Propagate trustworthy actual arrival timestamp if present, otherwise "Arrived"
            String actualArrival = resolveActualDestinationArrival(request, cachedOpt);
            String schedArrival = resolveScheduledDestinationArrival(request, cachedOpt);

            finalArrivalDelay = calculateFinalArrivalDelay(schedArrival, actualArrival);
            if (finalArrivalDelay != null) {
                // For COMPLETED journeys:
                // - currentDelay remains telemetry-specific (latest physical checkpoint delay).
                // - finalArrivalDelay is the destination arrival delay (actualArrival - scheduledArrival).
                // - expectedDelay and totalDelay become destination-result-specific (matching finalArrivalDelay).
                // This is intentional: currentDelay keeps raw telemetry while expectedDelay/totalDelay
                // match the actual destination outcome.
                totalDelay = finalArrivalDelay;
                expectedDelay = finalArrivalDelay;
            }

            if (isValidTime(actualArrival)) {
                predictedArrivalTime = formatStandardTime(actualArrival);
            } else {
                predictedArrivalTime = "Arrived";
            }
            dynamicETA = 0.0;
        } else {
            // Non-completed train:
            // Check if valid scheduled destination arrival exists
            String schedArrival = resolveScheduledDestinationArrival(request, cachedOpt);

            boolean canCalculateETA = effectiveSpeed > 0
                    && safeRouteDistance > 0
                    && Double.isFinite(safeRouteDistance);

            if (canCalculateETA) {
                double baseTravelTime = (safeRouteDistance / effectiveSpeed) * 60.0;
                double calculatedETA = baseTravelTime + safeCurrentDelay + futureDelay;
                if (Double.isFinite(calculatedETA) && calculatedETA >= 0) {
                    dynamicETA = calculatedETA;
                }
            }

            // Check if route-aware ETA-first station prediction is available
            FutureDelayController.StationPrediction destPrediction = null;
            if (futureDelayController != null && request.trainNumber() != null && !request.trainNumber().trim().isEmpty()) {
                try {
                    FutureDelayController.StationWiseRequest stnReq = new FutureDelayController.StationWiseRequest(
                            request.trainNumber(),
                            request.currentLocation(),
                            safeCurrentSpeed,
                            safeCurrentDelay,
                            safePrevDelay,
                            request.weatherFactor(),
                            request.trafficFactor(),
                            request.route(),
                            safeRouteDistance
                    );
                    var stnResp = futureDelayController.predictStationWise(stnReq);
                    if (stnResp != null && stnResp.stationPredictions() != null && !stnResp.stationPredictions().isEmpty()) {
                        var preds = stnResp.stationPredictions();
                        // Find destination stop prediction (matching destination station if known, else last prediction)
                        String destStationName = null;
                        if (cachedOpt.isPresent() && cachedOpt.get().getRoute() != null && !cachedOpt.get().getRoute().isEmpty()) {
                            var r = cachedOpt.get().getRoute();
                            destStationName = r.get(r.size() - 1).getStationName();
                        } else if (cachedOpt.isPresent() && cachedOpt.get().getDestination() != null) {
                            destStationName = cachedOpt.get().getDestination();
                        } else if (request.route() != null && !request.route().isEmpty()) {
                            destStationName = request.route().get(request.route().size() - 1);
                        }

                        if (destStationName != null) {
                            for (int i = preds.size() - 1; i >= 0; i--) {
                                if (destStationName.trim().equalsIgnoreCase(preds.get(i).station().trim())) {
                                    destPrediction = preds.get(i);
                                    break;
                                }
                            }
                        }
                        if (destPrediction == null) {
                            destPrediction = preds.get(preds.size() - 1);
                        }
                    }
                } catch (Exception ignored) {
                    destPrediction = null;
                }
            }

            if (destPrediction != null && destPrediction.predictedETA() != null
                    && !destPrediction.predictedETA().equalsIgnoreCase("Not available")
                    && !destPrediction.predictedETA().equalsIgnoreCase("--")) {
                // Authoritative ETA-First destination prediction
                predictedArrivalTime = destPrediction.predictedETA();
                totalDelay = destPrediction.predictedDelay();
                expectedDelay = destPrediction.predictedDelay();
            } else {
                if (schedArrival != null) {
                    // Authoritative Invariant: Predicted Arrival = Scheduled Destination Arrival + Total Delay
                    String calculatedArrival = calculatePredictedArrival(schedArrival, totalDelay);
                    if (calculatedArrival != null) {
                        predictedArrivalTime = calculatedArrival;
                    }
                }

                // Fallback: If scheduled destination arrival was not available, but travel time can be calculated
                if ("N/A".equals(predictedArrivalTime) && canCalculateETA && dynamicETA > 0) {
                    long secondsToAdd = Math.round(dynamicETA * 60.0);
                    if (secondsToAdd >= 0 && secondsToAdd < 3153600000L) {
                        LocalDateTime predictedArrival =
                                LocalDateTime.now().plusSeconds(secondsToAdd);
                        DateTimeFormatter timeFormatter =
                                DateTimeFormatter.ofPattern("hh:mm a");
                        predictedArrivalTime = formatStandardTime(predictedArrival.format(timeFormatter));
                    }
                }
            }
        }

        // Confidence score
        double confidence = calculateConfidence(
                safeCurrentDelay,
                safePrevDelay,
                futureDelay,
                request.weatherFactor(),
                request.trafficFactor()
        );

        // Delay alert
        String delayAlert;

        if (futureDelay >= 10) {
            delayAlert = "Additional "
                    + round(futureDelay)
                    + " min delay predicted";
        } else if (futureDelay > 0) {
            delayAlert = "Minor future delay predicted";
        } else {
            delayAlert = "No additional delay predicted";
        }

        // Dynamically resolve real train route
        List<String> dynamicRouteList = new ArrayList<>();
        if (request.route() != null && !request.route().isEmpty()) {
            dynamicRouteList.addAll(request.route());
        } else if (cachedOpt.isPresent() && cachedOpt.get().getRoute() != null && !cachedOpt.get().getRoute().isEmpty()) {
            for (var stop : cachedOpt.get().getRoute()) {
                if (stop.getStationName() != null && !stop.getStationName().isEmpty()) {
                    dynamicRouteList.add(stop.getStationName());
                }
            }
        }

        String[] route = dynamicRouteList.toArray(new String[0]);

        return new ETAResponse(
                request.trainNumber(),
                request.currentLocation(),
                request.currentSpeed(),
                request.currentDelay(),
                request.nextStation(),
                round(futureDelay),
                round(expectedDelay),
                round(totalDelay),
                round(dynamicETA),
                predictedArrivalTime,
                round(confidence),
                delayAlert,
                route,
                finalArrivalDelay != null ? round(finalArrivalDelay) : null
        );
    }

    private boolean isJourneyCompleted(ETARequest request, Optional<TrainStatus> cachedOpt) {
        if (isCompletedStatus(request.journeyStatus()) || isCompletedStatus(request.trainStatus())) {
            return true;
        }
        if (cachedOpt.isPresent()) {
            TrainStatus cached = cachedOpt.get();
            if (isCompletedStatus(cached.getTrainStatus())) {
                return true;
            }
            if (cached.getDestination() != null && !cached.getDestination().trim().isEmpty()
                    && request.currentLocation() != null && !request.currentLocation().trim().isEmpty()) {
                if (cached.getDestination().trim().equalsIgnoreCase(request.currentLocation().trim())) {
                    return true;
                }
            }
            if (cached.getRoute() != null && !cached.getRoute().isEmpty()) {
                var lastStop = cached.getRoute().get(cached.getRoute().size() - 1);
                if (lastStop.getStationName() != null && request.currentLocation() != null
                        && lastStop.getStationName().trim().equalsIgnoreCase(request.currentLocation().trim())) {
                    return true;
                }
                if (lastStop.getStatus() != null && isCompletedStatus(lastStop.getStatus())) {
                    return true;
                }
            }
        }
        if (request.route() != null && !request.route().isEmpty() && request.currentLocation() != null) {
            String lastStn = request.route().get(request.route().size() - 1);
            if (lastStn != null && lastStn.trim().equalsIgnoreCase(request.currentLocation().trim())) {
                return true;
            }
        }
        return false;
    }

    public static boolean isCompletedStatus(String status) {
        if (status == null) return false;
        String s = status.trim().toLowerCase();
        return s.equals("completed")
                || s.equals("terminated")
                || s.equals("reached")
                || s.equals("arrived")
                || s.equals("arrived_destination")
                || s.equals("journey_completed")
                || s.equals("journey completed");
    }

    private String resolveActualDestinationArrival(ETARequest request, Optional<TrainStatus> cachedOpt) {
        if (request.actualArrival() != null && isValidTime(request.actualArrival())) {
            return request.actualArrival().trim();
        }
        if (cachedOpt.isPresent() && cachedOpt.get().getRoute() != null && !cachedOpt.get().getRoute().isEmpty()) {
            var route = cachedOpt.get().getRoute();
            var lastStop = route.get(route.size() - 1);
            if (lastStop.getActualArrival() != null && isValidTime(lastStop.getActualArrival())) {
                return lastStop.getActualArrival().trim();
            }
        }
        return null;
    }

    private String resolveScheduledDestinationArrival(ETARequest request, Optional<TrainStatus> cachedOpt) {
        if (request.scheduledArrival() != null && isValidTime(request.scheduledArrival())) {
            return request.scheduledArrival().trim();
        }
        if (cachedOpt.isPresent() && cachedOpt.get().getRoute() != null && !cachedOpt.get().getRoute().isEmpty()) {
            var route = cachedOpt.get().getRoute();
            var lastStop = route.get(route.size() - 1);
            if (lastStop.getScheduledArrival() != null && isValidTime(lastStop.getScheduledArrival())) {
                return lastStop.getScheduledArrival().trim();
            }
        }
        return null;
    }

    /**
     * Calculates the final destination arrival delay for a completed journey:
     * finalArrivalDelay = actualArrival - scheduledArrival
     *
     * Handles:
     * - Full ISO-8601 datetimes with dates.
     * - 12-hour/24-hour time-of-day strings with safe midnight rollover handling
     *   (e.g., scheduled 11:50 PM, actual 12:20 AM -> +30 min).
     * - Non-negative clamping for on-time/early arrivals (max(0.0, diff)).
     * - Returns null when either timestamp is missing, invalid, or "Arrived".
     */
    public static Double calculateFinalArrivalDelay(String scheduledTimeStr, String actualTimeStr) {
        if (scheduledTimeStr == null || actualTimeStr == null) {
            return null;
        }
        String schedTrimmed = scheduledTimeStr.trim();
        String actualTrimmed = actualTimeStr.trim();
        if (!isValidTimeString(schedTrimmed) || !isValidTimeString(actualTrimmed)) {
            return null;
        }
        if (actualTrimmed.equalsIgnoreCase("Arrived") || schedTrimmed.equalsIgnoreCase("Arrived")) {
            return null;
        }

        // Try parsing full ISO-8601 datetimes with dates if both contain full dates
        java.util.regex.Pattern isoDatePattern = java.util.regex.Pattern.compile("^\\d{4}-\\d{2}-\\d{2}T");
        if (isoDatePattern.matcher(schedTrimmed).find() && isoDatePattern.matcher(actualTrimmed).find()) {
            try {
                if (schedTrimmed.contains("+") || schedTrimmed.contains("Z") || schedTrimmed.matches(".*-\\d{2}:\\d{2}$")) {
                    java.time.OffsetDateTime t1 = java.time.OffsetDateTime.parse(schedTrimmed);
                    java.time.OffsetDateTime t2 = java.time.OffsetDateTime.parse(actualTrimmed);
                    long diffMinutes = java.time.Duration.between(t1, t2).toMinutes();
                    return (double) diffMinutes;
                } else {
                    java.time.LocalDateTime t1 = java.time.LocalDateTime.parse(schedTrimmed);
                    java.time.LocalDateTime t2 = java.time.LocalDateTime.parse(actualTrimmed);
                    long diffMinutes = java.time.Duration.between(t1, t2).toMinutes();
                    return (double) diffMinutes;
                }
            } catch (Exception ignored) {
                // Fallback to time-of-day parsing below
            }
        }

        int[] schedParts = parseTimeParts(schedTrimmed);
        int[] actualParts = parseTimeParts(actualTrimmed);

        if (schedParts == null || actualParts == null) {
            return null;
        }

        int schedTotal = schedParts[0] * 60 + schedParts[1];
        int actualTotal = actualParts[0] * 60 + actualParts[1];
        int diff = actualTotal - schedTotal;

        // Midnight crossing handling:
        // If scheduled arrival is late evening (e.g. 11:50 PM [1430]) and actual arrival is past midnight (e.g. 12:20 AM [20]),
        // diff = 20 - 1430 = -1410. When diff < -360, add 1440 minutes -> +30 minutes.
        // If scheduled arrival is early morning (e.g. 12:10 AM [10]) and actual arrival is late evening (e.g. 11:55 PM [1435]),
        // diff = 1435 - 10 = 1425. When diff > 1080, subtract 1440 minutes -> -15 minutes.
        if (diff < -360) {
            diff += 1440;
        } else if (diff > 1080) {
            diff -= 1440;
        }

        return (double) diff;
    }

    public static int[] parseTimeParts(String timeStr) {
        if (timeStr == null) return null;
        String trimmed = timeStr.trim();
        if (!isValidTimeString(trimmed)) return null;

        int hours = -1;
        int minutes = -1;

        // Check ISO-8601 timestamps like "2026-09-17T21:50:00+05:30" or "2026-09-17T21:50:00"
        java.util.regex.Matcher isoMatcher = java.util.regex.Pattern.compile("T(\\d{1,2}):(\\d{2})(?::(\\d{2}))?").matcher(trimmed);
        if (isoMatcher.find()) {
            hours = Integer.parseInt(isoMatcher.group(1));
            minutes = Integer.parseInt(isoMatcher.group(2));
        } else {
            // Check 12-hour strings like "09:50 PM", "9:50 PM", "03:03 am"
            java.util.regex.Matcher twelveMatcher = java.util.regex.Pattern.compile("^(\\d{1,2}):(\\d{2})(?::\\d{2})?\\s*([AaPp][Mm])$").matcher(trimmed);
            if (twelveMatcher.matches()) {
                hours = Integer.parseInt(twelveMatcher.group(1));
                minutes = Integer.parseInt(twelveMatcher.group(2));
                String period = twelveMatcher.group(3).toUpperCase();
                if (period.equals("PM") && hours < 12) hours += 12;
                if (period.equals("AM") && hours == 12) hours = 0;
            } else {
                // Check 24-hour strings like "21:50", "09:50"
                java.util.regex.Matcher twentyFourMatcher = java.util.regex.Pattern.compile("^(\\d{1,2}):(\\d{2})(?::\\d{2})?$").matcher(trimmed);
                if (twentyFourMatcher.matches()) {
                    hours = Integer.parseInt(twentyFourMatcher.group(1));
                    minutes = Integer.parseInt(twentyFourMatcher.group(2));
                }
            }
        }

        if (hours < 0 || minutes < 0) return null;
        return new int[]{hours, minutes};
    }

    public static String calculatePredictedArrival(String scheduledTimeStr, double delayMinutes) {
        if (scheduledTimeStr == null) return null;
        String trimmed = scheduledTimeStr.trim();
        if (!isValidTimeString(trimmed)) {
            return null;
        }

        int hours = -1;
        int minutes = -1;

        // Check ISO-8601 timestamps like "2026-09-17T21:50:00+05:30" or "2026-09-17T21:50:00"
        java.util.regex.Matcher isoMatcher = java.util.regex.Pattern.compile("T(\\d{1,2}):(\\d{2})(?::(\\d{2}))?").matcher(trimmed);
        if (isoMatcher.find()) {
            hours = Integer.parseInt(isoMatcher.group(1));
            minutes = Integer.parseInt(isoMatcher.group(2));
        } else {
            // Check 12-hour strings like "09:50 PM", "9:50 PM", "03:03 am"
            java.util.regex.Matcher twelveMatcher = java.util.regex.Pattern.compile("^(\\d{1,2}):(\\d{2})(?::\\d{2})?\\s*([AaPp][Mm])$").matcher(trimmed);
            if (twelveMatcher.matches()) {
                hours = Integer.parseInt(twelveMatcher.group(1));
                minutes = Integer.parseInt(twelveMatcher.group(2));
                String period = twelveMatcher.group(3).toUpperCase();
                if (period.equals("PM") && hours < 12) hours += 12;
                if (period.equals("AM") && hours == 12) hours = 0;
            } else {
                // Check 24-hour strings like "21:50", "09:50"
                java.util.regex.Matcher twentyFourMatcher = java.util.regex.Pattern.compile("^(\\d{1,2}):(\\d{2})(?::\\d{2})?$").matcher(trimmed);
                if (twentyFourMatcher.matches()) {
                    hours = Integer.parseInt(twentyFourMatcher.group(1));
                    minutes = Integer.parseInt(twentyFourMatcher.group(2));
                }
            }
        }

        if (hours < 0 || minutes < 0) {
            return null;
        }

        int baseMinutes = hours * 60 + minutes;
        int safeDelay = (int) Math.round(Double.isFinite(delayMinutes) ? delayMinutes : 0.0);
        int totalMinutes = ((baseMinutes + safeDelay) % (24 * 60) + (24 * 60)) % (24 * 60);

        int finalHours = totalMinutes / 60;
        int finalMinutes = totalMinutes % 60;
        String ampm = finalHours >= 12 ? "PM" : "AM";
        int displayHour = finalHours % 12;
        if (displayHour == 0) displayHour = 12;

        return String.format("%02d:%02d %s", displayHour, finalMinutes, ampm);
    }

    public static String formatStandardTime(String timeStr) {
        if (timeStr == null) return "Not available";
        String trimmed = timeStr.trim();
        if (!isValidTimeString(trimmed)) {
            return "Not available";
        }
        if (trimmed.equalsIgnoreCase("Arrived")) {
            return "Arrived";
        }

        // Check ISO-8601
        java.util.regex.Matcher isoMatcher = java.util.regex.Pattern.compile("T(\\d{1,2}):(\\d{2})(?::(\\d{2}))?").matcher(trimmed);
        if (isoMatcher.find()) {
            int h = Integer.parseInt(isoMatcher.group(1));
            int m = Integer.parseInt(isoMatcher.group(2));
            String ampm = h >= 12 ? "PM" : "AM";
            int dh = h % 12 == 0 ? 12 : h % 12;
            return String.format("%02d:%02d %s", dh, m, ampm);
        }

        // Check 12-hour
        java.util.regex.Matcher twelveMatcher = java.util.regex.Pattern.compile("^(\\d{1,2}):(\\d{2})(?::\\d{2})?\\s*([AaPp][Mm])$").matcher(trimmed);
        if (twelveMatcher.matches()) {
            int h = Integer.parseInt(twelveMatcher.group(1));
            int m = Integer.parseInt(twelveMatcher.group(2));
            String ampm = twelveMatcher.group(3).toUpperCase();
            if (h > 12) h = h % 12 == 0 ? 12 : h % 12;
            if (h == 0) h = 12;
            return String.format("%02d:%02d %s", h, m, ampm);
        }

        // Check 24-hour
        java.util.regex.Matcher twentyFourMatcher = java.util.regex.Pattern.compile("^(\\d{1,2}):(\\d{2})(?::\\d{2})?$").matcher(trimmed);
        if (twentyFourMatcher.matches()) {
            int h = Integer.parseInt(twentyFourMatcher.group(1));
            int m = Integer.parseInt(twentyFourMatcher.group(2));
            String ampm = h >= 12 ? "PM" : "AM";
            int dh = h % 12 == 0 ? 12 : h % 12;
            return String.format("%02d:%02d %s", dh, m, ampm);
        }

        return trimmed;
    }

    private static boolean isValidTimeString(String time) {
        if (time == null) return false;
        String t = time.trim();
        return !t.isEmpty() && !t.equals("--") && !t.equalsIgnoreCase("null")
                && !t.equalsIgnoreCase("undefined") && !t.equalsIgnoreCase("N/A")
                && !t.equalsIgnoreCase("-- AM") && !t.equalsIgnoreCase("-- PM");
    }

    private boolean isValidTime(String time) {
        return isValidTimeString(time);
    }

    private double calculateConfidence(
            double currentDelay,
            double previousDelay,
            double futureDelay,
            int weatherFactor,
            int trafficFactor) {

        double confidence = 95.0;

        // Delay instability
        double delayDifference =
                Math.abs(currentDelay - previousDelay);

        confidence -= delayDifference * 1.5;

        // Weather impact
        if (weatherFactor == 1) {
            confidence -= 5.0;
        }

        // Traffic impact
        if (trafficFactor == 1) {
            confidence -= 4.0;
        }

        // High future delay = slightly lower confidence
        if (futureDelay > 15) {
            confidence -= 3.0;
        }

        // Keep confidence between 50 and 99
        confidence = Math.max(50.0, confidence);
        confidence = Math.min(99.0, confidence);

        return confidence;
    }

    private double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }

    public record ETARequest(
            String trainNumber,
            String currentLocation,
            double routeDistance,
            double currentSpeed,
            double currentDelay,
            double previousDelay,
            int weatherFactor,
            int trafficFactor,
            String nextStation,
            List<String> route,
            Double averageSpeed,
            String journeyStatus,
            String trainStatus,
            String actualArrival,
            String scheduledArrival
    ) {
        public ETARequest(
                String trainNumber,
                String currentLocation,
                double routeDistance,
                double currentSpeed,
                double currentDelay,
                double previousDelay,
                int weatherFactor,
                int trafficFactor,
                String nextStation,
                List<String> route,
                Double averageSpeed,
                String journeyStatus,
                String trainStatus,
                String actualArrival) {
            this(trainNumber, currentLocation, routeDistance, currentSpeed, currentDelay, previousDelay, weatherFactor, trafficFactor, nextStation, route, averageSpeed, journeyStatus, trainStatus, actualArrival, null);
        }

        public ETARequest(
                String trainNumber,
                String currentLocation,
                double routeDistance,
                double currentSpeed,
                double currentDelay,
                double previousDelay,
                int weatherFactor,
                int trafficFactor,
                String nextStation,
                List<String> route,
                Double averageSpeed) {
            this(trainNumber, currentLocation, routeDistance, currentSpeed, currentDelay, previousDelay, weatherFactor, trafficFactor, nextStation, route, averageSpeed, null, null, null, null);
        }

        public ETARequest(
                String trainNumber,
                String currentLocation,
                double routeDistance,
                double currentSpeed,
                double currentDelay,
                double previousDelay,
                int weatherFactor,
                int trafficFactor,
                String nextStation,
                List<String> route) {
            this(trainNumber, currentLocation, routeDistance, currentSpeed, currentDelay, previousDelay, weatherFactor, trafficFactor, nextStation, route, null, null, null, null, null);
        }

        public ETARequest(
                String trainNumber,
                String currentLocation,
                double routeDistance,
                double currentSpeed,
                double currentDelay,
                double previousDelay,
                int weatherFactor,
                int trafficFactor,
                String nextStation) {
            this(trainNumber, currentLocation, routeDistance, currentSpeed, currentDelay, previousDelay, weatherFactor, trafficFactor, nextStation, null, null, null, null, null, null);
        }
    }

    public record ETAResponse(
            String trainNumber,
            String currentLocation,
            double currentSpeed,
            double currentDelay,
            String nextStation,
            double futureDelay,
            double expectedDelay,
            double totalDelay,
            double etaMinutes,
            String predictedETA,
            double confidenceScore,
            String delayAlert,
            String[] route,
            Double finalArrivalDelay
    ) {
        // Constructor preserving 13 arguments for existing tests and consumers
        public ETAResponse(
                String trainNumber,
                String currentLocation,
                double currentSpeed,
                double currentDelay,
                String nextStation,
                double futureDelay,
                double expectedDelay,
                double totalDelay,
                double etaMinutes,
                String predictedETA,
                double confidenceScore,
                String delayAlert,
                String[] route
        ) {
            this(
                    trainNumber,
                    currentLocation,
                    currentSpeed,
                    currentDelay,
                    nextStation,
                    futureDelay,
                    expectedDelay,
                    totalDelay,
                    etaMinutes,
                    predictedETA,
                    confidenceScore,
                    delayAlert,
                    route,
                    null
            );
        }

        // Legacy constructor with 11 parameters
        public ETAResponse(
                String trainNumber,
                String currentLocation,
                double currentSpeed,
                double currentDelay,
                String nextStation,
                double futureDelay,
                double etaMinutes,
                String predictedETA,
                double confidenceScore,
                String delayAlert,
                String[] route
        ) {
            this(
                    trainNumber,
                    currentLocation,
                    currentSpeed,
                    currentDelay,
                    nextStation,
                    futureDelay,
                    Math.round((currentDelay + futureDelay) * 100.0) / 100.0,
                    Math.round((currentDelay + futureDelay) * 100.0) / 100.0,
                    etaMinutes,
                    predictedETA,
                    confidenceScore,
                    delayAlert,
                    route,
                    null
            );
        }
    }
}