package com.traineta.backend;

import java.util.List;

import org.springframework.web.bind.annotation.*;

import com.traineta.backend.service.TrainStatusService;

@RestController
@RequestMapping("/api/trains")
@CrossOrigin(origins = "*")
public class TrainStatusController {

    private final TrainStatusService service;

    public TrainStatusController(TrainStatusService service) {
        this.service = service;
    }

    // Save train status
    @PostMapping
    public TrainStatus saveTrainStatus(
            @RequestBody TrainStatus trainStatus) {

        return service.saveTrainStatus(trainStatus);
    }

    // Get all trains
    @GetMapping
    public List<TrainStatus> getAllTrains() {

        return service.getAllTrainStatus();
    }

    // Get train by ID
    @GetMapping("/{id}")
    public TrainStatus getTrainById(
            @PathVariable Integer id) {

        return service.getTrainById(id);
    }
}