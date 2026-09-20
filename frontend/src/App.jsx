import { useEffect, useState, useMemo, useRef } from "react";
import {
  connectTrainWebSocket,
  disconnectTrainWebSocket,
} from "./services/websocket";
import "./App.css";

// COMPONENTS
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";

// PAGES
import Home from "./pages/Home";
import SearchTrain from "./pages/SearchTrain";
import Dashboard from "./pages/Dashboard";
import LiveTrainMap from "./pages/LiveTrainMap";
import Alerts from "./pages/Alerts";

import { checkBackendHealth } from "./services/api";
import { getAllLiveTrains, getLiveTrainData } from "./services/trainApi";
import {
  mapBackendTrainToUI,
  resolveTrainJourneyStatus,
  formatTimeDisplay,
  calculatePredictedETA,
  calculateFinalArrivalDelay,
  formatDelayText,
} from "./services/trainMapper";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV ? "http://localhost:8080" : "https://dynamic-train-eta.onrender.com");

function App() {

  // =========================
  // MAIN UI STATES
  // =========================

  const [activePage, setActivePage] =
    useState("home");

  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth >= 1024;
    }
    return true;
  });

  const handlePageChange = (page) => {
    setActivePage(page);
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  const [searchQuery, setSearchQuery] =
    useState("");

  // =========================
  // MONITORED FLEET STATE (REAL DATA)
  // =========================

  const [trains, setTrains] = useState([]);
  const [fleetLoading, setFleetLoading] = useState(true);

  // =========================
  // SELECTED TRAIN
  // =========================

  const [selectedTrain, setSelectedTrain] = useState(null);
  const selectedTrainNumberRef = useRef(null);

  // =========================
  // LIVE TRAIN DATA
  // =========================

  const [liveTrainData, setLiveTrainData] = useState(null);

  // =========================
  // ETA DATA
  // =========================

  const [etaData, setEtaData] =
    useState(null);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  // =========================
  // BACKEND STATUS
  // =========================

  const [backendStatus, setBackendStatus] =
    useState("checking");

  // =========================
  // FUTURE DELAY DATA
  // =========================

  const [
    futureDelayData,
    setFutureDelayData,
  ] = useState(null);

  const [
    futureDelayLoading,
    setFutureDelayLoading,
  ] = useState(false);

  // =========================
  // STATION-WISE PREDICTIONS
  // =========================

  const [
    stationPredictions,
    setStationPredictions,
  ] = useState([]);

  // =========================
  // BACKEND HEALTH CHECK
  // =========================

  useEffect(() => {
    let isMounted = true;
    const checkBackend = async () => {
      try {
        await checkBackendHealth();
        if (isMounted) {
          setBackendStatus("online");
        }
      } catch (error) {
        if (isMounted) {
          console.warn("Backend health check failed:", error);
          setBackendStatus("offline");
        }
      }
    };

    checkBackend();
    const interval = setInterval(checkBackend, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // =========================
  // MONITORED REAL-DATA FLEET FETCH & PERIODIC RESYNC
  // =========================

  useEffect(() => {
    let isMounted = true;
    const fetchFleet = async (isInitial = false) => {
      if (isInitial) setFleetLoading(true);
      try {
        const rawList = await getAllLiveTrains();
        if (!isMounted) return;

        if (Array.isArray(rawList) && rawList.length > 0) {
          const mappedList = rawList.map(mapBackendTrainToUI).filter(Boolean);
          console.log("[Fleet] Loaded authoritative real trains from backend:", mappedList);
          // Directly set authoritative fleet - prunes any non-monitored trains
          setTrains(mappedList);

          const currentSelectedNum = selectedTrainNumberRef.current;
          const matchingTrain = currentSelectedNum
            ? mappedList.find((t) => String(t.number || t.trainNumber) === String(currentSelectedNum))
            : null;

          if (matchingTrain) {
            // Keep current selection up-to-date with backend fleet
            setSelectedTrain((prev) => ({ ...(prev || {}), ...matchingTrain }));
            setLiveTrainData((prev) => ({ ...(prev || {}), ...matchingTrain }));
          } else {
            // Default to first train in authoritative fleet
            const firstTrain = mappedList[0];
            const trainNum = String(firstTrain.number || firstTrain.trainNumber);
            selectedTrainNumberRef.current = trainNum;
            setSelectedTrain(firstTrain);
            setLiveTrainData(firstTrain);

            setFutureDelayData({
              predictedFutureDelay: firstTrain.futureDelay ?? 0,
              confidenceScore: firstTrain.confidenceScore ?? 0,
            });

            const initialCombinedDelay = Number(
              firstTrain.totalDelay ??
              firstTrain.expectedDelay ??
              (Number(firstTrain.currentDelay ?? 0) + Number(firstTrain.futureDelay ?? 0))
            );

            setEtaData({
              scheduledArrival: firstTrain.scheduledDeparture || null,
              currentDelay: firstTrain.currentDelay ?? 0,
              futureDelay: firstTrain.futureDelay ?? 0,
              expectedDelay: initialCombinedDelay,
              totalDelay: initialCombinedDelay,
              predictedETA: firstTrain.predictedETA || null,
              confidenceScore: firstTrain.confidenceScore ?? 0,
              delayAlert: firstTrain.delayAlert,
              etaMinutes: firstTrain.etaMinutes ?? 0,
            });

            predictETA(trainNum, firstTrain);
            predictFutureDelay(firstTrain);
            predictStationWiseETA(trainNum, firstTrain);
          }
        } else {
          console.log("[Fleet] Backend returned empty live train list. Awaiting WebSocket / telemetry updates.");
          setTrains([]);
        }
      } catch (err) {
        console.warn("[Fleet] Error fetching live train fleet:", err);
      } finally {
        if (isMounted && isInitial) setFleetLoading(false);
      }
    };

    fetchFleet(true);
    const fleetInterval = setInterval(() => fetchFleet(false), 30000);
    return () => {
      isMounted = false;
      clearInterval(fleetInterval);
    };
  }, []);

  // =========================
  // LIVE WEBSOCKET UPDATES (REAL DATA ONLY)
  // =========================

  useEffect(() => {
    console.log("Connecting to train WebSocket topic /topic/train-status...");

    connectTrainWebSocket(
      (data) => {
        console.log("WebSocket live train update received:", data);
        const mapped = mapBackendTrainToUI(data);
        if (!mapped || !mapped.number) return;

        const incomingNum = String(mapped.number);

        // Update ONLY if already present in trains collection! Do NOT append unmonitored trains!
        setTrains((prevFleet) => {
          const idx = prevFleet.findIndex((t) => String(t.number || t.trainNumber) === incomingNum);
          if (idx >= 0) {
            const next = [...prevFleet];
            next[idx] = { ...next[idx], ...mapped };
            return next;
          }
          // Do NOT append unknown trains to the fleet!
          return prevFleet;
        });

        // Update selected train and live train data ONLY if matching currently selected train
        if (selectedTrainNumberRef.current === incomingNum) {
          setFutureDelayData({
            predictedFutureDelay: mapped.futureDelay ?? 0,
            confidenceScore: mapped.confidenceScore ?? 0,
          });

          setEtaData((prev) => {
            const wsCurrentDelay = Number(mapped.currentDelay ?? prev?.currentDelay ?? 0);
            const wsFutureDelay = Number(mapped.futureDelay ?? prev?.futureDelay ?? 0);
            const wsTotalDelay = Number(
              mapped.totalDelay ??
              mapped.expectedDelay ??
              prev?.totalDelay ??
              prev?.expectedDelay ??
              (wsCurrentDelay + wsFutureDelay)
            );

            return {
              ...prev,
              scheduledArrival: (mapped.scheduledDeparture && mapped.scheduledDeparture !== "--")
                ? mapped.scheduledDeparture
                : (prev?.scheduledArrival || null),
              currentDelay: wsCurrentDelay,
              futureDelay: wsFutureDelay,
              expectedDelay: wsTotalDelay,
              totalDelay: wsTotalDelay,
              predictedETA: mapped.predictedETA || prev?.predictedETA || null,
              confidenceScore: Number(mapped.confidenceScore ?? prev?.confidenceScore ?? 0),
              delayAlert: mapped.delayAlert || prev?.delayAlert,
              etaMinutes: Number(mapped.etaMinutes ?? prev?.etaMinutes ?? 0),
            };
          });

          setSelectedTrain((curr) => {
            if (curr && String(curr.number || curr.trainNumber) === incomingNum) {
              return { ...curr, ...mapped };
            }
            return curr;
          });

          setLiveTrainData((curr) => {
            if (curr && String(curr.number || curr.trainNumber) === incomingNum) {
              return { ...curr, ...mapped };
            }
            return curr;
          });
        }
      },
      (status) => {
        if (status === "connected") {
          setBackendStatus("online");
        } else if (status === "disconnected") {
          console.warn("[WebSocket] Disconnected from server");
        }
      }
    );

    return () => {
      console.log("Disconnecting train WebSocket...");
      disconnectTrainWebSocket();
    };
  }, []);

  // =========================
  // EASY ACCESS VARIABLES
  // =========================

  const currentSpeed = liveTrainData?.currentSpeed ?? 0;
  const currentDelay = liveTrainData?.currentDelay ?? 0;
  const previousDelay = liveTrainData?.previousDelay ?? 0;
  const weatherFactor = liveTrainData?.weatherFactor ?? 0;
  const trafficFactor = liveTrainData?.trafficFactor ?? 0;

  // =========================
  // PREDICTED DELAY
  // =========================

  const predictedDelay =
    futureDelayData?.predictedFutureDelay ??
    etaData?.futureDelay ??
    liveTrainData?.futureDelay ??
    null;

  // =========================
  // FETCH LIVE TRAIN DATA (REAL API)
  // =========================

  const fetchLiveTrainData = async (trainNumber) => {
    if (!trainNumber) return null;
    const trainNumStr = String(trainNumber);
    try {
      const data = await getLiveTrainData(trainNumStr);
      if (data) {
        const mapped = mapBackendTrainToUI(data);
        if (mapped) {
          if (selectedTrainNumberRef.current === trainNumStr) {
            setLiveTrainData(mapped);
          }
          return mapped;
        }
      }
      return null;
    } catch (error) {
      console.warn("Failed to fetch live train data for " + trainNumber, error);
      return null;
    }
  };

  // =========================
  // CALCULATE PREDICTED TIME
  // =========================

  const calculatePredictedTime = (
    scheduledArrival,
    totalDelay
  ) => {
    return calculatePredictedETA(scheduledArrival, totalDelay);
  };

  // =========================
  // ETA PREDICTION
  // =========================

  const predictETA = async (
    trainNumber = selectedTrain?.number || liveTrainData?.number,
    trainData = liveTrainData
  ) => {
    if (!trainNumber || !trainData) return;
    const trainNumStr = String(trainNumber);
    setLoading(true);
    setError("");

    const destStation = Array.isArray(trainData.stations) && trainData.stations.length > 0
      ? trainData.stations[trainData.stations.length - 1]
      : null;
    const destSchedArrival =
      (destStation && (destStation.scheduledArrival || destStation.arrivalTime || destStation.time) && destStation.scheduledArrival !== "--")
        ? (destStation.scheduledArrival || destStation.arrivalTime || destStation.time)
        : (trainData.scheduledArrival && trainData.scheduledArrival !== "--"
          ? trainData.scheduledArrival
          : null);

    const journeyStatusObj = resolveTrainJourneyStatus(trainData, {
      currentStation: trainData.currentStation,
      nextStation: trainData.nextStation,
      currentStationIndex: Array.isArray(trainData.stations)
        ? trainData.stations.findIndex((s) => (s.name || s) === (trainData.currentStation || trainData.currentLocation))
        : -1,
      totalStations: Array.isArray(trainData.stations) ? trainData.stations.length : 0,
    });
    const isCompleted = journeyStatusObj?.isCompleted === true;

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/predict/eta`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            trainNumber: trainNumStr,
            currentLocation: trainData.currentStation || trainData.currentLocation,
            routeDistance: Number(trainData.routeDistance || 0),
            currentSpeed: Number(trainData.currentSpeed || 0),
            averageSpeed: trainData.averageSpeed != null && Number(trainData.averageSpeed) > 0 ? Number(trainData.averageSpeed) : undefined,
            currentDelay: Number(trainData.currentDelay || 0),
            previousDelay: Number(trainData.previousDelay || 0),
            weatherFactor: Number(trainData.weatherFactor || 0),
            trafficFactor: Number(trainData.trafficFactor || 0),
            nextStation: trainData.nextStation || "",
            route: trainData.routeStations || (Array.isArray(trainData.stations) ? trainData.stations.map((s) => typeof s === "object" && s !== null ? s.name : s) : undefined),
            journeyStatus: journeyStatusObj?.badge || (isCompleted ? "COMPLETED" : undefined),
            trainStatus: trainData.trainStatus || trainData.status,
            actualArrival: trainData.actualArrival || (Array.isArray(trainData.stations) && trainData.stations.length > 0 ? trainData.stations[trainData.stations.length - 1]?.actualArrival : undefined),
            scheduledArrival: destSchedArrival || undefined,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (selectedTrainNumberRef.current !== trainNumStr) return;

      const rawCurrentDelay = data.currentDelay ?? trainData.currentDelay;
      const rawFutureDelay = data.futureDelay ?? trainData.futureDelay;

      let finalArrivalDelay = data.finalArrivalDelay != null ? Number(data.finalArrivalDelay) : null;
      if (finalArrivalDelay == null && isCompleted) {
        const destSched = destSchedArrival || data.scheduledArrival || trainData.scheduledArrival;
        const destAct = trainData.actualArrival || (data.predictedETA && data.predictedETA !== "Arrived" && data.predictedETA !== "N/A" ? data.predictedETA : null);
        if (destSched && destAct) {
          finalArrivalDelay = calculateFinalArrivalDelay(destSched, destAct);
        }
      }

      // For COMPLETED journeys:
      // - currentDelay remains telemetry-specific (latest reported physical checkpoint delay).
      // - expectedDelay and totalDelay become destination-result-specific (reflecting finalArrivalDelay).
      const consistentTotalDelay = Number(
        (isCompleted && finalArrivalDelay != null)
          ? finalArrivalDelay
          : (data.totalDelay ??
             data.expectedDelay ??
             (rawFutureDelay != null
               ? (Number(rawCurrentDelay ?? 0) + Number(rawFutureDelay ?? 0))
               : (rawCurrentDelay ?? 0)))
      );

      const isUnavailableEta = (val) => !val || val === "N/A" || val === "--" || (typeof val === "string" && val.trim() === "");

      let consistentPredictedETA = null;
      if (isCompleted) {
        // Train has completed journey: do NOT calculate future travel time from current time
        consistentPredictedETA = (!isUnavailableEta(data.predictedETA) && data.predictedETA !== "N/A")
          ? formatTimeDisplay(data.predictedETA)
          : (trainData.actualArrival ? formatTimeDisplay(trainData.actualArrival) : "Arrived");
      } else if (destSchedArrival) {
        // Authoritative Mathematical Invariant:
        // Predicted Arrival = Scheduled Destination Arrival + Total Delay
        consistentPredictedETA = calculatePredictedETA(destSchedArrival, consistentTotalDelay);
      } else if (!isUnavailableEta(data.predictedETA)) {
        consistentPredictedETA = formatTimeDisplay(data.predictedETA);
      } else if (!isUnavailableEta(trainData.predictedETA)) {
        consistentPredictedETA = formatTimeDisplay(trainData.predictedETA);
      }

      setEtaData({
        ...data,
        finalArrivalDelay,
        scheduledArrival: destSchedArrival
          ? formatTimeDisplay(destSchedArrival)
          : ((data.scheduledArrival && data.scheduledArrival !== "--") ? formatTimeDisplay(data.scheduledArrival) : null),
        currentDelay: data.currentDelay ?? trainData.currentDelay,
        futureDelay: data.futureDelay ?? trainData.futureDelay,
        expectedDelay: consistentTotalDelay,
        totalDelay: consistentTotalDelay,
        predictedETA: consistentPredictedETA,
        nextStation: data.nextStation || trainData.nextStation,
        confidenceScore: data.confidenceScore ?? trainData.confidenceScore ?? 0,
      });
    } catch (err) {
      console.warn("ETA prediction service skipped/failed:", err);
      if (selectedTrainNumberRef.current !== trainNumStr) return;
      if (trainData) {
        let fallbackFinalArrivalDelay = trainData.finalArrivalDelay != null ? Number(trainData.finalArrivalDelay) : null;
        if (fallbackFinalArrivalDelay == null && isCompleted) {
          const destSched = destSchedArrival || trainData.scheduledArrival;
          const destAct = trainData.actualArrival;
          if (destSched && destAct) {
            fallbackFinalArrivalDelay = calculateFinalArrivalDelay(destSched, destAct);
          }
        }

        const fallbackTotalDelay = Number(
          (isCompleted && fallbackFinalArrivalDelay != null)
            ? fallbackFinalArrivalDelay
            : (trainData.totalDelay ??
               trainData.expectedDelay ??
               (Number(trainData.currentDelay ?? 0) + Number(trainData.futureDelay ?? 0)))
        );
        const isUnavailableEta = (val) => !val || val === "N/A" || val === "--" || (typeof val === "string" && val.trim() === "");
        let fallbackPredictedETA = null;
        if (isCompleted) {
          fallbackPredictedETA = trainData.actualArrival ? formatTimeDisplay(trainData.actualArrival) : "Arrived";
        } else if (destSchedArrival) {
          fallbackPredictedETA = calculatePredictedETA(destSchedArrival, fallbackTotalDelay);
        } else if (!isUnavailableEta(trainData.predictedETA)) {
          fallbackPredictedETA = formatTimeDisplay(trainData.predictedETA);
        }

        setEtaData((prev) => ({
          ...prev,
          finalArrivalDelay: fallbackFinalArrivalDelay,
          scheduledArrival: destSchedArrival
            ? formatTimeDisplay(destSchedArrival)
            : (prev?.scheduledArrival || null),
          currentDelay: Number(trainData.currentDelay ?? 0),
          futureDelay: Number(trainData.futureDelay ?? 0),
          expectedDelay: fallbackTotalDelay,
          totalDelay: fallbackTotalDelay,
          predictedETA: fallbackPredictedETA || prev?.predictedETA || null,
          nextStation: trainData.nextStation || "--",
          confidenceScore: Number(trainData.confidenceScore ?? 0),
        }));
      }
    } finally {
      if (selectedTrainNumberRef.current === trainNumStr) {
        setLoading(false);
      }
    }
  };

  // =========================
  // FUTURE DELAY PREDICTION
  // =========================

  const predictFutureDelay = async (trainData = liveTrainData) => {
    if (!trainData) return;
    const trainNumStr = String(trainData.number || trainData.trainNumber);
    setFutureDelayLoading(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/predict/future-delay`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            currentSpeed: Number(trainData.currentSpeed || 0),
            currentDelay: Number(trainData.currentDelay || 0),
            previousDelay: Number(trainData.previousDelay || 0),
            weatherFactor: Number(trainData.weatherFactor || 0),
            trafficFactor: Number(trainData.trafficFactor || 0),
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (selectedTrainNumberRef.current !== trainNumStr) return;
      setFutureDelayData(data);
    } catch (err) {
      console.warn("Future delay prediction skipped/failed:", err);
      if (selectedTrainNumberRef.current !== trainNumStr) return;
      if (trainData) {
        setFutureDelayData({
          predictedFutureDelay: Number(trainData.futureDelay ?? 0),
          confidenceScore: Number(trainData.confidenceScore ?? 0),
        });
      }
    } finally {
      if (selectedTrainNumberRef.current === trainNumStr) {
        setFutureDelayLoading(false);
      }
    }
  };

  // =========================
  // STATION-WISE PREDICTION
  // =========================

  const predictStationWiseETA = async (
    trainNumber = selectedTrain?.number || liveTrainData?.number,
    trainData = liveTrainData
  ) => {
    if (!trainNumber || !trainData) return;
    const trainNumStr = String(trainNumber);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/predict/station-wise`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            trainNumber: trainNumStr,
            currentLocation: trainData.currentStation || trainData.currentLocation,
            routeDistance: Number(
              trainData.routeDistance ||
              trainData.remainingDistance ||
              0
            ),
            currentSpeed: Number(trainData.currentSpeed || 0),
            currentDelay: Number(trainData.currentDelay || 0),
            previousDelay: Number(trainData.previousDelay || 0),
            weatherFactor: Number(trainData.weatherFactor || 0),
            trafficFactor: Number(trainData.trafficFactor || 0),
            stations: trainData.routeStations || (Array.isArray(trainData.stations) ? trainData.stations.map((s) => typeof s === "object" && s !== null ? s.name : s) : undefined),
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (selectedTrainNumberRef.current !== trainNumStr) return;
      const predictions = data.stationPredictions;

      if (Array.isArray(predictions) && predictions.length > 0) {
        setStationPredictions(predictions);
      } else {
        setStationPredictions([]);
      }
    } catch (err) {
      console.warn("Station-wise predictions skipped/failed:", err);
      if (selectedTrainNumberRef.current !== trainNumStr) return;
      setStationPredictions([]);
    }
  };
  // =========================
  // LIVE STATION-WISE UPDATES
  // =========================

  useEffect(() => {
    const activeNum = liveTrainData?.number || liveTrainData?.trainNumber;
    if (!activeNum || selectedTrainNumberRef.current !== String(activeNum)) {
      return;
    }

    let isSubscribed = true;
    const updateStationPredictions = async () => {
      try {
        await predictStationWiseETA(
          activeNum,
          liveTrainData
        );
      } catch (error) {
        if (isSubscribed) {
          console.warn(
            "Unable to update station-wise predictions:",
            error
          );
        }
      }
    };

    updateStationPredictions();
    return () => {
      isSubscribed = false;
    };
  }, [
    liveTrainData?.number,
    liveTrainData?.trainNumber,
    liveTrainData?.currentStation,
    Math.round(liveTrainData?.currentDelay || 0),
  ]);

  // =========================
  // DYNAMIC STATION DATA
  // =========================

  const stations = useMemo(() => {
    const activeTrain = liveTrainData || selectedTrain;
    const curLoc = activeTrain?.currentStation || activeTrain?.currentLocation || "";
    const nextLoc = activeTrain?.nextStation || "";

    // 1. If rich station objects are present from real timetable, use them directly
    const richStns = (Array.isArray(activeTrain?.stationDetails) && activeTrain.stationDetails.length > 0)
      ? activeTrain.stationDetails
      : (Array.isArray(activeTrain?.stations) && activeTrain.stations.length > 0 && typeof activeTrain.stations[0] === "object")
      ? activeTrain.stations
      : null;

    if (richStns && richStns.length > 0) {
      const curIdx = curLoc
        ? richStns.findIndex(
            (s) =>
              (s.name && s.name.toLowerCase() === curLoc.toLowerCase()) ||
              (s.code && s.code.toLowerCase() === curLoc.toLowerCase())
          )
        : -1;

      return richStns.map((stn, idx) => {
        let status = "upcoming";
        if (curIdx >= 0) {
          if (idx < curIdx) status = "completed";
          else if (idx === curIdx) status = "current";
        } else if (idx === 0) {
          status = "completed";
        }

        const predObj = stationPredictions.find(
          (p) => p?.station?.toLowerCase() === stn.name?.toLowerCase()
        );

        let arrivalTime = stn.arrivalTime || stn.scheduledArrival || stn.time || null;
        let departureTime = stn.departureTime || stn.scheduledDeparture || null;
        let predictedArrivalTime = predObj?.predictedETA || null;

        if (predObj?.scheduledTime && predObj.scheduledTime !== "Not available") {
          arrivalTime = predObj.scheduledTime;
        }

        if (idx === 0 && activeTrain?.scheduledDeparture) {
          departureTime = activeTrain.scheduledDeparture;
        }

        const isDestination = idx === richStns.length - 1;
        if (isDestination && !predictedArrivalTime && etaData?.predictedETA) {
          predictedArrivalTime = etaData.predictedETA;
        }
        if (isDestination && !arrivalTime && etaData?.scheduledArrival && etaData.scheduledArrival !== "--") {
          arrivalTime = etaData.scheduledArrival;
        }

        let delayText = "Not available";
        if (status === "current") {
          delayText = formatDelayText(currentDelay);
        } else if (status === "completed") {
          delayText = "Departed";
        } else if (predObj?.predictedDelay !== undefined) {
          delayText = formatDelayText(predObj.predictedDelay);
        } else if (predictedDelay !== null && predictedDelay !== undefined) {
          delayText = formatDelayText(predictedDelay);
        }

        return {
          ...stn,
          isHalt: stn.isHalt !== undefined ? stn.isHalt : true,
          name: stn.name,
          code: stn.code,
          time: arrivalTime || departureTime,
          arrivalTime,
          departureTime,
          predictedArrivalTime,
          predictedDelay: predObj?.predictedDelay !== undefined ? predObj.predictedDelay : null,
          delay: delayText,
          status,
          distanceKm: stn.distanceKm,
          distanceFromOrigin: stn.distanceFromOrigin != null ? Number(stn.distanceFromOrigin) : (stn.distanceKm != null ? Number(stn.distanceKm) : null),
        };
      });
    }

    // Fallback when string names are present from real route
    let stnNames = [];
    if (Array.isArray(activeTrain?.routeStations) && activeTrain.routeStations.length > 0) {
      stnNames = activeTrain.routeStations;
    } else if (
      Array.isArray(activeTrain?.stations) &&
      activeTrain.stations.length > 0 &&
      typeof activeTrain.stations[0] === "string"
    ) {
      stnNames = activeTrain.stations;
    } else if (Array.isArray(etaData?.route) && etaData.route.length > 0) {
      stnNames = etaData.route;
    }

    if (stnNames.length === 0) return [];

    const curIdx = curLoc
      ? stnNames.findIndex((s) => s.toLowerCase() === curLoc.toLowerCase())
      : -1;

    return stnNames.map((name, idx) => {
      let status = "upcoming";
      if (curIdx >= 0) {
        if (idx < curIdx) status = "completed";
        else if (idx === curIdx) status = "current";
      } else if (idx === 0) {
        status = "completed";
      }

      // Check real station predictions from backend
      const predObj = stationPredictions.find(
        (p) => p?.station?.toLowerCase() === name.toLowerCase()
      );

      let arrivalTime = null;
      let departureTime = null;
      let predictedArrivalTime = null;

      if (predObj?.scheduledTime) {
        arrivalTime = predObj.scheduledTime;
      }
      if (predObj?.predictedETA) {
        predictedArrivalTime = predObj.predictedETA;
      }

      // For origin station, scheduled departure may come from train data
      if (idx === 0 && activeTrain?.scheduledDeparture) {
        departureTime = activeTrain.scheduledDeparture;
      }

      // For destination station, authoritative predicted ETA is always etaData.predictedETA
      const isDestination = idx === stnNames.length - 1;
      if (isDestination && !predictedArrivalTime && etaData?.predictedETA) {
        predictedArrivalTime = etaData.predictedETA;
      }
      if (isDestination && !arrivalTime && etaData?.scheduledArrival && etaData.scheduledArrival !== "--") {
        arrivalTime = etaData.scheduledArrival;
      }

      let delayText = "Not available";
      if (status === "current") {
        delayText = formatDelayText(currentDelay);
      } else if (status === "completed") {
        delayText = "Departed";
      } else if (predObj?.predictedDelay !== undefined) {
        delayText = formatDelayText(predObj.predictedDelay);
      } else if (predictedDelay !== null && predictedDelay !== undefined) {
        delayText = formatDelayText(predictedDelay);
      }

      return {
        name,
        time: arrivalTime,
        arrivalTime,
        departureTime,
        predictedArrivalTime,
        predictedDelay: predObj?.predictedDelay !== undefined ? predObj.predictedDelay : null,
        delay: delayText,
        status,
      };
    });
  }, [selectedTrain, liveTrainData, currentDelay, predictedDelay, stationPredictions, etaData]);

  // =========================
  // SELECT TRAIN
  // =========================

  const selectTrain = async (train) => {
    if (!train) return;
    const trainNum = String(train.number || train.trainNumber);
    selectedTrainNumberRef.current = trainNum;
    setSelectedTrain(train);
    setLiveTrainData(train);
    setSearchQuery(trainNum || "");
    setEtaData(null);
    setFutureDelayData(null);
    setStationPredictions([]);
    setActivePage("dashboard");

    const freshTrainData = await fetchLiveTrainData(trainNum);
    if (selectedTrainNumberRef.current !== trainNum) return;

    const targetData = freshTrainData || train;
    if (freshTrainData) {
      setSelectedTrain((prev) => (prev && String(prev.number || prev.trainNumber) === trainNum ? freshTrainData : prev));
      setLiveTrainData(freshTrainData);
    }

    await Promise.all([
      predictETA(trainNum, targetData),
      predictFutureDelay(targetData),
      predictStationWiseETA(trainNum, targetData),
    ]);
  };

  // =========================
  // PAGE RENDERER
  // =========================

  const renderPage = () => {
    switch (activePage) {
      case "home":
        return (
          <Home
            trains={trains}
            etaData={etaData}
            selectTrain={selectTrain}
            setActivePage={setActivePage}
            liveTrainData={liveTrainData}
            loading={fleetLoading}
          />
        );

      case "search":
        return (
          <SearchTrain
            trains={trains}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            selectTrain={selectTrain}
            loading={fleetLoading}
          />
        );

      case "dashboard":
        return (
          <Dashboard
            trains={trains}
            selectTrain={selectTrain}
            etaData={etaData}
            predictedDelay={predictedDelay}
            stations={stations}
            stationPredictions={stationPredictions}
            setActivePage={setActivePage}
            selectedTrain={selectedTrain}
            loading={loading || futureDelayLoading || fleetLoading}
            backendStatus={backendStatus}
            liveTrainData={liveTrainData}
          />
        );

      case "map":
        return (
          <LiveTrainMap
            trains={trains}
            selectTrain={selectTrain}
            stations={stations}
            currentSpeed={currentSpeed}
            currentDelay={Number(currentDelay).toFixed(1)}
            selectedTrain={selectedTrain}
            liveTrainData={liveTrainData}
          />
        );

      case "alerts":
        return (
          <Alerts
            trains={trains}
            selectTrain={selectTrain}
            predictedDelay={predictedDelay}
            etaData={etaData}
            currentDelay={Number(currentDelay).toFixed(1)}
            setActivePage={setActivePage}
            selectedTrain={selectedTrain}
            liveTrainData={liveTrainData}
            stations={stations}
            stationPredictions={stationPredictions}
          />
        );

      default:
        return (
          <Home
            trains={trains}
            etaData={etaData}
            selectTrain={selectTrain}
            setActivePage={setActivePage}
            liveTrainData={liveTrainData}
            loading={fleetLoading}
          />
        );
    }
  };

  // =========================
  // PAGE TITLES
  // =========================

  const pageTitles = {
    home: "Home",
    search: "Search Train",
    dashboard: "Dashboard",
    map: "Live Train Map",
    alerts: "Alerts",
  };

  const currentPageTitle =
    pageTitles[activePage] ||
    "Home";

  // =========================
  // APP UI
  // =========================

  return (
    <div className="app">
      {sidebarOpen && (
        <div
          className="sidebar-mobile-backdrop"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <Sidebar
        activePage={activePage}
        setActivePage={handlePageChange}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />

      <main className="main-content">

        <Topbar
          currentPageTitle={
            currentPageTitle
          }
          setSidebarOpen={
            setSidebarOpen
          }
          sidebarOpen={
            sidebarOpen
          }
          setActivePage={
            setActivePage
          }
        />

        <div className="content-wrapper">
          {renderPage()}
        </div>

      </main>

    </div>
  );
}

export default App;

