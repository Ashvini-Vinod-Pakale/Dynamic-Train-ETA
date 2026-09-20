package com.traineta.backend;

import com.traineta.backend.dto.StationStopDTO;
import com.traineta.backend.service.RailRadarService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api")
@CrossOrigin(
        origins = "http://localhost:5173",
        methods = {
                RequestMethod.GET,
                RequestMethod.POST,
                RequestMethod.PUT,
                RequestMethod.DELETE,
                RequestMethod.OPTIONS
        }
)
public class FutureDelayController {

    private final RailRadarService railRadarService;
    private final FutureDelayService futureDelayService;

    @Autowired
    public FutureDelayController(RailRadarService railRadarService, FutureDelayService futureDelayService) {
        this.railRadarService = railRadarService;
        this.futureDelayService = futureDelayService;
    }

    public FutureDelayController(RailRadarService railRadarService) {
        this(railRadarService, new FutureDelayService());
    }

    // =========================================
    // FUTURE DELAY PREDICTION
    // =========================================

    @PostMapping("/predict/future-delay")
    public PredictionResponse predict(
            @RequestBody PredictionRequest request) {

        double safeSpeed = Double.isFinite(request.currentSpeed()) ? Math.max(0.0, request.currentSpeed()) : 0.0;
        double safeCurrentDelay = Double.isFinite(request.currentDelay()) ? request.currentDelay() : 0.0;
        double safePreviousDelay = Double.isFinite(request.previousDelay()) ? request.previousDelay() : 0.0;

        double distance = 0.0;
        if (request.routeDistance() != null && Double.isFinite(request.routeDistance()) && request.routeDistance() > 0) {
            distance = request.routeDistance();
        } else if (request.trainNumber() != null && !request.trainNumber().trim().isEmpty()) {
            var cachedOpt = railRadarService.getCachedStatus(request.trainNumber().trim());
            if (cachedOpt.isPresent() && cachedOpt.get().getRouteDistance() != null && cachedOpt.get().getRouteDistance() > 0) {
                distance = cachedOpt.get().getRouteDistance();
            }
        }

        double prediction = futureDelayService.predictFutureDelay(
                safeSpeed,
                safeCurrentDelay,
                safePreviousDelay,
                request.weatherFactor(),
                request.trafficFactor(),
                distance
        );

        if (!Double.isFinite(prediction)) {
            prediction = 0.0;
        }

        prediction = Math.max(0.0, prediction);
        prediction = Math.round(prediction * 100.0) / 100.0;

        return new PredictionResponse(prediction);
    }

    // =========================================
    // STATION-WISE PREDICTION
    // =========================================

