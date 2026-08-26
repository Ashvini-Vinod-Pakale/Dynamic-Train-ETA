package com.traineta.backend;

import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class ETAController {

    @PostMapping("/predict/eta")
    public ETAResponse predictETA(
            @RequestBody ETARequest request) {

        // Base travel time in minutes
        double baseTravelTime =
                (request.routeDistance() / request.currentSpeed()) * 60;

        // Future delay prediction
        double futureDelay =
                (request.currentDelay() * 0.40)
                + (request.previousDelay() * 0.30)
                + (request.currentSpeed() * -0.10)
                + (request.weatherFactor() * 2.00)
                + (request.trafficFactor() * 3.00);

        // Future delay cannot be negative
        futureDelay = Math.max(0, futureDelay);

        // Dynamic ETA duration in minutes
        double dynamicETA =
                baseTravelTime
                + request.currentDelay()
                + futureDelay;

        // Actual predicted arrival clock time
        LocalDateTime predictedArrival =
                LocalDateTime.now().plusSeconds(
                        Math.round(dynamicETA * 60)
                );

        DateTimeFormatter timeFormatter =
                DateTimeFormatter.ofPattern("hh:mm a");

        String predictedArrivalTime =
                predictedArrival.format(timeFormatter);

        // Confidence score
        double confidence = calculateConfidence(
                request.currentDelay(),
                request.previousDelay(),
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

        // Train route
        String[] route = {
                "Mumbai",
                "Pune",
                "Nashik Road",
                "Manmad"
        };

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
            String nextStation
    ) {}

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