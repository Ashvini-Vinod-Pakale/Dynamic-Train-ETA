package com.traineta.backend.service;

import com.traineta.backend.FutureDelayService;
import com.traineta.backend.TrainStatus;
import com.traineta.backend.repository.PredictionHistory;
import com.traineta.backend.repository.PredictionHistoryRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Service
public class LivePredictionService {

    private final FutureDelayService futureDelayService;
    private final PredictionHistoryRepository predictionHistoryRepository;
    public LivePredictionService(
        FutureDelayService futureDelayService,
        PredictionHistoryRepository predictionHistoryRepository) {

    this.futureDelayService = futureDelayService;
    this.predictionHistoryRepository = predictionHistoryRepository;
}
    public TrainStatus predictFutureDelay(
            TrainStatus trainStatus) {

        // =====================================================
        // STEP 1: FUTURE DELAY PREDICTION
        // =====================================================

        double currentSpeedVal =
                trainStatus.getCurrentSpeed() != null
                        ? trainStatus.getCurrentSpeed()
                        : 0.0;

        double currentDelayVal =
                trainStatus.getCurrentDelay() != null
                        ? trainStatus.getCurrentDelay()
                        : 0.0;

        double previousDelayVal =
                trainStatus.getPreviousDelay() != null
                        ? trainStatus.getPreviousDelay()
                        : 0.0;

        int weatherFactorVal =
                trainStatus.getWeatherFactor() != null
                        ? trainStatus.getWeatherFactor()
                        : 0;

        int trafficFactorVal =
                trainStatus.getTrafficFactor() != null
                        ? trainStatus.getTrafficFactor()
                        : 0;

        double routeDistanceVal =
                trainStatus.getRouteDistance() != null
                        ? trainStatus.getRouteDistance()
                        : 0.0;

        double futureDelay =
                futureDelayService.predictFutureDelay(
                        currentSpeedVal,
                        currentDelayVal,
                        previousDelayVal,
                        weatherFactorVal,
                        trafficFactorVal,
                        routeDistanceVal
                );

        trainStatus.setFutureDelay(
                round(futureDelay)
        );


        // =====================================================
        // STEP 2: DELAY ALERT
        // =====================================================

        if (futureDelay >= 10.0) {

            trainStatus.setDelayAlert(
                    "Additional "
                            + round(futureDelay)
                            + " min delay predicted"
            );

        } else if (futureDelay > 0.0) {

            trainStatus.setDelayAlert(
                    "Minor future delay predicted"
            );

        } else {

            trainStatus.setDelayAlert(
                    "No additional delay predicted"
            );
        }


        // =====================================================
        // STEP 3: SELECT SPEED FOR ETA
        // =====================================================

        double currentSpeed =
                trainStatus.getCurrentSpeed() != null
                        ? trainStatus.getCurrentSpeed()
                        : 0.0;

        double averageSpeed =
                trainStatus.getAverageSpeed() != null
                        ? trainStatus.getAverageSpeed()
                        : 0.0;

        double selectedSpeed;

        if (currentSpeed > 0) {

            // Train is currently moving
            selectedSpeed = currentSpeed;

        } else {

            // Train is stopped / not started
            // Use average speed as fallback
            selectedSpeed = averageSpeed;
        }


        // =====================================================
        // STEP 4: DYNAMIC ETA CALCULATION
        // =====================================================

        double routeDistance =
                trainStatus.getRouteDistance() != null
                        ? trainStatus.getRouteDistance()
                        : 0.0;

        double currentDelay =
                trainStatus.getCurrentDelay() != null
                        ? trainStatus.getCurrentDelay()
                        : 0.0;


        // Determine if train journey has reached destination / completed
        boolean isCompleted = isJourneyCompleted(trainStatus);
        double etaMinutes = 0.0;
        if (isCompleted) {
            // Train has already arrived at destination
            String actualArrival = resolveActualDestinationArrival(trainStatus);
            String schedArrival = resolveScheduledDestinationArrival(trainStatus);
            Double finalArrivalDelay = calculateFinalArrivalDelay(schedArrival, actualArrival);
            if (finalArrivalDelay != null) {
                trainStatus.setFinalArrivalDelay(round(finalArrivalDelay));
            } else {
                trainStatus.setFinalArrivalDelay(null);
            }

            if (isValidTime(actualArrival)) {
                trainStatus.setPredictedEta(formatStandardTime(actualArrival));
            } else {
                trainStatus.setPredictedEta("Arrived");
            }
        } else {
            trainStatus.setFinalArrivalDelay(null);
            String schedArrival = resolveScheduledDestinationArrival(trainStatus);
            double totalDelay = currentDelay + futureDelay;
            boolean calculatedFromSchedule = false;

            if (schedArrival != null) {
                String calculatedArrival = calculatePredictedArrival(schedArrival, totalDelay);
                if (calculatedArrival != null) {
                    trainStatus.setPredictedEta(calculatedArrival);
                      int[] predictedParts = parseTimeParts(calculatedArrival);
    if (predictedParts != null) {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime predictedDateTime = now
                .withHour(predictedParts[0])
                .withMinute(predictedParts[1])
                .withSecond(0)
                .withNano(0);

        if (predictedDateTime.isBefore(now)) {
            predictedDateTime = predictedDateTime.plusDays(1);
        }

        etaMinutes = java.time.Duration
                .between(now, predictedDateTime)
                .toSeconds() / 60.0;
    }
                    calculatedFromSchedule = true;
                }
            }

            if (!calculatedFromSchedule) {
                if (selectedSpeed > 0 && routeDistance >= 0) {
                    // Travel time in minutes
                    double travelTime =
                            (routeDistance / selectedSpeed) * 60.0;

                    // Dynamic ETA
                    double dynamicEta =
                            travelTime
                                    + currentDelay
                                    + futureDelay;
                    etaMinutes = dynamicEta;
                    // Calculate predicted arrival time
                    LocalDateTime predictedArrival =
                            LocalDateTime.now().plusSeconds(
                                    Math.round(dynamicEta * 60.0)
                            );

                    DateTimeFormatter formatter =
                            DateTimeFormatter.ofPattern("hh:mm a");

                    String predictedEta =
                            predictedArrival.format(formatter);

                    trainStatus.setPredictedEta(
                            formatStandardTime(predictedEta)
                    );
                } else {
                    // ETA cannot be calculated
                    trainStatus.setPredictedEta("N/A");
                }
            }
        }


        // =====================================================
        // STEP 5: CONFIDENCE SCORE
        // =====================================================

        double confidence =
                calculateConfidence(
                        currentDelayVal,
                        previousDelayVal,
                        futureDelay,
                        weatherFactorVal,
                        trafficFactorVal
                );

        trainStatus.setConfidenceScore(
                round(confidence)
        );
        PredictionHistory history = new PredictionHistory();

        history.setTrainNumber(trainStatus.getTrainNumber());
        history.setCurrentLocation(trainStatus.getCurrentLocation());
        history.setNextStation(trainStatus.getNextStation());
        history.setCurrentSpeed(currentSpeedVal);
        history.setCurrentDelay(currentDelayVal);
        history.setFutureDelay(futureDelay);
        history.setEtaMinutes(etaMinutes);
        history.setConfidenceScore(round(confidence));
        history.setPredictedEta(trainStatus.getPredictedEta());
        history.setDelayAlert(trainStatus.getDelayAlert());

        predictionHistoryRepository.save(history);


        return trainStatus;
    }


