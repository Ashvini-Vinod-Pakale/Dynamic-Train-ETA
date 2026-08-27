package com.traineta.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.traineta.backend.TrainStatus;

@Repository
public interface TrainStatusRepository extends JpaRepository<TrainStatus, Integer> {
}