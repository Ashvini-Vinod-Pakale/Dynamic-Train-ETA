package com.traineta.backend;

import com.traineta.backend.dto.StationStopDTO;
import com.traineta.backend.service.RailRadarService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class FutureDelayControllerTest {

    private RailRadarService mockRailRadarService;
    private FutureDelayService mockFutureDelayService;
    private FutureDelayController controller;

    @BeforeEach
    void setUp() {
        mockRailRadarService = mock(RailRadarService.class);
        mockFutureDelayService = mock(FutureDelayService.class);
        controller = new FutureDelayController(mockRailRadarService, mockFutureDelayService);
    }

    @Test
    void predict_delegatesToFutureDelayService() {
        when(mockFutureDelayService.predictFutureDelay(50.0, 20.0, 10.0, 1, 0, 0.0))
                .thenReturn(12.3456);

        FutureDelayController.PredictionRequest request = new FutureDelayController.PredictionRequest(
                50.0,
                20.0,
                10.0,
                1,
                0
        );

        FutureDelayController.PredictionResponse response = controller.predict(request);

        assertNotNull(response);
        assertEquals(12.35, response.predictedFutureDelay(), 0.001);
    }

    @Test
    void predict_withExplicitRouteDistance_passesRouteDistanceToService() {
        when(mockFutureDelayService.predictFutureDelay(60.0, 15.0, 5.0, 0, 1, 180.0))
                .thenReturn(8.40);

        FutureDelayController.PredictionRequest request = new FutureDelayController.PredictionRequest(
                60.0,
                15.0,
                5.0,
                0,
                1,
                180.0,
                "12123"
        );

        FutureDelayController.PredictionResponse response = controller.predict(request);

        assertNotNull(response);
        assertEquals(8.40, response.predictedFutureDelay(), 0.001);
    }

    @Test
    void predict_resolvesRouteDistance_fromCachedStatus() {
        TrainStatus cachedStatus = new TrainStatus();
        cachedStatus.setTrainNumber("12124");
        cachedStatus.setRouteDistance(192.5);
        when(mockRailRadarService.getCachedStatus("12124")).thenReturn(Optional.of(cachedStatus));

        when(mockFutureDelayService.predictFutureDelay(45.0, 10.0, 8.0, 0, 0, 192.5))
                .thenReturn(7.85);

        // routeDistance is null/omitted in request, but trainNumber is provided
        FutureDelayController.PredictionRequest request = new FutureDelayController.PredictionRequest(
                45.0,
                10.0,
                8.0,
                0,
                0,
                null,
                "12124"
        );

        FutureDelayController.PredictionResponse response = controller.predict(request);

        assertNotNull(response);
        assertEquals(7.85, response.predictedFutureDelay(), 0.001);
    }

    // =========================================================================
    // STEP 10 TESTS: BOUNDED INTERPOLATION, HALT FILTERING, AND TIME PARSING
    // =========================================================================

    @Test
    void test1_boundedInterpolation() {
        TrainStatus cachedStatus = new TrainStatus();
        cachedStatus.setTrainNumber("12123");
        cachedStatus.setRouteDistance(150.0);

        StationStopDTO current = new StationStopDTO(1, "A", "Origin", "10:00 AM", "10:00 AM", null, null, null, null, 0.0, "current", true, "1");
        StationStopDTO h1 = new StationStopDTO(2, "H1", "Halt1", "10:30 AM", "10:32 AM", null, null, null, null, 30.0, "upcoming", true, "1");
        StationStopDTO h2 = new StationStopDTO(3, "H2", "Halt2", "11:00 AM", "11:02 AM", null, null, null, null, 60.0, "upcoming", true, "1");
        StationStopDTO h3 = new StationStopDTO(4, "H3", "Halt3", "11:30 AM", "11:32 AM", null, null, null, null, 90.0, "upcoming", true, "1");
        StationStopDTO h4 = new StationStopDTO(5, "H4", "Halt4", "12:00 PM", "12:02 PM", null, null, null, null, 120.0, "upcoming", true, "1");
        StationStopDTO h5 = new StationStopDTO(6, "H5", "Dest", "12:30 PM", "12:30 PM", null, null, null, null, 150.0, "upcoming", true, "1");

        cachedStatus.setRoute(List.of(current, h1, h2, h3, h4, h5));
        when(mockRailRadarService.getCachedStatus("12123")).thenReturn(Optional.of(cachedStatus));
        when(mockFutureDelayService.predictFutureDelay(anyDouble(), anyDouble(), anyDouble(), anyInt(), anyInt(), anyDouble()))
                .thenReturn(5.0);

        // currentDelay = 20.0, futureDelay = 5.0, upcoming halts = 5
        FutureDelayController.StationWiseRequest request = new FutureDelayController.StationWiseRequest(
                "12123", "Origin", 0.0, 20.0, 10.0, 0, 0
        );

        FutureDelayController.StationWiseResponse response = controller.predictStationWise(request);
        assertNotNull(response);
        List<FutureDelayController.StationPrediction> preds = response.stationPredictions();
        assertEquals(5, preds.size());

        // Expected station delays: 21, 22, 23, 24, 25
        assertEquals(21.0, preds.get(0).predictedDelay(), 0.01);
        assertEquals(22.0, preds.get(1).predictedDelay(), 0.01);
        assertEquals(23.0, preds.get(2).predictedDelay(), 0.01);
        assertEquals(24.0, preds.get(3).predictedDelay(), 0.01);
        assertEquals(25.0, preds.get(4).predictedDelay(), 0.01);

        // Verify: first >= 20, last == 25, no station > 25, monotonic non-decreasing
        assertTrue(preds.get(0).predictedDelay() >= 20.0);
        assertEquals(25.0, preds.get(4).predictedDelay(), 0.001);
        for (int i = 0; i < preds.size(); i++) {
            assertTrue(preds.get(i).predictedDelay() <= 25.0);
            if (i > 0) {
                assertTrue(preds.get(i).predictedDelay() >= preds.get(i - 1).predictedDelay());
            }
        }
    }

    @Test
    void test2_singleUpcomingHalt() {
        TrainStatus cachedStatus = new TrainStatus();
        cachedStatus.setTrainNumber("12123");
        cachedStatus.setRouteDistance(50.0);

        StationStopDTO current = new StationStopDTO(1, "A", "Origin", "10:00 AM", "10:00 AM", null, null, null, null, 0.0, "current", true, "1");
        StationStopDTO dest = new StationStopDTO(2, "B", "Dest", "11:00 AM", "11:00 AM", null, null, null, null, 50.0, "upcoming", true, "1");

        cachedStatus.setRoute(List.of(current, dest));
        when(mockRailRadarService.getCachedStatus("12123")).thenReturn(Optional.of(cachedStatus));
        when(mockFutureDelayService.predictFutureDelay(anyDouble(), anyDouble(), anyDouble(), anyInt(), anyInt(), anyDouble()))
                .thenReturn(5.0);

        // currentDelay = 20.0, futureDelay = 5.0, N = 1
        FutureDelayController.StationWiseRequest request = new FutureDelayController.StationWiseRequest(
                "12123", "Origin", 0.0, 20.0, 10.0, 0, 0
        );

        FutureDelayController.StationWiseResponse response = controller.predictStationWise(request);
        assertNotNull(response);
        List<FutureDelayController.StationPrediction> preds = response.stationPredictions();
        assertEquals(1, preds.size());
        assertEquals("Dest", preds.get(0).station());
        assertEquals(25.0, preds.get(0).predictedDelay(), 0.001);
    }

    @Test
    void test3_zeroFutureDelay() {
        TrainStatus cachedStatus = new TrainStatus();
        cachedStatus.setTrainNumber("12123");
        cachedStatus.setRouteDistance(150.0);

        StationStopDTO current = new StationStopDTO(1, "A", "Origin", "10:00 AM", "10:00 AM", null, null, null, null, 0.0, "current", true, "1");
        StationStopDTO h1 = new StationStopDTO(2, "H1", "H1", "10:30 AM", "10:32 AM", null, null, null, null, 30.0, "upcoming", true, "1");
        StationStopDTO h2 = new StationStopDTO(3, "H2", "H2", "11:00 AM", "11:02 AM", null, null, null, null, 60.0, "upcoming", true, "1");
        StationStopDTO h3 = new StationStopDTO(4, "H3", "H3", "11:30 AM", "11:32 AM", null, null, null, null, 90.0, "upcoming", true, "1");
        StationStopDTO h4 = new StationStopDTO(5, "H4", "H4", "12:00 PM", "12:02 PM", null, null, null, null, 120.0, "upcoming", true, "1");
        StationStopDTO h5 = new StationStopDTO(6, "H5", "H5", "12:30 PM", "12:30 PM", null, null, null, null, 150.0, "upcoming", true, "1");

        cachedStatus.setRoute(List.of(current, h1, h2, h3, h4, h5));
        when(mockRailRadarService.getCachedStatus("12123")).thenReturn(Optional.of(cachedStatus));
        when(mockFutureDelayService.predictFutureDelay(anyDouble(), anyDouble(), anyDouble(), anyInt(), anyInt(), anyDouble()))
                .thenReturn(0.0);

        // currentDelay = 20.0, futureDelay = 0.0, N = 5
        FutureDelayController.StationWiseRequest request = new FutureDelayController.StationWiseRequest(
                "12123", "Origin", 0.0, 20.0, 10.0, 0, 0
        );

        FutureDelayController.StationWiseResponse response = controller.predictStationWise(request);
        assertNotNull(response);
        List<FutureDelayController.StationPrediction> preds = response.stationPredictions();
        assertEquals(5, preds.size());
        for (FutureDelayController.StationPrediction p : preds) {
            assertEquals(20.0, p.predictedDelay(), 0.001);
        }
    }

    @Test
    void test4_isoTimeParsing() {
        String isoTime = "2026-09-17T18:02:00+05:30";
        double delay = 5.0;
        String predicted = FutureDelayController.calculatePredictedTime(isoTime, delay);
        assertEquals("06:07 PM", predicted, "06:02 PM scheduled represented as ISO with +5 delay must be 06:07 PM");
    }

    @Test
    void test5_destinationConsistency() {
        TrainStatus cachedStatus = new TrainStatus();
        cachedStatus.setTrainNumber("11009");
        cachedStatus.setRouteDistance(190.0);

        StationStopDTO origin = new StationStopDTO(1, "CSMT", "Mumbai CSMT", null, "05:50 PM", null, null, null, null, 0.0, "current", true, "1");
        StationStopDTO dest = new StationStopDTO(2, "PUNE", "Pune Jn", "09:50 PM", null, null, null, null, null, 190.0, "upcoming", true, "1");

        cachedStatus.setRoute(List.of(origin, dest));
        when(mockRailRadarService.getCachedStatus("11009")).thenReturn(Optional.of(cachedStatus));
        when(mockFutureDelayService.predictFutureDelay(anyDouble(), anyDouble(), anyDouble(), anyInt(), anyInt(), anyDouble()))
                .thenReturn(5.0);

        FutureDelayController.StationWiseRequest request = new FutureDelayController.StationWiseRequest(
                "11009", "Mumbai CSMT", 0.0, 20.0, 10.0, 0, 0
        );

        FutureDelayController.StationWiseResponse response = controller.predictStationWise(request);
        assertNotNull(response);
        List<FutureDelayController.StationPrediction> preds = response.stationPredictions();
        assertEquals(1, preds.size());
        FutureDelayController.StationPrediction destPred = preds.get(0);
        assertEquals("Pune Jn", destPred.station());
        assertEquals(25.0, destPred.predictedDelay(), 0.001);
        assertEquals("10:15 PM", destPred.predictedETA(), "Scheduled 09:50 PM + 25 min delay must be 10:15 PM");
    }

    @Test
    void test6_midnightCrossing() {
        String sched = "11:50 PM";
        double delay = 30.0;
        String predicted = FutureDelayController.calculatePredictedTime(sched, delay);
        assertEquals("12:20 AM", predicted, "11:50 PM + 30 min delay must be 12:20 AM");
    }

    @Test
    void test7_haltFiltering_excludesPassThroughStations() {
        TrainStatus cachedStatus = new TrainStatus();
        cachedStatus.setTrainNumber("12125");
        cachedStatus.setRouteDistance(100.0);

        StationStopDTO stopA = new StationStopDTO(1, "A", "Station A", "10:00 AM", "10:02 AM", null, null, null, null, 0.0, "current", true, "1");
        StationStopDTO stopX = new StationStopDTO(2, "X", "Pass X", "10:15 AM", "10:15 AM", null, null, null, null, 20.0, "upcoming", false, null);
        StationStopDTO stopY = new StationStopDTO(3, "Y", "Pass Y", "10:30 AM", "10:30 AM", null, null, null, null, 40.0, "upcoming", false, null);
        StationStopDTO stopZ = new StationStopDTO(4, "Z", "Pass Z", "10:45 AM", "10:45 AM", null, null, null, null, 60.0, "upcoming", false, null);
        StationStopDTO stopB = new StationStopDTO(5, "B", "Station B", "11:15 AM", "11:15 AM", null, null, null, null, 100.0, "upcoming", true, "1");

        cachedStatus.setRoute(List.of(stopA, stopX, stopY, stopZ, stopB));
        when(mockRailRadarService.getCachedStatus("12125")).thenReturn(Optional.of(cachedStatus));
        when(mockFutureDelayService.predictFutureDelay(anyDouble(), anyDouble(), anyDouble(), anyInt(), anyInt(), anyDouble()))
                .thenReturn(6.0);

        FutureDelayController.StationWiseRequest request = new FutureDelayController.StationWiseRequest(
                "12125", "Station A", 0.0, 10.0, 5.0, 0, 0
        );

        FutureDelayController.StationWiseResponse response = controller.predictStationWise(request);
        assertNotNull(response);
        List<FutureDelayController.StationPrediction> preds = response.stationPredictions();

        // Must ONLY contain B, no X, Y, Z
        assertEquals(1, preds.size());
        assertEquals("Station B", preds.get(0).station());
        assertEquals(16.0, preds.get(0).predictedDelay(), 0.001);
    }

    @Test
    void test8_noArtificialHopPenalty() {
        TrainStatus cachedStatus = new TrainStatus();
        cachedStatus.setTrainNumber("12123");
        cachedStatus.setRouteDistance(200.0);

        // 20 halt stations
        List<StationStopDTO> stops = new java.util.ArrayList<>();
        stops.add(new StationStopDTO(1, "S0", "Station 0", "06:00 AM", "06:00 AM", null, null, null, null, 0.0, "current", true, "1"));
        for (int i = 1; i <= 20; i++) {
            stops.add(new StationStopDTO(i + 1, "S" + i, "Station " + i, "06:" + String.format("%02d", i) + " AM", "06:" + String.format("%02d", i) + " AM", null, null, null, null, (double) i * 10, "upcoming", true, "1"));
        }
        cachedStatus.setRoute(stops);
        when(mockRailRadarService.getCachedStatus("12123")).thenReturn(Optional.of(cachedStatus));
        when(mockFutureDelayService.predictFutureDelay(anyDouble(), anyDouble(), anyDouble(), anyInt(), anyInt(), anyDouble()))
                .thenReturn(5.0);

        // currentDelay = 20.0, futureDelay = 5.0
        // Under old code with hop*1.5 across 20 stations, destination delay would be 20 + 5 + 19*1.5 = 53.5!
        // Under new code, destination MUST be exactly 25.0, and no station can exceed 25.0
        FutureDelayController.StationWiseRequest request = new FutureDelayController.StationWiseRequest(
                "12123", "Station 0", 0.0, 20.0, 10.0, 0, 0
        );

        FutureDelayController.StationWiseResponse response = controller.predictStationWise(request);
        assertNotNull(response);
        List<FutureDelayController.StationPrediction> preds = response.stationPredictions();
        assertEquals(20, preds.size());

        // Max delay must be <= 25.0
        for (FutureDelayController.StationPrediction p : preds) {
            assertTrue(p.predictedDelay() <= 25.0, "Station " + p.station() + " delay " + p.predictedDelay() + " exceeds total delay 25.0");
            assertTrue(p.predictedDelay() >= 20.0, "Station " + p.station() + " delay " + p.predictedDelay() + " is below current delay 20.0");
        }
        assertEquals(25.0, preds.get(preds.size() - 1).predictedDelay(), 0.001, "Destination delay must equal 25.0 exactly");
    }

    @Test
    void test9_completedRegression_preservesFinalArrivalDelay() {
        // For a completed train, ETAController and TrainStatus calculate finalArrivalDelay = 109
        // (09:50 PM scheduled, 11:39 PM actual -> 109 min)
        Double finalArrivalDelay = ETAController.calculateFinalArrivalDelay("09:50 PM", "11:39 PM");
        assertNotNull(finalArrivalDelay);
        assertEquals(109.0, finalArrivalDelay, 0.001, "Final arrival delay for completed journey must be 109 min");

        // Station-wise prediction on completed train at destination yields 0 upcoming stops
        TrainStatus cachedStatus = new TrainStatus();
        cachedStatus.setTrainNumber("11009");
        cachedStatus.setTrainStatus("COMPLETED");

        StationStopDTO origin = new StationStopDTO(1, "CSMT", "Mumbai CSMT", null, "05:50 PM", null, "05:50 PM", null, null, 0.0, "completed", true, "1");
        StationStopDTO dest = new StationStopDTO(2, "PUNE", "Pune Jn", "09:50 PM", null, "11:39 PM", null, null, null, 190.0, "current", true, "1");

        cachedStatus.setRoute(List.of(origin, dest));
        when(mockRailRadarService.getCachedStatus("11009")).thenReturn(Optional.of(cachedStatus));

        FutureDelayController.StationWiseRequest request = new FutureDelayController.StationWiseRequest(
                "11009", "Pune Jn", 0.0, 109.0, 33.0, 0, 0
        );

        FutureDelayController.StationWiseResponse response = controller.predictStationWise(request);
        assertNotNull(response);
        // At destination, no upcoming halts remain
        assertEquals(0, response.stationPredictions().size());
    }



    @Test
    void bothControllers_produceIdenticalFutureDelay_forIdenticalInputs() {
        // Test cross-controller consistency using the real trained FutureDelayService
        FutureDelayService realService = new FutureDelayService();
        ETAController etaController = new ETAController(mockRailRadarService, realService);
        FutureDelayController fdcController = new FutureDelayController(mockRailRadarService, realService);

        double speed = 45.0;
        double currentDelay = 20.0;
        double prevDelay = 12.0;
        int weather = 1;
        int traffic = 0;
        double routeDistance = 150.0;

        ETAController.ETARequest etaReq = new ETAController.ETARequest(
                "12123",
                "Pune",
                routeDistance,
                speed,
                currentDelay,
                prevDelay,
                weather,
                traffic,
                "Lonavala"
        );

        FutureDelayController.PredictionRequest fdcReq = new FutureDelayController.PredictionRequest(
                speed,
                currentDelay,
                prevDelay,
                weather,
                traffic,
                routeDistance,
                "12123"
        );

        ETAController.ETAResponse etaRes = etaController.predictETA(etaReq);
        FutureDelayController.PredictionResponse fdcRes = fdcController.predict(fdcReq);

        // Both must return identical future delay values
        assertEquals(etaRes.futureDelay(), fdcRes.predictedFutureDelay(), 0.001);

        // Expected and total delay semantics must be preserved
        assertEquals(etaRes.totalDelay(), etaRes.expectedDelay(), 0.001);
        assertEquals(Math.round((currentDelay + etaRes.futureDelay()) * 100.0) / 100.0, etaRes.totalDelay(), 0.001);
    }

    // =========================================================================
    // 14 APPROVED ETA-FIRST PREDICTION ENGINE SCENARIOS
    // =========================================================================

    @Test
    void testRunningOnTimeTrain_predictsZeroDelayAndScheduledETAs() {
        TrainStatus cachedStatus = new TrainStatus();
        cachedStatus.setTrainNumber("12123");
        cachedStatus.setRouteDistance(90.0);
        cachedStatus.setTrainStatus("RUNNING");

        StationStopDTO origin = new StationStopDTO(1, "O", "Origin", "10:00 AM", "10:00 AM", null, null, null, null, 0.0, "current", true, "1");
        StationStopDTO h1 = new StationStopDTO(2, "H1", "Halt 1", "10:30 AM", "10:32 AM", null, null, null, null, 30.0, "upcoming", true, "1");
        StationStopDTO h2 = new StationStopDTO(3, "H2", "Halt 2", "11:00 AM", "11:02 AM", null, null, null, null, 60.0, "upcoming", true, "1");
        StationStopDTO dest = new StationStopDTO(4, "D", "Dest", "11:30 AM", "11:30 AM", null, null, null, null, 90.0, "upcoming", true, "1");

        cachedStatus.setRoute(List.of(origin, h1, h2, dest));
        when(mockRailRadarService.getCachedStatus("12123")).thenReturn(Optional.of(cachedStatus));
        when(mockFutureDelayService.predictFutureDelay(anyDouble(), anyDouble(), anyDouble(), anyInt(), anyInt(), anyDouble()))
                .thenReturn(0.0);

        // Train running on time at scheduled speed: 30 km in 30 min = 60 km/h
        FutureDelayController.StationWiseRequest request = new FutureDelayController.StationWiseRequest(
                "12123", "Origin", 60.0, 0.0, 0.0, 0, 0
        );

        FutureDelayController.StationWiseResponse response = controller.predictStationWise(request);
        assertNotNull(response);
        List<FutureDelayController.StationPrediction> preds = response.stationPredictions();
        assertEquals(3, preds.size());

        assertEquals("Halt 1", preds.get(0).station());
        assertEquals(0.0, preds.get(0).predictedDelay(), 0.001);
        assertEquals("10:30 AM", preds.get(0).predictedETA());

        assertEquals("Halt 2", preds.get(1).station());
        assertEquals(0.0, preds.get(1).predictedDelay(), 0.001);
        assertEquals("11:00 AM", preds.get(1).predictedETA());

        assertEquals("Dest", preds.get(2).station());
        assertEquals(0.0, preds.get(2).predictedDelay(), 0.001);
        assertEquals("11:30 AM", preds.get(2).predictedETA());
    }

    @Test
    void testRunningDelayedTrain_propagatesDelayStably() {
        TrainStatus cachedStatus = new TrainStatus();
        cachedStatus.setTrainNumber("12123");
        cachedStatus.setRouteDistance(90.0);
        cachedStatus.setTrainStatus("RUNNING");

        StationStopDTO origin = new StationStopDTO(1, "O", "Origin", "10:00 AM", "10:00 AM", null, null, null, null, 0.0, "current", true, "1");
        StationStopDTO h1 = new StationStopDTO(2, "H1", "Halt 1", "10:30 AM", "10:32 AM", null, null, null, null, 30.0, "upcoming", true, "1");
        StationStopDTO h2 = new StationStopDTO(3, "H2", "Halt 2", "11:00 AM", "11:02 AM", null, null, null, null, 60.0, "upcoming", true, "1");
        StationStopDTO dest = new StationStopDTO(4, "D", "Dest", "11:30 AM", "11:30 AM", null, null, null, null, 90.0, "upcoming", true, "1");

        cachedStatus.setRoute(List.of(origin, h1, h2, dest));
        when(mockRailRadarService.getCachedStatus("12123")).thenReturn(Optional.of(cachedStatus));
        when(mockFutureDelayService.predictFutureDelay(anyDouble(), anyDouble(), anyDouble(), anyInt(), anyInt(), anyDouble()))
                .thenReturn(0.0);

        // Train delayed by 25.0 min, operating at scheduled speed
        FutureDelayController.StationWiseRequest request = new FutureDelayController.StationWiseRequest(
                "12123", "Origin", 60.0, 25.0, 25.0, 0, 0
        );

        FutureDelayController.StationWiseResponse response = controller.predictStationWise(request);
        assertNotNull(response);
        List<FutureDelayController.StationPrediction> preds = response.stationPredictions();
        assertEquals(3, preds.size());

        assertEquals(25.0, preds.get(0).predictedDelay(), 0.001);
        assertEquals("10:55 AM", preds.get(0).predictedETA());

        assertEquals(25.0, preds.get(1).predictedDelay(), 0.001);
        assertEquals("11:25 AM", preds.get(1).predictedETA());

        assertEquals(25.0, preds.get(2).predictedDelay(), 0.001);
        assertEquals("11:55 AM", preds.get(2).predictedETA());
    }

    @Test
    void testRunningEarlyTrain_predictsEarlyArrivalAndHoldsDeparture() {
        TrainStatus cachedStatus = new TrainStatus();
        cachedStatus.setTrainNumber("12123");
        cachedStatus.setRouteDistance(60.0);
        cachedStatus.setTrainStatus("RUNNING");

        StationStopDTO origin = new StationStopDTO(1, "O", "Origin", "10:00 AM", "10:00 AM", null, null, null, null, 0.0, "current", true, "1");
        StationStopDTO h1 = new StationStopDTO(2, "H1", "Halt 1", "10:30 AM", "10:35 AM", null, null, null, null, 30.0, "upcoming", true, "1");
        StationStopDTO dest = new StationStopDTO(3, "D", "Dest", "11:05 AM", "11:05 AM", null, null, null, null, 60.0, "upcoming", true, "1");

        cachedStatus.setRoute(List.of(origin, h1, dest));
        when(mockRailRadarService.getCachedStatus("12123")).thenReturn(Optional.of(cachedStatus));
        when(mockFutureDelayService.predictFutureDelay(anyDouble(), anyDouble(), anyDouble(), anyInt(), anyInt(), anyDouble()))
                .thenReturn(0.0);

        // Train 10 minutes early (currentDelay = -10.0), speed 60 km/h (30 min traversal)
        FutureDelayController.StationWiseRequest request = new FutureDelayController.StationWiseRequest(
                "12123", "Origin", 60.0, -10.0, -10.0, 0, 0
        );

        FutureDelayController.StationWiseResponse response = controller.predictStationWise(request);
        assertNotNull(response);
        List<FutureDelayController.StationPrediction> preds = response.stationPredictions();
        assertEquals(2, preds.size());

        // Halt 1 arrives 10 min early (10:20 AM), delay = -10.0
        assertEquals(-10.0, preds.get(0).predictedDelay(), 0.001);
        assertEquals("10:20 AM", preds.get(0).predictedETA());

        // Departure from Halt 1 is held until scheduled departure (10:35 AM), so arrival at Dest is on time!
        assertEquals(0.0, preds.get(1).predictedDelay(), 0.001);
        assertEquals("11:05 AM", preds.get(1).predictedETA());
    }

    @Test
    void testStationaryAtHalt_fallsBackToAverageSpeedWithoutZeroDivision() {
        TrainStatus cachedStatus = new TrainStatus();
        cachedStatus.setTrainNumber("12123");
        cachedStatus.setRouteDistance(60.0);
        cachedStatus.setTrainStatus("AT_STATION");
        cachedStatus.setAverageSpeed(60.0);

        StationStopDTO currentHalt = new StationStopDTO(1, "H1", "Halt 1", "10:00 AM", "10:05 AM", null, null, null, null, 30.0, "current", true, "1");
        StationStopDTO dest = new StationStopDTO(2, "D", "Dest", "10:35 AM", "10:35 AM", null, null, null, null, 60.0, "upcoming", true, "1");

        cachedStatus.setRoute(List.of(currentHalt, dest));
        when(mockRailRadarService.getCachedStatus("12123")).thenReturn(Optional.of(cachedStatus));
        when(mockFutureDelayService.predictFutureDelay(anyDouble(), anyDouble(), anyDouble(), anyInt(), anyInt(), anyDouble()))
                .thenReturn(0.0);

        // Stationary at platform: currentSpeed = 0.0
        FutureDelayController.StationWiseRequest request = new FutureDelayController.StationWiseRequest(
                "12123", "Halt 1", 0.0, 0.0, 0.0, 0, 0
        );

        FutureDelayController.StationWiseResponse response = controller.predictStationWise(request);
        assertNotNull(response);
        List<FutureDelayController.StationPrediction> preds = response.stationPredictions();
        assertEquals(1, preds.size());
        assertEquals("Dest", preds.get(0).station());
        assertEquals("10:35 AM", preds.get(0).predictedETA());
        assertEquals(0.0, preds.get(0).predictedDelay(), 0.001);
    }

    @Test
    void testNotStartedTrain_calculatesFromOriginScheduledDeparture() {
        TrainStatus cachedStatus = new TrainStatus();
        cachedStatus.setTrainNumber("12123");
        cachedStatus.setRouteDistance(60.0);
        cachedStatus.setTrainStatus("NOT_STARTED");

        StationStopDTO origin = new StationStopDTO(1, "O", "Origin", null, "08:00 AM", null, null, null, null, 0.0, "current", true, "1");
        StationStopDTO h1 = new StationStopDTO(2, "H1", "Halt 1", "08:30 AM", "08:35 AM", null, null, null, null, 30.0, "upcoming", true, "1");
        StationStopDTO dest = new StationStopDTO(3, "D", "Dest", "09:05 AM", null, null, null, null, null, 60.0, "upcoming", true, "1");

        cachedStatus.setRoute(List.of(origin, h1, dest));
        when(mockRailRadarService.getCachedStatus("12123")).thenReturn(Optional.of(cachedStatus));
        when(mockFutureDelayService.predictFutureDelay(anyDouble(), anyDouble(), anyDouble(), anyInt(), anyInt(), anyDouble()))
                .thenReturn(0.0);

        FutureDelayController.StationWiseRequest request = new FutureDelayController.StationWiseRequest(
                "12123", "Origin", 0.0, 0.0, 0.0, 0, 0
        );

        FutureDelayController.StationWiseResponse response = controller.predictStationWise(request);
        assertNotNull(response);
        List<FutureDelayController.StationPrediction> preds = response.stationPredictions();
        assertEquals(2, preds.size());
        assertEquals("08:30 AM", preds.get(0).predictedETA());
        assertEquals("09:05 AM", preds.get(1).predictedETA());
    }

    @Test
    void testDelayRecoverySection_recoversDelayWhenSlackPermits() {
        TrainStatus cachedStatus = new TrainStatus();
        cachedStatus.setTrainNumber("12123");
        cachedStatus.setRouteDistance(30.0);
        cachedStatus.setTrainStatus("RUNNING");

        // Section has 45 min scheduled runtime for 30 km, train runs at 60 km/h (takes 30 min -> 15 min recovery)
        StationStopDTO origin = new StationStopDTO(1, "O", "Origin", "10:00 AM", "10:00 AM", null, null, null, null, 0.0, "current", true, "1");
        StationStopDTO dest = new StationStopDTO(2, "D", "Dest", "10:45 AM", "10:45 AM", null, null, null, null, 30.0, "upcoming", true, "1");

        cachedStatus.setRoute(List.of(origin, dest));
        when(mockRailRadarService.getCachedStatus("12123")).thenReturn(Optional.of(cachedStatus));
        when(mockFutureDelayService.predictFutureDelay(anyDouble(), anyDouble(), anyDouble(), anyInt(), anyInt(), anyDouble()))
                .thenReturn(0.0);

        // Train starts with +20 min delay
        FutureDelayController.StationWiseRequest request = new FutureDelayController.StationWiseRequest(
                "12123", "Origin", 60.0, 20.0, 20.0, 0, 0
        );

        FutureDelayController.StationWiseResponse response = controller.predictStationWise(request);
        assertNotNull(response);
        List<FutureDelayController.StationPrediction> preds = response.stationPredictions();
        assertEquals(1, preds.size());
        // Departs 10:20 AM + 30 min traversal = 10:50 AM arrival. Sched arr is 10:45 AM -> delay is +5.0 min!
        assertEquals(5.0, preds.get(0).predictedDelay(), 0.001);
        assertEquals("10:50 AM", preds.get(0).predictedETA());
        assertTrue(preds.get(0).predictedDelay() < 20.0, "Delay must recover from 20.0 to 5.0 min");
    }

    @Test
    void testDelayIncreaseSection_increasesDelayUnderLowPerformance() {
        TrainStatus cachedStatus = new TrainStatus();
        cachedStatus.setTrainNumber("12123");
        cachedStatus.setRouteDistance(30.0);
        cachedStatus.setTrainStatus("RUNNING");

        // Scheduled 30 min runtime for 30 km (scheduled speed 60 km/h), but train runs at 30 km/h (takes 60 min)
        StationStopDTO origin = new StationStopDTO(1, "O", "Origin", "10:00 AM", "10:00 AM", null, null, null, null, 0.0, "current", true, "1");
        StationStopDTO dest = new StationStopDTO(2, "D", "Dest", "10:30 AM", "10:30 AM", null, null, null, null, 30.0, "upcoming", true, "1");

        cachedStatus.setRoute(List.of(origin, dest));
        when(mockRailRadarService.getCachedStatus("12123")).thenReturn(Optional.of(cachedStatus));
        when(mockFutureDelayService.predictFutureDelay(anyDouble(), anyDouble(), anyDouble(), anyInt(), anyInt(), anyDouble()))
                .thenReturn(0.0);

        // Train starts on time, but speed is only 30 km/h
        FutureDelayController.StationWiseRequest request = new FutureDelayController.StationWiseRequest(
                "12123", "Origin", 30.0, 0.0, 0.0, 0, 0
        );

        FutureDelayController.StationWiseResponse response = controller.predictStationWise(request);
        assertNotNull(response);
        List<FutureDelayController.StationPrediction> preds = response.stationPredictions();
        assertEquals(1, preds.size());
        // Departs 10:00 AM + 60 min traversal = 11:00 AM arrival. Sched arr is 10:30 AM -> delay is +30.0 min!
        assertEquals(30.0, preds.get(0).predictedDelay(), 0.001);
        assertEquals("11:00 AM", preds.get(0).predictedETA());
        assertTrue(preds.get(0).predictedDelay() > 0.0, "Delay must increase due to lower speed");
    }

    @Test
    void testNoChangeSection_preservesExactDelayWhenRuntimeMatchesSchedule() {
        TrainStatus cachedStatus = new TrainStatus();
        cachedStatus.setTrainNumber("12123");
        cachedStatus.setRouteDistance(30.0);
        cachedStatus.setTrainStatus("RUNNING");

        StationStopDTO origin = new StationStopDTO(1, "O", "Origin", "10:00 AM", "10:00 AM", null, null, null, null, 0.0, "current", true, "1");
        StationStopDTO dest = new StationStopDTO(2, "D", "Dest", "10:30 AM", "10:30 AM", null, null, null, null, 30.0, "upcoming", true, "1");

        cachedStatus.setRoute(List.of(origin, dest));
        when(mockRailRadarService.getCachedStatus("12123")).thenReturn(Optional.of(cachedStatus));
        when(mockFutureDelayService.predictFutureDelay(anyDouble(), anyDouble(), anyDouble(), anyInt(), anyInt(), anyDouble()))
                .thenReturn(0.0);

        // Train delayed by 15.0 min, operating at scheduled speed 60 km/h
        FutureDelayController.StationWiseRequest request = new FutureDelayController.StationWiseRequest(
                "12123", "Origin", 60.0, 15.0, 15.0, 0, 0
        );

        FutureDelayController.StationWiseResponse response = controller.predictStationWise(request);
        assertNotNull(response);
        List<FutureDelayController.StationPrediction> preds = response.stationPredictions();
        assertEquals(1, preds.size());
        assertEquals(15.0, preds.get(0).predictedDelay(), 0.001);
        assertEquals("10:45 AM", preds.get(0).predictedETA());
    }

    @Test
    void testMidnightCrossing_handles2350To0025WithoutRolloverErrors() {
        TrainStatus cachedStatus = new TrainStatus();
        cachedStatus.setTrainNumber("12123");
        cachedStatus.setRouteDistance(35.0);
        cachedStatus.setTrainStatus("RUNNING");

        StationStopDTO stnA = new StationStopDTO(1, "A", "Stn A", "11:45 PM", "11:50 PM", null, null, null, null, 0.0, "current", true, "1");
        StationStopDTO stnB = new StationStopDTO(2, "B", "Stn B", "12:25 AM", "12:30 AM", null, null, null, null, 35.0, "upcoming", true, "1");

        cachedStatus.setRoute(List.of(stnA, stnB));
        when(mockRailRadarService.getCachedStatus("12123")).thenReturn(Optional.of(cachedStatus));
        when(mockFutureDelayService.predictFutureDelay(anyDouble(), anyDouble(), anyDouble(), anyInt(), anyInt(), anyDouble()))
                .thenReturn(0.0);

        // Operating at scheduled speed: 35 km in 35 min (60 km/h), on time
        FutureDelayController.StationWiseRequest request = new FutureDelayController.StationWiseRequest(
                "12123", "Stn A", 60.0, 0.0, 0.0, 0, 0
        );

        FutureDelayController.StationWiseResponse response = controller.predictStationWise(request);
        assertNotNull(response);
        List<FutureDelayController.StationPrediction> preds = response.stationPredictions();
        assertEquals(1, preds.size());
        assertEquals("12:25 AM", preds.get(0).predictedETA());
        assertEquals(0.0, preds.get(0).predictedDelay(), 0.001);
    }

    @Test
    void testDestinationReconciliation_matchesRouteMLAnchorExactly() {
        TrainStatus cachedStatus = new TrainStatus();
        cachedStatus.setTrainNumber("12123");
        cachedStatus.setRouteDistance(60.0);
        cachedStatus.setTrainStatus("RUNNING");

        StationStopDTO origin = new StationStopDTO(1, "O", "Origin", "10:00 AM", "10:00 AM", null, null, null, null, 0.0, "current", true, "1");
        StationStopDTO h1 = new StationStopDTO(2, "H1", "Halt 1", "10:30 AM", "10:32 AM", null, null, null, null, 30.0, "upcoming", true, "1");
        StationStopDTO dest = new StationStopDTO(3, "D", "Dest", "11:00 AM", "11:00 AM", null, null, null, null, 60.0, "upcoming", true, "1");

        cachedStatus.setRoute(List.of(origin, h1, dest));
        when(mockRailRadarService.getCachedStatus("12123")).thenReturn(Optional.of(cachedStatus));
        // ML predicts +6.0 min additional delay across trip
        when(mockFutureDelayService.predictFutureDelay(anyDouble(), anyDouble(), anyDouble(), anyInt(), anyInt(), anyDouble()))
                .thenReturn(6.0);

        // Current delay = 10.0 min -> Total destination anchor delay = 10.0 + 6.0 = 16.0 min
        FutureDelayController.StationWiseRequest request = new FutureDelayController.StationWiseRequest(
                "12123", "Origin", 60.0, 10.0, 10.0, 0, 0
        );

        FutureDelayController.StationWiseResponse response = controller.predictStationWise(request);
        assertNotNull(response);
        List<FutureDelayController.StationPrediction> preds = response.stationPredictions();
        assertEquals(2, preds.size());

        // Final destination predicted delay must equal destination anchor delay: 16.0 min
        FutureDelayController.StationPrediction destPred = preds.get(1);
        assertEquals("Dest", destPred.station());
        assertEquals(16.0, destPred.predictedDelay(), 0.001);
        assertEquals("11:16 AM", destPred.predictedETA());
    }

    @Test
    void testHaltFiltering_predictsOnlyCommercialHaltsWhilePreservingFullRoute() {
        TrainStatus cachedStatus = new TrainStatus();
        cachedStatus.setTrainNumber("12123");
        cachedStatus.setRouteDistance(100.0);

        StationStopDTO origin = new StationStopDTO(1, "O", "Origin", "08:00 AM", "08:00 AM", null, null, null, null, 0.0, "current", true, "1");
        StationStopDTO pass1 = new StationStopDTO(2, "P1", "Pass-through 1", "08:15 AM", "08:15 AM", null, null, null, null, 15.0, "upcoming", false, "--");
        StationStopDTO h1 = new StationStopDTO(3, "H1", "Commercial Halt 1", "08:35 AM", "08:37 AM", null, null, null, null, 35.0, "upcoming", true, "2");
        StationStopDTO pass2 = new StationStopDTO(4, "P2", "Pass-through 2", "08:50 AM", "08:50 AM", null, null, null, null, 55.0, "upcoming", false, "--");
        StationStopDTO dest = new StationStopDTO(5, "D", "Dest", "09:30 AM", "09:30 AM", null, null, null, null, 100.0, "upcoming", true, "3");

        cachedStatus.setRoute(List.of(origin, pass1, h1, pass2, dest));
        when(mockRailRadarService.getCachedStatus("12123")).thenReturn(Optional.of(cachedStatus));
        when(mockFutureDelayService.predictFutureDelay(anyDouble(), anyDouble(), anyDouble(), anyInt(), anyInt(), anyDouble()))
                .thenReturn(0.0);

        FutureDelayController.StationWiseRequest request = new FutureDelayController.StationWiseRequest(
                "12123", "Origin", 60.0, 0.0, 0.0, 0, 0
        );

        FutureDelayController.StationWiseResponse response = controller.predictStationWise(request);
        assertNotNull(response);
        List<FutureDelayController.StationPrediction> preds = response.stationPredictions();

        // Only commercial halts are predicted (Commercial Halt 1 and Dest)
        assertEquals(2, preds.size());
        assertEquals("Commercial Halt 1", preds.get(0).station());
        assertEquals("Dest", preds.get(1).station());

        // Full underlying route in cache remains 5 stops untouched
        assertEquals(5, cachedStatus.getRoute().size());
    }

    @Test
    void testTrainSwitchingIsolation_preventsStateLeakageBetweenTrains() {
        TrainStatus trainA = new TrainStatus();
        trainA.setTrainNumber("12123");
        trainA.setRouteDistance(50.0);
        StationStopDTO aOrigin = new StationStopDTO(1, "A1", "Alpha Origin", "07:00 AM", "07:00 AM", null, null, null, null, 0.0, "current", true, "1");
        StationStopDTO aDest = new StationStopDTO(2, "A2", "Alpha Dest", "08:00 AM", "08:00 AM", null, null, null, null, 50.0, "upcoming", true, "1");
        trainA.setRoute(List.of(aOrigin, aDest));

        TrainStatus trainB = new TrainStatus();
        trainB.setTrainNumber("12124");
        trainB.setRouteDistance(80.0);
        StationStopDTO bOrigin = new StationStopDTO(1, "B1", "Beta Origin", "09:00 AM", "09:00 AM", null, null, null, null, 0.0, "current", true, "1");
        StationStopDTO bDest = new StationStopDTO(2, "B2", "Beta Dest", "10:20 AM", "10:20 AM", null, null, null, null, 80.0, "upcoming", true, "1");
        trainB.setRoute(List.of(bOrigin, bDest));

        when(mockRailRadarService.getCachedStatus("12123")).thenReturn(Optional.of(trainA));
        when(mockRailRadarService.getCachedStatus("12124")).thenReturn(Optional.of(trainB));
        when(mockFutureDelayService.predictFutureDelay(anyDouble(), anyDouble(), anyDouble(), anyInt(), anyInt(), anyDouble()))
                .thenReturn(0.0);

        FutureDelayController.StationWiseRequest reqA = new FutureDelayController.StationWiseRequest(
                "12123", "Alpha Origin", 50.0, 0.0, 0.0, 0, 0
        );
        FutureDelayController.StationWiseRequest reqB = new FutureDelayController.StationWiseRequest(
                "12124", "Beta Origin", 60.0, 10.0, 10.0, 0, 0
        );

        FutureDelayController.StationWiseResponse resA1 = controller.predictStationWise(reqA);
        FutureDelayController.StationWiseResponse resB = controller.predictStationWise(reqB);
        FutureDelayController.StationWiseResponse resA2 = controller.predictStationWise(reqA);

        assertEquals("Alpha Dest", resA1.stationPredictions().get(0).station());
        assertEquals("Beta Dest", resB.stationPredictions().get(0).station());
        assertEquals("Alpha Dest", resA2.stationPredictions().get(0).station());
        assertEquals(resA1.stationPredictions().get(0).predictedETA(), resA2.stationPredictions().get(0).predictedETA());
    }

    @Test
    void testCompletedTrainRegression_returnsActualArrivalAndSkipsTraversal() {
        TrainStatus cachedStatus = new TrainStatus();
        cachedStatus.setTrainNumber("11009");
        cachedStatus.setTrainStatus("COMPLETED");

        StationStopDTO origin = new StationStopDTO(1, "CSMT", "Mumbai CSMT", null, "05:50 PM", null, "05:50 PM", null, null, 0.0, "completed", true, "1");
        StationStopDTO dest = new StationStopDTO(2, "PUNE", "Pune Jn", "09:50 PM", null, "11:39 PM", null, null, null, 190.0, "current", true, "1");

        cachedStatus.setRoute(List.of(origin, dest));
        when(mockRailRadarService.getCachedStatus("11009")).thenReturn(Optional.of(cachedStatus));

        FutureDelayController.StationWiseRequest request = new FutureDelayController.StationWiseRequest(
                "11009", "Pune Jn", 0.0, 109.0, 33.0, 0, 0
        );

        FutureDelayController.StationWiseResponse response = controller.predictStationWise(request);
        assertNotNull(response);
        // Completed train at destination has 0 upcoming halts
        assertEquals(0, response.stationPredictions().size());
    }

    @Test
    void testTrainAgnosticBehavior_verifiesZeroHardcodedTrainNumbers() {
        String customTrain = "CUSTOM-999";
        TrainStatus cachedStatus = new TrainStatus();
        cachedStatus.setTrainNumber(customTrain);
        cachedStatus.setRouteDistance(100.0);

        StationStopDTO s1 = new StationStopDTO(1, "STN1", "Custom Origin", "01:00 PM", "01:00 PM", null, null, null, null, 0.0, "current", true, "1");
        StationStopDTO s2 = new StationStopDTO(2, "STN2", "Custom Halt", "01:30 PM", "01:32 PM", null, null, null, null, 50.0, "upcoming", true, "2");
        StationStopDTO s3 = new StationStopDTO(3, "STN3", "Custom Dest", "02:00 PM", "02:00 PM", null, null, null, null, 100.0, "upcoming", true, "3");

        cachedStatus.setRoute(List.of(s1, s2, s3));
        when(mockRailRadarService.getCachedStatus(customTrain)).thenReturn(Optional.of(cachedStatus));
        when(mockFutureDelayService.predictFutureDelay(anyDouble(), anyDouble(), anyDouble(), anyInt(), anyInt(), anyDouble()))
                .thenReturn(0.0);

        // Operates generically on scheduled sectional speed (100 km/h: 50 km in 30 min)
        FutureDelayController.StationWiseRequest request = new FutureDelayController.StationWiseRequest(
                customTrain, "Custom Origin", 100.0, 0.0, 0.0, 0, 0
        );

        FutureDelayController.StationWiseResponse response = controller.predictStationWise(request);
        assertNotNull(response);
        assertEquals(customTrain, response.trainNumber());
        List<FutureDelayController.StationPrediction> preds = response.stationPredictions();
        assertEquals(2, preds.size());
        assertEquals("Custom Halt", preds.get(0).station());
        assertEquals("01:30 PM", preds.get(0).predictedETA());
        assertEquals("Custom Dest", preds.get(1).station());
        assertEquals("02:00 PM", preds.get(1).predictedETA());
    }
}
