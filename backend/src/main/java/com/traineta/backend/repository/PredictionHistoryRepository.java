package com.traineta.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.traineta.backend.repository.PredictionHistory;

@Repository
public interface PredictionHistoryRepository
        extends JpaRepository<PredictionHistory, Integer> {
}