    @PostMapping("/predict/station-wise")
    public StationWiseResponse predictStationWise(
            @RequestBody StationWiseRequest request) {

        double safeCurrentSpeed = Double.isFinite(request.currentSpeed()) ? Math.max(0.0, request.currentSpeed()) : 0.0;
        double currentDelay = Double.isFinite(request.currentDelay()) ? request.currentDelay() : 0.0;
        double safePreviousDelay = Double.isFinite(request.previousDelay()) ? request.previousDelay() : 0.0;

        double routeDist = 0.0;
        if (request.routeDistance() != null && Double.isFinite(request.routeDistance()) && request.routeDistance() > 0) {
            routeDist = request.routeDistance();
        } else if (request.trainNumber() != null && !request.trainNumber().trim().isEmpty()) {
            var cachedOpt = railRadarService.getCachedStatus(request.trainNumber().trim());
            if (cachedOpt.isPresent() && cachedOpt.get().getRouteDistance() != null && cachedOpt.get().getRouteDistance() > 0) {
                routeDist = cachedOpt.get().getRouteDistance();
            }
        }

        double additionalDelay =
                futureDelayService.predictFutureDelay(
                        safeCurrentSpeed,
                        currentDelay,
                        safePreviousDelay,
                        request.weatherFactor(),
                        request.trafficFactor(),
                        routeDist
                );

        if (!Double.isFinite(additionalDelay)) {
            additionalDelay = 0.0;
        }
        additionalDelay = Math.max(0.0, additionalDelay);

        List<StationPrediction> predictions = new ArrayList<>();
        String currentLoc = request.currentLocation() != null ? request.currentLocation().trim() : "";

        // Check if real route stops are cached for this train
        var cachedOpt = request.trainNumber() != null ? railRadarService.getCachedStatus(request.trainNumber().trim()) : Optional.<TrainStatus>empty();

        // 1. COMPLETED TRAIN SHORT-CIRCUIT: Bypass sectional kinematics for completed journeys
        if (isJourneyCompleted(cachedOpt, currentLoc)) {
            return new StationWiseResponse(request.trainNumber(), List.of());
        }

        // 2. ACTIVE TRAIN: Real timetable & kinematic sectional prediction
        if (cachedOpt.isPresent() && cachedOpt.get().getRoute() != null && !cachedOpt.get().getRoute().isEmpty()) {
            List<StationStopDTO> routeStops = cachedOpt.get().getRoute();
            int currentIdx = -1;
            for (int i = 0; i < routeStops.size(); i++) {
                var stop = routeStops.get(i);
                if (stop.getStationName() != null && !currentLoc.isEmpty()
                        && (stop.getStationName().equalsIgnoreCase(currentLoc)
                            || (stop.getStationCode() != null && stop.getStationCode().equalsIgnoreCase(currentLoc)))) {
                    currentIdx = i;
                    break;
                }
            }

            if (currentIdx == -1) {
                for (int i = 0; i < routeStops.size(); i++) {
                    if ("current".equalsIgnoreCase(routeStops.get(i).getStatus())) {
                        currentIdx = i;
                        break;
                    }
                }
            }

            int totalStops = routeStops.size();
            int startIdx = currentIdx >= 0 ? currentIdx + 1 : 0;
            StationStopDTO currentStop = (currentIdx >= 0 && currentIdx < totalStops)
                    ? routeStops.get(currentIdx)
                    : routeStops.get(0);

            // Build list of UPCOMING COMMERCIAL HALT STATIONS ONLY
            List<StationStopDTO> upcomingHalts = new ArrayList<>();
            for (int i = startIdx; i < totalStops; i++) {
                var stop = routeStops.get(i);
                if (stop.getStationName() == null || stop.getStationName().trim().isEmpty()) continue;
                if (isHaltStop(stop, i, totalStops)) {
                    upcomingHalts.add(stop);
                }
            }

            if (upcomingHalts.isEmpty()) {
                if (isHaltStop(currentStop, currentIdx >= 0 ? currentIdx : 0, totalStops)) {
                    upcomingHalts.add(currentStop);
                }
            }

            int N = upcomingHalts.size();
            if (N > 0) {
                boolean isRunning = isTrainRunning(cachedOpt, safeCurrentSpeed);

                double[] schedArrs = new double[N];
                double[] schedDeps = new double[N];
                double[] dwells = new double[N];
                double[] deltaDists = new double[N];
                double[] schedRuntimes = new double[N];
                double[] rawRuntimes = new double[N];

                // Continuous timeline normalization across midnights
                Integer prevDepM = parseTimeMinutes(currentStop.getScheduledDeparture());
                if (prevDepM == null) {
                    prevDepM = parseTimeMinutes(currentStop.getScheduledArrival());
                }
                if (prevDepM == null && !upcomingHalts.isEmpty()) {
                    Integer firstArrM = parseTimeMinutes(upcomingHalts.get(0).getScheduledArrival());
                    prevDepM = firstArrM != null ? Math.max(0, firstArrM - 30) : 0;
                }
                if (prevDepM == null) {
                    prevDepM = 0;
                }

                double runningSchedMinutes = prevDepM;
                for (int i = 0; i < N; i++) {
                    StationStopDTO halt = upcomingHalts.get(i);
                    Integer arrM = parseTimeMinutes(halt.getScheduledArrival());
                    if (arrM == null) {
                        arrM = parseTimeMinutes(halt.getScheduledDeparture());
                    }
                    Integer depM = parseTimeMinutes(halt.getScheduledDeparture());
                    if (depM == null) {
                        depM = arrM;
                    }

                    if (arrM != null) {
                        double normArr = arrM;
                        while (normArr < runningSchedMinutes) {
                            normArr += 1440.0;
                        }
                        schedArrs[i] = normArr;
                        runningSchedMinutes = normArr;
                    } else {
                        schedArrs[i] = runningSchedMinutes + 30.0;
                        runningSchedMinutes = schedArrs[i];
                    }

                    if (depM != null) {
                        double normDep = depM;
                        while (normDep < runningSchedMinutes) {
                            normDep += 1440.0;
                        }
                        schedDeps[i] = normDep;
                        runningSchedMinutes = normDep;
                    } else {
                        schedDeps[i] = schedArrs[i];
                    }

                    // Real scheduled dwell: dep - arr, 0 if identical or missing
                    dwells[i] = Math.max(0.0, schedDeps[i] - schedArrs[i]);

                    // Scheduled section runtime
                    double prevDep = (i == 0) ? prevDepM : schedDeps[i - 1];
                    schedRuntimes[i] = Math.max(1.0, schedArrs[i] - prevDep);
                }

                // Section distances
                Double d0 = getSafeDistance(currentStop);
                if (d0 == null && currentIdx <= 0) {
                    d0 = 0.0;
                }
                for (int i = 0; i < N; i++) {
                    Double dPrev = (i == 0) ? d0 : getSafeDistance(upcomingHalts.get(i - 1));
                    Double dCurr = getSafeDistance(upcomingHalts.get(i));
                    if (dPrev != null && dCurr != null && dCurr > dPrev) {
                        deltaDists[i] = dCurr - dPrev;
                    } else {
                        deltaDists[i] = 0.0;
                    }
                }

                // Fallback: If section distances missing but remaining route distance available
                double sumDist = 0.0;
                for (double d : deltaDists) sumDist += d;
                double sumSched = 0.0;
                for (double s : schedRuntimes) sumSched += s;
                if (sumDist <= 0.0 && routeDist > 0.0 && sumSched > 0.0) {
                    for (int i = 0; i < N; i++) {
                        deltaDists[i] = routeDist * (schedRuntimes[i] / sumSched);
                    }
                }

                // Speed hierarchy & raw traversal times
                Double avgSpeedObj = cachedOpt.isPresent() ? cachedOpt.get().getAverageSpeed() : null;
                double avgSpeed = (avgSpeedObj != null && Double.isFinite(avgSpeedObj) && avgSpeedObj > 0) ? avgSpeedObj : 0.0;

                for (int i = 0; i < N; i++) {
                    double dist = deltaDists[i];
                    double sTime = schedRuntimes[i];
                    double sSpeed = (dist > 0 && sTime > 0) ? (60.0 * dist / sTime) : 0.0;

                    double effSpeed;
                    if (i == 0) {
                        // Immediate section:
                        if (isRunning && safeCurrentSpeed > 0) {
                            effSpeed = safeCurrentSpeed;
                        } else if (avgSpeed > 0) {
                            effSpeed = avgSpeed;
                        } else if (sSpeed > 0) {
                            effSpeed = sSpeed;
                        } else {
                            effSpeed = 0.0;
                        }
                    } else {
                        // Future sections:
                        if (avgSpeed > 0) {
                            effSpeed = avgSpeed;
                        } else if (sSpeed > 0) {
                            effSpeed = sSpeed;
                        } else {
                            effSpeed = 0.0;
                        }
                    }

                    if (dist > 0 && effSpeed > 0) {
                        rawRuntimes[i] = (dist / effSpeed) * 60.0;
                    } else {
                        rawRuntimes[i] = sTime > 0 ? sTime : 1.0;
                    }
                    if (!Double.isFinite(rawRuntimes[i]) || rawRuntimes[i] <= 0) {
                        rawRuntimes[i] = sTime > 0 ? sTime : 1.0;
                    }
                }

                // Route-level ML delay reconciliation:
                // additionalDelay represents corridor-level delay predicted by FutureDelayService
                // (weather, traffic, congestion). It is allocated proportionally across sections by distance
                // without erasing local kinematic recovery, slack, or speed variation.
                double gap = Double.isFinite(additionalDelay) ? Math.max(0.0, additionalDelay) : 0.0;

                double totalDist = 0.0;
                for (double d : deltaDists) totalDist += d;
                double totalSched = 0.0;
                for (double s : schedRuntimes) totalSched += s;

                double[] reconciledRuntimes = new double[N];
                for (int i = 0; i < N; i++) {
                    double adj;
                    if (totalDist > 0) {
                        adj = gap * (deltaDists[i] / totalDist);
                    } else if (totalSched > 0) {
                        adj = gap * (schedRuntimes[i] / totalSched);
                    } else {
                        adj = gap / N;
                    }
                    double rec = rawRuntimes[i] + adj;
                    // Traversal time must remain positive
                    if (!Double.isFinite(rec) || rec <= 0) {
                        rec = Math.max(1.0, rawRuntimes[i]);
                    }
                    reconciledRuntimes[i] = rec;
                }

                // Reconciled sequential propagation: ETA is primary, delay is secondary
                double currentDep = prevDepM + currentDelay;
                for (int i = 0; i < N; i++) {
                    StationStopDTO halt = upcomingHalts.get(i);
                    String stnName = halt.getStationName();

                    double predArrMin = currentDep + reconciledRuntimes[i];

                    String scheduledStr = halt.getScheduledArrival() != null && !halt.getScheduledArrival().isEmpty()
                            ? halt.getScheduledArrival()
                            : (halt.getScheduledDeparture() != null ? halt.getScheduledDeparture() : null);

                    double stationDelay = round(predArrMin - schedArrs[i]);
                    String predictedETA;
                    if (scheduledStr != null && !scheduledStr.equalsIgnoreCase("Not available")) {
                        predictedETA = calculatePredictedTime(scheduledStr, stationDelay);
                    } else {
                        predictedETA = formatMinutesToStandardTime((int) Math.round(predArrMin));
                        scheduledStr = "Not available";
                    }

                    predictions.add(new StationPrediction(stnName, scheduledStr, stationDelay, predictedETA));

                    if (i < N - 1) {
                        // Early trains cannot depart before scheduled departure
                        currentDep = Math.max(predArrMin + dwells[i], schedDeps[i]);
                    }
                }
            }
        } else if (request.stations() != null && !request.stations().isEmpty()) {
            // Degraded fallback when no route timetable is available in cache
            List<String> stnList = request.stations();
            int currentIdx = -1;
            for (int i = 0; i < stnList.size(); i++) {
                if (stnList.get(i).equalsIgnoreCase(currentLoc)) {
                    currentIdx = i;
                    break;
                }
            }

            int startIdx = currentIdx >= 0 ? currentIdx + 1 : 0;
            List<String> upcomingStations = new ArrayList<>();
            for (int i = startIdx; i < stnList.size(); i++) {
                String stnName = stnList.get(i);
                if (stnName != null && !stnName.trim().isEmpty()) {
                    upcomingStations.add(stnName);
                }
            }

            int N = upcomingStations.size();
            for (int i = 0; i < N; i++) {
                String stnName = upcomingStations.get(i);
                double fraction = (i + 1.0) / (double) N;
                double stationDelay = round(currentDelay + (fraction * additionalDelay));
                predictions.add(new StationPrediction(stnName, "Not available", stationDelay, "Not available"));
            }
        }

        return new StationWiseResponse(
                request.trainNumber(),
                predictions
        );
    }

