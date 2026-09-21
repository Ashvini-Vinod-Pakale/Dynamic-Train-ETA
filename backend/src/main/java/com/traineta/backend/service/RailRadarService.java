package com.traineta.backend.service;

import com.traineta.backend.TrainStatus;
import com.traineta.backend.repository.TrainStatusRepository;
import com.traineta.backend.repository.PredictionHistory;
import com.traineta.backend.repository.PredictionHistoryRepository;

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
    private final PredictionHistoryRepository predictionHistoryRepository;
    private final LivePredictionService livePredictionService;
    private final WeatherService weatherService;
    private final SimpMessagingTemplate messagingTemplate;

    @Value("${railradar.base-url}")
    private String baseUrl;

    @Value("${railradar.api-key}")
    private String apiKey;

    public RailRadarService(
            RailRadarDataMapper dataMapper,
            TrainStatusRepository trainStatusRepository,
            PredictionHistoryRepository predictionHistoryRepository,
            LivePredictionService livePredictionService,
            WeatherService weatherService,
            SimpMessagingTemplate messagingTemplate) {

        this.restClient = RestClient.builder().build();
        this.dataMapper = dataMapper;
        this.trainStatusRepository = trainStatusRepository;
        this.predictionHistoryRepository = predictionHistoryRepository;
        this.livePredictionService = livePredictionService;
        this.weatherService = weatherService;
        this.messagingTemplate = messagingTemplate;
    }

    public TrainStatus getLiveTrainData(String trainNumber) {

        // =====================================================
        // STEP 1: GET LIVE TRAIN DATA
        // =====================================================

        String liveUrl =
                baseUrl
                        + "/v1/trains/"
                        + trainNumber
                        + "/live?authoritative=true&geometry=true&includeCoordinates=true";

        String liveResponse = restClient.get()
                .uri(liveUrl)
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
        // STEP 2: GET ROUTE GEOMETRY + STATION COORDINATES
        // =====================================================

        String routeUrl =
                baseUrl
                        + "/v1/trains/"
                        + trainNumber
                        + "/route?format=geojson&stops=true";

        String routeResponse = restClient.get()
                .uri(routeUrl)
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
        // STEP 3: LIVE DATA + ROUTE DATA → TRAIN STATUS
        // =====================================================

        TrainStatus currentTrain =
                dataMapper.mapToTrainStatus(
                        liveResponse,
                        routeResponse
                );


        // =====================================================
        // STEP 4: GET PREVIOUS DELAY FROM DATABASE
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
        // STEP 5: GET WEATHER FACTOR
        // =====================================================

        int weatherFactor =
                weatherService.getWeatherFactor(
                        currentTrain.getLatitude(),
                        currentTrain.getLongitude()
                );

        currentTrain.setWeatherFactor(
                weatherFactor
        );


        // =====================================================
        // STEP 6: ML + DYNAMIC ETA + CONFIDENCE
        // =====================================================

        TrainStatus predictedTrain =
                livePredictionService.predictFutureDelay(
                        currentTrain
                );


        // =====================================================
        // STEP 7: SAVE CURRENT TRAIN STATUS
        // =====================================================

        TrainStatus savedTrain =
                trainStatusRepository.save(
                        predictedTrain
                );


        // =====================================================
        // STEP 8: SAVE PREDICTION HISTORY
        // =====================================================

        PredictionHistory history =
                new PredictionHistory();

        history.setTrainNumber(
                savedTrain.getTrainNumber()
        );

        history.setCurrentLocation(
                savedTrain.getCurrentLocation()
        );

        history.setNextStation(
                savedTrain.getNextStation()
        );

        history.setCurrentSpeed(
                savedTrain.getCurrentSpeed()
        );

        history.setCurrentDelay(
                savedTrain.getCurrentDelay()
        );

        history.setFutureDelay(
                savedTrain.getFutureDelay()
        );

        history.setPredictedEta(
                savedTrain.getPredictedEta()
        );

        history.setConfidenceScore(
                savedTrain.getConfidenceScore()
        );

        history.setDelayAlert(
                savedTrain.getDelayAlert()
        );

        // Dynamic ETA in minutes
        double selectedSpeed;

        if (savedTrain.getCurrentSpeed() > 0) {
            selectedSpeed = savedTrain.getCurrentSpeed();
        } else {
            selectedSpeed = savedTrain.getAverageSpeed();
        }

        double etaMinutes = 0.0;

        if (selectedSpeed > 0 &&
                savedTrain.getRouteDistance() >= 0) {

            double travelTime =
                    (savedTrain.getRouteDistance()
                            / selectedSpeed) * 60.0;

            etaMinutes =
                    travelTime
                            + savedTrain.getCurrentDelay()
                            + savedTrain.getFutureDelay();
        }

        history.setEtaMinutes(
                Math.round(etaMinutes * 100.0) / 100.0
        );

        predictionHistoryRepository.save(
                history
        );


        // =====================================================
        // STEP 9: SEND LIVE UPDATE THROUGH WEBSOCKET
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
        // STEP 10: RETURN RESPONSE
        // =====================================================

        return savedTrain;
    }
}