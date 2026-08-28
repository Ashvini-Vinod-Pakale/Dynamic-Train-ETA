package com.traineta.backend;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.concurrent.atomic.AtomicBoolean;

@Service
public class TrainSimulationService {

    private final AtomicBoolean running = new AtomicBoolean(false);

    private final SimpMessagingTemplate messagingTemplate;
    private final FutureDelayService futureDelayService;

    public TrainSimulationService(
            SimpMessagingTemplate messagingTemplate,
            FutureDelayService futureDelayService) {

        this.messagingTemplate = messagingTemplate;
        this.futureDelayService = futureDelayService;
    }

    // ==========================================
    // TRAIN DATA
    // ==========================================

    private String trainNumber = "12123";
    private String currentLocation = "Nashik Road";
    private String nextStation = "Manmad";

    private double latitude = 19.9975;
    private double longitude = 73.7898;

    private double currentSpeed = 68.0;
    private double currentDelay = 18.0;
    private double previousDelay = 15.0;

    private int weatherFactor = 0;
    private int trafficFactor = 0;

    // ==========================================
    // PREDICTION DATA
    // ==========================================

    private double futureDelay = 0.0;
    private double etaMinutes = 0.0;
    private double confidenceScore = 0.0;

    private String predictedETA = "";
    private String delayAlert = "";

    // Example route distance
    private double routeDistance = 120.0;

    // ==========================================
    // START SIMULATION
    // ==========================================

    public synchronized void startSimulation() {

        if (running.get()) {
            return;
        }

        running.set(true);

        Thread simulationThread = new Thread(() -> {

            while (running.get()) {

                try {

                    // 1. Update simulation data
                    updateTrainData();

                    // 2. ML + ETA prediction
                    calculateDynamicETA();

                    // 3. Send complete live data
                    messagingTemplate.convertAndSend(
                            "/topic/train-status",
                            getStatus()
                    );

                    Thread.sleep(10000);

                } catch (InterruptedException e) {

                    Thread.currentThread().interrupt();
                    running.set(false);
                }
            }

        });

        simulationThread.setDaemon(true);
        simulationThread.start();
    }

    // ==========================================
    // STOP SIMULATION
    // ==========================================

    public void stopSimulation() {

        running.set(false);

        messagingTemplate.convertAndSend(
                "/topic/train-status",
                getStatus()
        );
    }

    // ==========================================
    // UPDATE SIMULATION DATA
    // ==========================================

    private synchronized void updateTrainData() {

        // Previous delay becomes current delay
        previousDelay = currentDelay;

        // ----------------------------------------
        // SPEED SIMULATION
        // ----------------------------------------

        double speedChange =
                (Math.random() * 10.0) - 5.0;

        currentSpeed += speedChange;

        currentSpeed =
                Math.max(
                        30.0,
                        Math.min(100.0, currentSpeed)
                );

        // ----------------------------------------
        // DELAY SIMULATION
        // ----------------------------------------

        double delayChange =
                (Math.random() * 4.0) - 2.0;

        currentDelay += delayChange;

        currentDelay =
                Math.max(0.0, currentDelay);

        // ----------------------------------------
        // GPS SIMULATION
        // ----------------------------------------

        double movement =
                currentSpeed / 360000.0;

        latitude += movement;
        longitude += movement;

        // ----------------------------------------
        // LOCATION SIMULATION
        // ----------------------------------------

        if (latitude < 19.70) {

            currentLocation = "Igatpuri";

        } else if (latitude < 20.10) {

            currentLocation = "Nashik Road";

        } else {

            currentLocation = "Manmad";
        }

        // ----------------------------------------
        // WEATHER SIMULATION
        // ----------------------------------------

        weatherFactor =
                Math.random() < 0.15 ? 1 : 0;

        // ----------------------------------------
        // TRAFFIC SIMULATION
        // ----------------------------------------

        trafficFactor =
                Math.random() < 0.20 ? 1 : 0;

        // ----------------------------------------
        // CONSOLE
        // ----------------------------------------

        System.out.println(
                "========================================"
        );

        System.out.println(
                "REAL-TIME TRAIN SIMULATION"
        );

        System.out.println(
                "Train Number   : " + trainNumber
        );

        System.out.println(
                "Location       : " + currentLocation
        );

        System.out.println(
                "Latitude       : " + round(latitude)
        );

        System.out.println(
                "Longitude      : " + round(longitude)
        );

        System.out.println(
                "Speed          : "
                        + round(currentSpeed)
                        + " km/h"
        );

        System.out.println(
                "Current Delay  : "
                        + round(currentDelay)
                        + " min"
        );

        System.out.println(
                "Previous Delay : "
                        + round(previousDelay)
                        + " min"
        );

        System.out.println(
                "Weather        : " + weatherFactor
        );

        System.out.println(
                "Traffic        : " + trafficFactor
        );

        System.out.println(
                "Next Station   : " + nextStation
        );

        System.out.println(
                "========================================"
        );
    }

