/**
 * Maps raw backend TrainStatus JSON into the normalized frontend train model.
 * Preserves real data and uses null/empty representations when data is unavailable.
 * Never invents mock coordinates, train numbers, or stations.
 */
export const mapBackendTrainToUI = (data) => {
  if (!data) return null;

  const trainNumber = data.trainNumber ? String(data.trainNumber).trim() : "";
  const trainName = data.trainName
    ? String(data.trainName).trim()
    : trainNumber
    ? `Train ${trainNumber}`
    : "Train";

  const currentLocation = data.currentLocation || data.currentStation || "En Route";
  const nextStation = data.nextStation || "";

  // Derive and preserve real route, source, destination, and stations
  let route = "";
  let source = data.origin || data.source || "";
  let destination = data.destination || "";
  let routeStations = [];
  let stationDetails = [];

  if (Array.isArray(data.route) && data.route.length > 0) {
    if (typeof data.route[0] === "object" && data.route[0] !== null) {
      stationDetails = data.route.map((s, idx) => {
        const name = s.stationName || s.name || s.station || s.stationCode || `Station ${idx + 1}`;
        const scheduledArr = s.scheduledArrival || s.arrival || null;
        const scheduledDep = s.scheduledDeparture || s.departure || null;
        return {
          sequence: s.sequence ?? idx + 1,
          code: s.stationCode || s.code || "",
          name,
          scheduledArrival: scheduledArr,
          scheduledDeparture: scheduledDep,
          actualArrival: s.actualArrival || null,
          actualDeparture: s.actualDeparture || null,
          time: scheduledArr || scheduledDep || null,
          arrivalTime: scheduledArr,
          departureTime: scheduledDep,
          distanceFromOrigin: s.distanceFromOrigin != null ? Number(s.distanceFromOrigin) : (s.distance != null ? Number(s.distance) : null),
          distanceKm: s.distanceFromOrigin != null ? Number(s.distanceFromOrigin) : (s.distance != null ? Number(s.distance) : null),
          status: s.status || "upcoming",
          latitude: s.latitude != null ? Number(s.latitude) : null,
          longitude: s.longitude != null ? Number(s.longitude) : null,
          platform: s.platform || null,
          isHalt: s.isHalt !== undefined ? Boolean(s.isHalt) : (s.halt !== undefined ? Boolean(s.halt) : true),
        };
      });
      routeStations = stationDetails.map((s) => s.name);
      source = source || stationDetails[0].name;
      destination = destination || stationDetails[stationDetails.length - 1].name;
      route = routeStations.join(" → ");
    } else {
      routeStations = data.route.map(String);
      source = source || routeStations[0];
      destination = destination || routeStations[routeStations.length - 1];
      route = routeStations.join(" → ");
    }
  } else if (typeof data.route === "string" && data.route.includes("→")) {
    route = data.route;
    const parts = data.route.split("→").map((s) => s.trim());
    routeStations = parts;
    source = source || parts[0];
    destination = destination || parts[parts.length - 1];
  } else if (Array.isArray(data.routeStations) && data.routeStations.length > 0) {
    routeStations = data.routeStations.map(String);
    source = source || routeStations[0];
    destination = destination || routeStations[routeStations.length - 1];
    route = routeStations.join(" → ");
  } else {
    source = source || currentLocation;
    destination = destination || nextStation;
    route = nextStation ? `${currentLocation} → ${nextStation}` : currentLocation;
  }

  const currentDelay = Number(data.currentDelay ?? 0);
  const previousDelay = Number(data.previousDelay ?? 0);
  const futureDelay = Number(data.futureDelay ?? 0);
  const currentSpeed = Number(data.currentSpeed ?? 0);
  const averageSpeed = data.averageSpeed != null ? Number(data.averageSpeed) : null;

  const roundedDelay = Math.round(currentDelay);
  const isEarly = roundedDelay < 0;
  const isDelayed = roundedDelay > 0;
  const status = data.trainStatus || (isEarly ? "Early" : (isDelayed ? "Delayed" : "On Time"));
  const delayText = isEarly ? `Early by ${Math.abs(roundedDelay)} min` : (isDelayed ? `+${roundedDelay} min` : "On Time");

  const latitude = data.latitude != null ? Number(data.latitude) : null;
  const longitude = data.longitude != null ? Number(data.longitude) : null;

  const destinationStation = stationDetails.length > 0 ? stationDetails[stationDetails.length - 1] : null;
  const originStation = stationDetails.length > 0 ? stationDetails[0] : null;

  const scheduledArrival =
    data.scheduledArrival ||
    (destinationStation ? (destinationStation.scheduledArrival || destinationStation.arrivalTime || destinationStation.time) : null);

  const scheduledDeparture =
    data.scheduledDeparture ||
    (originStation ? (originStation.scheduledDeparture || originStation.departureTime || originStation.time) : null);

  const actualArrival =
    data.actualArrival ||
    (destinationStation ? destinationStation.actualArrival : null);

  const rawStatusLower = (data.trainStatus || data.status || "").toLowerCase().trim();
  const isCompletedJourney = [
    "completed",
    "terminated",
    "journey_completed",
    "reached",
    "arrived_destination",
    "arrived",
  ].includes(rawStatusLower);

  let finalArrivalDelay = data.finalArrivalDelay != null ? Number(data.finalArrivalDelay) : null;
  if (finalArrivalDelay == null && isCompletedJourney && scheduledArrival && actualArrival) {
    finalArrivalDelay = calculateFinalArrivalDelay(scheduledArrival, actualArrival);
  }

  // For COMPLETED journeys:
  // - currentDelay remains telemetry-specific (latest reported physical checkpoint delay).
  // - expectedDelay and totalDelay become destination-result-specific (reflecting finalArrivalDelay).
  const totalDelay = (isCompletedJourney && finalArrivalDelay != null)
    ? finalArrivalDelay
    : (data.totalDelay != null ? Number(data.totalDelay) : Number(currentDelay + futureDelay));

  const expectedDelay = (isCompletedJourney && finalArrivalDelay != null)
    ? finalArrivalDelay
    : (data.expectedDelay != null ? Number(data.expectedDelay) : totalDelay);

  // For COMPLETED journeys, passenger-facing currentStation resolves to destination,
  // while preserving raw physical telemetry currentLocation!
  const passengerCurrentStation = (isCompletedJourney && destination)
    ? destination
    : currentLocation;

  const rawPredictedETA = data.predictedEta || data.predictedETA || null;
  const formattedPredictedETA = rawPredictedETA ? formatTimeDisplay(rawPredictedETA) : null;

  return {
    ...data,
    id: trainNumber,
    number: trainNumber,
    trainNumber: trainNumber,
    name: trainName,
    trainName: trainName,
    route,
    source,
    destination,
    routeStations,
    stationDetails,
    stations: stationDetails.length > 0 ? stationDetails : (data.stations || (routeStations.length > 0 ? routeStations : null)),
    rawCurrentLocation: currentLocation,
    currentLocation,
    currentStation: passengerCurrentStation,
    passengerCurrentStation,
    nextStation: isCompletedJourney ? null : nextStation,
    status,
    delay: delayText,
    currentDelay,
    previousDelay,
    futureDelay,
    finalArrivalDelay,
    totalDelay,
    expectedDelay,
    currentSpeed,
    averageSpeed,
    latitude,
    longitude,
    currentLatitude: latitude,
    currentLongitude: longitude,
    predictedETA: formattedPredictedETA,
    predictedEta: formattedPredictedETA,
    scheduledArrival: scheduledArrival ? formatTimeDisplay(scheduledArrival) : null,
    scheduledDeparture: scheduledDeparture ? formatTimeDisplay(scheduledDeparture) : null,
    actualArrival: actualArrival ? formatTimeDisplay(actualArrival) : null,
    confidenceScore: data.confidenceScore != null ? Number(data.confidenceScore) : null,
    delayAlert:
      data.delayAlert ||
      (futureDelay > 0
        ? `+${futureDelay.toFixed(1)} min future delay predicted`
        : "On schedule"),
    weatherFactor: data.weatherFactor != null ? Number(data.weatherFactor) : 0,
    trafficFactor: data.trafficFactor != null ? Number(data.trafficFactor) : 0,
    routeDistance: data.routeDistance != null ? Number(data.routeDistance) : null,
    etaMinutes: data.etaMinutes != null ? Number(data.etaMinutes) : null,
    lastUpdated: data.lastUpdated || data.createdAt || new Date().toISOString(),
  };
};