    // =========================================
    // HALT STOP CHECK
    // =========================================

    private boolean isHaltStop(StationStopDTO stop, int index, int totalCount) {
        if (stop == null) return false;
        // Origin and Destination stations are always commercial halts
        if (index == 0 || (totalCount > 1 && index == totalCount - 1)) {
            return true;
        }
        if (Boolean.FALSE.equals(stop.getIsHalt())) {
            return false;
        }
        if (Boolean.TRUE.equals(stop.getIsHalt())) {
            return true;
        }
        // Timetable stop characteristics
        String arr = stop.getScheduledArrival();
        String dep = stop.getScheduledDeparture();
        if (arr != null && dep != null && !arr.trim().equalsIgnoreCase(dep.trim())) {
            return true;
        }
        if (stop.getPlatform() != null && !stop.getPlatform().trim().isEmpty() && !stop.getPlatform().trim().equals("--")) {
            return true;
        }
        return true;
    }

    private Integer parseTimeMinutes(String timeStr) {
        if (timeStr == null) return null;
        int[] parts = ETAController.parseTimeParts(timeStr);
        if (parts == null) return null;
        return parts[0] * 60 + parts[1];
    }

    private Double getSafeDistance(StationStopDTO stop) {
        if (stop == null) return null;
        Double d = stop.getDistanceFromOrigin();
        if (d != null && Double.isFinite(d) && d >= 0.0) {
            return d;
        }
        return null;
    }

