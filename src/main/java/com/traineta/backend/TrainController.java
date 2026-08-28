package com.traineta.backend;

import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/train")
@CrossOrigin(origins = "*")
public class TrainController {

    private final TrainSimulationService simulationService;

    public TrainController(
            TrainSimulationService simulationService
    ) {
        this.simulationService = simulationService;
    }

    @GetMapping("/{trainNumber}/live")
    public LiveTrainResponse getLiveTrainData(
            @PathVariable String trainNumber
    ) {

        TrainSimulationService.SimulationStatus status =
                simulationService.getStatus();

        return new LiveTrainResponse(

                status.trainNumber(),

                "Deccan Queen",

                status.currentLocation(),

                status.nextStation(),

                status.latitude(),

                status.longitude(),

                status.currentSpeed(),

                status.currentDelay(),

                status.previousDelay(),

                status.weatherFactor(),

                status.trafficFactor(),

                LocalDateTime.now().toString()
        );
    }

    public record LiveTrainResponse(

            String trainNumber,

            String trainName,

            String currentStation,

            String nextStation,

            double latitude,

            double longitude,

            double currentSpeed,

            double currentDelay,

            double previousDelay,

            int weatherFactor,

            int trafficFactor,

            String lastUpdated

    ) {
    }
}