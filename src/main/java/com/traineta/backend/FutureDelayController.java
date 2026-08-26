package com.traineta.backend;

import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class FutureDelayController {

    private static final double CURRENT_DELAY_WEIGHT = 0.40;
    private static final double PREVIOUS_DELAY_WEIGHT = 0.30;
    private static final double SPEED_WEIGHT = -0.10;
    private static final double WEATHER_WEIGHT = 2.00;
    private static final double TRAFFIC_WEIGHT = 3.00;

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

        prediction = Math.round(prediction * 100.0) / 100.0;

        return new PredictionResponse(prediction);
    }

    public record PredictionRequest(
            double currentSpeed,
            double currentDelay,
            double previousDelay,
            int weatherFactor,
            int trafficFactor
    ) {}

    public record PredictionResponse(
            double predictedFutureDelay
    ) {}
}