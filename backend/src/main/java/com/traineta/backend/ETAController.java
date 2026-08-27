package com.traineta.backend;

import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class ETAController {

    private final FutureDelayService futureDelayService;

    public ETAController(FutureDelayService futureDelayService) {
        this.futureDelayService = futureDelayService;
    }

    @PostMapping("/predict/eta")
    public ETAResponse predictETA(
            @RequestBody ETARequest request) {

        // ==========================================
        // STEP 5: IMPROVED DYNAMIC ETA CALCULATION
        // ==========================================

        // Base travel time in minutes
        double baseTravelTime;

        // Prevent division by zero when train speed is 0
        if (request.currentSpeed() > 0) {
            baseTravelTime =
                    (request.routeDistance() / request.currentSpeed()) * 60;
        } else {
            baseTravelTime = 0;
        }

        // Future delay prediction using AI/ML service
        double futureDelay =
                futureDelayService.predictFutureDelay(
                        request.currentSpeed(),
                        request.currentDelay(),
                        request.previousDelay(),
                        request.weatherFactor(),
                        request.trafficFactor()
                );

        // ==========================================
        // DYNAMIC ETA
        // Base Travel Time
        // + Current Delay
        // + Predicted Future Delay
        // ==========================================

        double dynamicETA =
                baseTravelTime
                + request.currentDelay()
                + futureDelay;

        // Predicted arrival clock time
        LocalDateTime predictedArrival =
                LocalDateTime.now().plusSeconds(
                        Math.round(dynamicETA * 60)
                );

        DateTimeFormatter timeFormatter =
                DateTimeFormatter.ofPattern("hh:mm a");

        String predictedArrivalTime =
                predictedArrival.format(timeFormatter);

        // ==========================================
        // CONFIDENCE SCORE
        // ==========================================

        double confidence = calculateConfidence(
                request.currentDelay(),
                request.previousDelay(),
                futureDelay,
                request.weatherFactor(),
                request.trafficFactor()
        );

        // ==========================================
        // DELAY ALERT
        // ==========================================

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

        // ==========================================
        // TRAIN ROUTE
        // ==========================================

        String[] route = {
                "Mumbai",
                "Pune",
                "Nashik Road",
                "Manmad"
        };

        // ==========================================
        // FINAL RESPONSE
        // ==========================================

        return new ETAResponse(
                request.trainNumber(),
                request.currentLocation(),
                request.currentSpeed(),
                request.currentDelay(),
                request.nextStation(),
                round(futureDelay),
                round(dynamicETA),
                predictedArrivalTime,
                round(confidence),
                delayAlert,
                route
        );
    }

    // ==========================================
    // CONFIDENCE SCORE CALCULATION
    // ==========================================

    private double calculateConfidence(
            double currentDelay,
            double previousDelay,
            double futureDelay,
            int weatherFactor,
            int trafficFactor) {

        double confidence = 95.0;

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

        // High future delay reduces confidence
        if (futureDelay > 15) {
            confidence -= 3.0;
        }

        // Keep confidence between 50% and 99%
        confidence = Math.max(50.0, confidence);
        confidence = Math.min(99.0, confidence);

        return confidence;
    }

    // ==========================================
    // ROUND VALUE
    // ==========================================

    private double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }

    // ==========================================
    // ETA REQUEST
    // ==========================================

    public record ETARequest(
            String trainNumber,
            String currentLocation,
            double routeDistance,
            double currentSpeed,
            double currentDelay,
            double previousDelay,
            int weatherFactor,
            int trafficFactor,
            String nextStation
    ) {}

    // ==========================================
    // ETA RESPONSE
    // ==========================================

    public record ETAResponse(
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
    ) {}
}