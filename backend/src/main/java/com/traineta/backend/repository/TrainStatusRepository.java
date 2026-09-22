package com.traineta.backend.repository;

import com.traineta.backend.TrainStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface TrainStatusRepository extends JpaRepository<TrainStatus, Integer> {

    Optional<TrainStatus> findTopByTrainNumberOrderByCreatedAtDesc(
            String trainNumber
    );
}