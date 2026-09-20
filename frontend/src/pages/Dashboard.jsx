import "./Dashboard.css";
import { useEffect, useState, useMemo } from "react";
import heroTrainImg from "../assets/hero-modern-railway.png";
import heroSceneImg from "../assets/hero-railway-scene.png";

import { checkBackendHealth } from "../services/api";
import {
  resolveTrainJourneyStatus,
  isHaltStation,
  formatTimeDisplay,
  calculatePredictedETA,
  formatDelayText,
  calculateJourneyProgress,
} from "../services/trainMapper";

import {
  Train,
  Check,
  Circle,
  BrainCircuit,
  Clock,
  Clock3,
  CloudSun,
  Route,
  Signal,
  MapPin,
  X,
  Activity,
  Gauge,
  Info,
  ChevronRight,
  Target,
  Bell,
  Building,
  Building2,
  Mountain,
  Landmark,
  Compass,
  ArrowRight,
  Sparkles,
  BarChart3,
  TrendingUp,
  Shield,
  History,
  Map,
} from "lucide-react";

// Route Station Milestones & Metadata derived dynamically from live train/stations
const buildDynamicRouteConfig = (stations, selectedTrain, liveTrainData) => {
  if (stations && stations.length > 0) {
    const totalCount = stations.length;
    return stations.map((stn, idx) => {
      let icon = Building;
      let subtext = "";
      if (idx === 0) {
        icon = Building2;
        subtext = "Origin Station";
      } else if (idx === totalCount - 1) {
        icon = Landmark;
        subtext = "Destination";
      } else if (stn.status === "current") {
        icon = Train;
        subtext = "Current Location";
      } else if (stn.status === "upcoming" && (idx === 1 || stations[idx - 1]?.status === "current")) {
        icon = Building;
        subtext = "Next Station";
      }

      const rawDist = stn.distanceFromOrigin != null
        ? Number(stn.distanceFromOrigin)
        : (stn.distanceKm != null ? Number(stn.distanceKm) : null);

      const distanceKm = rawDist != null
        ? rawDist
        : (liveTrainData?.routeDistance != null && totalCount > 1
          ? Number(((idx / (totalCount - 1)) * liveTrainData.routeDistance).toFixed(1))
          : null);

      return {
        name: stn.name,
        distanceKm,
        distanceFromOrigin: rawDist != null ? rawDist : distanceKm,
        subtext,
        icon,
      };
    });
  }

  // If real stations are unavailable, do NOT synthesize a fake route
  return [];
};