    // ==========================================
    // ML + DYNAMIC ETA
    // ==========================================

    private synchronized void calculateDynamicETA() {

        // ----------------------------------------
        // 1. ML FUTURE DELAY
        // ----------------------------------------

        futureDelay =
                futureDelayService.predictFutureDelay(
                        currentSpeed,
                        currentDelay,
                        previousDelay,
                        weatherFactor,
                        trafficFactor,
                        routeDistance
                );

        // ----------------------------------------
        // 2. BASE TRAVEL TIME
        // ----------------------------------------

        double baseTravelTime = 0.0;

        if (currentSpeed > 0) {

            baseTravelTime =
                    (routeDistance / currentSpeed) * 60.0;
        }

        // ----------------------------------------
        // 3. DYNAMIC ETA
        // ----------------------------------------

        etaMinutes =
                baseTravelTime
                        + currentDelay
                        + futureDelay;

        // ----------------------------------------
        // 4. PREDICTED ARRIVAL TIME
        // ----------------------------------------

        LocalDateTime predictedArrival =
                LocalDateTime.now().plusSeconds(
                        Math.round(etaMinutes * 60.0)
                );

        DateTimeFormatter formatter =
                DateTimeFormatter.ofPattern("hh:mm a");

        predictedETA =
                predictedArrival.format(formatter);

        // ----------------------------------------
        // 5. CONFIDENCE SCORE
        // ----------------------------------------

        confidenceScore =
                calculateConfidence();

        // ----------------------------------------
        // 6. DELAY ALERT
        // ----------------------------------------

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

        // ----------------------------------------
        // DISPLAY PREDICTION
        // ----------------------------------------

        System.out.println(
                "ML FUTURE DELAY : "
                        + round(futureDelay)
                        + " min"
        );

        System.out.println(
                "DYNAMIC ETA     : "
                        + round(etaMinutes)
                        + " min"
        );

        System.out.println(
                "PREDICTED ETA   : "
                        + predictedETA
        );

        System.out.println(
                "CONFIDENCE      : "
                        + round(confidenceScore)
                        + "%"
        );

        System.out.println(
                "ALERT           : "
                        + delayAlert
        );

        System.out.println(
                "========================================"
        );
    }

    // ==========================================
    // CONFIDENCE
    // ==========================================

    private double calculateConfidence() {

        double confidence = 95.0;

        double delayDifference =
                Math.abs(
                        currentDelay
                                - previousDelay
                );

        confidence -=
                delayDifference * 1.5;

        if (weatherFactor == 1) {
            confidence -= 5.0;
        }

        if (trafficFactor == 1) {
            confidence -= 4.0;
        }

        if (futureDelay > 15.0) {
            confidence -= 3.0;
        }

        confidence =
                Math.max(50.0, confidence);

        confidence =
                Math.min(99.0, confidence);

        return confidence;
    }

    // ==========================================
    // GET LIVE STATUS
    // ==========================================

    public synchronized SimulationStatus getStatus() {

        return new SimulationStatus(

                running.get(),

                trainNumber,

                currentLocation,

                latitude,
                longitude,

                currentSpeed,
                currentDelay,
                previousDelay,

                weatherFactor,
                trafficFactor,

                nextStation,

                futureDelay,
                etaMinutes,

                predictedETA,

                confidenceScore,

                delayAlert
        );
    }

    // ==========================================
    // ROUND
    // ==========================================

    private double round(double value) {

        return Math.round(value * 100.0) / 100.0;
    }

    // ==========================================
    // SIMULATION RESPONSE
    // ==========================================

    public record SimulationStatus(

            boolean running,

            String trainNumber,

            String currentLocation,

            double latitude,
            double longitude,

            double currentSpeed,
            double currentDelay,
            double previousDelay,

            int weatherFactor,
            int trafficFactor,

            String nextStation,

            double futureDelay,
            double etaMinutes,

            String predictedETA,

            double confidenceScore,

            String delayAlert

    ) {
    }
}