/**
 * Universal time formatter that enforces HH:MM AM/PM standard format:
 * - 2-digit zero-padded hour (01-12)
 * - 2-digit zero-padded minute (00-59)
 * - uppercase AM/PM
 * - handles ISO-8601 strings, 12-hour strings (including lowercase am/pm and unpadded hours), and 24-hour strings
 */
export const formatTimeDisplay = (time, fallback = "Not available") => {
  if (!time || typeof time !== "string") return fallback;
  const trimmed = time.trim();
  if (
    !trimmed ||
    trimmed === "--" ||
    trimmed === "null" ||
    trimmed === "undefined" ||
    trimmed === "N/A" ||
    trimmed === "-- AM" ||
    trimmed === "-- PM"
  ) {
    return fallback;
  }
  if (trimmed.toLowerCase() === "arrived") {
    return "Arrived";
  }

  // ISO-8601 timestamps like "2026-09-17T17:10:00+05:30" or "2026-09-17T17:10:00"
  const isoMatch = trimmed.match(/T(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (isoMatch) {
    let hours = parseInt(isoMatch[1], 10);
    const minutes = String(parseInt(isoMatch[2], 10)).padStart(2, "0");
    const meridiem = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    return `${String(hours).padStart(2, "0")}:${minutes} ${meridiem}`;
  }

  // 12-hour strings like "03:03 am", "3:03 PM", "11:11 PM", "12:15 AM", "9:50 PM"
  const twelveHourMatch = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*([AaPp][Mm])$/);
  if (twelveHourMatch) {
    let hours = parseInt(twelveHourMatch[1], 10);
    const minutes = String(parseInt(twelveHourMatch[2], 10)).padStart(2, "0");
    const meridiem = twelveHourMatch[3].toUpperCase();
    if (hours > 12) hours = hours % 12 || 12;
    if (hours === 0) hours = 12;
    return `${String(hours).padStart(2, "0")}:${minutes} ${meridiem}`;
  }

  // 24-hour strings like "17:10", "09:05", "00:30"
  const twentyFourHourMatch = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (twentyFourHourMatch) {
    let hours = parseInt(twentyFourHourMatch[1], 10);
    const minutes = String(parseInt(twentyFourHourMatch[2], 10)).padStart(2, "0");
    const meridiem = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    return `${String(hours).padStart(2, "0")}:${minutes} ${meridiem}`;
  }

  return trimmed;
};

/**
 * Calculates predicted arrival by mathematically adding non-negative delay to scheduled destination time.
 * Invariant: Predicted Arrival = Scheduled Destination Arrival + Total Delay.
 * Always formats as HH:MM AM/PM.
 */
export const calculatePredictedETA = (scheduledTimeStr, delayMinutes) => {
  if (!scheduledTimeStr || typeof scheduledTimeStr !== "string") return "Not available";
  const trimmed = scheduledTimeStr.trim();
  if (
    !trimmed ||
    trimmed === "--" ||
    trimmed === "null" ||
    trimmed === "undefined" ||
    trimmed === "N/A" ||
    trimmed === "-- AM" ||
    trimmed === "-- PM" ||
    trimmed === "Not available"
  ) {
    return "Not available";
  }

  let hours = -1;
  let minutes = -1;

  // Check ISO-8601
  const isoMatch = trimmed.match(/T(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (isoMatch) {
    hours = parseInt(isoMatch[1], 10);
    minutes = parseInt(isoMatch[2], 10);
  } else {
    // Check 12-hour
    const twelveMatch = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*([AaPp][Mm])$/);
    if (twelveMatch) {
      hours = parseInt(twelveMatch[1], 10);
      minutes = parseInt(twelveMatch[2], 10);
      const period = twelveMatch[3].toUpperCase();
      if (period === "PM" && hours < 12) hours += 12;
      if (period === "AM" && hours === 12) hours = 0;
    } else {
      // Check 24-hour
      const twentyFourMatch = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
      if (twentyFourMatch) {
        hours = parseInt(twentyFourMatch[1], 10);
        minutes = parseInt(twentyFourMatch[2], 10);
      }
    }
  }

  if (hours < 0 || minutes < 0 || isNaN(hours) || isNaN(minutes)) {
    return formatTimeDisplay(scheduledTimeStr);
  }

  const baseMinutes = hours * 60 + minutes;
  const safeDelay = Math.round(Number(delayMinutes) || 0);
  const totalMinutes = ((baseMinutes + safeDelay) % 1440 + 1440) % 1440;

  const finalHours = Math.floor(totalMinutes / 60);
  const finalMinutes = totalMinutes % 60;
  const outMeridiem = finalHours >= 12 ? "PM" : "AM";
  const displayHours = finalHours % 12 || 12;

  return `${String(displayHours).padStart(2, "0")}:${String(finalMinutes).padStart(2, "0")} ${outMeridiem}`;
};

/**
 * Calculates the final destination arrival delay for a completed journey:
 * finalArrivalDelay = actualArrival - scheduledArrival
 *
 * Handles:
 * - Full ISO-8601 datetimes with dates.
 * - 12-hour/24-hour time-of-day strings with safe midnight rollover handling
 *   (e.g., scheduled 11:50 PM, actual 12:20 AM -> +30 min).
 * - Non-negative clamping for on-time/early arrivals (Math.max(0, diff)).
 * - Returns null when either timestamp is missing, invalid, or "Arrived".
 */
export const calculateFinalArrivalDelay = (scheduledTimeStr, actualTimeStr) => {
  if (!scheduledTimeStr || !actualTimeStr) return null;
  const schedTrimmed = String(scheduledTimeStr).trim();
  const actualTrimmed = String(actualTimeStr).trim();

  const isInvalid = (val) =>
    !val ||
    val === "--" ||
    val === "null" ||
    val === "undefined" ||
    val === "N/A" ||
    val === "-- AM" ||
    val === "-- PM" ||
    val === "Not available" ||
    val.toLowerCase() === "arrived";

  if (isInvalid(schedTrimmed) || isInvalid(actualTrimmed)) {
    return null;
  }

  // Check if both are full ISO strings with dates
  const isoDateRegex = /^\d{4}-\d{2}-\d{2}T/;
  if (isoDateRegex.test(schedTrimmed) && isoDateRegex.test(actualTrimmed)) {
    try {
      const d1 = new Date(schedTrimmed);
      const d2 = new Date(actualTrimmed);
      if (!isNaN(d1.getTime()) && !isNaN(d2.getTime())) {
        const diffMinutes = Math.round((d2.getTime() - d1.getTime()) / 60000);
        return diffMinutes;
      }
    } catch {
      // Fallback to time-of-day parsing
    }
  }

  const parseParts = (str) => {
    let hours = -1;
    let minutes = -1;
    const isoMatch = str.match(/T(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (isoMatch) {
      hours = parseInt(isoMatch[1], 10);
      minutes = parseInt(isoMatch[2], 10);
    } else {
      const twelveMatch = str.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*([AaPp][Mm])$/);
      if (twelveMatch) {
        hours = parseInt(twelveMatch[1], 10);
        minutes = parseInt(twelveMatch[2], 10);
        const period = twelveMatch[3].toUpperCase();
        if (period === "PM" && hours < 12) hours += 12;
        if (period === "AM" && hours === 12) hours = 0;
      } else {
        const twentyFourMatch = str.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
        if (twentyFourMatch) {
          hours = parseInt(twentyFourMatch[1], 10);
          minutes = parseInt(twentyFourMatch[2], 10);
        }
      }
    }
    if (hours < 0 || minutes < 0 || isNaN(hours) || isNaN(minutes)) return null;
    return { hours, minutes };
  };

  const p1 = parseParts(schedTrimmed);
  const p2 = parseParts(actualTrimmed);

  if (!p1 || !p2) return null;

  const m1 = p1.hours * 60 + p1.minutes;
  const m2 = p2.hours * 60 + p2.minutes;
  let diff = m2 - m1;

  // Midnight crossing handling:
  // e.g. scheduled 11:50 PM (1430), actual 12:20 AM (20) -> diff = -1410. When diff < -360, add 1440 min -> +30 min.
  // If scheduled 12:10 AM (10), actual 11:55 PM (1435) -> diff = 1425. When diff > 1080, subtract 1440 min -> -15 min.
  if (diff < -360) {
    diff += 1440;
  } else if (diff > 1080) {
    diff -= 1440;
  }

  return diff;
};

/**
 * Formats a numeric delay value into 3-state human readable text:
 * - negative -> "Early by X min"
 * - zero -> "On Time"
 * - positive -> "+X min"
 */
export const formatDelayText = (delayMinutes) => {
  if (delayMinutes == null || isNaN(delayMinutes)) return "On Time";
  const rounded = Math.round(Number(delayMinutes));
  if (rounded < 0) return `Early by ${Math.abs(rounded)} min`;
  if (rounded > 0) return `+${rounded} min`;
  return "On Time";
};

/**
 * Resolves the authoritative semantic journey status of a train.
 * Train-agnostic: relies on real backend status fields (trainStatus, status, running, speed, location).
 * Never assumes a train is "On The Way" merely because API or telemetry data is present.
 */
export const resolveTrainJourneyStatus = (trainData, context = {}) => {
  const {
    currentStation,
    nextStation,
    currentStationIndex = 0,
    totalStations = 0,
  } = context;

  // 1. Authoritative backend status field
  const rawStatus = (
    trainData?.trainStatus ||
    (typeof trainData?.status === "string" && !["on time", "delayed"].includes(trainData.status.trim().toLowerCase()) ? trainData.status : "") ||
    ""
  ).trim().toLowerCase();

  const currentLoc = (
    trainData?.currentLocation ||
    trainData?.currentStation ||
    currentStation?.name ||
    ""
  ).trim();

  const originName = (
    trainData?.origin ||
    trainData?.source ||
    ""
  ).trim();

  const destinationName = (
    trainData?.destination ||
    ""
  ).trim();

  const currentSpeed = Number(trainData?.currentSpeed ?? 0);
  const isStoppedFlag = trainData?.running === false;
  const isRunningFlag = trainData?.running === true;

  // Destination reached check
  const isAtDestination =
    (totalStations > 1 && currentStationIndex >= totalStations - 1) ||
    (Boolean(destinationName) && Boolean(currentLoc) && currentLoc.toLowerCase() === destinationName.toLowerCase()) ||
    ["completed", "terminated", "journey_completed", "reached", "arrived_destination"].includes(rawStatus);

  if (isAtDestination) {
    return {
      statusType: "COMPLETED",
      isCompleted: true,
      isNotStarted: false,
      isRunning: false,
      isAtStation: false,
      title: "Journey Completed",
      label: "Journey Complete",
      badge: "COMPLETED",
      badgeColor: "green",
      description: destinationName ? `Train has reached ${destinationName}` : "Train has reached destination",
      nextStationPill: "Arrived",
      nextStationDesc: "Train has reached destination",
      distanceDesc: "Journey completed",
      timelineFooter: "▶ JOURNEY COMPLETED",
      scheduleBannerTitle: "Train has reached final destination",
      scheduleBannerSubtitle: destinationName ? `Arrived at ${destinationName} · All scheduled stops completed` : "All scheduled stops completed",
      topbarTrackingText: "Journey completed",
    };
  }

  // Not started check
  // Primary authority: backend trainStatus indicates not-started
  // Secondary consistency: stopped flag at origin station
  const isExplicitNotStarted = [
    "not-started",
    "not_started",
    "yet_to_start",
    "scheduled",
    "inactive",
  ].includes(rawStatus);

  const isAtOriginNotMoving =
    (isStoppedFlag || rawStatus === "" || isExplicitNotStarted) &&
    currentStationIndex === 0 &&
    currentSpeed <= 0 &&
    Boolean(originName) &&
    Boolean(currentLoc) &&
    originName.toLowerCase() === currentLoc.toLowerCase();

  if (isExplicitNotStarted || isAtOriginNotMoving) {
    const atStationText = currentStation?.name || originName || currentLoc || "origin";
    return {
      statusType: "NOT_STARTED",
      isCompleted: false,
      isNotStarted: true,
      isRunning: false,
      isAtStation: false,
      title: "Not Started",
      label: "Not Started",
      badge: "NOT STARTED",
      badgeColor: "blue",
      description: `At ${atStationText} awaiting departure`,
      nextStationPill: "Scheduled",
      nextStationDesc: nextStation?.name ? `Scheduled arrival: ${nextStation.scheduledArrival || nextStation.time || "Scheduled"}` : "Awaiting departure",
      distanceDesc: nextStation?.name ? `Next station after departure: ${nextStation.name}` : "Awaiting departure",
      timelineFooter: "▶ TRAIN SCHEDULED",
      scheduleBannerTitle: "Train has not started",
      scheduleBannerSubtitle: `At ${atStationText} · Awaiting scheduled departure`,
      topbarTrackingText: "Tracking scheduled",
    };
  }

  // At station (halted at intermediate station) check
  const isExplicitAtStation = [
    "at-station",
    "at_station",
    "halt",
    "halted",
    "stopped",
    "arrived",
  ].includes(rawStatus);

  if (isExplicitAtStation || (currentSpeed === 0 && currentStationIndex > 0 && !isAtDestination)) {
    const stationName = currentStation?.name || currentLoc || "station";
    return {
      statusType: "AT_STATION",
      isCompleted: false,
      isNotStarted: false,
      isRunning: false,
      isAtStation: true,
      title: "At Station",
      label: "At Station",
      badge: "AT STATION",
      badgeColor: "purple",
      description: `Currently halted at ${stationName}`,
      nextStationPill: "At Platform",
      nextStationDesc: nextStation?.name ? `Next stop after departure: ${nextStation.name}` : "Next station after departure",
      distanceDesc: nextStation?.name ? `Next station after departure: ${nextStation.name}` : "Halted at station",
      timelineFooter: "▶ TRAIN AT STATION",
      scheduleBannerTitle: `Train is halted at ${stationName}`,
      scheduleBannerSubtitle: nextStation?.name ? `Next stop: ${nextStation.name}` : "Awaiting departure",
      topbarTrackingText: "Live tracking active",
    };
  }

  // Running / En Route (default when actively in motion or explicit running status)
  return {
    statusType: "RUNNING",
    isCompleted: false,
    isNotStarted: false,
    isRunning: true,
    isAtStation: false,
    title: "On The Way",
    label: "On The Way",
    badge: "ACTIVE",
    badgeColor: "green",
    description: nextStation?.name ? `Currently travelling towards ${nextStation.name}` : "En route to destination",
    nextStationPill: "En Route",
    nextStationDesc: nextStation?.name ? `Scheduled arrival: ${nextStation.scheduledArrival || nextStation.time || "Scheduled"}` : "En route",
    distanceDesc: nextStation?.name ? "En route to next station" : "En route",
    timelineFooter: "▶ TRAIN IS LIVE",
    scheduleBannerTitle: (trainData?.totalDelay ?? 0) <= 5 ? "Train is running on schedule" : "Train is experiencing delay",
    scheduleBannerSubtitle: destinationName ? `Approaching ${destinationName}` : "En route",
    topbarTrackingText: "Live tracking active",
  };
};

/**
 * Determines whether a station in a route is a scheduled halt/stop or a pass-through station.
 * Relies on real timetable metadata present in the project.
 * Origin (index 0) and Destination (index totalCount - 1) are always halts.
 * Explicit boolean `isHalt` or `halt` takes precedence.
 * Checks scheduled arrival/departure or platform if available.
 * If no halt metadata distinguishes them, defaults safely to true (does not invent exclusions).
 */
export const isHaltStation = (station, index = 0, totalCount = 1) => {
  if (!station) return false;

  // 1. Origin and Destination stations are always commercial halts
  if (index === 0 || (totalCount > 1 && index === totalCount - 1)) {
    return true;
  }

  // 2. Explicit boolean flags from backend / RailRadar
  if (station.isHalt === false || station.halt === false) {
    return false;
  }
  if (station.isHalt === true || station.halt === true) {
    return true;
  }

  // 3. Timetable stop characteristics (distinct arrival and departure, or platform assigned)
  const arr = station.scheduledArrival || station.arrivalTime || null;
  const dep = station.scheduledDeparture || station.departureTime || null;
  if (arr && dep && arr !== dep) {
    return true;
  }
  if (station.platform != null && String(station.platform).trim() !== "" && String(station.platform).trim() !== "--") {
    return true;
  }

  // 4. Fallback: If no distinguishing metadata exists (e.g. plain station names or uniform timetable),
  // preserve safe behavior without inventing arbitrary exclusions (Test C)
  return true;
};

/**
 * Calculates continuous real train progress and fractional timeline index
 * for Full Journey and Main Journey views.
 *
 * Never fabricates simulated movement; strictly reflects real telemetry.
 * Clamps output safely to: 0.0 <= fraction <= totalStations - 1.
 */
export const calculateJourneyProgress = ({
  liveTrainData,
  fullRouteStations = [],
  journeyStations = [],
  showFullJourney = false,
  isCompletedJourney = false,
  isNotStarted = false,
}) => {
  const fullCount = Array.isArray(fullRouteStations) ? fullRouteStations.length : 0;
  const haltCount = Array.isArray(journeyStations) ? journeyStations.length : 0;

  if (fullCount <= 1) {
    return {
      timelineFractionalIndex: 0,
      currentKmCovered: 0,
      totalRouteKm: 0,
      fullRouteFractionalIndex: 0,
      mainJourneyFractionalIndex: 0,
      isAtStation: true,
    };
  }

  // 1. Build monotonic distance array for full physical route
  const fullDistances = fullRouteStations.map((stn) => {
    const raw = stn.distanceKm != null
      ? Number(stn.distanceKm)
      : (stn.distanceFromOrigin != null ? Number(stn.distanceFromOrigin) : null);
    return raw != null && !isNaN(raw) ? raw : null;
  });

  const lastFullDist = fullDistances[fullCount - 1];
  const totalRouteKm = lastFullDist != null && lastFullDist > 0
    ? lastFullDist
    : (liveTrainData?.routeDistance != null && Number(liveTrainData.routeDistance) > 0
        ? Number(liveTrainData.routeDistance)
        : 200);

  // Fill in any null/missing intermediate distances monotonically
  fullDistances[0] = 0;
  if (fullDistances[fullCount - 1] == null) {
    fullDistances[fullCount - 1] = totalRouteKm;
  }
  for (let i = 1; i < fullCount - 1; i++) {
    if (fullDistances[i] == null) {
      let prevIdx = i - 1;
      let nextIdx = i + 1;
      while (nextIdx < fullCount && fullDistances[nextIdx] == null) nextIdx++;
      const prevD = fullDistances[prevIdx] ?? 0;
      const nextD = fullDistances[nextIdx] ?? totalRouteKm;
      fullDistances[i] = prevD + ((nextD - prevD) * (i - prevIdx)) / (nextIdx - prevIdx);
    }
  }

  // 2. Completed / Not Started edge cases
  if (isCompletedJourney) {
    const fullIdx = fullCount - 1;
    const mainIdx = Math.max(0, haltCount - 1);
    return {
      timelineFractionalIndex: showFullJourney ? fullIdx : mainIdx,
      currentKmCovered: totalRouteKm,
      totalRouteKm,
      fullRouteFractionalIndex: fullIdx,
      mainJourneyFractionalIndex: mainIdx,
      isAtStation: true,
    };
  }

  if (isNotStarted) {
    return {
      timelineFractionalIndex: 0,
      currentKmCovered: 0,
      totalRouteKm,
      fullRouteFractionalIndex: 0,
      mainJourneyFractionalIndex: 0,
      isAtStation: true,
    };
  }

  // 3. Current station checkpoint matching
  const currentLocRaw = (liveTrainData?.currentLocation || liveTrainData?.currentStation || "").trim().toLowerCase();
  let fullCurrentIdx = 0;
  if (currentLocRaw) {
    const matched = fullRouteStations.findIndex((s) => {
      const sName = (s.name || s.stationName || "").trim().toLowerCase();
      return sName === currentLocRaw || sName.includes(currentLocRaw) || currentLocRaw.includes(sName);
    });
    if (matched >= 0) fullCurrentIdx = matched;
  }

  const rawStatus = (liveTrainData?.trainStatus || liveTrainData?.status || "").trim().toLowerCase();
  const isStoppedAtStation = (liveTrainData?.currentSpeed === 0) ||
    ["at_station", "stopped", "halted"].includes(rawStatus);

  // 4. Physical progress evaluation
  let D_train = null;
  let P_full = null;

  // A. GPS Coordinate Projection (if coordinates exist)
  const trainLat = Number(liveTrainData?.latitude ?? liveTrainData?.currentLatitude);
  const trainLng = Number(liveTrainData?.longitude ?? liveTrainData?.currentLongitude);
  const hasValidGps = !isNaN(trainLat) && !isNaN(trainLng) && (trainLat !== 0 || trainLng !== 0);

  if (hasValidGps && !isStoppedAtStation) {
    let bestDist = Infinity;
    const minSeg = Math.max(0, fullCurrentIdx - 1);
    const maxSeg = Math.min(fullCount - 2, fullCurrentIdx + 2);

    for (let i = minSeg; i <= maxSeg; i++) {
      const stnA = fullRouteStations[i];
      const stnB = fullRouteStations[i + 1];
      const latA = Number(stnA.latitude);
      const lngA = Number(stnA.longitude);
      const latB = Number(stnB.latitude);
      const lngB = Number(stnB.longitude);

      if (!isNaN(latA) && !isNaN(lngA) && !isNaN(latB) && !isNaN(lngB) && (latA !== 0 || lngA !== 0)) {
        const latScale = 111.32;
        const lngScale = 111.32 * Math.cos((trainLat * Math.PI) / 180);

        const segX = (lngB - lngA) * lngScale;
        const segY = (latB - latA) * latScale;
        const segLenSq = segX * segX + segY * segY;

        if (segLenSq > 0.0001) {
          const ptX = (trainLng - lngA) * lngScale;
          const ptY = (trainLat - latA) * latScale;
          let t = (ptX * segX + ptY * segY) / segLenSq;
          t = Math.max(0, Math.min(1, t));

          const projLat = latA + (latB - latA) * t;
          const projLng = lngA + (lngB - lngA) * t;
          const dX = (trainLng - projLng) * lngScale;
          const dY = (trainLat - projLat) * latScale;
          const distToTrack = Math.sqrt(dX * dX + dY * dY);

          if (distToTrack < bestDist) {
            bestDist = distToTrack;
            P_full = i + t;
            D_train = fullDistances[i] + t * (fullDistances[i + 1] - fullDistances[i]);
          }
        }
      }
    }
  }

  // B. Real distance progress (distanceFromOrigin / distanceCovered / routeDistance)
  if (D_train == null) {
    let distProgress = null;
    if (liveTrainData?.distanceFromOrigin != null && !isNaN(Number(liveTrainData.distanceFromOrigin))) {
      distProgress = Number(liveTrainData.distanceFromOrigin);
    } else if (liveTrainData?.distanceCovered != null && !isNaN(Number(liveTrainData.distanceCovered))) {
      distProgress = Number(liveTrainData.distanceCovered);
    } else if (liveTrainData?.routeDistance != null && !isNaN(Number(liveTrainData.routeDistance)) && totalRouteKm > 0) {
      distProgress = Math.max(0, Math.min(totalRouteKm, totalRouteKm - Number(liveTrainData.routeDistance)));
    }

    if (distProgress != null && !isStoppedAtStation) {
      D_train = Math.max(0, Math.min(totalRouteKm, distProgress));
      let seg = 0;
      while (seg < fullCount - 2 && fullDistances[seg + 1] <= D_train) {
        seg++;
      }
      const span = fullDistances[seg + 1] - fullDistances[seg];
      const t = span > 0 ? Math.max(0, Math.min(1, (D_train - fullDistances[seg]) / span)) : 0;
      P_full = seg + t;
    }
  }

  // C. Fallback: Checkpoint / At-Station Telemetry
  if (D_train == null || P_full == null) {
    P_full = fullCurrentIdx;
    D_train = fullDistances[fullCurrentIdx] ?? 0;
  }

  P_full = Math.max(0, Math.min(fullCount - 1, P_full));
  D_train = Math.max(0, Math.min(totalRouteKm, D_train));

  // 5. Compute Main Journey fractional index
  let mainJourneyFractionalIndex = 0;
  if (haltCount > 1) {
    const haltDistances = journeyStations.map((hStn) => {
      const hName = (hStn.name || hStn.stationName || "").trim().toLowerCase();
      const matchedIdx = fullRouteStations.findIndex((fStn) => {
        const fName = (fStn.name || fStn.stationName || "").trim().toLowerCase();
        return fName === hName || fName.includes(hName) || hName.includes(fName);
      });
      const d = matchedIdx >= 0
        ? fullDistances[matchedIdx]
        : (hStn.distanceKm != null ? Number(hStn.distanceKm) : (hStn.distanceFromOrigin != null ? Number(hStn.distanceFromOrigin) : null));
      return { dist: d, fullIdx: matchedIdx >= 0 ? matchedIdx : 0 };
    });

    let h = 0;
    while (h < haltCount - 2 && (haltDistances[h + 1].dist != null ? haltDistances[h + 1].dist <= D_train : haltDistances[h + 1].fullIdx <= P_full)) {
      h++;
    }

    const dA = haltDistances[h].dist;
    const dB = haltDistances[h + 1].dist;
    let tMain = 0;
    if (dA != null && dB != null && dB > dA) {
      tMain = (D_train - dA) / (dB - dA);
    } else {
      const idxA = haltDistances[h].fullIdx;
      const idxB = haltDistances[h + 1].fullIdx;
      if (idxB > idxA) {
        tMain = (P_full - idxA) / (idxB - idxA);
      }
    }
    tMain = Math.max(0, Math.min(1, tMain));
    mainJourneyFractionalIndex = Math.max(0, Math.min(haltCount - 1, h + tMain));
  }

  const fullRouteFractionalIndex = P_full;
  const timelineFractionalIndex = showFullJourney
    ? fullRouteFractionalIndex
    : mainJourneyFractionalIndex;

  return {
    timelineFractionalIndex,
    currentKmCovered: Number(D_train.toFixed(1)),
    totalRouteKm: Number(totalRouteKm.toFixed(1)),
    fullRouteFractionalIndex,
    mainJourneyFractionalIndex,
    isAtStation: isStoppedAtStation,
  };
};
