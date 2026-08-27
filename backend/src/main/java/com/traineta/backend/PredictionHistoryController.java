package com.traineta.backend;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.traineta.backend.repository.PredictionHistoryRepository;
import com.traineta.backend.repository.PredictionHistory;

@RestController
@RequestMapping("/api/predictions")
public class PredictionHistoryController {

    private final PredictionHistoryRepository repository;

    public PredictionHistoryController(PredictionHistoryRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public Iterable<PredictionHistory> getAllPredictions() {
        return repository.findAll();
    }
}
