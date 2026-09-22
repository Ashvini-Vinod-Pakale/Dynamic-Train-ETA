package com.traineta.backend.service;

import java.util.List;

import org.springframework.stereotype.Service;

import com.traineta.backend.TrainStatus;
import com.traineta.backend.repository.TrainStatusRepository;

@Service
public class TrainStatusService {

    private final TrainStatusRepository repository;

    public TrainStatusService(TrainStatusRepository repository) {
        this.repository = repository;
    }

    public TrainStatus saveTrainStatus(TrainStatus trainStatus) {
        return repository.save(trainStatus);
    }

    public List<TrainStatus> getAllTrainStatus() {
        return repository.findAll();
    }

    public TrainStatus getTrainById(Integer id) {
        return repository.findById(id).orElse(null);
    }
}