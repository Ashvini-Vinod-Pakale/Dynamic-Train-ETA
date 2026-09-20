package com.traineta.backend.service;

import com.traineta.backend.TrainStatus;
import com.traineta.backend.repository.TrainStatusRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class RailRadarService {

    private static final Logger logger = LoggerFactory.getLogger(RailRadarService.class);

    private final RestClient restClient;
    private final RailRadarDataMapper dataMapper;
    private final TrainStatusRepository trainStatusRepository;
    private final LivePredictionService livePredictionService;
    private final SimpMessagingTemplate messagingTemplate;

    // In-memory thread-safe cache storing latest verified real train status
    private final Map<String, TrainStatus> latestTrainCache = new ConcurrentHashMap<>();

    @Value("${railradar.base-url:https://api.railradar.in}")
    private String baseUrl = "https://api.railradar.in";

    @Value("${railradar.api-key:${RAILRADAR_API_KEY:}}")
    private String apiKey;

    @Value("${railradar.cache-ttl-ms:${railradar.poll-interval-ms:90000}}")
    private long cacheTtlMs = 90000;

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

    private String resolveApiKey() {
        if (apiKey != null && !apiKey.trim().isEmpty()) {
            return apiKey.trim();
        }
        String envKey = System.getenv("RAILRADAR_API_KEY");
        if (envKey != null && !envKey.trim().isEmpty()) {
            return envKey.trim();
        }
        String sysProp = System.getProperty("railradar.api-key");
        if (sysProp != null && !sysProp.trim().isEmpty()) {
            return sysProp.trim();
        }
        return null;
    }

    public TrainStatus getLiveTrainData(String trainNumber) {

        String effectiveApiKey = resolveApiKey();
        if (effectiveApiKey == null || effectiveApiKey.isEmpty()) {
            throw new IllegalStateException(
                    "RailRadar API key is not configured. Please set the railradar.api-key property or RAILRADAR_API_KEY environment variable."
            );
        }

        String url = baseUrl + "/v1/trains/" + trainNumber + "/live?includeCoordinates=true";

        // =====================================================
        // STEP 1: GET LIVE DATA FROM RAILRADAR
        // =====================================================

        String response = restClient.get()
                .uri(url)
                .header(
                        HttpHeaders.AUTHORIZATION,
                        "Bearer " + effectiveApiKey
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
        // STEP 3: GET PREVIOUS DELAY FROM DATABASE
        // =====================================================

        var previousTrain =
                trainStatusRepository
                        .findTopByTrainNumberOrderByCreatedAtDesc(
                                trainNumber
                        );

        if (previousTrain.isPresent() && previousTrain.get().getCurrentDelay() != null) {
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
        // STEP 5: SAVE TO DATABASE
        // =====================================================

        TrainStatus savedTrain =
                trainStatusRepository.save(
                        predictedTrain
                );

        // Preserve in-memory transient route and train metadata
        savedTrain.setTrainName(predictedTrain.getTrainName());
        savedTrain.setOrigin(predictedTrain.getOrigin());
        savedTrain.setDestination(predictedTrain.getDestination());
        savedTrain.setRoute(predictedTrain.getRoute());

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
        // STEP 7: UPDATE IN-MEMORY CACHE
        // =====================================================

        if (savedTrain.getTrainNumber() != null) {
            latestTrainCache.put(savedTrain.getTrainNumber(), savedTrain);
        }

        // =====================================================
        // STEP 8: RETURN RESPONSE
        // =====================================================

        return savedTrain;
    }

    /**
     * Returns all currently cached real train statuses.
     * If no real train data has been fetched yet, returns an empty list.
     */
    public List<TrainStatus> getAllCachedStatuses() {
        return new ArrayList<>(latestTrainCache.values());
    }

    /**
     * Returns the latest cached real train status for a specific train if present.
     */
    public Optional<TrainStatus> getCachedStatus(String trainNumber) {
        if (trainNumber == null) {
            return Optional.empty();
        }
        return Optional.ofNullable(latestTrainCache.get(trainNumber));
    }

    /**
     * Checks if a cached TrainStatus is fresh according to the configured TTL.
     * Uses the existing createdAt timestamp on the TrainStatus object.
     */
    public boolean isCacheFresh(TrainStatus status) {
        if (status == null || status.getCreatedAt() == null) {
            return false;
        }
        long ageMs = Duration.between(status.getCreatedAt(), LocalDateTime.now()).toMillis();
        return ageMs >= -5000 && ageMs <= cacheTtlMs;
    }

    /**
     * Cache-first retrieval for live train data.
     * Returns the cached status if available and fresh according to TTL.
     * Falls back to fetching from the real RailRadar API when cache is missing or stale.
     */
    public TrainStatus getLiveTrainDataCacheFirst(String trainNumber) {
        if (trainNumber == null || trainNumber.trim().isEmpty()) {
            throw new IllegalArgumentException("Train number cannot be null or empty");
        }

        String normalizedTrainNumber = trainNumber.trim();
        Optional<TrainStatus> cachedOpt = getCachedStatus(normalizedTrainNumber);

        if (cachedOpt.isPresent() && isCacheFresh(cachedOpt.get())) {
            TrainStatus cached = cachedOpt.get();
            long ageMs = Duration.between(cached.getCreatedAt(), LocalDateTime.now()).toMillis();
            logger.info("Serving live status for train [{}] from cache (age: {} ms, TTL: {} ms). No external API call.",
                    normalizedTrainNumber, Math.max(0, ageMs), cacheTtlMs);
            return cached;
        }

        logger.info("Cache miss or stale data for train [{}]. Falling back to live RailRadar API call.", normalizedTrainNumber);
        return getLiveTrainData(normalizedTrainNumber);
    }

    // Cache management helpers (usable for testing and administrative cache priming)
    public void primeCache(TrainStatus status) {
        if (status != null && status.getTrainNumber() != null) {
            latestTrainCache.put(status.getTrainNumber(), status);
        }
    }

    public void clearCache() {
        latestTrainCache.clear();
    }

    public void setCacheTtlMs(long ttlMs) {
        this.cacheTtlMs = ttlMs;
    }

    public long getCacheTtlMs() {
        return this.cacheTtlMs;
    }
}