    // =========================================================
    // CONFIDENCE CALCULATION
    // =========================================================

    private double calculateConfidence(
            double currentDelay,
            double previousDelay,
            double futureDelay,
            int weatherFactor,
            int trafficFactor) {

        double confidence = 95.0;


        // Difference between previous and current delay
        double delayDifference =
                Math.abs(
                        currentDelay - previousDelay
                );

        confidence -=
                delayDifference * 1.5;


        // Weather impact
        if (weatherFactor == 1) {
            confidence -= 5.0;
        }


        // Traffic / operational impact
        if (trafficFactor == 1) {
            confidence -= 4.0;
        }


        // High predicted delay
        if (futureDelay > 15.0) {
            confidence -= 3.0;
        }


        // Minimum confidence
        confidence =
                Math.max(
                        50.0,
                        confidence
                );


        // Maximum confidence
        confidence =
                Math.min(
                        99.0,
                        confidence
                );


        return confidence;
    }


    // =========================================================
    // ROUNDING
    // =========================================================

    private double round(double value) {

        return Math.round(value * 100.0) / 100.0;
    }

    private boolean isJourneyCompleted(TrainStatus trainStatus) {
        if (trainStatus == null) return false;
        if (isCompletedStatus(trainStatus.getTrainStatus())) {
            return true;
        }
        if (trainStatus.getDestination() != null && !trainStatus.getDestination().trim().isEmpty()
                && trainStatus.getCurrentLocation() != null && !trainStatus.getCurrentLocation().trim().isEmpty()) {
            if (trainStatus.getDestination().trim().equalsIgnoreCase(trainStatus.getCurrentLocation().trim())) {
                return true;
            }
        }
        if (trainStatus.getRoute() != null && !trainStatus.getRoute().isEmpty()) {
            var lastStop = trainStatus.getRoute().get(trainStatus.getRoute().size() - 1);
            if (lastStop.getStationName() != null && trainStatus.getCurrentLocation() != null
                    && lastStop.getStationName().trim().equalsIgnoreCase(trainStatus.getCurrentLocation().trim())) {
                return true;
            }
            if (lastStop.getStatus() != null && isCompletedStatus(lastStop.getStatus())) {
                return true;
            }
        }
        return false;
    }

    private boolean isCompletedStatus(String status) {
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

    private String resolveActualDestinationArrival(TrainStatus trainStatus) {
        if (trainStatus == null) return null;
        if (trainStatus.getRoute() != null && !trainStatus.getRoute().isEmpty()) {
            var lastStop = trainStatus.getRoute().get(trainStatus.getRoute().size() - 1);
            if (lastStop.getActualArrival() != null && isValidTime(lastStop.getActualArrival())) {
                return lastStop.getActualArrival().trim();
            }
        }
        return null;
    }

    private String resolveScheduledDestinationArrival(TrainStatus trainStatus) {
        if (trainStatus == null) return null;
        if (trainStatus.getRoute() != null && !trainStatus.getRoute().isEmpty()) {
            var lastStop = trainStatus.getRoute().get(trainStatus.getRoute().size() - 1);
            if (lastStop.getScheduledArrival() != null && isValidTime(lastStop.getScheduledArrival())) {
                return lastStop.getScheduledArrival().trim();
            }
        }
        return null;
    }

    /**
     * Calculates the final destination arrival delay for a completed journey:
     * finalArrivalDelay = actualArrival - scheduledArrival
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
        java.util.regex.Matcher twelveMatcher = java.util.regex.Pattern.compile("^(\\d{1,2}):(\\d{2})(?::(\\d{2}))?\\s*([AaPp][Mm])$").matcher(trimmed);
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
}
