package com.traineta.backend;

import com.traineta.backend.repository.TrainStatusRepository;
import com.traineta.backend.service.LivePredictionService;
import com.traineta.backend.service.RailRadarDataMapper;
import com.traineta.backend.service.RailRadarService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class RailRadarCacheTest {

    private RailRadarService mockRailRadarService;
    private RailRadarController controller;

    private RailRadarDataMapper mockMapper;
    private TrainStatusRepository mockRepo;
    private LivePredictionService mockPredictionService;
    private SimpMessagingTemplate mockMessagingTemplate;
    private RailRadarService realServiceWithMocks;

    @BeforeEach
    void setUp() {
        mockRailRadarService = mock(RailRadarService.class);
        controller = new RailRadarController(mockRailRadarService);

        mockMapper = mock(RailRadarDataMapper.class);
        mockRepo = mock(TrainStatusRepository.class);
        mockPredictionService = mock(LivePredictionService.class);
        mockMessagingTemplate = mock(SimpMessagingTemplate.class);

        realServiceWithMocks = new RailRadarService(
                mockMapper,
                mockRepo,
                mockPredictionService,
                mockMessagingTemplate
        );
        realServiceWithMocks.setCacheTtlMs(90000); // 90s TTL
    }

    // =========================================================================
    // 1. Controller Tests: Cache-First Behavior & Isolation
    // =========================================================================

    @Test
    void getLiveTrain_callsCacheFirstMethod_andReturnsOk() {
        TrainStatus cachedTrain = new TrainStatus();
        cachedTrain.setTrainNumber("12123");
        cachedTrain.setCurrentLocation("CSMT");
        cachedTrain.setCreatedAt(LocalDateTime.now());

        when(mockRailRadarService.getLiveTrainDataCacheFirst("12123")).thenReturn(cachedTrain);

        ResponseEntity<TrainStatus> response = controller.getLiveTrain("12123");

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("12123", response.getBody().getTrainNumber());
        assertEquals("CSMT", response.getBody().getCurrentLocation());

        verify(mockRailRadarService, times(1)).getLiveTrainDataCacheFirst("12123");
        verify(mockRailRadarService, never()).getLiveTrainData(anyString());
    }

    @Test
    void getAllLiveTrains_remainsCacheOnly_noDirectFetches() {
        TrainStatus t1 = new TrainStatus();
        t1.setTrainNumber("12123");
        TrainStatus t2 = new TrainStatus();
        t2.setTrainNumber("11007");

        when(mockRailRadarService.getAllCachedStatuses()).thenReturn(List.of(t1, t2));

        ResponseEntity<List<TrainStatus>> response = controller.getAllLiveTrains();

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(2, response.getBody().size());

        verify(mockRailRadarService, times(1)).getAllCachedStatuses();
        verify(mockRailRadarService, never()).getLiveTrainData(anyString());
        verify(mockRailRadarService, never()).getLiveTrainDataCacheFirst(anyString());
    }

    @Test
    void getLiveTrain_throwsOnBlankTrainNumber() {
        assertThrows(IllegalArgumentException.class, () -> realServiceWithMocks.getLiveTrainDataCacheFirst(""));
        assertThrows(IllegalArgumentException.class, () -> realServiceWithMocks.getLiveTrainDataCacheFirst("   "));
        assertThrows(IllegalArgumentException.class, () -> realServiceWithMocks.getLiveTrainDataCacheFirst(null));
    }

    // =========================================================================
    // 2. Service Cache Freshness Tests (Using existing createdAt timestamp)
    // =========================================================================

    @Test
    void isCacheFresh_returnsTrueForRecentTimestamp() {
        TrainStatus status = new TrainStatus();
        status.setTrainNumber("12123");
        status.setCreatedAt(LocalDateTime.now().minusSeconds(15)); // 15s old, TTL is 60s

        assertTrue(realServiceWithMocks.isCacheFresh(status));
    }

    @Test
    void isCacheFresh_returnsFalseForStaleTimestamp() {
        TrainStatus status = new TrainStatus();
        status.setTrainNumber("12123");
        status.setCreatedAt(LocalDateTime.now().minusSeconds(120)); // 120s old, TTL is 60s

        assertFalse(realServiceWithMocks.isCacheFresh(status));
    }

    @Test
    void isCacheFresh_returnsFalseForNullStatusOrNullCreatedAt() {
        assertFalse(realServiceWithMocks.isCacheFresh(null));

        TrainStatus noTimestamp = new TrainStatus();
        noTimestamp.setTrainNumber("12123");
        noTimestamp.setCreatedAt(null);
        assertFalse(realServiceWithMocks.isCacheFresh(noTimestamp));
    }

    // =========================================================================
    // 3. Service Cache-First vs Fallback Behavior
    // =========================================================================

    @Test
    void getLiveTrainDataCacheFirst_servesFromCache_withoutUpstreamCall() {
        TrainStatus freshTrain = new TrainStatus();
        freshTrain.setTrainNumber("12123");
        freshTrain.setCurrentLocation("CSMT");
        freshTrain.setCurrentSpeed(0.0);
        freshTrain.setCreatedAt(LocalDateTime.now().minusSeconds(5));

        // Prime existing in-memory cache
        realServiceWithMocks.primeCache(freshTrain);

        TrainStatus result = realServiceWithMocks.getLiveTrainDataCacheFirst("12123");

        assertNotNull(result);
        assertEquals("12123", result.getTrainNumber());
        assertEquals("CSMT", result.getCurrentLocation());

        // Verify no interaction with repositories or mappers occurred
        verifyNoInteractions(mockMapper);
        verifyNoInteractions(mockRepo);
        verifyNoInteractions(mockPredictionService);
        verifyNoInteractions(mockMessagingTemplate);
    }

    @Test
    void getLiveTrainDataCacheFirst_fallsBackToRailRadar_whenCacheEmpty() {
        RailRadarService spyService = spy(realServiceWithMocks);
        TrainStatus fetched = new TrainStatus();
        fetched.setTrainNumber("99999");
        doReturn(fetched).when(spyService).getLiveTrainData("99999");

        TrainStatus result = spyService.getLiveTrainDataCacheFirst("99999");

        assertNotNull(result);
        assertEquals("99999", result.getTrainNumber());
        verify(spyService, times(1)).getLiveTrainData("99999");
    }

    @Test
    void getLiveTrainDataCacheFirst_fallsBackToRailRadar_whenCacheStale() {
        RailRadarService spyService = spy(realServiceWithMocks);
        TrainStatus staleTrain = new TrainStatus();
        staleTrain.setTrainNumber("11007");
        staleTrain.setCreatedAt(LocalDateTime.now().minusSeconds(300)); // 5 minutes old
        spyService.primeCache(staleTrain);

        TrainStatus freshTrain = new TrainStatus();
        freshTrain.setTrainNumber("11007");
        doReturn(freshTrain).when(spyService).getLiveTrainData("11007");

        TrainStatus result = spyService.getLiveTrainDataCacheFirst("11007");

        assertNotNull(result);
        verify(spyService, times(1)).getLiveTrainData("11007");
    }
}
