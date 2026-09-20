package com.traineta.backend;

import com.traineta.backend.dto.StationStopDTO;
import com.traineta.backend.service.RailRadarService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class ETAControllerTest {

    private RailRadarService mockRailRadarService;
    private ETAController controller;

    @BeforeEach
    void setUp() {
        mockRailRadarService = mock(RailRadarService.class);
        controller = new ETAController(mockRailRadarService);
    }

    @Test
    void predictETA_calculatesExpectedAndTotalDelay_exactAuditExample() {
        // currentDelay = 24.0
        // previousDelay = 14.0
        // currentSpeed = 0.0
        // weatherFactor = 1
        // trafficFactor = 0
        // routeDistance = 120.0
        // With trained model (FutureDelayService):
        // futureDelay = 16.13
        // totalDelay = safeCurrentDelay + safeFutureDelay = 24.0 + 16.13 = 40.13
        // expectedDelay = totalDelay = 40.13
        ETAController.ETARequest request = new ETAController.ETARequest(
                "12123",
                "Pune Junction",
                120.0,
                0.0,
                24.0,
                14.0,
                1,
                0,
                "Lonavala",
                List.of("Pune Junction", "Lonavala", "Kalyan", "CSMT")
        );

        ETAController.ETAResponse response = controller.predictETA(request);

        assertNotNull(response);
        assertEquals("12123", response.trainNumber());
        assertEquals(24.0, response.currentDelay(), 0.001);
        assertEquals(16.13, response.futureDelay(), 0.001);
        assertEquals(40.13, response.totalDelay(), 0.001);
        assertEquals(40.13, response.expectedDelay(), 0.001);
        assertEquals(response.totalDelay(), response.expectedDelay());
        assertTrue(response.delayAlert().contains("Additional 16.13 min delay predicted"));
    }

    @Test
    void predictETA_delegatesToFutureDelayServiceWithExactParameters() {
        FutureDelayService mockFds = mock(FutureDelayService.class);
        ETAController customController = new ETAController(mockRailRadarService, mockFds);
        when(mockFds.predictFutureDelay(40.0, 15.0, 10.0, 1, 2, 85.0)).thenReturn(12.5);

        ETAController.ETARequest request = new ETAController.ETARequest(
                "12123",
                "Pune",
                85.0,
                40.0,
                15.0,
                10.0,
                1,
                2,
                "Lonavala"
        );

        ETAController.ETAResponse response = customController.predictETA(request);

        assertEquals(12.5, response.futureDelay(), 0.001);
        assertEquals(27.5, response.totalDelay(), 0.001);
        assertEquals(27.5, response.expectedDelay(), 0.001);
    }

    // =========================================================================
    // STEP 3 TEST CASES
    // =========================================================================

    @Test
    void predictETA_movingTrain_calculatesPredictedETA() {
        // currentSpeed = 60.0 > 0 -> effectiveSpeed = 60.0
        ETAController.ETARequest request = new ETAController.ETARequest(
                "11007",
                "Kalyan",
                60.0,
                60.0,
                10.0,
                5.0,
                0,
                0,
                "Thane",
                List.of("Kalyan", "Thane", "Dadar", "CSMT")
        );

        ETAController.ETAResponse response = controller.predictETA(request);

        assertNotNull(response);
        assertEquals(60.0, response.currentSpeed());
        assertEquals(10.0, response.currentDelay(), 0.001);
        assertEquals(10.0, response.totalDelay(), 0.001);
        assertEquals(10.0, response.expectedDelay(), 0.001);
        assertEquals(70.0, response.etaMinutes(), 0.001);
        assertNotEquals("N/A", response.predictedETA());
    }

    @Test
    void predictETA_stationaryTrain_withValidAverageSpeedInRequest_calculatesPredictedETA() {
        // currentSpeed = 0.0 (halted at platform)
        // averageSpeed in request = 50.0 > 0 -> effectiveSpeed = 50.0
        // distance = 100.0 km -> travelTime = (100 / 50) * 60 = 120 min
        // currentDelay = 5.0, futureDelay = 6.75 min (from trained model)
        // calculatedETA = 120 + 5 + 6.75 = 131.75 min
        ETAController.ETARequest request = new ETAController.ETARequest(
                "12123",
                "Nashik Road",
                100.0,
                0.0,
                5.0,
                0.0,
                0,
                0,
                "Manmad",
                List.of("Nashik Road", "Manmad"),
                50.0
        );

        ETAController.ETAResponse response = controller.predictETA(request);

        assertNotNull(response);
        assertEquals(0.0, response.currentSpeed(), 0.001); // Current physical speed is 0
        assertEquals(11.75, response.totalDelay(), 0.001);
        assertEquals(11.75, response.expectedDelay(), 0.001);
        assertEquals(131.75, response.etaMinutes(), 0.001);
        assertNotEquals("N/A", response.predictedETA());
        assertFalse(response.predictedETA().isEmpty());
    }

    @Test
    void predictETA_stationaryTrain_withValidAverageSpeedInCache_calculatesPredictedETA() {
        // currentSpeed = 0.0, averageSpeed not in request (null)
        // Cached train status has averageSpeed = 60.0 km/h
        TrainStatus cachedStatus = new TrainStatus();
        cachedStatus.setTrainNumber("22105");
        cachedStatus.setAverageSpeed(60.0);
        when(mockRailRadarService.getCachedStatus("22105")).thenReturn(Optional.of(cachedStatus));

        ETAController.ETARequest request = new ETAController.ETARequest(
                "22105",
                "Lonavala",
                60.0,
                0.0,
                0.0,
                0.0,
                0,
                0,
                "Khandala",
                List.of("Lonavala", "Khandala")
        );

        ETAController.ETAResponse response = controller.predictETA(request);

        assertNotNull(response);
        assertEquals(0.0, response.currentSpeed());
        assertEquals(63.33, response.etaMinutes(), 0.01); // (60 / 60) * 60 + 0 + 3.33 = 63.33 min
        assertNotEquals("N/A", response.predictedETA());
    }

    @Test
    void predictETA_stationaryTrain_withNoValidAverageSpeed_returnsNA() {
        // currentSpeed = 0.0, averageSpeed = 0.0 (or unavailable)
        when(mockRailRadarService.getCachedStatus("12125")).thenReturn(Optional.empty());

        ETAController.ETARequest request = new ETAController.ETARequest(
                "12125",
                "Dadar",
                50.0,
                0.0,
                10.0,
                5.0,
                0,
                0,
                "Thane",
                List.of("Dadar", "Thane"),
                0.0 // averageSpeed <= 0
        );

        ETAController.ETAResponse response = controller.predictETA(request);

        assertNotNull(response);
        assertEquals(0.0, response.currentSpeed());
        assertEquals(0.0, response.etaMinutes());
        assertEquals("N/A", response.predictedETA());
    }

    // =========================================================================
    // DTO RECORD CONSTRUCTOR TESTS
    // =========================================================================

    @Test
    void etaResponse_recordConstructor_setsExpectedAndTotalDelayExplicitly() {
        ETAController.ETAResponse response = new ETAController.ETAResponse(
                "12125",
                "Dadar",
                45.0,
                24.0,
                "Kalyan",
                15.8,
                39.8,
                39.8,
                95.0,
                "05:30 PM",
                88.0,
                "Additional 15.8 min delay predicted",
                new String[]{"Dadar", "Kalyan"}
        );

        assertEquals(24.0, response.currentDelay());
        assertEquals(15.8, response.futureDelay());
        assertEquals(39.8, response.expectedDelay());
        assertEquals(39.8, response.totalDelay());
        assertEquals(95.0, response.etaMinutes());
        assertEquals("05:30 PM", response.predictedETA());
    }

    @Test
    void etaResponse_legacyConstructor_computesTotalAndExpectedDelayAutomatically() {
        // Test backward compatibility constructor with 11 parameters
        ETAController.ETAResponse legacyResponse = new ETAController.ETAResponse(
                "12125",
                "Dadar",
                45.0,
                24.0,
                "Kalyan",
                15.8,
                95.0,
                "05:30 PM",
                88.0,
                "Additional 15.8 min delay predicted",
                new String[]{"Dadar", "Kalyan"}
        );

        assertEquals(24.0, legacyResponse.currentDelay());
        assertEquals(15.8, legacyResponse.futureDelay());
        assertEquals(39.8, legacyResponse.expectedDelay(), 0.001);
        assertEquals(39.8, legacyResponse.totalDelay(), 0.001);
    }

    // =========================================================================
    // COMPLETED JOURNEY SEMANTICS TESTS
    // =========================================================================

    @Test
    void predictETA_completedTrain_doesNotCalculateFutureTravelTime() {
        // Train marked as COMPLETED in request
        ETAController.ETARequest request = new ETAController.ETARequest(
                "11012",
                "CSMT",
                0.0,
                0.0,
                18.0,
                12.0,
                0,
                0,
                "N/A",
                List.of("Pune Junction", "Lonavala", "Kalyan", "Thane", "Dadar", "CSMT"),
                55.0,
                "COMPLETED",
                "completed",
                null
        );

        ETAController.ETAResponse response = controller.predictETA(request);

        assertNotNull(response);
        assertEquals(0.0, response.etaMinutes(), 0.001, "Dynamic ETA must be 0 for completed journey");
        assertEquals("Arrived", response.predictedETA(), "Predicted ETA must indicate Arrived when actual arrival unavailable");
        assertEquals(18.0, response.currentDelay(), 0.001);
        assertEquals(25.48, response.totalDelay(), 0.001);
        assertEquals(25.48, response.expectedDelay(), 0.001);
        assertEquals(response.totalDelay(), response.expectedDelay());
    }

    @Test
    void predictETA_completedTrain_withActualArrivalInRequest_propagatesActualArrivalTime() {
        // Train marked as completed with known actualArrival timestamp in request
        ETAController.ETARequest request = new ETAController.ETARequest(
                "11012",
                "CSMT",
                0.0,
                0.0,
                18.0,
                10.0,
                0,
                0,
                "N/A",
                List.of("Pune Junction", "Lonavala", "CSMT"),
                50.0,
                "COMPLETED",
                "completed",
                "02:43 PM"
        );

        ETAController.ETAResponse response = controller.predictETA(request);

        assertNotNull(response);
        assertEquals(0.0, response.etaMinutes(), 0.001);
        assertEquals("02:43 PM", response.predictedETA());
        assertEquals(24.96, response.expectedDelay(), 0.001);
        assertEquals(24.96, response.totalDelay(), 0.001);
    }

    @Test
    void predictETA_completedTrain_withActualArrivalInCache_propagatesActualArrivalTime() {
        TrainStatus cachedStatus = new TrainStatus();
        cachedStatus.setTrainNumber("11012");
        cachedStatus.setTrainStatus("completed");
        cachedStatus.setDestination("CSMT");

        StationStopDTO stop1 = new StationStopDTO();
        stop1.setStationName("Pune Junction");
        stop1.setStatus("completed");

        StationStopDTO stop2 = new StationStopDTO();
        stop2.setStationName("CSMT");
        stop2.setStatus("completed");
        stop2.setActualArrival("02:43 PM");

        cachedStatus.setRoute(List.of(stop1, stop2));
        when(mockRailRadarService.getCachedStatus("11012")).thenReturn(Optional.of(cachedStatus));

        ETAController.ETARequest request = new ETAController.ETARequest(
                "11012",
                "CSMT",
                0.0,
                0.0,
                18.0,
                10.0,
                0,
                0,
                "N/A",
                List.of("Pune Junction", "CSMT")
        );

        ETAController.ETAResponse response = controller.predictETA(request);

        assertNotNull(response);
        assertEquals(0.0, response.etaMinutes(), 0.001);
        assertEquals("02:43 PM", response.predictedETA());
        assertEquals(24.96, response.expectedDelay(), 0.001);
        assertEquals(24.96, response.totalDelay(), 0.001);
    }

    @Test
    void predictETA_completedTrain_withoutActualArrival_returnsArrived() {
        TrainStatus cachedStatus = new TrainStatus();
        cachedStatus.setTrainNumber("12124");
        cachedStatus.setTrainStatus("completed");
        when(mockRailRadarService.getCachedStatus("12124")).thenReturn(Optional.of(cachedStatus));

        ETAController.ETARequest request = new ETAController.ETARequest(
                "12124",
                "Pune Junction",
                0.0,
                0.0,
                5.0,
                0.0,
                0,
                0,
                "N/A"
        );

        ETAController.ETAResponse response = controller.predictETA(request);

        assertNotNull(response);
        assertEquals(0.0, response.etaMinutes(), 0.001);
        assertEquals("Arrived", response.predictedETA());
        assertEquals(6.21, response.expectedDelay(), 0.001);
        assertEquals(6.21, response.totalDelay(), 0.001);
    }

    @Test
    void predictETA_completedTrain_preservesDelaysAndRoute() {
        ETAController.ETARequest request = new ETAController.ETARequest(
                "22105",
                "Pune Junction",
                0.0,
                0.0,
                25.0,
                20.0,
                0,
                0,
                "N/A",
                List.of("CSMT", "Dadar", "Kalyan", "Pune Junction"),
                60.0,
                "COMPLETED",
                "completed",
                "07:35 PM"
        );

        ETAController.ETAResponse response = controller.predictETA(request);

        assertNotNull(response);
        assertEquals("22105", response.trainNumber());
        assertEquals("Pune Junction", response.currentLocation());
        assertEquals(25.0, response.currentDelay(), 0.001);
        assertEquals(11.25, response.futureDelay(), 0.001);
        assertEquals(36.25, response.totalDelay(), 0.001);
        assertEquals(36.25, response.expectedDelay(), 0.001);
        assertEquals("07:35 PM", response.predictedETA());
        assertEquals(4, response.route().length);
        assertEquals("CSMT", response.route()[0]);
        assertEquals("Pune Junction", response.route()[3]);
    }

    @Test
    void stationStopDTO_preservesIsHaltStatus() {
        StationStopDTO haltStop = new StationStopDTO(
                1, "CSMT", "Mumbai CSMT", "07:00", "07:05", null, null, 18.94, 72.83, 0.0, "completed", true, "1"
        );
        StationStopDTO passStop = new StationStopDTO(
                2, "DR", "Dadar", "07:15", "07:15", null, null, 19.01, 72.84, 9.0, "upcoming", false, null
        );

        assertTrue(haltStop.getIsHalt());
        assertFalse(passStop.getIsHalt());
    }

    // =========================================================================
    // ETA + TIME CONSISTENCY FIX TESTS
    // =========================================================================

    @Test
    void predictETA_scheduledDestinationArrivalInRequest_computesAuthoritativePredictedArrival() {
        // Train 11009 audit case:
        // scheduledArrival = "09:50 PM"
        // currentDelay = 24.0, futureDelay = 3.0 -> totalDelay = 27.0
        // Expected arrival: "09:50 PM" + 27 min = "10:17 PM"
        FutureDelayService mockFds = mock(FutureDelayService.class);
        ETAController testController = new ETAController(mockRailRadarService, mockFds);
        when(mockFds.predictFutureDelay(60.0, 24.0, 10.0, 0, 0, 50.0)).thenReturn(3.0);

        ETAController.ETARequest request = new ETAController.ETARequest(
                "11009",
                "Kalyan",
                50.0,
                60.0,
                24.0,
                10.0,
                0,
                0,
                "Pune Junction",
                List.of("CSMT", "Kalyan", "Pune Junction"),
                60.0,
                "RUNNING",
                "running",
                null,
                "09:50 PM"
        );

        ETAController.ETAResponse response = testController.predictETA(request);

        assertNotNull(response);
        assertEquals(24.0, response.currentDelay(), 0.001);
        assertEquals(3.0, response.futureDelay(), 0.001);
        assertEquals(27.0, response.totalDelay(), 0.001);
        assertEquals(27.0, response.expectedDelay(), 0.001);
        assertEquals("10:17 PM", response.predictedETA(), "Predicted ETA must be 09:50 PM + 27 min = 10:17 PM");
    }

    @Test
    void predictETA_train11007_neverEarlierThanScheduledArrival() {
        // Train 11007 audit case:
        // scheduledArrival = "11:05 AM"
        // currentDelay = 8.0, futureDelay = 3.0 -> totalDelay = 11.0
        // Expected arrival: "11:05 AM" + 11 min = "11:16 AM" (NOT 03:03 AM)
        FutureDelayService mockFds = mock(FutureDelayService.class);
        ETAController testController = new ETAController(mockRailRadarService, mockFds);
        when(mockFds.predictFutureDelay(50.0, 8.0, 5.0, 0, 0, 40.0)).thenReturn(3.0);

        ETAController.ETARequest request = new ETAController.ETARequest(
                "11007",
                "Dadar",
                40.0,
                50.0,
                8.0,
                5.0,
                0,
                0,
                "Pune Junction",
                List.of("CSMT", "Dadar", "Pune Junction"),
                50.0,
                "RUNNING",
                "running",
                null,
                "11:05 AM"
        );

        ETAController.ETAResponse response = testController.predictETA(request);

        assertNotNull(response);
        assertEquals(11.0, response.totalDelay(), 0.001);
        assertEquals("11:16 AM", response.predictedETA(), "Predicted ETA must be 11:05 AM + 11 min = 11:16 AM");
    }

    @Test
    void predictETA_scheduledDestinationArrivalFromCache_resolvedAndApplied() {
        // Cache contains destination stop with scheduledArrival
        TrainStatus cachedStatus = new TrainStatus();
        cachedStatus.setTrainNumber("12123");
        StationStopDTO stop1 = new StationStopDTO(1, "PUNE", "Pune Junction", "07:15", "07:15", null, null, null, null, 0.0, "completed", true, "1");
        StationStopDTO stop2 = new StationStopDTO(2, "CSMT", "Mumbai CSMT", "10:25 AM", null, null, null, null, null, 192.0, "upcoming", true, "1");
        cachedStatus.setRoute(List.of(stop1, stop2));
        when(mockRailRadarService.getCachedStatus("12123")).thenReturn(Optional.of(cachedStatus));

        FutureDelayService mockFds = mock(FutureDelayService.class);
        ETAController testController = new ETAController(mockRailRadarService, mockFds);
        when(mockFds.predictFutureDelay(60.0, 10.0, 5.0, 0, 0, 100.0)).thenReturn(5.0);

        // Request doesn't pass scheduledArrival, controller resolves it from cached status route
        ETAController.ETARequest request = new ETAController.ETARequest(
                "12123",
                "Lonavala",
                100.0,
                60.0,
                10.0,
                5.0,
                0,
                0,
                "Mumbai CSMT",
                List.of("Pune Junction", "Mumbai CSMT")
        );

        ETAController.ETAResponse response = testController.predictETA(request);

        assertNotNull(response);
        assertEquals(16.0, response.totalDelay(), 0.001);
        assertEquals("10:41 AM", response.predictedETA(), "Unified ETA-first destination prediction: 10:25 AM + 16 min = 10:41 AM");
    }

    @Test
    void predictETA_midnightCrossing_wrapsAroundMidnightCorrectly() {
        // Scheduled: 11:45 PM, delay: 30 min -> 12:15 AM
        FutureDelayService mockFds = mock(FutureDelayService.class);
        ETAController testController = new ETAController(mockRailRadarService, mockFds);
        when(mockFds.predictFutureDelay(60.0, 20.0, 10.0, 0, 0, 50.0)).thenReturn(10.0);

        ETAController.ETARequest request = new ETAController.ETARequest(
                "12127",
                "Kalyan",
                50.0,
                60.0,
                20.0,
                10.0,
                0,
                0,
                "Pune Junction",
                List.of("CSMT", "Pune Junction"),
                60.0,
                "RUNNING",
                "running",
                null,
                "11:45 PM"
        );

        ETAController.ETAResponse response = testController.predictETA(request);

        assertNotNull(response);
        assertEquals(30.0, response.totalDelay(), 0.001);
        assertEquals("12:15 AM", response.predictedETA());
    }

    @Test
    void calculatePredictedArrival_variousFormatsAndEdgeCases() {
        // 12-hour lowercase
        assertEquals("03:08 AM", ETAController.calculatePredictedArrival("03:03 am", 5.0));
        assertEquals("03:03 AM", ETAController.calculatePredictedArrival("03:03 am", 0.0));

        // 12-hour single-digit hour
        assertEquals("03:08 PM", ETAController.calculatePredictedArrival("3:03 PM", 5.0));

        // 24-hour format
        assertEquals("10:17 PM", ETAController.calculatePredictedArrival("21:50", 27.0));

        // ISO-8601
        assertEquals("10:17 PM", ETAController.calculatePredictedArrival("2026-09-17T21:50:00+05:30", 27.0));

        // Negative delay produces early predicted arrival
        assertEquals("09:35 PM", ETAController.calculatePredictedArrival("09:50 PM", -15.0));

        // Invalid inputs
        assertNull(ETAController.calculatePredictedArrival(null, 10.0));
        assertNull(ETAController.calculatePredictedArrival("N/A", 10.0));
        assertNull(ETAController.calculatePredictedArrival("--", 10.0));
    }

    @Test
    void formatStandardTime_variousInputs() {
        assertEquals("03:03 AM", ETAController.formatStandardTime("03:03 am"));
        assertEquals("03:03 PM", ETAController.formatStandardTime("3:03 PM"));
        assertEquals("02:24 AM", ETAController.formatStandardTime("02:24 am"));
        assertEquals("04:13 PM", ETAController.formatStandardTime("04:13 pm"));
        assertEquals("05:10 PM", ETAController.formatStandardTime("17:10"));
        assertEquals("09:50 PM", ETAController.formatStandardTime("2026-09-17T21:50:00+05:30"));
        assertEquals("Arrived", ETAController.formatStandardTime("Arrived"));
        assertEquals("Not available", ETAController.formatStandardTime(null));
        assertEquals("Not available", ETAController.formatStandardTime("--"));
        assertEquals("Not available", ETAController.formatStandardTime("N/A"));
    }

    // =========================================================================
    // COMPLETED-JOURNEY FINAL ARRIVAL CONSISTENCY TESTS (PART 10: TESTS 1-11)
    // =========================================================================

    @Test
    void test1_completedWithActualArrival() {
        // TEST 1: scheduled = 09:50 PM, actual = 11:39 PM, currentDelay = 33
        // Verify:
        // currentDelay = 33 (NOT overwritten)
        // finalArrivalDelay = 109
        // expectedDelay = 109
        // totalDelay = 109
        // actualArrival = 11:39 PM
        // journey = COMPLETED
        ETAController.ETARequest request = new ETAController.ETARequest(
                "11009",
                "Shivaji Nagar",
                2.5,
                0.0,
                33.0,
                30.0,
                0,
                0,
                "Pune Jn",
                List.of("Mumbai CSMT", "Shivaji Nagar", "Pune Jn"),
                45.0,
                "COMPLETED",
                "completed",
                "11:39 PM",
                "09:50 PM"
        );

        ETAController.ETAResponse response = controller.predictETA(request);

        assertNotNull(response);
        assertEquals(33.0, response.currentDelay(), "currentDelay must NOT be overwritten and retain physical checkpoint delay");
        assertNotNull(response.finalArrivalDelay(), "finalArrivalDelay must be present for completed journey with actual and scheduled arrival");
        assertEquals(109.0, response.finalArrivalDelay(), 0.001, "finalArrivalDelay must be 11:39 PM - 09:50 PM = +109 min");
        assertEquals(109.0, response.expectedDelay(), 0.001, "expectedDelay must match finalArrivalDelay for completed journey");
        assertEquals(109.0, response.totalDelay(), 0.001, "totalDelay must match finalArrivalDelay for completed journey");
        assertEquals("11:39 PM", response.predictedETA(), "Actual arrival must be preserved and formatted");
    }

    @Test
    void test2_completedWithSmallDelay() {
        // TEST 2: scheduled = 02:25 PM, actual = 02:46 PM, currentDelay = 21
        // Verify:
        // currentDelay = 21
        // finalArrivalDelay = 21
        // expectedDelay = 21
        // totalDelay = 21
        ETAController.ETARequest request = new ETAController.ETARequest(
                "12124",
                "Dadar",
                0.0,
                0.0,
                21.0,
                18.0,
                0,
                0,
                "Mumbai CSMT",
                List.of("Pune Jn", "Dadar", "Mumbai CSMT"),
                50.0,
                "COMPLETED",
                "completed",
                "02:46 PM",
                "02:25 PM"
        );

        ETAController.ETAResponse response = controller.predictETA(request);

        assertNotNull(response);
        assertEquals(21.0, response.currentDelay(), "currentDelay remains 21");
        assertEquals(21.0, response.finalArrivalDelay(), 0.001, "finalArrivalDelay = 21 min");
        assertEquals(21.0, response.expectedDelay(), 0.001, "expectedDelay = 21 min");
        assertEquals(21.0, response.totalDelay(), 0.001, "totalDelay = 21 min");
    }

    @Test
    void test3_completedExactlyOnTime() {
        // TEST 3: scheduled = 10:00 AM, actual = 10:00 AM
        // Verify:
        // finalArrivalDelay = 0
        // expectedDelay = 0
        // totalDelay = 0
        ETAController.ETARequest request = new ETAController.ETARequest(
                "12126",
                "Pune Junction",
                0.0,
                0.0,
                0.0,
                0.0,
                0,
                0,
                "Pune Junction",
                List.of("Mumbai CSMT", "Pune Junction"),
                50.0,
                "COMPLETED",
                "completed",
                "10:00 AM",
                "10:00 AM"
        );

        ETAController.ETAResponse response = controller.predictETA(request);

        assertNotNull(response);
        assertEquals(0.0, response.finalArrivalDelay(), 0.001, "finalArrivalDelay = 0");
        assertEquals(0.0, response.expectedDelay(), 0.001, "expectedDelay = 0");
        assertEquals(0.0, response.totalDelay(), 0.001, "totalDelay = 0");
    }

    @Test
    void test4_completedWithActualArrivalAfterMidnight() {
        // TEST 4: scheduled = 11:50 PM, actual = 12:20 AM
        // Verify:
        // finalArrivalDelay = +30 min
        Double delay = ETAController.calculateFinalArrivalDelay("11:50 PM", "12:20 AM");
        assertNotNull(delay);
        assertEquals(30.0, delay, 0.001, "11:50 PM to 12:20 AM across midnight must be +30 min");

        ETAController.ETARequest request = new ETAController.ETARequest(
                "12128",
                "Pune Jn",
                0.0,
                0.0,
                25.0,
                20.0,
                0,
                0,
                "Pune Jn",
                List.of("CSMT", "Pune Jn"),
                50.0,
                "COMPLETED",
                "completed",
                "12:20 AM",
                "11:50 PM"
        );

        ETAController.ETAResponse response = controller.predictETA(request);

        assertNotNull(response);
        assertEquals(25.0, response.currentDelay(), "currentDelay preserved as 25");
        assertEquals(30.0, response.finalArrivalDelay(), 0.001, "finalArrivalDelay = +30 min");
        assertEquals(30.0, response.expectedDelay(), 0.001, "expectedDelay = +30 min");
        assertEquals(30.0, response.totalDelay(), 0.001, "totalDelay = +30 min");
    }

    @Test
    void test5_completedWithoutActualArrival() {
        // TEST 5: scheduled exists, actualArrival missing
        // Verify:
        // finalArrivalDelay = null
        // predicted ETA = "Arrived"
        // No fake final delay is generated
        ETAController.ETARequest request = new ETAController.ETARequest(
                "12124",
                "Mumbai CSMT",
                0.0,
                0.0,
                15.0,
                10.0,
                0,
                0,
                "Mumbai CSMT",
                List.of("Pune Jn", "Mumbai CSMT"),
                50.0,
                "COMPLETED",
                "completed",
                null,
                "02:25 PM"
        );

        ETAController.ETAResponse response = controller.predictETA(request);

        assertNotNull(response);
        assertNull(response.finalArrivalDelay(), "finalArrivalDelay must be null when actualArrival is missing");
        assertEquals("Arrived", response.predictedETA(), "predicted ETA must be Arrived");
    }

    @Test
    void test6_completedWithoutScheduledArrival() {
        // TEST 6: actual exists, scheduled missing
        // Verify:
        // finalArrivalDelay = null
        // actual arrival is preserved
        ETAController.ETARequest request = new ETAController.ETARequest(
                "12124",
                "Mumbai CSMT",
                0.0,
                0.0,
                15.0,
                10.0,
                0,
                0,
                "Mumbai CSMT",
                List.of("Pune Jn", "Mumbai CSMT"),
                50.0,
                "COMPLETED",
                "completed",
                "02:46 PM",
                null
        );

        ETAController.ETAResponse response = controller.predictETA(request);

        assertNotNull(response);
        assertNull(response.finalArrivalDelay(), "finalArrivalDelay must be null when scheduledArrival is missing");
        assertEquals("02:46 PM", response.predictedETA(), "actual arrival is preserved");
    }

    @Test
    void test7_passengerFacingCurrentStationAndRawTelemetry() {
        // TEST 7: Raw currentLocation = penultimate station, journeyStatus = COMPLETED, destination = final route station
        // Verify passenger-facing current station = destination in status DTO, raw telemetry preserved.
        TrainStatus status = new TrainStatus();
        status.setTrainNumber("11009");
        status.setCurrentLocation("Shivaji Nagar");
        status.setDestination("Pune Jn");
        status.setTrainStatus("completed");
        status.setCurrentDelay(33.0);

        StationStopDTO stop1 = new StationStopDTO(1, "CSMT", "Mumbai CSMT", "17:10", "17:10", null, null, null, null, 0.0, "completed", true, "1");
        StationStopDTO stop2 = new StationStopDTO(2, "SVJR", "Shivaji Nagar", "21:30", "21:32", null, null, null, null, 190.0, "completed", true, "1");
        StationStopDTO stop3 = new StationStopDTO(3, "PUNE", "Pune Jn", "21:50", null, "23:39", null, null, null, 192.5, "completed", true, "1");
        status.setRoute(List.of(stop1, stop2, stop3));

        assertEquals("Shivaji Nagar", status.getCurrentLocation(), "Raw telemetry currentLocation is preserved");
        assertEquals("Pune Jn", status.getDestination(), "Destination is Pune Jn");
        assertEquals("completed", status.getTrainStatus(), "Train status is completed");

        // Verify that setting finalArrivalDelay on TrainStatus updates totalDelay and expectedDelay without touching currentDelay
        status.setFinalArrivalDelay(109.0);
        assertEquals(33.0, status.getCurrentDelay(), "currentDelay remains raw physical delay");
        assertEquals(109.0, status.getFinalArrivalDelay(), "finalArrivalDelay is 109");
        assertEquals(109.0, status.getTotalDelay(), "totalDelay reflects finalArrivalDelay");
        assertEquals(109.0, status.getExpectedDelay(), "expectedDelay reflects finalArrivalDelay");
    }

    @Test
    void test8_runningTrainRegression() {
        // TEST 8: Running train regression
        // Verify: currentDelay/futureDelay/expectedDelay/totalDelay remain unchanged
        ETAController.ETARequest request = new ETAController.ETARequest(
                "12123",
                "Lonavala",
                60.0,
                60.0,
                20.0,
                15.0,
                0,
                0,
                "Pune Junction",
                List.of("CSMT", "Lonavala", "Pune Junction"),
                60.0,
                "RUNNING",
                "running",
                null,
                "11:05 AM"
        );

        ETAController.ETAResponse response = controller.predictETA(request);

        assertNotNull(response);
        assertEquals(20.0, response.currentDelay());
        assertNull(response.finalArrivalDelay(), "finalArrivalDelay must be null for non-completed trains");
        assertEquals(response.currentDelay() + response.futureDelay(), response.totalDelay(), 0.001);
        assertEquals(response.totalDelay(), response.expectedDelay(), 0.001);
    }

    @Test
    void test9_atStationRegression() {
        // TEST 9: At-station regression
        // Verify: average-speed ETA behavior remains unchanged
        ETAController.ETARequest request = new ETAController.ETARequest(
                "12127",
                "Shivaji Nagar",
                2.5,
                0.0,
                10.0,
                10.0,
                0,
                0,
                "Pune Junction",
                List.of("CSMT", "Shivaji Nagar", "Pune Junction"),
                50.0,
                "AT_STATION",
                "running",
                null,
                null
        );

        ETAController.ETAResponse response = controller.predictETA(request);

        assertNotNull(response);
        assertNotEquals("N/A", response.predictedETA(), "At-station train with average speed must compute predicted ETA");
        assertTrue(response.etaMinutes() > 0, "dynamic ETA minutes must be positive");
    }

    @Test
    void test10_notStartedRegression() {
        // TEST 10: Not-started regression
        // Verify: scheduled ETA behavior remains unchanged
        FutureDelayService mockFds = mock(FutureDelayService.class);
        ETAController testController = new ETAController(mockRailRadarService, mockFds);
        when(mockFds.predictFutureDelay(0.0, 0.0, 0.0, 0, 0, 192.0)).thenReturn(0.0);

        ETAController.ETARequest request = new ETAController.ETARequest(
                "12125",
                "CSMT",
                192.0,
                0.0,
                0.0,
                0.0,
                0,
                0,
                "Dadar",
                List.of("CSMT", "Dadar", "Pune Junction"),
                55.0,
                "NOT_STARTED",
                "not-started",
                null,
                "09:50 PM"
        );

        ETAController.ETAResponse response = testController.predictETA(request);

        assertNotNull(response);
        assertNull(response.finalArrivalDelay(), "finalArrivalDelay is null for not-started trains");
        assertEquals(0.0, response.totalDelay(), 0.001);
        assertEquals("09:50 PM", response.predictedETA(), "Scheduled arrival is preserved on not-started train");
    }

    @Test
    void test11_trainAgnosticBehavior() {
        // TEST 11: Train-agnostic behavior with two completely fictional trains
        // Fictional Train 1: "99881", "Alpha Station" -> "Omega Terminal", sched "06:15 PM", actual "07:30 PM", currentDelay 15.0
        ETAController.ETARequest train1 = new ETAController.ETARequest(
                "99881",
                "Beta Stop",
                10.0,
                0.0,
                15.0,
                12.0,
                0,
                0,
                "Omega Terminal",
                List.of("Alpha Station", "Beta Stop", "Omega Terminal"),
                40.0,
                "COMPLETED",
                "completed",
                "07:30 PM",
                "06:15 PM"
        );

        ETAController.ETAResponse res1 = controller.predictETA(train1);
        assertNotNull(res1);
        assertEquals(15.0, res1.currentDelay(), "currentDelay = 15");
        assertEquals(75.0, res1.finalArrivalDelay(), 0.001, "06:15 PM to 07:30 PM is +75 min");
        assertEquals(75.0, res1.expectedDelay(), 0.001);
        assertEquals(75.0, res1.totalDelay(), 0.001);
        assertEquals("07:30 PM", res1.predictedETA());

        // Fictional Train 2: "77662", "North City" -> "South Harbor", sched "11:40 PM", actual "12:10 AM", currentDelay 10.0
        ETAController.ETARequest train2 = new ETAController.ETARequest(
                "77662",
                "Midland",
                5.0,
                0.0,
                10.0,
                8.0,
                0,
                0,
                "South Harbor",
                List.of("North City", "Midland", "South Harbor"),
                45.0,
                "COMPLETED",
                "completed",
                "12:10 AM",
                "11:40 PM"
        );

        ETAController.ETAResponse res2 = controller.predictETA(train2);
        assertNotNull(res2);
        assertEquals(10.0, res2.currentDelay(), "currentDelay = 10");
        assertEquals(30.0, res2.finalArrivalDelay(), 0.001, "11:40 PM to 12:10 AM is +30 min");
        assertEquals(30.0, res2.expectedDelay(), 0.001);
        assertEquals(30.0, res2.totalDelay(), 0.001);
        assertEquals("12:10 AM", res2.predictedETA());
    }

    // ==========================================================
    // GLOBAL SIGNED-DELAY SEMANTICS TESTS (PART 15)
    // ==========================================================

    @Test
    void test1_earlyCompletedTrain() {
        Double diff = ETAController.calculateFinalArrivalDelay("10:00 AM", "09:50 AM");
        assertNotNull(diff);
        assertEquals(-10.0, diff, 0.001, "Actual 09:50 AM is 10 min early compared to scheduled 10:00 AM");
    }

    @Test
    void test2_onTimeCompletedTrain() {
        Double diff = ETAController.calculateFinalArrivalDelay("10:00 AM", "10:00 AM");
        assertNotNull(diff);
        assertEquals(0.0, diff, 0.001, "Actual 10:00 AM is exactly on time compared to scheduled 10:00 AM");
    }

    @Test
    void test3_delayedCompletedTrain() {
        Double diff = ETAController.calculateFinalArrivalDelay("10:00 AM", "10:15 AM");
        assertNotNull(diff);
        assertEquals(15.0, diff, 0.001, "Actual 10:15 AM is 15 min late compared to scheduled 10:00 AM");
    }

    @Test
    void test4_earlyNonCompletedTrain() {
        FutureDelayService mockFds = mock(FutureDelayService.class);
        ETAController c = new ETAController(mockRailRadarService, mockFds);
        when(mockFds.predictFutureDelay(60.0, -8.0, 0.0, 0, 0, 50.0)).thenReturn(2.0);

        ETAController.ETARequest req = new ETAController.ETARequest(
                "99881", "StationA", 50.0, 60.0, -8.0, 0.0, 0, 0, "StationB", List.of("StationA", "StationB")
        );

        ETAController.ETAResponse res = c.predictETA(req);
        assertNotNull(res);
        assertEquals(-8.0, res.currentDelay(), 0.001);
        assertEquals(2.0, res.futureDelay(), 0.001);
        assertEquals(-6.0, res.totalDelay(), 0.001);
        assertEquals(-6.0, res.expectedDelay(), 0.001);
    }

    @Test
    void test5_onTimeNonCompletedTrain() {
        FutureDelayService mockFds = mock(FutureDelayService.class);
        ETAController c = new ETAController(mockRailRadarService, mockFds);
        when(mockFds.predictFutureDelay(60.0, 0.0, 0.0, 0, 0, 50.0)).thenReturn(0.0);

        ETAController.ETARequest req = new ETAController.ETARequest(
                "99882", "StationA", 50.0, 60.0, 0.0, 0.0, 0, 0, "StationB", List.of("StationA", "StationB")
        );

        ETAController.ETAResponse res = c.predictETA(req);
        assertNotNull(res);
        assertEquals(0.0, res.currentDelay(), 0.001);
        assertEquals(0.0, res.futureDelay(), 0.001);
        assertEquals(0.0, res.totalDelay(), 0.001);
        assertEquals(0.0, res.expectedDelay(), 0.001);
    }

    @Test
    void test6_delayedNonCompletedTrain() {
        FutureDelayService mockFds = mock(FutureDelayService.class);
        ETAController c = new ETAController(mockRailRadarService, mockFds);
        when(mockFds.predictFutureDelay(60.0, 8.0, 0.0, 0, 0, 50.0)).thenReturn(2.0);

        ETAController.ETARequest req = new ETAController.ETARequest(
                "99883", "StationA", 50.0, 60.0, 8.0, 0.0, 0, 0, "StationB", List.of("StationA", "StationB")
        );

        ETAController.ETAResponse res = c.predictETA(req);
        assertNotNull(res);
        assertEquals(8.0, res.currentDelay(), 0.001);
        assertEquals(2.0, res.futureDelay(), 0.001);
        assertEquals(10.0, res.totalDelay(), 0.001);
        assertEquals(10.0, res.expectedDelay(), 0.001);
    }

    @Test
    void test7_earlyETA() {
        String pred = ETAController.calculatePredictedArrival("10:00 AM", -10.0);
        assertEquals("09:50 AM", pred);
    }

    @Test
    void test8_onTimeETA() {
        String pred = ETAController.calculatePredictedArrival("10:00 AM", 0.0);
        assertEquals("10:00 AM", pred);
    }

    @Test
    void test9_delayedETA() {
        String pred = ETAController.calculatePredictedArrival("10:00 AM", 15.0);
        assertEquals("10:15 AM", pred);
    }

    @Test
    void test13_midnightCrossing() {
        Double diff = ETAController.calculateFinalArrivalDelay("11:50 PM", "12:20 AM");
        assertNotNull(diff);
        assertEquals(30.0, diff, 0.001);
    }

    @Test
    void test14_earlyTimeComparison() {
        Double diff = ETAController.calculateFinalArrivalDelay("10:00 AM", "09:45 AM");
        assertNotNull(diff);
        assertEquals(-15.0, diff, 0.001);
    }

    @Test
    void test15_trainAgnosticArbitraryTrainAndStations() {
        Double diff = ETAController.calculateFinalArrivalDelay("04:30 PM", "04:18 PM");
        assertNotNull(diff);
        assertEquals(-12.0, diff, 0.001);

        String pred = ETAController.calculatePredictedArrival("08:15 AM", -15.0);
        assertEquals("08:00 AM", pred);
    }
}
