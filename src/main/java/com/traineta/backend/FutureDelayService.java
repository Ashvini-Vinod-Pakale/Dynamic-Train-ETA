package com.traineta.backend;

import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;

@Service
public class FutureDelayService {

    // ==========================================
    // TRAINED ML MODEL WEIGHTS
    // ==========================================

    private double routeDistanceWeight;
    private double currentSpeedWeight;
    private double currentDelayWeight;
    private double previousDelayWeight;
    private double weatherFactorWeight;
    private double trafficFactorWeight;
    private double bias;

    // ==========================================
    // CONSTRUCTOR
    // ==========================================

    public FutureDelayService() {
        loadModel();
    }

    // ==========================================
    // LOAD ML MODEL
    // ==========================================

    private void loadModel() {

        try {

            ClassPathResource resource =
                    new ClassPathResource(
                            "models/future_delay_model.txt"
                    );

            try (BufferedReader reader =
                         new BufferedReader(
                                 new InputStreamReader(
                                         resource.getInputStream(),
                                         StandardCharsets.UTF_8
                                 )
                         )) {

                String line;

                while ((line = reader.readLine()) != null) {

                    line = line.trim();

                    if (line.isEmpty()) {
                        continue;
                    }

                    if (line.startsWith("RouteDistance=")) {

                        routeDistanceWeight =
                                getValue(line);

                    } else if (line.startsWith("CurrentSpeed=")) {

                        currentSpeedWeight =
                                getValue(line);

                    } else if (line.startsWith("CurrentDelay=")) {

                        currentDelayWeight =
                                getValue(line);

                    } else if (line.startsWith("PreviousDelay=")) {

                        previousDelayWeight =
                                getValue(line);

                    } else if (line.startsWith("WeatherFactor=")) {

                        weatherFactorWeight =
                                getValue(line);

                    } else if (line.startsWith("TrafficFactor=")) {

                        trafficFactorWeight =
                                getValue(line);

                    } else if (line.startsWith("Bias=")) {

                        bias =
                                getValue(line);
                    }
                }
            }

            System.out.println(
                    "========================================"
            );

            System.out.println(
                    "TRAINED ML MODEL LOADED SUCCESSFULLY"
            );

            System.out.println(
                    "RouteDistance Weight : "
                            + routeDistanceWeight
            );

            System.out.println(
                    "CurrentSpeed Weight  : "
                            + currentSpeedWeight
            );

            System.out.println(
                    "CurrentDelay Weight  : "
                            + currentDelayWeight
            );

            System.out.println(
                    "PreviousDelay Weight : "
                            + previousDelayWeight
            );

            System.out.println(
                    "WeatherFactor Weight : "
                            + weatherFactorWeight
            );

            System.out.println(
                    "TrafficFactor Weight : "
                            + trafficFactorWeight
            );

            System.out.println(
                    "Bias                 : "
                            + bias
            );

            System.out.println(
                    "========================================"
            );

        } catch (IOException e) {

            throw new RuntimeException(
                    "Failed to load future delay ML model",
                    e
            );
        }
    }

    // ==========================================
    // READ VALUE
    // ==========================================

    private double getValue(String line) {

        String value =
                line.substring(
                        line.indexOf("=") + 1
                ).trim();

        return Double.parseDouble(value);
    }

    // ==========================================
    // FUTURE DELAY PREDICTION
    // ==========================================

    public double predictFutureDelay(
            double currentSpeed,
            double currentDelay,
            double previousDelay,
            int weatherFactor,
            int trafficFactor,
            double routeDistance) {

        double prediction = bias;

        prediction +=
                routeDistanceWeight
                        * routeDistance;

        prediction +=
                currentSpeedWeight
                        * currentSpeed;

        prediction +=
                currentDelayWeight
                        * currentDelay;

        prediction +=
                previousDelayWeight
                        * previousDelay;

        prediction +=
                weatherFactorWeight
                        * weatherFactor;

        prediction +=
                trafficFactorWeight
                        * trafficFactor;

        // Future delay cannot be negative
        return Math.max(0.0, prediction);
    }
}