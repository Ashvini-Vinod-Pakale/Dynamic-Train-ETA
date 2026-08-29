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

        // ==========================================
        // ROUTE
        //
        // Nashik Road
        //      ↓
        // Manmad
        //      ↓
        // Dadar
        //      ↓
        // Mumbai CST
        // ==========================================

        private static final double[][] ROUTE = {

                        // Nashik Road
                        { 19.9975, 73.7898 },

                        // Nashik Road → Manmad
                        { 20.0250, 73.8200 },
                        { 20.0600, 73.8500 },
                        { 20.1000, 73.9000 },
                        { 20.1400, 73.9600 },
                        { 20.1700, 74.0500 },
                        { 20.1900, 74.1500 },
                        { 20.2100, 74.2500 },
                        { 20.2250, 74.3200 },
                        { 20.2400, 74.3800 },

                        // Manmad
                        { 20.2530, 74.4380 },

                        // Manmad → Dadar
                        { 20.2400, 74.3500 },
                        { 20.2200, 74.2500 },
                        { 20.1800, 74.1500 },
                        { 20.1300, 74.0500 },
                        { 20.0800, 73.9500 },
                        { 20.0200, 73.8500 },
                        { 19.9500, 73.7500 },
                        { 19.8800, 73.6500 },
                        { 19.8000, 73.5500 },
                        { 19.7200, 73.4500 },
                        { 19.6400, 73.3500 },
                        { 19.5500, 73.2500 },
                        { 19.4500, 73.1500 },
                        { 19.3500, 73.0500 },
                        { 19.2500, 72.9500 },
                        { 19.1500, 72.8800 },
                        { 19.0800, 72.8500 },

                        // Dadar
                        { 19.0183, 72.8438 },

                        // Dadar → Mumbai CST
                        { 19.0000, 72.8400 },
                        { 18.9800, 72.8370 },
                        { 18.9600, 72.8360 },

                        // Mumbai CST
                        { 18.9402, 72.8356 }
        };

        /*
         * Index of the current route segment.
         *
         * Example:
         *
         * 0  = Nashik Road
         * 9  = Manmad area
         * 27 = Dadar area
         * 31 = Mumbai CST
         */
        private int routeIndex = 0;

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

                                        // 1. Update train position
                                        updateTrainData();

                                        // 2. ML + ETA prediction
                                        calculateDynamicETA();

                                        // 3. Send complete live data
                                        messagingTemplate.convertAndSend(
                                                        "/topic/train-status",
                                                        getStatus());

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
                                getStatus());
        }

        // ==========================================
        // UPDATE SIMULATION DATA
        // ==========================================

        private synchronized void updateTrainData() {

                // ----------------------------------------
                // PREVIOUS DELAY
                // ----------------------------------------

                previousDelay = currentDelay;

                // ----------------------------------------
                // SPEED SIMULATION
                // ----------------------------------------

                double speedChange =
                                (Math.random() * 10.0) - 5.0;

                currentSpeed += speedChange;

                currentSpeed = Math.max(
                                30.0,
                                Math.min(
                                                100.0,
                                                currentSpeed));

                // ----------------------------------------
                // DELAY SIMULATION
                // ----------------------------------------

                double delayChange =
                                (Math.random() * 4.0) - 2.0;

                currentDelay += delayChange;

                currentDelay =
                                Math.max(
                                                0.0,
                                                currentDelay);

                // ----------------------------------------
                // ROUTE MOVEMENT
                // ----------------------------------------

                moveTrainAlongRoute();

                // ----------------------------------------
                // WEATHER SIMULATION
                // ----------------------------------------

                weatherFactor =
                                Math.random() < 0.15
                                                ? 1
                                                : 0;

                // ----------------------------------------
                // TRAFFIC SIMULATION
                // ----------------------------------------

                trafficFactor =
                                Math.random() < 0.20
                                                ? 1
                                                : 0;

                // ----------------------------------------
                // CONSOLE
                // ----------------------------------------

                System.out.println(
                                "========================================");

                System.out.println(
                                "REAL-TIME TRAIN SIMULATION");

                System.out.println(
                                "Train Number   : "
                                                + trainNumber);

                System.out.println(
                                "Location       : "
                                                + currentLocation);

                System.out.println(
                                "Latitude       : "
                                                + round(latitude));

                System.out.println(
                                "Longitude      : "
                                                + round(longitude));

                System.out.println(
                                "Speed          : "
                                                + round(currentSpeed)
                                                + " km/h");

                System.out.println(
                                "Current Delay  : "
                                                + round(currentDelay)
                                                + " min");

                System.out.println(
                                "Previous Delay : "
                                                + round(previousDelay)
                                                + " min");

                System.out.println(
                                "Weather        : "
                                                + weatherFactor);

                System.out.println(
                                "Traffic        : "
                                                + trafficFactor);

                System.out.println(
                                "Next Station   : "
                                                + nextStation);

                System.out.println(
                                "Route Index    : "
                                                + routeIndex);

                System.out.println(
                                "========================================");
        }

        // ==========================================
        // MOVE TRAIN ALONG ROUTE
        // ==========================================

        private void moveTrainAlongRoute() {

                // Already at destination
                if (routeIndex >= ROUTE.length - 1) {

                        latitude = ROUTE[ROUTE.length - 1][0];
                        longitude = ROUTE[ROUTE.length - 1][1];

                        currentLocation = "Mumbai CST";
                        nextStation = "Journey Complete";

                        running.set(false);

                        return;
                }

                double targetLatitude =
                                ROUTE[routeIndex + 1][0];

                double targetLongitude =
                                ROUTE[routeIndex + 1][1];

                double distance =
                                calculateDistance(
                                                latitude,
                                                longitude,
                                                targetLatitude,
                                                targetLongitude);

                /*
                 * Convert speed into approximate movement
                 * for the 10-second simulation interval.
                 *
                 * currentSpeed = km/h
                 *
                 * 10 seconds = 10 / 3600 hours
                 *
                 * distance = speed × time
                 */
                double movementDistance =
                                currentSpeed *
                                (10.0 / 3600.0);

                /*
                 * Keep the movement controlled so the train
                 * does not jump over route points.
                 */
                double interpolation;

                if (distance <= movementDistance) {

                        latitude = targetLatitude;
                        longitude = targetLongitude;

                        routeIndex++;

                } else {

                        interpolation =
                                        movementDistance /
                                        distance;

                        latitude +=
                                        (targetLatitude - latitude)
                                                        * interpolation;

                        longitude +=
                                        (targetLongitude - longitude)
                                                        * interpolation;
                }

                updateStationInformation();
        }

        // ==========================================
        // UPDATE CURRENT + NEXT STATION
        // ==========================================

        private void updateStationInformation() {

                /*
                 * Nashik Road → Manmad
                 */
                if (routeIndex < 10) {

                        currentLocation = "Nashik Road";
                        nextStation = "Manmad";

                        return;
                }

                /*
                 * Manmad → Dadar
                 */
                if (routeIndex < 28) {

                        currentLocation = "Manmad";
                        nextStation = "Dadar";

                        return;
                }

                /*
                 * Dadar → Mumbai CST
                 */
                if (routeIndex < ROUTE.length - 1) {

                        currentLocation = "Dadar";
                        nextStation = "Mumbai CST";

                        return;
                }

                /*
                 * Destination reached
                 */
                currentLocation = "Mumbai CST";
                nextStation = "Journey Complete";

                latitude =
                                ROUTE[ROUTE.length - 1][0];

                longitude =
                                ROUTE[ROUTE.length - 1][1];

                running.set(false);
        }

        // ==========================================
        // DISTANCE CALCULATION
        // ==========================================

        private double calculateDistance(
                        double lat1,
                        double lon1,
                        double lat2,
                        double lon2) {

                double earthRadius = 6371.0;

                double dLat =
                                Math.toRadians(
                                                lat2 - lat1);

                double dLon =
                                Math.toRadians(
                                                lon2 - lon1);

                double a =
                                Math.sin(dLat / 2)
                                                * Math.sin(dLat / 2)
                                                +
                                                Math.cos(
                                                                Math.toRadians(lat1))
                                                                * Math.cos(
                                                                                Math.toRadians(lat2))
                                                                * Math.sin(dLon / 2)
                                                                * Math.sin(dLon / 2);

                double c =
                                2.0 *
                                Math.atan2(
                                                Math.sqrt(a),
                                                Math.sqrt(1.0 - a));

                return earthRadius * c;
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
                                                routeDistance());

                // ----------------------------------------
                // 2. BASE TRAVEL TIME
                // ----------------------------------------

                double baseTravelTime = 0.0;

                if (currentSpeed > 0) {

                        baseTravelTime =
                                        (routeDistance() /
                                                        currentSpeed)
                                                        * 60.0;
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
                                LocalDateTime.now()
                                                .plusSeconds(
                                                                Math.round(
                                                                                etaMinutes
                                                                                                * 60.0));

                DateTimeFormatter formatter =
                                DateTimeFormatter.ofPattern(
                                                "hh:mm a");

                predictedETA =
                                predictedArrival.format(
                                                formatter);

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
                                                        + round(
                                                                        futureDelay)
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
                                                + " min");

                System.out.println(
                                "DYNAMIC ETA     : "
                                                + round(etaMinutes)
                                                + " min");

                System.out.println(
                                "PREDICTED ETA   : "
                                                + predictedETA);

                System.out.println(
                                "CONFIDENCE      : "
                                                + round(confidenceScore)
                                                + "%");

                System.out.println(
                                "ALERT           : "
                                                + delayAlert);

                System.out.println(
                                "========================================");
        }

        // ==========================================
        // DYNAMIC ROUTE DISTANCE
        // ==========================================

        private double routeDistance() {

                if (routeIndex >= ROUTE.length - 1) {
                        return 0.0;
                }

                double totalDistance =
                                calculateDistance(
                                                latitude,
                                                longitude,
                                                ROUTE[routeIndex + 1][0],
                                                ROUTE[routeIndex + 1][1]);

                /*
                 * Add remaining route segments.
                 */
                for (
                                int i = routeIndex + 1;
                                i < ROUTE.length - 1;
                                i++) {

                        totalDistance +=
                                        calculateDistance(
                                                        ROUTE[i][0],
                                                        ROUTE[i][1],
                                                        ROUTE[i + 1][0],
                                                        ROUTE[i + 1][1]);
                }

                return totalDistance;
        }

        // ==========================================
        // CONFIDENCE
        // ==========================================

        private double calculateConfidence() {

                double confidence = 95.0;

                double delayDifference =
                                Math.abs(
                                                currentDelay
                                                                - previousDelay);

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
                                Math.max(
                                                50.0,
                                                confidence);

                confidence =
                                Math.min(
                                                99.0,
                                                confidence);

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

                                delayAlert);
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