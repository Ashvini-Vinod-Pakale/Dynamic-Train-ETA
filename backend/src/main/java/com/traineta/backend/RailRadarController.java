package com.traineta.backend;

import com.traineta.backend.service.RailRadarService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/live-train")
public class RailRadarController {

    private final RailRadarService railRadarService;

    public RailRadarController(RailRadarService railRadarService) {
        this.railRadarService = railRadarService;
    }

    @GetMapping("/{trainNumber}")
    public TrainStatus getLiveTrain(
            @PathVariable String trainNumber) {

        return railRadarService.getLiveTrainData(trainNumber);
    }
}