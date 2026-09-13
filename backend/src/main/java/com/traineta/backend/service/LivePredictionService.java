package com.traineta.backend.service;

import com.traineta.backend.FutureDelayService;
import com.traineta.backend.TrainStatus;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Service
public class LivePredictionService {

    private final FutureDelayService futureDelayService;

    public LivePredictionService(
            FutureDelayService futureDelayService) {

        this.futureDelayService = futureDelayService;
    }

    public TrainStatus predictFutureDelay(
            TrainStatus trainStatus) {

        // =====================================================
        // STEP 1: FUTURE DELAY PREDICTION
        // =====================================================

        double futureDelay =
                futureDelayService.predictFutureDelay(
                        trainStatus.getCurrentSpeed(),
                        trainStatus.getCurrentDelay(),
                        trainStatus.getPreviousDelay(),
                        trainStatus.getWeatherFactor(),
                        trainStatus.getTrafficFactor(),
                        trainStatus.getRouteDistance()
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
                trainStatus.getCurrentSpeed();

        double averageSpeed =
                trainStatus.getAverageSpeed();

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
                trainStatus.getRouteDistance();

        double currentDelay =
                trainStatus.getCurrentDelay();


        if (selectedSpeed > 0 && routeDistance >= 0) {

            // Travel time in minutes
            double travelTime =
                    (routeDistance / selectedSpeed) * 60.0;

            // Dynamic ETA
            double dynamicEta =
                    travelTime
                            + currentDelay
                            + futureDelay;


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
                    predictedEta
            );

        } else {

            // ETA cannot be calculated
            trainStatus.setPredictedEta("N/A");
        }


        // =====================================================
        // STEP 5: CONFIDENCE SCORE
        // =====================================================

        double confidence =
                calculateConfidence(
                        trainStatus.getCurrentDelay(),
                        trainStatus.getPreviousDelay(),
                        futureDelay,
                        trainStatus.getWeatherFactor(),
                        trainStatus.getTrafficFactor()
                );

        trainStatus.setConfidenceScore(
                round(confidence)
        );


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
}