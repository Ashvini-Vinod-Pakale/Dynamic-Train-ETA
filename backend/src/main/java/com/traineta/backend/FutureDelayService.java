package com.traineta.backend;

import org.springframework.stereotype.Service;

@Service
public class FutureDelayService {

    private static final double CURRENT_DELAY_WEIGHT = 0.40;
    private static final double PREVIOUS_DELAY_WEIGHT = 0.30;
    private static final double SPEED_WEIGHT = -0.10;
    private static final double WEATHER_WEIGHT = 2.00;
    private static final double TRAFFIC_WEIGHT = 3.00;

    public double predictFutureDelay(
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
}