    private boolean isTrainRunning(Optional<TrainStatus> cachedOpt, double currentSpeed) {
        if (currentSpeed > 0) return true;
        if (cachedOpt.isPresent()) {
            String status = cachedOpt.get().getTrainStatus();
            if (status != null) {
                String s = status.trim().toLowerCase();
                return s.equals("running") || s.equals("active") || s.equals("on the way")
                        || s.equals("en route") || s.equals("en_route");
            }
        }
        return false;
    }

    private boolean isJourneyCompleted(Optional<TrainStatus> cachedOpt, String currentLoc) {
        if (cachedOpt == null || cachedOpt.isEmpty()) return false;
        TrainStatus cached = cachedOpt.get();
        if (ETAController.isCompletedStatus(cached.getTrainStatus())) {
            return true;
        }
        if (cached.getDestination() != null && !cached.getDestination().trim().isEmpty()
                && currentLoc != null && !currentLoc.trim().isEmpty()) {
            if (cached.getDestination().trim().equalsIgnoreCase(currentLoc.trim())) {
                return true;
            }
        }
        if (cached.getRoute() != null && !cached.getRoute().isEmpty()) {
            var lastStop = cached.getRoute().get(cached.getRoute().size() - 1);
            if (lastStop.getStationName() != null && currentLoc != null
                    && lastStop.getStationName().trim().equalsIgnoreCase(currentLoc.trim())) {
                return true;
            }
            if (lastStop.getStatus() != null && ETAController.isCompletedStatus(lastStop.getStatus())) {
                return true;
            }
        }
        return false;
    }

