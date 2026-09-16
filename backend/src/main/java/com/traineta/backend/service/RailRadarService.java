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
    private final WeatherService weatherService;
    private final SimpMessagingTemplate messagingTemplate;

    @Value("${railradar.base-url}")
    private String baseUrl;

    @Value("${railradar.api-key}")
    private String apiKey;

    public RailRadarService(
            RailRadarDataMapper dataMapper,
            TrainStatusRepository trainStatusRepository,
            LivePredictionService livePredictionService,
            WeatherService weatherService,
            SimpMessagingTemplate messagingTemplate) {

        this.restClient = RestClient.builder().build();
        this.dataMapper = dataMapper;
        this.trainStatusRepository = trainStatusRepository;
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
        // STEP 4: GET PREVIOUS DELAY FROM MYSQL
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
        // STEP 7: SAVE TO MYSQL
        // =====================================================

        TrainStatus savedTrain =
                trainStatusRepository.save(
                        predictedTrain
                );


        // =====================================================
        // STEP 8: SEND LIVE UPDATE THROUGH WEBSOCKET
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
        // STEP 9: RETURN RESPONSE
        // =====================================================

        return savedTrain;
    }
}