package com.traineta.backend;

import com.traineta.backend.repository.TrainStatusRepository;
import com.traineta.backend.repository.PredictionHistoryRepository;
import com.traineta.backend.repository.PredictionHistory;

import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class ETAController {

    private final FutureDelayService futureDelayService;
    private final TrainStatusRepository trainStatusRepository;
    private final PredictionHistoryRepository predictionHistoryRepository;

    public ETAController(
            FutureDelayService futureDelayService,
            TrainStatusRepository trainStatusRepository,
            PredictionHistoryRepository predictionHistoryRepository) {

        this.futureDelayService = futureDelayService;
        this.trainStatusRepository = trainStatusRepository;
        this.predictionHistoryRepository = predictionHistoryRepository;
    }

    @PostMapping("/predict/eta")
    public ETAResponse predictETA(@RequestBody ETARequest request) {

        double baseTravelTime = 0.0;

        if (request.currentSpeed() > 0) {
            baseTravelTime =
                    (request.routeDistance() / request.currentSpeed()) * 60.0;
        }

        double futureDelay =
                futureDelayService.predictFutureDelay(
                        request.currentSpeed(),
                        request.currentDelay(),
                        request.previousDelay(),
                        request.weatherFactor(),
                        request.trafficFactor(),
                        request.routeDistance()
                );

        double dynamicETA =
                baseTravelTime
                        + request.currentDelay()
                        + futureDelay;

        LocalDateTime predictedArrival =
                LocalDateTime.now().plusSeconds(
                        Math.round(dynamicETA * 60.0)
                );

        DateTimeFormatter formatter =
                DateTimeFormatter.ofPattern("hh:mm a");

        String predictedArrivalTime =
                predictedArrival.format(formatter);

        double confidence =
                calculateConfidence(
                        request.currentDelay(),
                        request.previousDelay(),
                        futureDelay,
                        request.weatherFactor(),
                        request.trafficFactor()
                );

        String delayAlert;

        if (futureDelay >= 10.0) {
            delayAlert =
                    "Additional "
                            + round(futureDelay)
                            + " min delay predicted";
        } else if (futureDelay > 0.0) {
            delayAlert = "Minor future delay predicted";
        } else {
            delayAlert = "No additional delay predicted";
        }

        String[] route = {
                "Mumbai",
                "Pune",
                "Nashik Road",
                "Manmad"
        };

        TrainStatus trainStatus = new TrainStatus();

        trainStatus.setTrainNumber(request.trainNumber());
        trainStatus.setCurrentLocation(request.currentLocation());
        trainStatus.setCurrentSpeed(request.currentSpeed());
        trainStatus.setCurrentDelay(request.currentDelay());
        trainStatus.setPreviousDelay(request.previousDelay());
        trainStatus.setWeatherFactor(request.weatherFactor());
        trainStatus.setTrafficFactor(request.trafficFactor());
        trainStatus.setNextStation(request.nextStation());
        trainStatus.setFutureDelay(round(futureDelay));
        trainStatus.setPredictedEta(predictedArrivalTime);
        trainStatus.setConfidenceScore(round(confidence));
        trainStatus.setDelayAlert(delayAlert);
        trainStatus.setCreatedAt(LocalDateTime.now());

        trainStatusRepository.save(trainStatus);

        PredictionHistory history = new PredictionHistory();

        history.setTrainNumber(request.trainNumber());
        history.setCurrentLocation(request.currentLocation());
        history.setNextStation(request.nextStation());
        history.setCurrentSpeed(request.currentSpeed());
        history.setCurrentDelay(request.currentDelay());
        history.setFutureDelay(round(futureDelay));
        history.setEtaMinutes(round(dynamicETA));
        history.setConfidenceScore(round(confidence));
        history.setPredictedEta(predictedArrivalTime);
        history.setDelayAlert(delayAlert);

        predictionHistoryRepository.save(history);

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
