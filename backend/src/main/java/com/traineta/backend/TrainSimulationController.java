package com.traineta.backend;

import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/simulation")
@CrossOrigin(origins = "*")
public class TrainSimulationController {

    private final TrainSimulationService simulationService;

    public TrainSimulationController(TrainSimulationService simulationService) {
        this.simulationService = simulationService;
    }

    @PostMapping("/start")
    public String startSimulation() {
        simulationService.startSimulation();
        return "Train simulation started successfully";
    }

    @PostMapping("/stop")
    public String stopSimulation() {
        simulationService.stopSimulation();
        return "Train simulation stopped successfully";
    }

    @GetMapping("/status")
    public TrainSimulationService.SimulationStatus getStatus() {
        return simulationService.getStatus();
    }
}