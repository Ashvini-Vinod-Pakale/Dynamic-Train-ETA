package com.traineta.backend;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.concurrent.atomic.AtomicBoolean;

@Service
public class TrainSimulationService {

    private final AtomicBoolean running = new AtomicBoolean(false);

    private final SimpMessagingTemplate messagingTemplate;

    public TrainSimulationService(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

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

    public synchronized void startSimulation() {

        if (running.get()) {
            return;
        }

        running.set(true);

        Thread simulationThread = new Thread(() -> {

            while (running.get()) {

                try {

                    updateTrainData();

                    // Send live train data through WebSocket
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

    public void stopSimulation() {

        running.set(false);

        // Notify frontend that simulation stopped
        messagingTemplate.convertAndSend(
                "/topic/train-status",
                getStatus()
        );
    }

    private synchronized void updateTrainData() {

        previousDelay = currentDelay;

        // -----------------------------
        // Speed simulation
        // -----------------------------

        double speedChange =
                (Math.random() * 10.0) - 5.0;

        currentSpeed += speedChange;

        currentSpeed =
                Math.max(
                        30.0,
                        Math.min(100.0, currentSpeed)
                );

        // -----------------------------
        // Delay simulation
        // -----------------------------

        double delayChange =
                (Math.random() * 4.0) - 2.0;

        currentDelay += delayChange;

        currentDelay =
                Math.max(0.0, currentDelay);

        // -----------------------------
        // GPS simulation
        // -----------------------------

        double movement = currentSpeed / 360000.0;

        latitude += movement;
        longitude += movement;

        // -----------------------------
        // Location simulation
        // -----------------------------

        if (latitude < 19.70) {

            currentLocation = "Igatpuri";

        } else if (latitude < 20.10) {

            currentLocation = "Nashik Road";

        } else {

            currentLocation = "Manmad";
        }

        // -----------------------------
        // Weather simulation
        // -----------------------------

        weatherFactor =
                Math.random() < 0.15 ? 1 : 0;

        // -----------------------------
        // Traffic simulation
        // -----------------------------

        trafficFactor =
                Math.random() < 0.20 ? 1 : 0;

        // -----------------------------
        // Console output
        // -----------------------------

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
                "Speed          : " + round(currentSpeed) + " km/h"
        );

        System.out.println(
                "Current Delay  : " + round(currentDelay) + " min"
        );

        System.out.println(
                "Previous Delay : " + round(previousDelay) + " min"
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
                nextStation
        );
    }

    private double round(double value) {

        return Math.round(value * 100.0) / 100.0;
    }

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

            String nextStation

    ) {
    }
}