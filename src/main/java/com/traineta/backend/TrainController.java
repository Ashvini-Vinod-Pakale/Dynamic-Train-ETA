package com.traineta.backend;

import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@RestController
@RequestMapping("/api/train")
@CrossOrigin(origins = "*")
public class TrainController {

    @GetMapping("/{trainNumber}/live")
    public LiveTrainResponse getLiveTrainData(
            @PathVariable String trainNumber) {

        // Simulated live train data
        String currentStation = "Khopoli";
        String nextStation = "Panvel";

        double latitude = 18.8920;
        double longitude = 73.3250;

        double currentSpeed = 64.0;
        double currentDelay = 15.0;
        double previousDelay = 12.0;

        int weatherFactor = 0;
        int trafficFactor = 1;

        String lastUpdated = LocalDateTime.now()
                .format(DateTimeFormatter.ofPattern("dd-MM-yyyy hh:mm:ss a"));

        return new LiveTrainResponse(
                trainNumber,
                "Deccan Queen",
                currentStation,
                nextStation,
                latitude,
                longitude,
                currentSpeed,
                currentDelay,
                previousDelay,
                weatherFactor,
                trafficFactor,
                lastUpdated
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
    ) {}
}