    public static String formatMinutesToStandardTime(int totalMinutes) {
        int normalized = ((totalMinutes % (24 * 60)) + (24 * 60)) % (24 * 60);
        int finalHours = normalized / 60;
        int finalMinutes = normalized % 60;
        String ampm = finalHours >= 12 ? "PM" : "AM";
        int displayHour = finalHours % 12;
        if (displayHour == 0) displayHour = 12;
        return String.format("%02d:%02d %s", displayHour, finalMinutes, ampm);
    }

    // =========================================
    // CALCULATE FUTURE DELAY
    // =========================================

    private double calculateFutureDelay(
            double currentSpeed,
            double currentDelay,
            double previousDelay,
            int weatherFactor,
            int trafficFactor) {
        return calculateFutureDelay(currentSpeed, currentDelay, previousDelay, weatherFactor, trafficFactor, 0.0);
    }

    private double calculateFutureDelay(
            double currentSpeed,
            double currentDelay,
            double previousDelay,
            int weatherFactor,
            int trafficFactor,
            double routeDistance) {

        return futureDelayService.predictFutureDelay(
                currentSpeed,
                currentDelay,
                previousDelay,
                weatherFactor,
                trafficFactor,
                routeDistance
        );
    }

    // =========================================
    // CALCULATE PREDICTED TIME
    // =========================================

    public static String calculatePredictedTime(
            String scheduledTime,
            double delayMinutes) {

        if (scheduledTime == null || scheduledTime.trim().isEmpty() || scheduledTime.equalsIgnoreCase("Not available")) {
            return "Not available";
        }

        try {
            String predicted = ETAController.calculatePredictedArrival(scheduledTime, delayMinutes);
            if (predicted != null) {
                return predicted;
            }
        } catch (Exception ignored) {
        }

        return scheduledTime;
    }

    // =========================================
    // ROUND
    // =========================================

    private double round(double value) {

        return Math.round(value * 100.0) / 100.0;
    }

    // =========================================
    // REQUEST: FUTURE DELAY
    // =========================================

    public record PredictionRequest(
            double currentSpeed,
            double currentDelay,
            double previousDelay,
            int weatherFactor,
            int trafficFactor,
            Double routeDistance,
            String trainNumber
    ) {
        public PredictionRequest(
                double currentSpeed,
                double currentDelay,
                double previousDelay,
                int weatherFactor,
                int trafficFactor) {
            this(currentSpeed, currentDelay, previousDelay, weatherFactor, trafficFactor, null, null);
        }

        public PredictionRequest(
                double currentSpeed,
                double currentDelay,
                double previousDelay,
                int weatherFactor,
                int trafficFactor,
                Double routeDistance) {
            this(currentSpeed, currentDelay, previousDelay, weatherFactor, trafficFactor, routeDistance, null);
        }
    }

    // =========================================
    // RESPONSE: FUTURE DELAY
    // =========================================

    public record PredictionResponse(

            double predictedFutureDelay

    ) {}

    // =========================================
    // REQUEST: STATION-WISE
    // =========================================

    public record StationWiseRequest(
            String trainNumber,
            String currentLocation,
            double currentSpeed,
            double currentDelay,
            double previousDelay,
            int weatherFactor,
            int trafficFactor,
            List<String> stations,
            Double routeDistance
    ) {
        public StationWiseRequest(
                String trainNumber,
                String currentLocation,
                double currentSpeed,
                double currentDelay,
                double previousDelay,
                int weatherFactor,
                int trafficFactor,
                List<String> stations) {
            this(trainNumber, currentLocation, currentSpeed, currentDelay, previousDelay, weatherFactor, trafficFactor, stations, null);
        }

        public StationWiseRequest(
                String trainNumber,
                String currentLocation,
                double currentSpeed,
                double currentDelay,
                double previousDelay,
                int weatherFactor,
                int trafficFactor) {
            this(trainNumber, currentLocation, currentSpeed, currentDelay, previousDelay, weatherFactor, trafficFactor, null, null);
        }
    }

    // =========================================
    // RESPONSE: STATION-WISE
    // =========================================

    public record StationWiseResponse(

            String trainNumber,

            List<StationPrediction> stationPredictions

    ) {}

    // =========================================
    // STATION PREDICTION
    // =========================================

    public record StationPrediction(

            String station,

            String scheduledTime,

            double predictedDelay,

            String predictedETA

    ) {}
}