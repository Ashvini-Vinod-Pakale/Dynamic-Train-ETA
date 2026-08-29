package com.traineta.backend;

import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/api")
@CrossOrigin(
        origins = "http://localhost:5173",
        methods = {
                RequestMethod.GET,
                RequestMethod.POST,
                RequestMethod.PUT,
                RequestMethod.DELETE,
                RequestMethod.OPTIONS
        }
)
public class FutureDelayController {

    private static final double CURRENT_DELAY_WEIGHT = 0.40;
    private static final double PREVIOUS_DELAY_WEIGHT = 0.30;
    private static final double SPEED_WEIGHT = -0.10;
    private static final double WEATHER_WEIGHT = 2.00;
    private static final double TRAFFIC_WEIGHT = 3.00;

    // =========================================
    // FUTURE DELAY PREDICTION
    // =========================================

    @PostMapping("/predict/future-delay")
    public PredictionResponse predict(
            @RequestBody PredictionRequest request) {

        double prediction =
                (request.currentDelay() * CURRENT_DELAY_WEIGHT)
                + (request.previousDelay() * PREVIOUS_DELAY_WEIGHT)
                + (request.currentSpeed() * SPEED_WEIGHT)
                + (request.weatherFactor() * WEATHER_WEIGHT)
                + (request.trafficFactor() * TRAFFIC_WEIGHT);

        prediction = Math.max(0, prediction);

        prediction =
                Math.round(prediction * 100.0) / 100.0;

        return new PredictionResponse(prediction);
    }

    // =========================================
    // STATION-WISE PREDICTION
    // =========================================

    @PostMapping("/predict/station-wise")
    public StationWiseResponse predictStationWise(
            @RequestBody StationWiseRequest request) {

        double currentDelay = request.currentDelay();

        double additionalDelay =
                calculateFutureDelay(
                        request.currentSpeed(),
                        request.currentDelay(),
                        request.previousDelay(),
                        request.weatherFactor(),
                        request.trafficFactor()
                );

        /*
         * Keep predictions realistic and dynamic.
         */

        double manmadDelay =
                currentDelay + additionalDelay;

        double dadarDelay =
                manmadDelay + 3.0;

        double mumbaiDelay =
                manmadDelay + 3.0;

        manmadDelay = round(manmadDelay);
        dadarDelay = round(dadarDelay);
        mumbaiDelay = round(mumbaiDelay);

        List<StationPrediction> predictions =
                new ArrayList<>();

        // =========================================
        // MANMAD
        // =========================================

        predictions.add(
                new StationPrediction(
                        "Manmad",
                        "10:10 AM",
                        manmadDelay,
                        calculatePredictedTime(
                                "10:10 AM",
                                manmadDelay
                        )
                )
        );

        // =========================================
        // DADAR
        // =========================================

        predictions.add(
                new StationPrediction(
                        "Dadar",
                        "10:58 AM",
                        dadarDelay,
                        calculatePredictedTime(
                                "10:58 AM",
                                dadarDelay
                        )
                )
        );

        // =========================================
        // MUMBAI CST
        // =========================================

        predictions.add(
                new StationPrediction(
                        "Mumbai CST",
                        "11:38 AM",
                        mumbaiDelay,
                        calculatePredictedTime(
                                "11:38 AM",
                                mumbaiDelay
                        )
                )
        );

        return new StationWiseResponse(
                request.trainNumber(),
                predictions
        );
    }

    // =========================================
    // CALCULATE FUTURE DELAY
    // =========================================

    private double calculateFutureDelay(
            double currentSpeed,
            double currentDelay,
            double previousDelay,
            int weatherFactor,
            int trafficFactor) {

        double prediction =
                (currentDelay * CURRENT_DELAY_WEIGHT)
                + (previousDelay * PREVIOUS_DELAY_WEIGHT)
                + (currentSpeed * SPEED_WEIGHT)
                + (weatherFactor * WEATHER_WEIGHT)
                + (trafficFactor * TRAFFIC_WEIGHT);

        return Math.max(0, prediction);
    }

    // =========================================
    // CALCULATE PREDICTED TIME
    // =========================================

    private String calculatePredictedTime(
            String scheduledTime,
            double delayMinutes) {

        try {

            String[] parts =
                    scheduledTime
                            .replace("AM", "")
                            .replace("PM", "")
                            .trim()
                            .split(":");

            int hour =
                    Integer.parseInt(parts[0]);

            int minute =
                    Integer.parseInt(parts[1]);

            boolean isPM =
                    scheduledTime
                            .toUpperCase()
                            .contains("PM");

            if (isPM && hour != 12) {
                hour += 12;
            }

            if (!isPM && hour == 12) {
                hour = 0;
            }

            int totalMinutes =
                    hour * 60
                    + minute
                    + (int) Math.round(delayMinutes);

            totalMinutes =
                    totalMinutes % (24 * 60);

            int resultHour =
                    totalMinutes / 60;

            int resultMinute =
                    totalMinutes % 60;

            String period =
                    resultHour >= 12
                            ? "PM"
                            : "AM";

            int displayHour =
                    resultHour % 12;

            if (displayHour == 0) {
                displayHour = 12;
            }

            return String.format(
                    "%02d:%02d %s",
                    displayHour,
                    resultMinute,
                    period
            );

        } catch (Exception e) {

            return scheduledTime;
        }
    }

    // =========================================
    // ROUND
    // =========================================

    private double round(double value) {

        return Math.round(value * 100.0) / 100.0;
    }

    // =========================================
    // REQUEST: FUTURE DELAY
    // =========================================

    public record PredictionRequest(

            double currentSpeed,

            double currentDelay,

            double previousDelay,

            int weatherFactor,

            int trafficFactor

    ) {}

    // =========================================
    // RESPONSE: FUTURE DELAY
    // =========================================

    public record PredictionResponse(

            double predictedFutureDelay

    ) {}

    // =========================================
    // REQUEST: STATION-WISE
    // =========================================

    public record StationWiseRequest(

            String trainNumber,

            String currentLocation,

            double currentSpeed,

            double currentDelay,

            double previousDelay,

            int weatherFactor,

            int trafficFactor

    ) {}

    // =========================================
    // RESPONSE: STATION-WISE
    // =========================================

    public record StationWiseResponse(

            String trainNumber,

            List<StationPrediction> stationPredictions

    ) {}

    // =========================================
    // STATION PREDICTION
    // =========================================

    public record StationPrediction(

            String station,

            String scheduledTime,

            double predictedDelay,

            String predictedETA

    ) {}
}