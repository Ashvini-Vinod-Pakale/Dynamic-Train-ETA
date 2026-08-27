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
        // 1. BASE TRAVEL TIME
        // ==========================================

        double baseTravelTime = 0.0;

        if (request.currentSpeed() > 0) {
            baseTravelTime =
                    (request.routeDistance()
                            / request.currentSpeed()) * 60.0;
        }

        // ==========================================
        // 2. ML FUTURE DELAY PREDICTION
        // ==========================================

        double futureDelay =
                futureDelayService.predictFutureDelay(
                        request.currentSpeed(),
                        request.currentDelay(),
                        request.previousDelay(),
                        request.weatherFactor(),
                        request.trafficFactor(),
                        request.routeDistance()
                );

        // ==========================================
        // 3. DYNAMIC ETA
        // ==========================================

        double dynamicETA =
                baseTravelTime
                        + request.currentDelay()
                        + futureDelay;

        // ==========================================
        // 4. PREDICTED ARRIVAL TIME
        // ==========================================

        LocalDateTime predictedArrival =
                LocalDateTime.now().plusSeconds(
                        Math.round(dynamicETA * 60.0)
                );

        DateTimeFormatter formatter =
                DateTimeFormatter.ofPattern("hh:mm a");

        String predictedArrivalTime =
                predictedArrival.format(formatter);

        // ==========================================
        // 5. CONFIDENCE SCORE
        // ==========================================

        double confidence =
                calculateConfidence(
                        request.currentDelay(),
                        request.previousDelay(),
                        futureDelay,
                        request.weatherFactor(),
                        request.trafficFactor()
                );

        // ==========================================
        // 6. DELAY ALERT
        // ==========================================

        String delayAlert;

        if (futureDelay >= 10.0) {

            delayAlert =
                    "Additional "
                            + round(futureDelay)
                            + " min delay predicted";

        } else if (futureDelay > 0.0) {

            delayAlert =
                    "Minor future delay predicted";

        } else {

            delayAlert =
                    "No additional delay predicted";
        }

        // ==========================================
        // 7. TRAIN ROUTE
        // ==========================================

        String[] route = {
                "Mumbai",
                "Pune",
                "Nashik Road",
                "Manmad"
        };

        // ==========================================
        // 8. RESPONSE
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
    // CONFIDENCE SCORE
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

        if (weatherFactor == 1) {
            confidence -= 5.0;
        }

        if (trafficFactor == 1) {
            confidence -= 4.0;
        }

        if (futureDelay > 15.0) {
            confidence -= 3.0;
        }

        confidence = Math.max(50.0, confidence);
        confidence = Math.min(99.0, confidence);

        return confidence;
    }

    // ==========================================
    // ROUND
    // ==========================================

    private double round(double value) {

        return Math.round(value * 100.0) / 100.0;
    }

    // ==========================================
    // REQUEST
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
    // RESPONSE
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