function Dashboard({
  etaData,
  predictedDelay,
  stations = [],
  stationPredictions = [],
  setActivePage,
  selectedTrain,
  loading,
  backendStatus: initialBackendStatus,
  userRole = "passenger",
  liveTrainData: propLiveTrainData,
  trains = [],
  selectTrain,
}) {
  /* =========================================
     POPUP MODAL STATE & INTERACTIVE GRAPH TOOLTIPS
  ========================================= */
  const [showTrendsModal, setShowTrendsModal] = useState(false);
  const [activeSpeedPoint, setActiveSpeedPoint] = useState(null);
  const [activeDelayPoint, setActiveDelayPoint] = useState(null);

  const handleCloseTrendsModal = () => {
    setShowTrendsModal(false);
    setActiveSpeedPoint(null);
    setActiveDelayPoint(null);
  };

  const [showUpcomingModal, setShowUpcomingModal] = useState(false);
  const handleCloseUpcomingModal = () => {
    setShowUpcomingModal(false);
  };

  /* =========================================
     INTERACTIVE 3D HEADER TILT EFFECT
  ========================================= */
  const [headerTilt, setHeaderTilt] = useState({
    rotateX: 0,
    rotateY: 0,
    translateZ: 0,
    textShadow: "0 1px 2px rgba(15, 23, 42, 0.12), 0 3px 8px rgba(37, 99, 235, 0.06)",
  });

  const handleHeaderMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
    const y = (e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
    const clampedX = Math.max(-1, Math.min(1, x));
    const clampedY = Math.max(-1, Math.min(1, y));

    const rotX = Number((-clampedY * 3.5).toFixed(2));
    const rotY = Number((clampedX * 4).toFixed(2));
    const shadowX = Number((-clampedX * 2.5).toFixed(1));
    const shadowY = Number((-clampedY * 2.5).toFixed(1));

    setHeaderTilt({
      rotateX: rotX,
      rotateY: rotY,
      translateZ: 4,
      textShadow: `${shadowX}px ${shadowY}px 0px rgba(15, 23, 42, 0.14), ${shadowX * 2}px ${shadowY * 2}px 10px rgba(37, 99, 235, 0.10), 0 1px 2px rgba(0, 0, 0, 0.08)`,
    });
  };

  const handleHeaderMouseLeave = () => {
    setHeaderTilt({
      rotateX: 0,
      rotateY: 0,
      translateZ: 0,
      textShadow: "0 1px 2px rgba(15, 23, 42, 0.12), 0 3px 8px rgba(37, 99, 235, 0.06)",
    });
  };

  /* =========================================
     ROLE / AUTHORITY PERMISSION CHECK
  ========================================= */
  const isAuthority =
    userRole === "authority" ||
    userRole === "admin" ||
    userRole === "operator" ||
    (typeof window !== "undefined" &&
      (window.localStorage?.getItem("userRole") === "authority" ||
       window.localStorage?.getItem("userRole") === "admin"));

  /* =========================================
     LIVE TRAIN DATA STATE
  ========================================= */
  const [backendStatus, setBackendStatus] = useState(initialBackendStatus || "online");

  const activeTrain = propLiveTrainData || selectedTrain || null;
  const liveTrainData = activeTrain;

  // View toggle: false = Main Journey (Halt Stations Only), true = Full Journey (All Route Stations)
  const [showFullJourney, setShowFullJourney] = useState(false);

  // Full authoritative route stations (retains all physical route points, never mutated or destroyed)
  const fullRouteStations = useMemo(() => {
    return Array.isArray(stations) ? stations : [];
  }, [stations]);

  // Main Journey halt stations (scheduled train halts only)
  const journeyStations = useMemo(() => {
    if (!fullRouteStations || fullRouteStations.length === 0) return [];
    const halts = fullRouteStations.filter((stn, idx) =>
      isHaltStation(stn, idx, fullRouteStations.length)
    );
    // If halt detection yields fewer than 2 stops, fall back safely to full route without inventing exclusions (Test C)
    return halts.length >= 2 ? halts : fullRouteStations;
  }, [fullRouteStations]);

  // Active station list for Route & Progress timeline
  const activeTimelineStations = showFullJourney ? fullRouteStations : journeyStations;

  // Active Route Configuration based on dynamic train & station milestones
  const ROUTE_CONFIG = useMemo(() => {
    return buildDynamicRouteConfig(activeTimelineStations, activeTrain, activeTrain);
  }, [activeTimelineStations, activeTrain]);

  const TOTAL_ROUTE_KM = fullRouteStations.length > 1
    ? (fullRouteStations[fullRouteStations.length - 1].distanceKm || fullRouteStations[fullRouteStations.length - 1].distanceFromOrigin || 200)
    : (ROUTE_CONFIG.length > 1 ? (ROUTE_CONFIG[ROUTE_CONFIG.length - 1].distanceKm || 200) : 100);

  /* =========================================
     TRAIN METRICS & STATE
  ========================================= */
  const trainNumber =
    activeTrain?.number ||
    activeTrain?.trainNumber ||
    (trains && trains.length > 0 ? (trains[0].number || trains[0].trainNumber) : "");

  const trainName =
    activeTrain?.name ||
    activeTrain?.trainName ||
    (trainNumber ? `Train ${trainNumber}` : "");

  // Dynamic Origin and Destination for compact summary (Origin → Destination)
  const origin =
    activeTrain?.source ||
    activeTrain?.origin ||
    activeTrain?.from ||
    (fullRouteStations.length > 0 ? fullRouteStations[0]?.name : null) ||
    (ROUTE_CONFIG.length > 0 ? ROUTE_CONFIG[0]?.name : null) ||
    (stations.length > 0
      ? (typeof stations[0] === "string" ? stations[0] : stations[0]?.name)
      : null) ||
    (Array.isArray(activeTrain?.routeStations) && activeTrain.routeStations.length > 0
      ? activeTrain.routeStations[0]
      : null) ||
    (typeof activeTrain?.route === "string" && activeTrain.route.includes("→")
      ? activeTrain.route.split("→")[0].trim()
      : "") ||
    "";

  const destination =
    activeTrain?.destination ||
    activeTrain?.dest ||
    activeTrain?.to ||
    (fullRouteStations.length > 0 ? fullRouteStations[fullRouteStations.length - 1]?.name : null) ||
    (ROUTE_CONFIG.length > 0 ? ROUTE_CONFIG[ROUTE_CONFIG.length - 1]?.name : null) ||
    (stations.length > 0
      ? (typeof stations[stations.length - 1] === "string"
          ? stations[stations.length - 1]
          : stations[stations.length - 1]?.name)
      : null) ||
    (Array.isArray(activeTrain?.routeStations) && activeTrain.routeStations.length > 0
      ? activeTrain.routeStations[activeTrain.routeStations.length - 1]
      : null) ||
    (typeof activeTrain?.route === "string" && activeTrain.route.includes("→")
      ? activeTrain.route.split("→").slice(-1)[0].trim()
      : "") ||
    "";

  const trainRoute = origin && destination
    ? `${origin} → ${destination}`
    : (origin || destination || activeTrain?.route || "");

  const destinationStationName = fullRouteStations.length > 0
    ? fullRouteStations[fullRouteStations.length - 1]?.name
    : (ROUTE_CONFIG.length > 0 ? ROUTE_CONFIG[ROUTE_CONFIG.length - 1]?.name : "");

  const destPredObj = (stationPredictions && stationPredictions.length > 0 && destinationStationName)
    ? stationPredictions.find(
        (p) => p?.station?.trim().toLowerCase() === destinationStationName.trim().toLowerCase()
      )
    : null;

  const scheduledArrival =
    (destPredObj?.scheduledTime && destPredObj.scheduledTime !== "--")
      ? destPredObj.scheduledTime
      : (etaData?.scheduledArrival && etaData.scheduledArrival !== "--")
      ? etaData.scheduledArrival
      : (stations && stations.length > 0 && stations[stations.length - 1]?.arrivalTime && stations[stations.length - 1]?.arrivalTime !== "--")
      ? stations[stations.length - 1]?.arrivalTime
      : (stations && stations.length > 0 && stations[stations.length - 1]?.scheduledArrival && stations[stations.length - 1]?.scheduledArrival !== "--")
      ? stations[stations.length - 1]?.scheduledArrival
      : (stations && stations.length > 0 && stations[stations.length - 1]?.time && stations[stations.length - 1]?.time !== "--")
      ? stations[stations.length - 1]?.time
      : (activeTrain?.scheduledArrival && activeTrain.scheduledArrival !== "--")
      ? activeTrain.scheduledArrival
      : (liveTrainData?.scheduledArrival && liveTrainData.scheduledArrival !== "--")
      ? liveTrainData.scheduledArrival
      : (liveTrainData?.scheduledDeparture && liveTrainData.scheduledDeparture !== "--")
      ? liveTrainData.scheduledDeparture
      : null;

  const isCompletedJourney = useMemo(() => {
    const rawStatus = (
      liveTrainData?.trainStatus ||
      liveTrainData?.status ||
      liveTrainData?.journeyStatus ||
      ""
    ).toLowerCase().trim();
    if ([
      "completed",
      "terminated",
      "journey_completed",
      "reached",
      "arrived_destination",
      "arrived",
    ].includes(rawStatus)) {
      return true;
    }
    const destName = (liveTrainData?.destination || "").trim().toLowerCase();
    const currLoc = (liveTrainData?.currentLocation || liveTrainData?.currentStation || "").trim().toLowerCase();
    if (destName && currLoc && destName === currLoc) {
      return true;
    }
    return false;
  }, [liveTrainData]);

  const finalArrivalDelay =
    etaData?.finalArrivalDelay != null
      ? Number(etaData.finalArrivalDelay)
      : (liveTrainData?.finalArrivalDelay != null ? Number(liveTrainData.finalArrivalDelay) : null);

  const isDestPredValid = !isCompletedJourney &&
    Boolean(destPredObj?.predictedETA) &&
    destPredObj.predictedETA !== "Not available" &&
    destPredObj.predictedETA !== "--";

  const predictedETA = isDestPredValid
    ? destPredObj.predictedETA
    : (etaData?.predictedETA ||
       liveTrainData?.predictedETA ||
       "");

  const totalDelay = Number(
    (isCompletedJourney && finalArrivalDelay != null)
      ? finalArrivalDelay
      : (isDestPredValid && destPredObj?.predictedDelay != null
          ? destPredObj.predictedDelay
          : (etaData?.expectedDelay ??
             etaData?.totalDelay ??
             liveTrainData?.expectedDelay ??
             liveTrainData?.totalDelay ??
             liveTrainData?.currentDelay ??
             predictedDelay ??
             0))
  );

  const confidenceScore = Number(
    liveTrainData?.confidenceScore ??
    etaData?.confidenceScore ??
    91
  );

  const roundedConfidence = Math.round(confidenceScore);

  const currentSpeed = Number(
    liveTrainData?.currentSpeed ??
    0
  );

  const futureDelay = Number(
    liveTrainData?.futureDelay ??
    predictedDelay ??
    0
  );

  /* =========================================
     DYNAMIC TRAIN POSITION CALCULATION
  ========================================= */
  const getStationIndexInList = (list, candidateName) => {
    if (!candidateName || typeof candidateName !== "string" || !list) return -1;
    const cleaned = candidateName.trim().toLowerCase();
    return list.findIndex((s) => {
      const routeName = (s.name || "").toLowerCase();
      return (
        routeName === cleaned ||
        routeName.includes(cleaned) ||
        cleaned.includes(routeName)
      );
    });
  };

  // Authoritative physical index in the complete full route
  const fullCurrentIdx = useMemo(() => {
    if (!fullRouteStations || fullRouteStations.length === 0) return 0;

    // For COMPLETED journeys, the passenger-facing journey pointer resolves to DESTINATION
    if (isCompletedJourney) {
      return fullRouteStations.length - 1;
    }

    const liveLocIdx = getStationIndexInList(fullRouteStations, liveTrainData?.currentLocation);
    if (liveLocIdx !== -1) return liveLocIdx;

    const liveStnIdx = getStationIndexInList(fullRouteStations, liveTrainData?.currentStation);
    if (liveStnIdx !== -1) return liveStnIdx;

    const propCurrent = stations?.find((s) => s.status === "current")?.name;
    const propIdx = getStationIndexInList(fullRouteStations, propCurrent);
    if (propIdx !== -1) return propIdx;

    return 0; // Default to origin
  }, [fullRouteStations, liveTrainData?.currentLocation, liveTrainData?.currentStation, stations, isCompletedJourney]);

  // Halt-based current index in the journeyStations sequence
  // If train is at a pass-through station X between halt A and halt B,
  // the current/departed halt station is A (latest halt station <= fullCurrentIdx).
  const journeyCurrentIdx = useMemo(() => {
    if (!journeyStations || journeyStations.length === 0) return 0;
    if (fullCurrentIdx <= 0) return 0;
    if (fullRouteStations.length > 0 && fullCurrentIdx >= fullRouteStations.length - 1) {
      return journeyStations.length - 1;
    }

    for (let i = fullCurrentIdx; i >= 0; i--) {
      const matchName = (fullRouteStations[i]?.name || "").trim().toLowerCase();
      const hIdx = journeyStations.findIndex(
        (h) => (h.name || "").trim().toLowerCase() === matchName
      );
      if (hIdx !== -1) {
        return hIdx;
      }
    }
    return 0;
  }, [journeyStations, fullRouteStations, fullCurrentIdx]);

  // Current station index for the currently displayed timeline
  const currentIdx = showFullJourney ? fullCurrentIdx : journeyCurrentIdx;
  const currentStationName = ROUTE_CONFIG[currentIdx]?.name || liveTrainData?.currentLocation || ROUTE_CONFIG[0]?.name || "--";

  // Next Station Semantics (Step 6):
  // The passenger-facing Next Stop resolves from the HALT-STATION sequence.
  // Next stop must NOT show a pass-through station.
  const nextHaltStation = useMemo(() => {
    if (!journeyStations || journeyStations.length === 0) return null;
    if (journeyCurrentIdx >= journeyStations.length - 1) {
      return null;
    }
    return journeyStations[journeyCurrentIdx + 1];
  }, [journeyStations, journeyCurrentIdx]);

  const nextStationName = nextHaltStation?.name || (journeyStations.length > 1 ? journeyStations[journeyStations.length - 1]?.name : "--");

  const resolvedNextIdx = ROUTE_CONFIG.length > 0
    ? (currentIdx < ROUTE_CONFIG.length - 1 ? currentIdx + 1 : currentIdx)
    : 0;

  const nextIdx = resolvedNextIdx;

  // Authoritative semantic journey status
  const journeyStatus = useMemo(() => {
    return resolveTrainJourneyStatus(liveTrainData, {
      currentStation: fullRouteStations[fullCurrentIdx] || journeyStations[journeyCurrentIdx] || stations[0],
      nextStation: nextHaltStation || journeyStations[journeyStations.length - 1],
      currentStationIndex: fullCurrentIdx,
      totalStations: fullRouteStations.length,
    });
  }, [liveTrainData, fullRouteStations, journeyStations, fullCurrentIdx, journeyCurrentIdx, nextHaltStation, stations]);


  // Compute continuous real train journey progress and track positioning
  const journeyProgress = useMemo(() => {
    return calculateJourneyProgress({
      liveTrainData,
      fullRouteStations,
      journeyStations,
      showFullJourney,
      isCompletedJourney,
      isNotStarted: journeyStatus?.isNotStarted ?? false,
    });
  }, [liveTrainData, fullRouteStations, journeyStations, showFullJourney, isCompletedJourney, journeyStatus?.isNotStarted]);

  const timelineFractionalIndex = journeyProgress.timelineFractionalIndex;
  const currentKmCovered = journeyProgress.currentKmCovered;
  const totalRouteKm = journeyProgress.totalRouteKm || (liveTrainData?.routeDistance != null ? Number(liveTrainData.routeDistance) : null);

  // Remaining time from real backend etaMinutes or arrival status
  const estimatedRemainingTime = useMemo(() => {
    if (isCompletedJourney) return "Arrived";
    if (etaData?.etaMinutes && Number(etaData.etaMinutes) > 0) {
      const totalMin = Math.round(Number(etaData.etaMinutes));
      const h = Math.floor(totalMin / 60);
      const m = totalMin % 60;
      return h > 0 ? `${h}h ${m}m` : `${m}m`;
    }
    return "Not available";
  }, [isCompletedJourney, etaData?.etaMinutes]);

  /* =========================================
     DEPARTURE CALCULATION (REAL DATA ONLY)
  ========================================= */
  const getStationDeparture = (station, index, totalCount) => {
    if (station?.departureTime) return station.departureTime;
    if (station?.departure) return station.departure;

    if (index === 0) {
      return liveTrainData?.scheduledDeparture || station?.arrivalTime || station?.time || null;
    }

    // Destination station terminates
    if (index === totalCount - 1) {
      return null;
    }

    return null;
  };

  const getDelayColor = () => {
    if (totalDelay <= 5) return "low";
    if (totalDelay <= 15) return "medium";
    return "high";
  };

  // Build stations display list merging activeTimelineStations with ROUTE_CONFIG
  const displayStations = ROUTE_CONFIG.map((config, index) => {
    const existing = activeTimelineStations[index] || {};
    const totalCount = ROUTE_CONFIG.length;
    let status = "upcoming";
    if (index < currentIdx) status = "completed";
    else if (index === currentIdx) status = "current";

    const isOrigin = index === 0;
    const isDest = index === totalCount - 1;

    let subtext = "";
    let icon = Building;
    if (isOrigin) {
      subtext = "Origin Station";
      icon = Building2;
    } else if (isDest) {
      subtext = journeyStatus.isCompleted ? "Arrived at Destination" : "Destination";
      icon = Landmark;
    } else if (status === "current") {
      subtext = "Current Location";
      icon = Train;
    } else if (status === "upcoming" && index === currentIdx + 1) {
      subtext = "Next Station";
      icon = Building;
    }

    if (isDest && journeyStatus.isCompleted) {
      status = "completed";
    }

    const isCurrentOrUpcoming = status === "current" || status === "upcoming";

    // For destination station, arrival time displayed MUST match predictedETA or actualArrival
    let arrival = existing.arrivalTime || existing.time || "";
    if (isDest && journeyStatus.isCompleted) {
      arrival = existing.actualArrival || liveTrainData?.actualArrival || (predictedETA && predictedETA !== "N/A" ? predictedETA : "Arrived");
    } else if (isDest && predictedETA) {
      arrival = predictedETA;
    } else if (isCurrentOrUpcoming && existing.predictedArrivalTime) {
      arrival = existing.predictedArrivalTime;
    }

    const departure = getStationDeparture(
      existing,
      index,
      totalCount
    );

    return {
      ...config,
      isDest,
      isHalt: existing.isHalt,
      distanceKm: config.distanceKm,
      distanceFromOrigin: config.distanceFromOrigin ?? config.distanceKm,
      subtext,
      icon,
      status,
      predictedDelay: isDest && journeyStatus.isCompleted
        ? (finalArrivalDelay != null ? finalArrivalDelay : totalDelay)
        : (existing.predictedDelay ?? existing.delay ?? null),
      delay: existing.delay ?? null,
      arrival: formatTimeDisplay(arrival),
      departure: formatTimeDisplay(departure),
    };
  });

  /* =========================================
     UPCOMING STATIONS DATA CALCULATION
  ========================================= */
  const calculatePredictedTime = (schedTimeStr, delayMinutes) => {
    return calculatePredictedETA(schedTimeStr, delayMinutes);
  };

  const allUpcomingStations = useMemo(() => {
    if (journeyStations.length === 0) return [];
    const currentHalt = journeyStations[journeyCurrentIdx];
    const currentDist = currentHalt?.distanceFromOrigin != null
      ? Number(currentHalt.distanceFromOrigin)
      : (currentHalt?.distanceKm != null ? Number(currentHalt.distanceKm) : null);

    // Step 7: ONLY upcoming halt stations
    const upcoming = journeyStations.filter((_, idx) => idx > journeyCurrentIdx);

    return upcoming.map((stn, uIdx) => {
      const isFirst = uIdx === 0;
      const isDestination = uIdx === upcoming.length - 1;

      let delayVal = 0;
      const predObj = stationPredictions.find(
        (p) => p?.station?.trim().toLowerCase() === stn.name?.trim().toLowerCase()
      );

      if (isDestination && journeyStatus.isCompleted) {
        delayVal = finalArrivalDelay != null ? Math.round(Number(finalArrivalDelay)) : Math.round(Number(totalDelay || 0));
      } else if (predObj?.predictedDelay !== undefined && predObj?.predictedDelay !== null) {
        delayVal = Math.round(Number(predObj.predictedDelay));
      } else if (isDestination && totalDelay != null) {
        delayVal = Math.round(Number(totalDelay));
      } else if (stn.predictedDelay !== undefined && stn.predictedDelay !== null) {
        delayVal = Math.round(Number(stn.predictedDelay));
      } else if (stn.delay !== undefined && stn.delay !== null) {
        delayVal = Math.round(Number(stn.delay));
      } else if (totalDelay != null) {
        delayVal = Math.round(Number(totalDelay));
      } else if (futureDelay != null) {
        delayVal = Math.round(Number(futureDelay));
      }

      // Scheduled arrival (Real backend data only)
      let sched = "Not available";
      if (predObj?.scheduledTime && predObj.scheduledTime !== "--") {
        sched = formatTimeDisplay(predObj.scheduledTime);
      } else if (isDestination && scheduledArrival && scheduledArrival !== "--") {
        sched = formatTimeDisplay(scheduledArrival);
      } else if (stn.arrival && stn.arrival !== "Not available" && stn.arrival !== "--") {
        sched = stn.arrival;
      } else if (stn.arrivalTime && stn.arrivalTime !== "Not available" && stn.arrivalTime !== "--") {
        sched = formatTimeDisplay(stn.arrivalTime);
      } else if (stn.time && stn.time !== "Not available" && stn.time !== "--") {
        sched = formatTimeDisplay(stn.time);
      }

      // Predicted arrival - PRIMARY station prediction directly from backend
      let predTime = "Not available";
      if (isDestination && journeyStatus.isCompleted) {
        predTime = formatTimeDisplay(predictedETA || stn.arrival || "Arrived");
      } else if (predObj?.predictedETA && predObj.predictedETA !== "Not available") {
        predTime = formatTimeDisplay(predObj.predictedETA);
      } else if (isDestination && predictedETA) {
        predTime = formatTimeDisplay(predictedETA);
      } else if (stn.predictedArrivalTime && stn.predictedArrivalTime !== "Not available") {
        predTime = formatTimeDisplay(stn.predictedArrivalTime);
      } else if (sched !== "Not available") {
        predTime = calculatePredictedTime(sched, delayVal);
      }

      let cardClass = "upcoming-card";
      let pillClass = "upcoming-pill";
      let badgeText = "Upcoming";

      if (isDestination) {
        cardClass = "destination-card";
        pillClass = "dest-pill";
        badgeText = "Destination";
      } else if (isFirst) {
        cardClass = "next-station-card";
        pillClass = "next-pill";
        badgeText = "Next Station";
      }

      const stnDist = stn.distanceFromOrigin != null
        ? Number(stn.distanceFromOrigin)
        : (stn.distanceKm != null ? Number(stn.distanceKm) : null);

      let distanceAhead = journeyStatus.isNotStarted ? "Scheduled" : "En route";
      if (stnDist != null && Number.isFinite(stnDist)) {
        if (currentDist != null && Number.isFinite(currentDist)) {
          const diff = stnDist - currentDist;
          distanceAhead = `${Math.max(0, diff).toFixed(1)} km ahead`;
        } else {
          distanceAhead = `${stnDist.toFixed(1)} km ahead`;
        }
      }

      return {
        sequence: uIdx + 1,
        name: stn.name,
        distanceAhead,
        distanceKm: stnDist,
        distanceFromOrigin: stnDist,
        scheduledArrival: sched,
        predictedArrival: predTime,
        delayVal,
        delayText: formatDelayText(delayVal),
        delayClass: delayVal > 5 ? "delay-high" : (delayVal < 0 ? "delay-early" : "delay-low"),
        cardClass,
        pillClass,
        badgeText,
      };
    });
  }, [
    journeyStations,
    journeyCurrentIdx,
    stationPredictions,
    totalDelay,
    futureDelay,
    predictedETA,
    scheduledArrival,
    journeyStatus,
  ]);

  /* =========================================
     TRENDS DATA INTERFACES & REAL-TIME LINE GRAPH SERIES
  ========================================= */
  // Time-series calibration points matching reference design curves
  const BASE_JOURNEY_POINTS = useMemo(() => [
    { time: "08:00", t: 0, baseSpeedAct: 60, baseSpeedPred: 58, baseDelayAct: 4, baseDelayPred: 0 },
    { time: "08:08", t: 8, baseSpeedAct: 63, baseSpeedPred: 60, baseDelayAct: 5, baseDelayPred: 0 },
    { time: "08:16", t: 16, baseSpeedAct: 70, baseSpeedPred: 64, baseDelayAct: 3, baseDelayPred: 0 },
    { time: "08:24", t: 24, baseSpeedAct: 68, baseSpeedPred: 63, baseDelayAct: 3, baseDelayPred: 1 },
    { time: "08:32", t: 32, baseSpeedAct: 73, baseSpeedPred: 66, baseDelayAct: 4, baseDelayPred: 0 },
    { time: "08:40", t: 40, baseSpeedAct: 63, baseSpeedPred: 66, baseDelayAct: 1, baseDelayPred: 0 },
    { time: "08:48", t: 48, baseSpeedAct: 60, baseSpeedPred: 68, baseDelayAct: 3, baseDelayPred: 0 },
    { time: "08:56", t: 56, baseSpeedAct: 62, baseSpeedPred: 75, baseDelayAct: 3, baseDelayPred: 0 },
    { time: "09:04", t: 64, baseSpeedAct: 62, baseSpeedPred: 76, baseDelayAct: 4, baseDelayPred: 0 },
    { time: "09:12", t: 72, baseSpeedAct: 60, baseSpeedPred: 72, baseDelayAct: 5, baseDelayPred: 0 },
    { time: "09:20", t: 80, baseSpeedAct: 65, baseSpeedPred: 73, baseDelayAct: 2, baseDelayPred: 1 },
    { time: "09:28", t: 88, baseSpeedAct: 64, baseSpeedPred: 78, baseDelayAct: 5, baseDelayPred: 1 },
    { time: "09:36", t: 96, baseSpeedAct: 70, baseSpeedPred: 78, baseDelayAct: 3, baseDelayPred: 1 },
    { time: "09:44", t: 104, baseSpeedAct: 68, baseSpeedPred: 82, baseDelayAct: 2, baseDelayPred: 1 },
    { time: "09:52", t: 112, baseSpeedAct: 80, baseSpeedPred: 87, baseDelayAct: 3, baseDelayPred: 2 },
    { time: "10:00", t: 120, baseSpeedAct: 93, baseSpeedPred: 92, baseDelayAct: 6, baseDelayPred: 3 },
    { time: "10:08", t: 128, baseSpeedAct: 88, baseSpeedPred: 96, baseDelayAct: 8, baseDelayPred: 4 },
    { time: "10:16", t: 136, baseSpeedAct: 80, baseSpeedPred: 88, baseDelayAct: 10, baseDelayPred: 4 },
    { time: "10:24", t: 144, baseSpeedAct: 72, baseSpeedPred: 83, baseDelayAct: 13, baseDelayPred: 5 },
    { time: "10:32", t: 152, baseSpeedAct: 66, baseSpeedPred: 84, baseDelayAct: 14, baseDelayPred: 7 },
    { time: "10:40", t: 160, baseSpeedAct: 73, baseSpeedPred: 87, baseDelayAct: 13, baseDelayPred: 9 },
    { time: "10:48", t: 168, baseSpeedAct: 69, baseSpeedPred: 85, baseDelayAct: 14, baseDelayPred: 11 },
    { time: "10:56", t: 176, baseSpeedAct: 66, baseSpeedPred: 85, baseDelayAct: 17, baseDelayPred: 13 },
    { time: "11:04", t: 184, baseSpeedAct: 69, baseSpeedPred: 80, baseDelayAct: 18, baseDelayPred: 14 },
    { time: "11:12", t: 192, baseSpeedAct: 71, baseSpeedPred: 85, baseDelayAct: 20, baseDelayPred: 15 },
    { time: "11:20", t: 200, baseSpeedAct: 72, baseSpeedPred: 85, baseDelayAct: 18, baseDelayPred: 15 },
    { time: "11:28", t: 208, baseSpeedAct: 78, baseSpeedPred: 85, baseDelayAct: 21, baseDelayPred: 15 },
    { time: "11:36", t: 216, baseSpeedAct: 72, baseSpeedPred: 85, baseDelayAct: 23, baseDelayPred: 16 },
    { time: "11:44", t: 224, baseSpeedAct: 66, baseSpeedPred: 82, baseDelayAct: 25, baseDelayPred: 18 },
    { time: "11:50", t: 230, baseSpeedAct: 71, baseSpeedPred: 84, baseDelayAct: 30, baseDelayPred: 22 },
  ], []);

  const TIME_TICKS = useMemo(() => ["08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30"], []);
  const SPEED_TICKS = useMemo(() => [120, 90, 60, 30, 0], []);
  const DELAY_TICKS = useMemo(() => [40, 30, 20, 10, 0, -10], []);

  const journeyTrendsData = useMemo(() => {
    const liveSpeed = Math.round(Number(currentSpeed) || 71);
    const livePredSpeed = Math.round(Number(liveTrainData?.predictedSpeed) || 75);
    const liveDelay = Math.round(Number(totalDelay) || 4);
    const livePredDelay = Math.round(Number(futureDelay) || Number(predictedDelay) || 3);

    const speedOffset = liveSpeed - 71;
    const predSpeedOffset = livePredSpeed - 75;
    const delayOffset = liveDelay - 4;
    const predDelayOffset = livePredDelay - 3;

    // All numerical values are strictly whole numbers (no decimals)
    const points = BASE_JOURNEY_POINTS.map((pt) => {
      const speedAct = Math.max(0, Math.min(120, Math.round(pt.baseSpeedAct + speedOffset * 0.4)));
      const speedPred = Math.max(0, Math.min(120, Math.round(pt.baseSpeedPred + predSpeedOffset * 0.4)));
      const delayAct = Math.max(-10, Math.min(40, Math.round(pt.baseDelayAct + delayOffset * 0.5)));
      const delayPred = Math.max(-10, Math.min(40, Math.round(pt.baseDelayPred + predDelayOffset * 0.5)));

      return {
        time: pt.time,
        t: pt.t,
        speedAct,
        speedPred,
        delayAct,
        delayPred,
      };
    });

    const plotLeft = 65;
    const plotRight = 740;
    const plotW = plotRight - plotLeft; // 675
    const plotYBottom = 160;
    const plotH = 145;
    const totalDuration = 230;

    const getX = (t) => Number((plotLeft + (t / totalDuration) * plotW).toFixed(1));
    const getSpeedY = (v) => Number((plotYBottom - (Math.max(0, Math.min(120, v)) / 120) * plotH).toFixed(1));
    const getDelayY = (v) => Number((plotYBottom - ((Math.max(-10, Math.min(40, v)) - (-10)) / 50) * plotH).toFixed(1));

    const speedActPath = points.map((pt, i) => `${i === 0 ? "M" : "L"} ${getX(pt.t)} ${getSpeedY(pt.speedAct)}`).join(" ");
    const speedAreaPath = `${speedActPath} L ${getX(230)} ${plotYBottom} L ${getX(0)} ${plotYBottom} Z`;
    const speedPredPath = points.map((pt, i) => `${i === 0 ? "M" : "L"} ${getX(pt.t)} ${getSpeedY(pt.speedPred)}`).join(" ");

    const delayActPath = points.map((pt, i) => `${i === 0 ? "M" : "L"} ${getX(pt.t)} ${getDelayY(pt.delayAct)}`).join(" ");
    const delayAreaPath = `${delayActPath} L ${getX(230)} ${plotYBottom} L ${getX(0)} ${plotYBottom} Z`;
    const delayPredPath = points.map((pt, i) => `${i === 0 ? "M" : "L"} ${getX(pt.t)} ${getDelayY(pt.delayPred)}`).join(" ");

    return {
      points,
      getX,
      getSpeedY,
      getDelayY,
      speedActPath,
      speedAreaPath,
      speedPredPath,
      delayActPath,
      delayAreaPath,
      delayPredPath,
    };
  }, [BASE_JOURNEY_POINTS, currentSpeed, liveTrainData?.predictedSpeed, totalDelay, futureDelay, predictedDelay]);

  // C. Authority View: Last 10 Journey Trends (Operational Analysis)
  const historicalJourneysData = useMemo(() => {
    if (liveTrainData?.historicalJourneys && Array.isArray(liveTrainData.historicalJourneys)) {
      return liveTrainData.historicalJourneys;
    }
    return [];
  }, [liveTrainData?.historicalJourneys]);

  // Pointer interaction helper to find closest data milestone across mouse and touch interactions
  const handleGraphPointer = (e, setPoint) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const clientX = e.touches && e.touches.length > 0 ? e.touches[0].clientX : e.clientX;
    if (clientX === undefined) return;
    const relX = clientX - rect.left;
    const svgX = (relX / rect.width) * 760;

    if (svgX < 45 || svgX > 755) {
      return;
    }

    let closest = journeyTrendsData.points[0];
    let minDiff = Math.abs(journeyTrendsData.getX(closest.t) - svgX);

    for (let i = 1; i < journeyTrendsData.points.length; i++) {
      const pt = journeyTrendsData.points[i];
      const diff = Math.abs(journeyTrendsData.getX(pt.t) - svgX);
      if (diff < minDiff) {
        minDiff = diff;
        closest = pt;
      }
    }

    setPoint(closest);
  };

  if (!loading && (!trains || trains.length === 0) && !selectedTrain && !propLiveTrainData) {
    return (
      <div className="page-animation dashboard-page ref-styled-dashboard">
        <div className="dashboard-top-header-area">
          <div className="dashboard-header-text">
            <span className="dashboard-pretitle">Dynamic Train ETA</span>
            <h1 className="dashboard-title">Dashboard</h1>
          </div>
        </div>
        <div style={{ padding: "64px 24px", textAlign: "center", background: "#ffffff", borderRadius: "16px", border: "1px solid #e2e8f0", margin: "24px" }}>
          <Train size={48} style={{ color: "#94a3b8", marginBottom: "16px" }} />
          <h2 style={{ fontSize: "1.25rem", fontWeight: "600", color: "#1e293b", marginBottom: "8px" }}>Live Monitored Fleet Connecting...</h2>
          <p style={{ color: "#64748b", maxWidth: "480px", margin: "0 auto", fontSize: "0.95rem" }}>
            Connecting to real-time RailRadar backend. Active trains will appear here automatically once live telemetry is received.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-animation dashboard-page ref-styled-dashboard">
      {/* =====================================
          TOP HEADER & CENTERED 3D TITLE
      ===================================== */}
      <div
        className="dashboard-top-header-area"
        onMouseMove={handleHeaderMouseMove}
        onMouseLeave={handleHeaderMouseLeave}
      >
        <div className="dashboard-header-text">
          <span className="dashboard-pretitle">Dynamic Train ETA</span>
          <h1
            className="dashboard-title"
            style={{
              transform: `perspective(700px) rotateX(${headerTilt.rotateX}deg) rotateY(${headerTilt.rotateY}deg) translateZ(${headerTilt.translateZ}px)`,
              textShadow: headerTilt.textShadow,
            }}
          >
            Dashboard
            <span className="dashboard-title-shine" aria-hidden="true">
              Dashboard
            </span>
          </h1>
        </div>
      </div>

      {/* =====================================
          TOP TRAIN JOURNEY STATUS BAR
      ===================================== */}
      <div className="train-journey-topbar-card">
        <div className="topbar-train-identity">
          <div className="topbar-train-icon-box">
            <Train size={24} />
          </div>
          <div className="topbar-train-info">
            {trains && trains.length > 1 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <select
                  aria-label="Select Train"
                  value={trainNumber}
                  onChange={(e) => {
                    const found = trains.find((t) => (t.number || t.trainNumber) === e.target.value);
                    if (found && selectTrain) selectTrain(found);
                  }}
                  style={{
                    background: "#ffffff",
                    border: "1px solid #cbd5e1",
                    borderRadius: "6px",
                    padding: "2px 8px",
                    fontSize: "1.05rem",
                    fontWeight: "700",
                    color: "#0f172a",
                    cursor: "pointer",
                    outline: "none"
                  }}
                >
                  {trains.map((t) => {
                    const num = t.number || t.trainNumber;
                    const nm = t.name || t.trainName || `Train ${num}`;
                    return (
                      <option key={num} value={num}>
                        Train {num} - {nm}
                      </option>
                    );
                  })}
                </select>
                <span style={{ fontSize: "0.85rem", color: "#64748b" }}>{trainName}</span>
              </div>
            ) : (
              <>
                <h2>Train {trainNumber || "--"}</h2>
                <span>{trainName || "Live Train"}</span>
              </>
            )}
          </div>
        </div>

        <div className="topbar-origin-target">
          <div className="topbar-station-point">
            <span className="topbar-point-label">Origin</span>
            <div className="topbar-point-detail">
              <MapPin size={14} className="point-pin-icon" />
              <strong>{activeTrain?.source || ROUTE_CONFIG[0]?.name || stations[0]?.name || "--"}</strong>
              <span className="point-time">
                {formatTimeDisplay(displayStations[0]?.departure !== "Not available" ? displayStations[0]?.departure : displayStations[0]?.arrival)}
              </span>
            </div>
          </div>

          <div className="topbar-route-arrow">
            <span>· · · &gt;</span>
          </div>

          <div className="topbar-station-point">
            <span className="topbar-point-label">Destination</span>
            <div className="topbar-point-detail">
              <Landmark size={14} className="point-pin-icon destination" />
              <strong>{activeTrain?.destination || ROUTE_CONFIG[ROUTE_CONFIG.length - 1]?.name || stations[stations.length - 1]?.name || "--"}</strong>
              <span className="point-time">
                {formatTimeDisplay(predictedETA || displayStations[displayStations.length - 1]?.arrival)}
              </span>
            </div>
          </div>
        </div>

        <div className="topbar-status-actions">
          <div className={`topbar-status-pill ${totalDelay < 0 ? "early" : (totalDelay === 0 ? "on-time" : "delayed")}`}>
            <span className="status-live-dot" />
            {totalDelay < 0 ? `Early by ${Math.abs(Math.round(totalDelay))}m` : (totalDelay === 0 ? "On Time" : `Delayed +${Math.round(totalDelay)}m`)}
          </div>

          <div className="topbar-last-updated">
            <span>{journeyStatus.topbarTrackingText}</span>
            <button className="topbar-bell-btn" title="Alerts" onClick={() => setActivePage("alerts")}>
              <Bell size={16} />
              <span className="bell-badge-dot" />
            </button>
          </div>
        </div>

        <div className="topbar-scenic-backdrop">
          <img src={heroSceneImg} alt="Railway Scenery" className="topbar-backdrop-img" />
          <div className="topbar-backdrop-gradient" />
        </div>
      </div>

      {/* =====================================
          MAIN 3-PANEL DASHBOARD GRID
      ===================================== */}
      <div className="analytics-dashboard-grid ref-grid-layout">
        {/* ===================================================================
            1. ROUTE & PROGRESS PANEL
           =================================================================== */}
        <div className="dashboard-panel route-progress-panel">
          {/* Panel Header */}
          <div className="panel-header route-panel-header">
            <div className="panel-header-left">
              <div className="panel-header-icon route-icon-box">
                <Route size={22} />
              </div>
              <div className="panel-header-title">
                <h3>Route &amp; Progress</h3>
                <p>{journeyStatus.isNotStarted ? "Scheduled route with origin station position" : "Live journey with real-time train position"}</p>
              </div>
            </div>

            <div className="route-header-actions" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              {fullRouteStations.length > journeyStations.length && (
                <button
                  type="button"
                  className={`route-journey-toggle-btn ${showFullJourney ? "active" : ""}`}
                  onClick={() => setShowFullJourney((prev) => !prev)}
                  title={showFullJourney ? "Full Journey (All Route Stations) · Click to view Main Journey (Halt Stations Only)" : "Main Journey (Halt Stations Only) · Click to view Full Journey (All Route Stations)"}
                  aria-label={showFullJourney ? "Full Journey active · Click for Main Journey" : "Main Journey active · Click for Full Journey"}
                >
                  <Route size={13} />
                  <span>{showFullJourney ? "Full Journey" : "Main Journey"}</span>
                </button>
              )}

              {/* Google Maps style Live Map Pin Button */}
              <button
                className="route-map-pin-btn"
                onClick={() => setActivePage("map")}
                title="View Live Map"
                aria-label="View Live Map"
              >
                <div className="map-pin-circle">
                  <svg width="22" height="26" viewBox="0 0 48 56" fill="none">
                    <path d="M24 0C10.745 0 0 10.745 0 24c0 18.2 24 32 24 32s24-13.8 24-32c0-13.255-10.745-24-24-24z" fill="#EA4335"/>
                    <path d="M24 0C10.745 0 0 10.745 0 24c0 7.36 3.33 13.95 8.58 18.35L24 24V0z" fill="#FBBC04"/>
                    <path d="M24 56s24-13.8 24-32c0-7.36-3.33-13.95-8.58-18.35L24 24v32z" fill="#4285F4"/>
                    <path d="M24 56s-9-5.17-15.42-13.65L24 24v32z" fill="#34A853"/>
                    <circle cx="24" cy="24" r="8" fill="#FFFFFF"/>
                  </svg>
                </div>
                <span className="map-pin-badge-text">View Live Map</span>
              </button>
            </div>
          </div>

          {/* Timeline 4-Column Header */}
          <div className="route-columns-header">
            <span className="col-title col-arr">ARRIVAL</span>
            <span className="col-title col-route">ROUTE</span>
            <span className="col-title col-station">STATION</span>
            <span className="col-title col-dep">DEPARTURE</span>
          </div>

          {/* Continuous Railway Journey Timeline Container */}
          <div className="route-timeline-viewport">
            {displayStations.length > 0 ? (
              /* Station Rows (Clean White Cards) */
              <div className="route-stations-list">
              {/* Continuous Vertical Railway Track Connector spanning from Station 0 center (28px) to Station N-1 center */}
              <div
                className="vertical-railway-track-line"
                style={{
                  top: "28px",
                  bottom: "auto",
                  height: `${Math.max(0, (displayStations.length - 1) * 64)}px`,
                }}
              >
                <div className="track-rail-guide" />
                {/* Completed Active Track Segment */}
                <div
                  className="track-rail-completed"
                  style={{
                    height: `${Math.max(
                      0,
                      Math.min(
                        (displayStations.length - 1) * 64,
                        timelineFractionalIndex * 64
                      )
                    )}px`,
                  }}
                />
                {/* Dynamic Live Front-View Passenger Train Pointer positioned continuously along the track connector */}
                {displayStations.length > 0 && (
                  <div
                    className="live-train-car-pointer"
                    style={{
                      top: `${Math.max(
                        0,
                        Math.min(
                          (displayStations.length - 1) * 64,
                          timelineFractionalIndex * 64
                        )
                      )}px`,
                    }}
                    title={`Live Train Position: ${currentStationName} (${currentKmCovered != null ? `${currentKmCovered} km` : "Distance data unavailable"})`}
                  >
                    <div className="train-car-halo" />
                    <svg
                      className="train-pointer-svg"
                      width="22"
                      height="26"
                      viewBox="0 0 22 26"
                      fill="none"
                    >
                      {/* Roof Pantograph */}
                      <path d="M8 2 L11 0.8 L14 2" stroke="#cbd5e1" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                      <line x1="11" y1="0.8" x2="11" y2="3" stroke="#cbd5e1" strokeWidth="1.2"/>

                      {/* Train Cab Body */}
                      <rect
                        x="3"
                        y="3"
                        width="16"
                        height="18"
                        rx="4.5"
                        fill="#1d4ed8"
                        stroke="#ffffff"
                        strokeWidth="1.2"
                      />

                      {/* Wide Curved Panoramic Windshield */}
                      <rect
                        x="4.5"
                        y="5"
                        width="13"
                        height="6.5"
                        rx="2"
                        fill="#0284c7"
                        stroke="#bae6fd"
                        strokeWidth="0.8"
                      />
                      <line x1="11" y1="5" x2="11" y2="11.5" stroke="#bae6fd" strokeWidth="0.7"/>
                      {/* Windshield Reflection Highlight */}
                      <path d="M6 6 L7.5 6 L6 10 L5 10 Z" fill="#ffffff" opacity="0.45"/>

                      {/* Front Aerodynamic Yellow Nose Stripe */}
                      <path
                        d="M3 13.5 Q11 15 19 13.5 L19 16.5 Q11 18 3 16.5 Z"
                        fill="#fbbf24"
                      />

                      {/* Twin Bright Train Headlights */}
                      <circle cx="6" cy="15" r="1.3" fill="#ffffff" stroke="#fef08a" strokeWidth="0.6" />
                      <circle cx="16" cy="15" r="1.3" fill="#ffffff" stroke="#fef08a" strokeWidth="0.6" />

                      {/* Top Route Marker Board */}
                      <rect x="9.5" y="3.8" width="3" height="1" rx="0.5" fill="#fef08a" />

                      {/* Lower Skirt / Cowcatcher / Tracks */}
                      <path d="M6 21 L7.5 24 L14.5 24 L16 21 Z" fill="#1e293b" />
                      <rect x="5.5" y="24" width="2" height="1.8" rx="0.5" fill="#475569" />
                      <rect x="14.5" y="24" width="2" height="1.8" rx="0.5" fill="#475569" />
                    </svg>
                  </div>
                )}
              </div>

              {displayStations.map((stn, idx) => {
                const isCurrent = stn.status === "current";
                const isCompleted = stn.status === "completed";

                return (
                  <div
                    key={stn.name}
                    className={`route-station-row ${
                      isCurrent ? "is-current-station" : ""
                    } ${isCompleted ? "is-completed-station" : ""}`}
                  >
                    {/* 1. ARRIVAL */}
                    <div className="row-col col-arrival">
                      <strong className={`arrival-time ${stn.arrival === "Not available" ? "time-unavailable" : ""}`}>
                        {stn.arrival}
                      </strong>
                      {isCurrent && !stn.isDest ? (
                        <span className="row-badge current-badge">
                          <span className="pulse-blue-dot" /> Current
                        </span>
                      ) : isCompleted || (isCurrent && stn.isDest) ? (
                        <span className="row-badge departed-badge">
                          <Check size={10} /> {stn.isDest ? "Arrived" : (stn.isHalt === false ? "Passed" : "Departed")}
                        </span>
                      ) : stn.isHalt === false ? (
                        <span className="row-badge passthrough-badge">
                          Pass
                        </span>
                      ) : (
                        <span className="row-badge upcoming-badge">
                          <Circle size={6} /> Upcoming
                        </span>
                      )}
                    </div>

                    {/* 2. DISTANCE (Separated in its own dedicated column) */}
                    <div className="row-col col-distance">
                      <span className="route-dist-label">{stn.distanceKm != null ? `${Number(stn.distanceKm).toFixed(1)} km` : "--"}</span>
                    </div>

                    {/* 3. TRACK NODE (Centered exactly on the vertical journey axis) */}
                    <div className="row-col col-node">
                      <div
                        className={`route-node-anchor ${stn.status}`}
                        data-index={idx}
                      >
                        {isCompleted && <span className="node-ring-completed" />}
                        {isCurrent && <span className="node-ring-current" />}
                        {!isCompleted && !isCurrent && (
                          <span className="node-ring-upcoming" />
                        )}
                      </div>
                    </div>

                    {/* 4. STATION (Consistent 2-line height across all stations) */}
                    <div className="row-col col-station">
                      <div className="station-name-details">
                        <strong className="station-main-name">{stn.name}</strong>
                        <span className="station-sub-info">
                          {stn.subtext || "\u00A0"}
                        </span>
                      </div>
                    </div>

                    {/* 5. DEPARTURE */}
                    <div className="row-col col-departure">
                      <strong className={`departure-time ${stn.departure === "Not available" ? "time-unavailable" : ""}`}>
                        {stn.departure}
                      </strong>
                    </div>
                  </div>
                );
              })}
            </div>
            ) : (
              <div
                className="route-awaiting-container"
                style={{
                  padding: "48px 24px",
                  textAlign: "center",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: "240px",
                }}
              >
                <Route size={32} color="#64748b" style={{ opacity: 0.5, marginBottom: "12px" }} />
                <strong style={{ fontSize: "1.05rem", color: "#334155", marginBottom: "6px" }}>
                  Awaiting live route data
                </strong>
                <span style={{ fontSize: "0.85rem", color: "#94a3b8" }}>
                  Station stops will appear automatically as live railway telemetry is received.
                </span>
              </div>
            )}
          </div>

          {/* Bottom Journey Metrics Summary Strip */}
          <div className="route-bottom-stats-bar">
            <div className="stat-metric-item">
              <div className="metric-icon-circle map-icon-bg">
                <MapPin size={17} />
              </div>
              <div>
                <strong>
                  {currentKmCovered != null && (totalRouteKm != null || liveTrainData?.routeDistance != null)
                    ? `${Number(currentKmCovered).toFixed(1)} / ${Number(totalRouteKm || liveTrainData.routeDistance).toFixed(1)} km`
                    : "Distance data unavailable"}
                </strong>
                <span>Distance Covered</span>
              </div>
            </div>

            <div className="stat-metric-divider" />

            <div className="stat-metric-item">
              <div className="metric-icon-circle speed-icon-bg">
                <Gauge size={17} />
              </div>
              <div>
                <strong>{Number(currentSpeed).toFixed(0)} km/h</strong>
                <span>Current Speed</span>
              </div>
            </div>

            <div className="stat-metric-divider" />

            <div className="stat-metric-item">
              <div className="metric-icon-circle eta-icon-bg">
                <Clock size={17} />
              </div>
              <div>
                <strong>{estimatedRemainingTime}</strong>
                <span>Estimated Time to Destination</span>
              </div>
            </div>
          </div>
        </div>

        {/* ===================================================================
            2. AI PREDICTION PANEL
           =================================================================== */}
        <div className="dashboard-panel ai-prediction-panel">
          {/* Panel Header */}
          <div className="panel-header">
            <div className="panel-header-icon ai-icon-box">
              <BrainCircuit size={20} />
            </div>
            <div className="panel-header-title">
              <h3>AI Prediction</h3>
              <p>Intelligent ETA analysis</p>
            </div>
          </div>

          {/* Hero Prediction Card Container */}
          <div className="ai-hero-prediction-card">
            <div className="hero-card-left">
              <span className="hero-prediction-sub">{journeyStatus.isCompleted ? "Arrival at " : "Predicted Arrival at "}{ROUTE_CONFIG[ROUTE_CONFIG.length - 1]?.name || "Destination"}</span>
              <div className="hero-eta-row">
                <span className="hero-eta-large">{formatTimeDisplay(predictedETA)}</span>
                <span className={`hero-eta-pill ${totalDelay < 0 ? "early" : (totalDelay === 0 ? "on-time" : "delayed")}`}>
                  <span className="status-live-dot" /> {totalDelay < 0 ? `Early by ${Math.abs(Math.round(totalDelay))}m` : (totalDelay === 0 ? "On Time" : `Delayed +${Math.round(totalDelay)}m`)}
                </span>
              </div>

              <div className="hero-metrics-table">
                <div className="hero-metric-line">
                  <span>{journeyStatus.isCompleted ? "Scheduled Arrival" : "Scheduled ETA"}</span>
                  <strong>{formatTimeDisplay(scheduledArrival)}</strong>
                </div>
                <div className="hero-metric-line">
                  <span>{journeyStatus.isCompleted ? "Actual Arrival" : "Predicted ETA"}</span>
                  <strong className="blue-bold">{formatTimeDisplay(predictedETA)}</strong>
                </div>
                <div className="hero-metric-line">
                  <span>{journeyStatus.isCompleted ? "Arrival Delay" : "Expected Delay"}</span>
                  <strong className="delay-accent">
                    {formatDelayText(totalDelay)}
                  </strong>
                </div>
              </div>
            </div>

            <div className="hero-card-right-train">
              <img src={heroTrainImg} alt="Modern Train" className="hero-train-cutout" />
            </div>
          </div>

          {/* Confidence Score Section */}
          <div className="confidence-score-container">
            <span className="section-small-title">Confidence Score</span>
            <div className="confidence-score-content">
              {/* Circular Progress Meter */}
              <div className="confidence-circular-gauge">
                <svg width="64" height="64" viewBox="0 0 64 64" className="gauge-svg">
                  <circle
                    cx="32"
                    cy="32"
                    r="26"
                    stroke="#e2e8f0"
                    strokeWidth="5.5"
                    fill="none"
                  />
                  <circle
                    cx="32"
                    cy="32"
                    r="26"
                    stroke="#2563eb"
                    strokeWidth="5.5"
                    fill="none"
                    strokeDasharray={163.36}
                    strokeDashoffset={163.36 * (1 - Math.min(Math.max(roundedConfidence, 0), 100) / 100)}
                    strokeLinecap="round"
                    transform="rotate(-90 32 32)"
                  />
                </svg>
                <span className="gauge-percent-text">{roundedConfidence}%</span>
              </div>

              <div className="confidence-info-text">
                <div className="confidence-badge-title">
                  <strong>High Confidence</strong>
                  <Info size={14} className="confidence-info-icon" />
                </div>
                <p>Prediction based on real-time data, historical patterns and AI model</p>
              </div>
            </div>
          </div>

          {/* AI Inputs Analyzed (2x3 Grid) */}
          <div className="ai-inputs-section">
            <span className="section-small-title">AI Inputs Analyzed</span>
            <div className="ai-inputs-compact-grid">
              <div className="input-chip-item">
                <div className="chip-icon-box">
                  <MapPin size={15} />
                </div>
                <div className="chip-info">
                  <strong>Live GPS Location</strong>
                  <span>{currentStationName}</span>
                </div>
              </div>

              <div className="input-chip-item">
                <div className="chip-icon-box">
                  <Gauge size={15} />
                </div>
                <div className="chip-info">
                  <strong>Current Speed</strong>
                  <span>{Number(currentSpeed).toFixed(1)} km/h</span>
                </div>
              </div>

              <div className="input-chip-item">
                <div className="chip-icon-box">
                  <Activity size={15} />
                </div>
                <div className="chip-info">
                  <strong>Delay Status</strong>
                  <span>{formatDelayText(totalDelay)}</span>
                </div>
              </div>

              <div className="input-chip-item">
                <div className="chip-icon-box">
                  <Clock3 size={15} />
                </div>
                <div className="chip-info">
                  <strong>Previous Station Delay</strong>
                  <span>
                    {liveTrainData?.previousDelay != null && !isNaN(liveTrainData.previousDelay)
                      ? (Number(liveTrainData.previousDelay) < 0
                          ? `Early by ${Math.abs(Math.round(liveTrainData.previousDelay))} min`
                          : (Number(liveTrainData.previousDelay) === 0
                              ? "On time"
                              : `+${Math.round(liveTrainData.previousDelay)} min`))
                      : "Not available"}
                  </span>
                </div>
              </div>

              <div className="input-chip-item">
                <div className="chip-icon-box">
                  <Route size={15} />
                </div>
                <div className="chip-info">
                  <strong>Route &amp; Track Congestion</strong>
                  <span>
                    {liveTrainData?.trafficFactor != null && Number(liveTrainData.trafficFactor) !== 0
                      ? `Factor ${Number(liveTrainData.trafficFactor).toFixed(1)}`
                      : "Not available"}
                  </span>
                </div>
              </div>

              <div className="input-chip-item">
                <div className="chip-icon-box">
                  <CloudSun size={15} />
                </div>
                <div className="chip-info">
                  <strong>Weather Conditions</strong>
                  <span>
                    {liveTrainData?.weatherFactor != null && Number(liveTrainData.weatherFactor) !== 0
                      ? `Factor ${Number(liveTrainData.weatherFactor).toFixed(1)}`
                      : "Not available"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Button: View Trends */}
          <button
            className="view-trends-btn"
            onClick={() => setShowTrendsModal(true)}
          >
            <TrendingUp size={16} />
            <span>View Trends</span>
            <ChevronRight size={16} className="btn-arrow" />
          </button>
        </div>

        {/* ===================================================================
            3. UPCOMING STATIONS PANEL
           =================================================================== */}
        <div className="dashboard-panel upcoming-stations-panel">
          {/* Panel Header */}
          <div className="panel-header">
            <div className="panel-header-icon clock-icon-box">
              <Clock3 size={20} />
            </div>
            <div className="panel-header-title">
              <h3>Upcoming Stations</h3>
              <p>Predicted arrival at next stations</p>
            </div>
            <button
              className="panel-header-action-btn view-all-upcoming-btn"
              onClick={() => setShowUpcomingModal(true)}
            >
              <span>All Upcoming Stations</span>
            </button>
          </div>

          {/* 3 Upcoming Station Cards Sequence */}
          <div className="upcoming-cards-stack">
            {allUpcomingStations.length > 0 ? (
              allUpcomingStations.slice(0, 3).map((stn) => (
                <div
                  key={stn.name}
                  className={`station-forecast-card ${stn.cardClass}`}
                >
                  <div className="forecast-card-header">
                    <div className="forecast-card-left">
                      <span className="station-sequence-num">{stn.sequence}</span>
                      <strong className="forecast-station-name">{stn.name}</strong>
                      <span className={`forecast-badge ${stn.pillClass}`}>
                        {stn.badgeText}
                      </span>
                    </div>
                    <span className="forecast-ahead-dist">{stn.distanceAhead}</span>
                  </div>

                  <div className="forecast-card-metrics">
                    <div className="forecast-metric-row">
                      <span>Scheduled Arrival</span>
                      <strong>{stn.scheduledArrival}</strong>
                    </div>
                    <div className="forecast-metric-row">
                      <span>Predicted Arrival</span>
                      <strong className="blue-bold">{stn.predictedArrival}</strong>
                    </div>
                    <div className="forecast-metric-row">
                      <span>Expected Delay</span>
                      <strong className={stn.delayClass}>{stn.delayText}</strong>
                    </div>
                  </div>
                </div>
              ))
            ) : ROUTE_CONFIG.length === 0 ? (
              <div className="station-forecast-card" style={{ padding: "24px 16px", textAlign: "center", color: "#64748b" }}>
                <span style={{ fontSize: "0.875rem", color: "#64748b" }}>Awaiting live route data</span>
              </div>
            ) : (
              <div className="station-forecast-card destination-card" style={{ padding: "20px 16px", textAlign: "center" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
                  <Check size={24} color="#16a34a" />
                  <strong style={{ fontSize: "1rem", color: "#0f172a" }}>
                    Train has reached its destination
                  </strong>
                  <span style={{ fontSize: "0.85rem", color: "#64748b" }}>
                    {ROUTE_CONFIG[ROUTE_CONFIG.length - 1]?.name || "Destination"} · All scheduled stops completed
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Running On Schedule Banner */}
          <div className="schedule-status-banner">
            <div className="schedule-banner-icon">
              <Target size={18} />
            </div>
            <div className="schedule-banner-text">
              <strong>
                {ROUTE_CONFIG.length === 0
                  ? "Live route tracking active"
                  : allUpcomingStations.length === 0
                  ? "Train has reached final destination"
                  : journeyStatus.isNotStarted
                  ? (liveTrainData?.delayAlert && liveTrainData.delayAlert !== "On schedule"
                    ? `Train has not started · ${liveTrainData.delayAlert}`
                    : journeyStatus.scheduleBannerTitle)
                  : (liveTrainData?.delayAlert || etaData?.delayAlert || (totalDelay < 0 ? "Train is running ahead of schedule" : (totalDelay === 0 ? "Train is running on schedule" : "Train is experiencing delay")))}
              </strong>
              <span>
                {ROUTE_CONFIG.length === 0
                  ? "Awaiting upcoming station schedule"
                  : allUpcomingStations.length === 0
                  ? `Arrived at ${ROUTE_CONFIG[ROUTE_CONFIG.length - 1]?.name || "destination"}`
                  : journeyStatus.isNotStarted
                  ? journeyStatus.scheduleBannerSubtitle
                  : (predictedETA && predictedETA !== "Not available"
                    ? `Expected to reach ${ROUTE_CONFIG[ROUTE_CONFIG.length - 1]?.name || "destination"} at ${formatTimeDisplay(predictedETA)}`
                    : `Approaching ${ROUTE_CONFIG[ROUTE_CONFIG.length - 1]?.name || "destination"}`)}
              </span>
            </div>
            <ChevronRight size={16} className="schedule-banner-chevron" />
          </div>
        </div>
      </div>

      {/* =====================================
          TRENDS POPUP MODAL (OVERLAY)
      ===================================== */}
      {showTrendsModal && (
        <div
          className="trends-modal-overlay"
          onClick={handleCloseTrendsModal}
        >
          <div
            className="trends-modal"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="trends-modal-header">
              <div className="trends-modal-header-left">
                <div className="trends-modal-icon">
                  <TrendingUp size={24} />
                </div>
                <div>
                  <div className="trends-modal-badge-row">
                    <span className="trends-modal-subtitle">JOURNEY ANALYTICS</span>
                    {isAuthority && (
                      <span className="trends-authority-tag">
                        <Shield size={11} /> Authority Access
                      </span>
                    )}
                  </div>
                  <h2 className="trends-modal-title">Trends &amp; Insights</h2>
                  <p className="trends-modal-train-info">
                    Train {trainNumber} · {trainName} ({trainRoute})
                  </p>
                </div>
              </div>

              <button
                className="trends-modal-close"
                onClick={handleCloseTrendsModal}
                aria-label="Close Trends"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="trends-modal-body">
              {/* ===================================================
                  GRAPH 1 — CURRENT SPEED VS PREDICTED SPEED
                 =================================================== */}
              <div className="trends-chart-card">
                <div className="trends-chart-header">
                  <div className="trends-card-title-group">
                    <div className="trends-card-icon-box speed-icon-box">
                      <Gauge size={16} />
                    </div>
                    <h3 className="trends-card-title">Current Speed vs Predicted Speed</h3>
                  </div>
                  <div className="trends-legend-row">
                    <div className="trends-legend-item">
                      <span className="legend-dot dot-blue" />
                      <span className="legend-text">Current Speed</span>
                    </div>
                    <div className="trends-legend-item">
                      <span className="legend-dot dot-green" />
                      <span className="legend-text">Predicted Speed</span>
                    </div>
                  </div>
                </div>

                <div className="trends-svg-container">
                  <svg
                    viewBox="0 0 760 190"
                    className="trends-line-chart-svg"
                    preserveAspectRatio="none"
                    onMouseMove={(e) => handleGraphPointer(e, setActiveSpeedPoint)}
                    onMouseLeave={() => setActiveSpeedPoint(null)}
                    onTouchStart={(e) => handleGraphPointer(e, setActiveSpeedPoint)}
                    onTouchMove={(e) => handleGraphPointer(e, setActiveSpeedPoint)}
                  >
                    <defs>
                      <linearGradient id="speedAreaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.22" />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.01" />
                      </linearGradient>
                    </defs>

                    {/* Y-Axis Label */}
                    <text
                      x="16"
                      y="88"
                      transform="rotate(-90 16 88)"
                      textAnchor="middle"
                      fill="#64748b"
                      fontSize="11"
                      fontWeight="600"
                    >
                      Speed (km/h)
                    </text>

                    {/* Horizontal Grid Lines & Y-axis numbers */}
                    {SPEED_TICKS.map((val) => {
                      const y = Number((160 - (val / 120) * 145).toFixed(1));
                      return (
                        <g key={val}>
                          <line x1="65" y1={y} x2="740" y2={y} stroke="#f1f5f9" strokeWidth="1" />
                          <text x="56" y={y + 3.5} textAnchor="end" fill="#94a3b8" fontSize="10" fontWeight="500">
                            {Math.round(val)}
                          </text>
                        </g>
                      );
                    })}

                    {/* Vertical Grid Lines & X-axis time labels */}
                    {TIME_TICKS.map((tick, idx) => {
                      const t = idx * 30;
                      const x = Number((65 + (t / 230) * 675).toFixed(1));
                      return (
                        <g key={tick}>
                          <line x1={x} y1="15" x2={x} y2="160" stroke="#f1f5f9" strokeWidth="1" />
                          <text x={x} y="177" textAnchor="middle" fill="#94a3b8" fontSize="10" fontWeight="500">
                            {tick}
                          </text>
                        </g>
                      );
                    })}

                    {/* Area Fill for Current Speed */}
                    <path d={journeyTrendsData.speedAreaPath} fill="url(#speedAreaGrad)" />

                    {/* Current Speed Line (Blue) */}
                    <path
                      d={journeyTrendsData.speedActPath}
                      fill="none"
                      stroke="#2563eb"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    {/* Predicted Speed Line (Green) */}
                    <path
                      d={journeyTrendsData.speedPredPath}
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    {/* Vertical Crosshair Guide on Active Point */}
                    {activeSpeedPoint && (
                      <line
                        x1={journeyTrendsData.getX(activeSpeedPoint.t)}
                        y1="15"
                        x2={journeyTrendsData.getX(activeSpeedPoint.t)}
                        y2="160"
                        stroke="#64748b"
                        strokeWidth="1.2"
                        strokeDasharray="3 3"
                        opacity="0.85"
                        pointerEvents="none"
                      />
                    )}

                    {/* Circular Dots on Current Speed */}
                    {journeyTrendsData.points.map((pt) => {
                      const cx = journeyTrendsData.getX(pt.t);
                      const cy = journeyTrendsData.getSpeedY(pt.speedAct);
                      return (
                        <circle
                          key={`sp-act-${pt.t}`}
                          cx={cx}
                          cy={cy}
                          r="3"
                          fill="#2563eb"
                          stroke="#ffffff"
                          strokeWidth="1"
                          style={{ cursor: "pointer" }}
                          onMouseEnter={() => setActiveSpeedPoint(pt)}
                          onTouchStart={() => setActiveSpeedPoint(pt)}
                        />
                      );
                    })}

                    {/* Circular Dots on Predicted Speed */}
                    {journeyTrendsData.points.map((pt) => {
                      const cx = journeyTrendsData.getX(pt.t);
                      const cy = journeyTrendsData.getSpeedY(pt.speedPred);
                      return (
                        <circle
                          key={`sp-pred-${pt.t}`}
                          cx={cx}
                          cy={cy}
                          r="3"
                          fill="#10b981"
                          stroke="#ffffff"
                          strokeWidth="1"
                          style={{ cursor: "pointer" }}
                          onMouseEnter={() => setActiveSpeedPoint(pt)}
                          onTouchStart={() => setActiveSpeedPoint(pt)}
                        />
                      );
                    })}

                    {/* Emphasized Active Point Highlights */}
                    {activeSpeedPoint && (
                      <g pointerEvents="none">
                        {/* Current Speed Highlight Ring & Dot */}
                        <circle
                          cx={journeyTrendsData.getX(activeSpeedPoint.t)}
                          cy={journeyTrendsData.getSpeedY(activeSpeedPoint.speedAct)}
                          r="8"
                          fill="rgba(37, 99, 235, 0.22)"
                        />
                        <circle
                          cx={journeyTrendsData.getX(activeSpeedPoint.t)}
                          cy={journeyTrendsData.getSpeedY(activeSpeedPoint.speedAct)}
                          r="5.5"
                          fill="#2563eb"
                          stroke="#ffffff"
                          strokeWidth="2"
                        />

                        {/* Predicted Speed Highlight Ring & Dot */}
                        <circle
                          cx={journeyTrendsData.getX(activeSpeedPoint.t)}
                          cy={journeyTrendsData.getSpeedY(activeSpeedPoint.speedPred)}
                          r="8"
                          fill="rgba(16, 185, 129, 0.22)"
                        />
                        <circle
                          cx={journeyTrendsData.getX(activeSpeedPoint.t)}
                          cy={journeyTrendsData.getSpeedY(activeSpeedPoint.speedPred)}
                          r="5.5"
                          fill="#10b981"
                          stroke="#ffffff"
                          strokeWidth="2"
                        />
                      </g>
                    )}
                  </svg>

                  {/* Interactive Data Tooltip */}
                  {activeSpeedPoint && (
                    <div
                      className="trends-chart-tooltip"
                      style={{
                        left: `${(journeyTrendsData.getX(activeSpeedPoint.t) / 760) * 100}%`,
                        top: "10px",
                        transform:
                          journeyTrendsData.getX(activeSpeedPoint.t) / 760 > 0.62
                            ? "translateX(-100%)"
                            : "translateX(0%)",
                        marginLeft:
                          journeyTrendsData.getX(activeSpeedPoint.t) / 760 > 0.62
                            ? "-12px"
                            : "12px",
                      }}
                    >
                      <div className="tooltip-time-badge">{activeSpeedPoint.time}</div>
                      <div className="tooltip-data-row">
                        <span className="tooltip-dot dot-blue" />
                        <span className="tooltip-label">Current Speed:</span>
                        <strong className="tooltip-value text-blue">
                          {Math.round(activeSpeedPoint.speedAct)} km/h
                        </strong>
                      </div>
                      <div className="tooltip-data-row">
                        <span className="tooltip-dot dot-green" />
                        <span className="tooltip-label">Predicted Speed:</span>
                        <strong className="tooltip-value text-green">
                          {Math.round(activeSpeedPoint.speedPred)} km/h
                        </strong>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* ===================================================
                  GRAPH 2 — ACTUAL DELAY VS PREDICTED DELAY
                 =================================================== */}
              <div className="trends-chart-card">
                <div className="trends-chart-header">
                  <div className="trends-card-title-group">
                    <div className="trends-card-icon-box delay-icon-box">
                      <Clock size={16} />
                    </div>
                    <h3 className="trends-card-title">Actual Delay vs Predicted Delay</h3>
                  </div>
                  <div className="trends-legend-row">
                    <div className="trends-legend-item">
                      <span className="legend-dot dot-red" />
                      <span className="legend-text">Actual Delay</span>
                    </div>
                    <div className="trends-legend-item">
                      <span className="legend-dot dot-orange" />
                      <span className="legend-text">Predicted Delay</span>
                    </div>
                  </div>
                </div>

                <div className="trends-svg-container">
                  <svg
                    viewBox="0 0 760 190"
                    className="trends-line-chart-svg"
                    preserveAspectRatio="none"
                    onMouseMove={(e) => handleGraphPointer(e, setActiveDelayPoint)}
                    onMouseLeave={() => setActiveDelayPoint(null)}
                    onTouchStart={(e) => handleGraphPointer(e, setActiveDelayPoint)}
                    onTouchMove={(e) => handleGraphPointer(e, setActiveDelayPoint)}
                  >
                    <defs>
                      <linearGradient id="delayAreaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ef4444" stopOpacity="0.20" />
                        <stop offset="100%" stopColor="#ef4444" stopOpacity="0.01" />
                      </linearGradient>
                    </defs>

                    {/* Y-Axis Label */}
                    <text
                      x="16"
                      y="88"
                      transform="rotate(-90 16 88)"
                      textAnchor="middle"
                      fill="#64748b"
                      fontSize="11"
                      fontWeight="600"
                    >
                      Delay (minutes)
                    </text>

                    {/* Horizontal Grid Lines & Y-axis numbers */}
                    {DELAY_TICKS.map((val) => {
                      const y = Number((160 - ((val - (-10)) / 50) * 145).toFixed(1));
                      return (
                        <g key={val}>
                          <line x1="65" y1={y} x2="740" y2={y} stroke="#f1f5f9" strokeWidth="1" />
                          <text x="56" y={y + 3.5} textAnchor="end" fill="#94a3b8" fontSize="10" fontWeight="500">
                            {Math.round(val)}
                          </text>
                        </g>
                      );
                    })}

                    {/* Vertical Grid Lines & X-axis time labels */}
                    {TIME_TICKS.map((tick, idx) => {
                      const t = idx * 30;
                      const x = Number((65 + (t / 230) * 675).toFixed(1));
                      return (
                        <g key={tick}>
                          <line x1={x} y1="15" x2={x} y2="160" stroke="#f1f5f9" strokeWidth="1" />
                          <text x={x} y="177" textAnchor="middle" fill="#94a3b8" fontSize="10" fontWeight="500">
                            {tick}
                          </text>
                        </g>
                      );
                    })}

                    {/* Area Fill for Actual Delay */}
                    <path d={journeyTrendsData.delayAreaPath} fill="url(#delayAreaGrad)" />

                    {/* Actual Delay Line (Red/Coral) */}
                    <path
                      d={journeyTrendsData.delayActPath}
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    {/* Predicted Delay Line (Orange) */}
                    <path
                      d={journeyTrendsData.delayPredPath}
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    {/* Vertical Crosshair Guide on Active Point */}
                    {activeDelayPoint && (
                      <line
                        x1={journeyTrendsData.getX(activeDelayPoint.t)}
                        y1="15"
                        x2={journeyTrendsData.getX(activeDelayPoint.t)}
                        y2="160"
                        stroke="#64748b"
                        strokeWidth="1.2"
                        strokeDasharray="3 3"
                        opacity="0.85"
                        pointerEvents="none"
                      />
                    )}

                    {/* Circular Dots on Actual Delay */}
                    {journeyTrendsData.points.map((pt) => {
                      const cx = journeyTrendsData.getX(pt.t);
                      const cy = journeyTrendsData.getDelayY(pt.delayAct);
                      return (
                        <circle
                          key={`dl-act-${pt.t}`}
                          cx={cx}
                          cy={cy}
                          r="3"
                          fill="#ef4444"
                          stroke="#ffffff"
                          strokeWidth="1"
                          style={{ cursor: "pointer" }}
                          onMouseEnter={() => setActiveDelayPoint(pt)}
                          onTouchStart={() => setActiveDelayPoint(pt)}
                        />
                      );
                    })}

                    {/* Circular Dots on Predicted Delay */}
                    {journeyTrendsData.points.map((pt) => {
                      const cx = journeyTrendsData.getX(pt.t);
                      const cy = journeyTrendsData.getDelayY(pt.delayPred);
                      return (
                        <circle
                          key={`dl-pred-${pt.t}`}
                          cx={cx}
                          cy={cy}
                          r="3"
                          fill="#f59e0b"
                          stroke="#ffffff"
                          strokeWidth="1"
                          style={{ cursor: "pointer" }}
                          onMouseEnter={() => setActiveDelayPoint(pt)}
                          onTouchStart={() => setActiveDelayPoint(pt)}
                        />
                      );
                    })}

                    {/* Emphasized Active Point Highlights */}
                    {activeDelayPoint && (
                      <g pointerEvents="none">
                        {/* Actual Delay Highlight Ring & Dot */}
                        <circle
                          cx={journeyTrendsData.getX(activeDelayPoint.t)}
                          cy={journeyTrendsData.getDelayY(activeDelayPoint.delayAct)}
                          r="8"
                          fill="rgba(239, 68, 68, 0.22)"
                        />
                        <circle
                          cx={journeyTrendsData.getX(activeDelayPoint.t)}
                          cy={journeyTrendsData.getDelayY(activeDelayPoint.delayAct)}
                          r="5.5"
                          fill="#ef4444"
                          stroke="#ffffff"
                          strokeWidth="2"
                        />

                        {/* Predicted Delay Highlight Ring & Dot */}
                        <circle
                          cx={journeyTrendsData.getX(activeDelayPoint.t)}
                          cy={journeyTrendsData.getDelayY(activeDelayPoint.delayPred)}
                          r="8"
                          fill="rgba(245, 158, 11, 0.22)"
                        />
                        <circle
                          cx={journeyTrendsData.getX(activeDelayPoint.t)}
                          cy={journeyTrendsData.getDelayY(activeDelayPoint.delayPred)}
                          r="5.5"
                          fill="#f59e0b"
                          stroke="#ffffff"
                          strokeWidth="2"
                        />
                      </g>
                    )}
                  </svg>

                  {/* Interactive Data Tooltip */}
                  {activeDelayPoint && (
                    <div
                      className="trends-chart-tooltip"
                      style={{
                        left: `${(journeyTrendsData.getX(activeDelayPoint.t) / 760) * 100}%`,
                        top: "10px",
                        transform:
                          journeyTrendsData.getX(activeDelayPoint.t) / 760 > 0.62
                            ? "translateX(-100%)"
                            : "translateX(0%)",
                        marginLeft:
                          journeyTrendsData.getX(activeDelayPoint.t) / 760 > 0.62
                            ? "-12px"
                            : "12px",
                      }}
                    >
                      <div className="tooltip-time-badge">{activeDelayPoint.time}</div>
                      <div className="tooltip-data-row">
                        <span className="tooltip-dot dot-red" />
                        <span className="tooltip-label">Actual Delay:</span>
                        <strong className="tooltip-value text-red">
                          {Math.round(activeDelayPoint.delayAct)} min
                        </strong>
                      </div>
                      <div className="tooltip-data-row">
                        <span className="tooltip-dot dot-orange" />
                        <span className="tooltip-label">Predicted Delay:</span>
                        <strong className="tooltip-value text-orange">
                          {Math.round(activeDelayPoint.delayPred)} min
                        </strong>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* ===================================================
                  C. LAST 10 JOURNEY TRENDS (Authority View Only)
                 =================================================== */}
              {isAuthority && (
                <div className="trends-chart-card authority-section-card">
                  <div className="trends-chart-header">
                    <div className="trends-card-title-group">
                      <div className="trends-card-icon-box authority-icon-box">
                        <History size={16} />
                      </div>
                      <div>
                        <div className="authority-heading-row">
                          <h4 className="trends-card-title">Last 10 Journey Trends</h4>
                          <span className="authority-badge-inline">
                            Operational Authority View
                          </span>
                        </div>
                        <p className="trend-section-desc">
                          Historical speed patterns, arrival variance, and on-time performance across past 10 completed journeys
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Authority Operational Table */}
                  <div className="authority-table-viewport">
                    <table className="authority-trends-table">
                      <thead>
                        <tr>
                          <th>Journey ID</th>
                          <th>Trip Date</th>
                          <th>Avg Speed</th>
                          <th>Pred. Avg Speed</th>
                          <th>Final Delay</th>
                          <th>Pred. Delay</th>
                          <th>On-Time Score</th>
                        </tr>
                      </thead>
                      <tbody>
                        {historicalJourneysData.length > 0 ? (
                          historicalJourneysData.map((j) => {
                            const avgSpeed = Math.round(Number(j.avgSpeed) || 0);
                            const predAvgSpeed = Math.round(Number(j.predictedAvgSpeed) || 0);
                            const actualDelay = Math.round(Number(j.actualDelay) || 0);
                            const predDelay = Math.round(Number(j.predictedDelay) || 0);
                            const onTimeScore =
                              typeof j.onTimeRate === "string" && j.onTimeRate.includes("%")
                                ? `${Math.round(parseFloat(j.onTimeRate))}%`
                                : `${Math.round(Number(j.onTimeRate) || 0)}%`;

                            return (
                              <tr key={j.journeyId}>
                                <td>
                                  <strong>{j.journeyId}</strong>
                                </td>
                                <td>{j.date}</td>
                                <td>
                                  <span className="speed-tag">{avgSpeed} km/h</span>
                                </td>
                                <td className="text-muted">{predAvgSpeed} km/h</td>
                                <td>
                                  <span className={actualDelay <= 5 ? "delay-tag-good" : "delay-tag-warn"}>
                                    +{actualDelay} min
                                  </span>
                                </td>
                                <td className="text-muted">+{predDelay} min</td>
                                <td>
                                  <span className="ontime-tag">{onTimeScore}</span>
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan="7" style={{ textAlign: "center", padding: "24px", color: "#64748b" }}>
                              No historical journey records recorded for this train yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="trends-modal-footer">
              <button
                className="trends-modal-close-btn"
                onClick={handleCloseTrendsModal}
              >
                Close Trends
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================
          ALL UPCOMING STATIONS POPUP MODAL
      ===================================== */}
      {showUpcomingModal && (
        <div
          className="upcoming-modal-overlay"
          onClick={handleCloseUpcomingModal}
        >
          <div
            className="upcoming-modal"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="upcoming-modal-header">
              <div className="upcoming-modal-header-left">
                <div className="upcoming-modal-icon">
                  <Clock3 size={24} />
                </div>
                <div>
                  <div className="upcoming-modal-badge-row">
                    <span className="upcoming-modal-subtitle">ROUTE FORECAST</span>
                    <span className="upcoming-count-badge">
                      {allUpcomingStations.length} Stations Remaining
                    </span>
                  </div>
                  <h2 className="upcoming-modal-title">All Upcoming Stations</h2>
                  <p className="upcoming-modal-train-info">
                    Train {trainNumber} · {trainName} ({trainRoute})
                  </p>
                </div>
              </div>

              <button
                className="upcoming-modal-close"
                onClick={handleCloseUpcomingModal}
                aria-label="Close Upcoming Stations"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="upcoming-modal-body">
              <div className="upcoming-modal-cards-stack">
                {allUpcomingStations.length > 0 ? (
                  allUpcomingStations.map((stn) => (
                    <div
                      key={stn.name}
                      className={`station-forecast-card ${stn.cardClass}`}
                    >
                      <div className="forecast-card-header">
                        <div className="forecast-card-left">
                          <span className="station-sequence-num">{stn.sequence}</span>
                          <strong className="forecast-station-name">{stn.name}</strong>
                          <span className={`forecast-badge ${stn.pillClass}`}>
                            {stn.badgeText}
                          </span>
                        </div>
                        <span className="forecast-ahead-dist">{stn.distanceAhead}</span>
                      </div>

                      <div className="forecast-card-metrics">
                        <div className="forecast-metric-row">
                          <span>Scheduled Arrival</span>
                          <strong>{stn.scheduledArrival}</strong>
                        </div>
                        <div className="forecast-metric-row">
                          <span>Predicted Arrival</span>
                          <strong className="blue-bold">{stn.predictedArrival}</strong>
                        </div>
                        <div className="forecast-metric-row">
                          <span>Expected Delay</span>
                          <strong className={stn.delayClass}>{stn.delayText}</strong>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="station-forecast-card destination-card" style={{ padding: "24px 16px", textAlign: "center" }}>
                    <p style={{ color: "#64748b", margin: 0, fontSize: "0.95rem" }}>
                      Train has reached its final destination. All scheduled stops have been completed.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="upcoming-modal-footer">
              <div className="upcoming-modal-footer-info">
                <Target size={16} />
                <span>
                  Expected to reach destination {allUpcomingStations[allUpcomingStations.length - 1]?.name || "Destination"} with {allUpcomingStations[allUpcomingStations.length - 1]?.delayVal != null ? allUpcomingStations[allUpcomingStations.length - 1].delayVal : Math.round(totalDelay)} minutes delay
                </span>
              </div>
              <button
                className="upcoming-modal-close-btn"
                onClick={handleCloseUpcomingModal}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
