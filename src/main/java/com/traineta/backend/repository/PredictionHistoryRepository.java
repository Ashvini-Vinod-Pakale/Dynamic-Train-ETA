package com.traineta.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PredictionHistoryRepository
        extends JpaRepository<PredictionHistory, Integer> {
}
