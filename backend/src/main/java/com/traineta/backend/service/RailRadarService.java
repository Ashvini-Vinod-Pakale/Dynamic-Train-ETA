package com.traineta.backend.service;

import com.traineta.backend.TrainStatus;
import com.traineta.backend.repository.TrainStatusRepository;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

@Service
public class RailRadarService {

    private final RestClient restClient;
    private final RailRadarDataMapper dataMapper;
    private final TrainStatusRepository trainStatusRepository;
    private final LivePredictionService livePredictionService;
    private final SimpMessagingTemplate messagingTemplate;

    @Value("${railradar.base-url}")
    private String baseUrl;

    @Value("${railradar.api-key}")
    private String apiKey;

    public RailRadarService(
            RailRadarDataMapper dataMapper,
            TrainStatusRepository trainStatusRepository,
            LivePredictionService livePredictionService,
            SimpMessagingTemplate messagingTemplate) {

        this.restClient = RestClient.builder().build();
        this.dataMapper = dataMapper;
        this.trainStatusRepository = trainStatusRepository;
        this.livePredictionService = livePredictionService;
        this.messagingTemplate = messagingTemplate;
    }

    public TrainStatus getLiveTrainData(String trainNumber) {

        String url =
                baseUrl + "/v1/trains/" + trainNumber + "/live";


        // =====================================================
        // STEP 1: GET LIVE DATA FROM RAILRADAR
        // =====================================================

        String response = restClient.get()
                .uri(url)
                .header(
                        HttpHeaders.AUTHORIZATION,
                        "Bearer " + apiKey
                )
                .header(
                        HttpHeaders.ACCEPT,
                        MediaType.APPLICATION_JSON_VALUE
                )
                .retrieve()
                .body(String.class);


        // =====================================================
        // STEP 2: RAILRADAR RESPONSE → TRAIN STATUS
        // =====================================================

        TrainStatus currentTrain =
                dataMapper.mapToTrainStatus(response);


        // =====================================================
        // STEP 3: GET PREVIOUS DELAY FROM MYSQL
        // =====================================================

        var previousTrain =
                trainStatusRepository
                        .findTopByTrainNumberOrderByCreatedAtDesc(
                                trainNumber
                        );

        if (previousTrain.isPresent()) {

            currentTrain.setPreviousDelay(
                    previousTrain.get().getCurrentDelay()
            );
        }


        // =====================================================
        // STEP 4: ML + DYNAMIC ETA + CONFIDENCE
        // =====================================================

        TrainStatus predictedTrain =
                livePredictionService.predictFutureDelay(
                        currentTrain
                );


        // =====================================================
        // STEP 5: SAVE TO MYSQL
        // =====================================================

        TrainStatus savedTrain =
                trainStatusRepository.save(
                        predictedTrain
                );


        // =====================================================
        // STEP 6: SEND LIVE UPDATE THROUGH WEBSOCKET
        // =====================================================

        System.out.println(
                "WEBSOCKET SENT → /topic/train-status → Train "
                        + savedTrain.getTrainNumber()
        );

        messagingTemplate.convertAndSend(
                "/topic/train-status",
                savedTrain
        );


        // =====================================================
        // STEP 7: RETURN RESPONSE
        // =====================================================

        return savedTrain;
    }
}