import { useEffect, useMemo, useState, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  CircleMarker,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import {
  Train,
  MapPin,
  Gauge,
  Clock3,
  Navigation,
  Check,
  Route,
  Activity,
  Radio,
  Search,
  Maximize2,
  Minimize2,
  Compass,
  LocateFixed,
  Crosshair,
  ZoomIn,
  ZoomOut,
  X,
} from "lucide-react";
import "leaflet/dist/leaflet.css";
import "./LiveTrainMap.css";
import { resolveTrainJourneyStatus, isHaltStation, formatTimeDisplay } from "../services/trainMapper";

/* =========================================
   CUSTOM PROMINENT TRAIN ICON
========================================= */
const customTrainIcon = L.divIcon({
  className: "live-train-marker-wrapper",
  html: `
    <div class="live-train-marker-pin">
      <div class="train-marker-pulse-ring"></div>
      <div class="train-marker-core">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
          <rect width="16" height="16" x="4" y="3" rx="2"/>
          <path d="M4 11h16"/>
          <path d="M12 3v8"/>
          <path d="m8 19-2 3"/>
          <path d="m18 22-2-3"/>
          <circle cx="8" cy="15" r="1"/>
          <circle cx="16" cy="15" r="1"/>
        </svg>
      </div>
    </div>
  `,
  iconSize: [44, 44],
  iconAnchor: [22, 22],
  popupAnchor: [0, -22],
});



/* =========================================
   MAP HELPER: FOLLOW & CONTROLLER
========================================= */
function MapInteractiveHelper({ position, autoFollow, flyTarget, setFlyTarget }) {
  const map = useMap();

  // Auto follow train when position updates
  useEffect(() => {
    if (!position || !autoFollow) return;
    map.flyTo(position, map.getZoom(), {
      animate: true,
      duration: 1.2,
    });
  }, [position?.[0], position?.[1], autoFollow, map]);

  // Handle station flyTo from search
  useEffect(() => {
    if (flyTarget) {
      map.flyTo(flyTarget, 11, {
        animate: true,
        duration: 1.5,
      });
      setFlyTarget(null);
    }
  }, [flyTarget, map, setFlyTarget]);

  return null;
}

function MapExternalControls({ mapRef, onRecenter, autoFollow, setAutoFollow }) {
  const handleZoomIn = () => {
    if (mapRef.current) mapRef.current.zoomIn();
  };

  const handleZoomOut = () => {
    if (mapRef.current) mapRef.current.zoomOut();
  };

  return (
    <div className="map-bottom-right-controls">
      <button
        className="map-control-btn"
        onClick={handleZoomIn}
        title="Zoom In"
        aria-label="Zoom In"
      >
        <ZoomIn size={18} />
      </button>
      <button
        className="map-control-btn"
        onClick={handleZoomOut}
        title="Zoom Out"
        aria-label="Zoom Out"
      >
        <ZoomOut size={18} />
      </button>
      <button
        className="map-control-btn"
        onClick={onRecenter}
        title="Recenter on Train"
        aria-label="Recenter on Train"
      >
        <LocateFixed size={18} />
      </button>
      <button
        className={`map-control-btn ${autoFollow ? "active" : ""}`}
        onClick={() => setAutoFollow(!autoFollow)}
        title={autoFollow ? "Live Tracking Auto-Follow: ON" : "Live Tracking Auto-Follow: OFF"}
        aria-label="Toggle Live Auto Follow"
      >
        <Crosshair size={18} />
      </button>
    </div>
  );
}

/* =========================================
   DISTANCE CALCULATION
========================================= */
const calculateDistance = (point1, point2) => {
  if (!point1 || !point2) return 0;
  const lat1 = point1[0];
  const lon1 = point1[1];
  const lat2 = point2[0];
  const lon2 = point2[1];
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/* =========================================
   FIND CLOSEST POINT ON RAILWAY ROUTE
========================================= */
const getNearestRoutePoint = (position, route = []) => {
  if (!position) {
    return { point: [20.5937, 78.9629], segmentIndex: 0 };
  }
  if (!route || route.length < 2) {
    return { point: position, segmentIndex: 0 };
  }

  let nearestPoint = route[0];
  let nearestDistance = Infinity;
  let nearestSegmentIndex = 0;

  for (let i = 0; i < route.length - 1; i++) {
    const start = route[i];
    const end = route[i + 1];
    const latitudeScale = 111.32;
    const longitudeScale = 111.32 * Math.cos((position[0] * Math.PI) / 180);

    const x = (position[1] - start[1]) * longitudeScale;
    const y = (position[0] - start[0]) * latitudeScale;
    const segmentX = (end[1] - start[1]) * longitudeScale;
    const segmentY = (end[0] - start[0]) * latitudeScale;
    const segmentLengthSquared = segmentX * segmentX + segmentY * segmentY;

    let t = 0;
    if (segmentLengthSquared > 0) {
      t = (x * segmentX + y * segmentY) / segmentLengthSquared;
    }
    t = Math.max(0, Math.min(1, t));

    const projectedPoint = [
      start[0] + (end[0] - start[0]) * t,
      start[1] + (end[1] - start[1]) * t,
    ];

    const distance = calculateDistance(position, projectedPoint);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestPoint = projectedPoint;
      nearestSegmentIndex = i;
    }
  }

  return { point: nearestPoint, segmentIndex: nearestSegmentIndex };
};

/* =========================================
   MAIN COMPONENT
========================================= */
function LiveTrainMap({
  currentSpeed,
  currentDelay,
  stations = [],
  selectedTrain,
  liveTrainData: propLiveTrainData,
  trains = [],
  selectTrain,
}) {
  const mapCardRef = useRef(null);
  const mapInstanceRef = useRef(null);

  const activeTrain = propLiveTrainData || selectedTrain || null;
  const liveTrainData = activeTrain;

  // Train metadata
  const trainNumber =
    activeTrain?.number || activeTrain?.trainNumber || "";
  const trainName =
    activeTrain?.name ||
    activeTrain?.trainName ||
    (trainNumber ? `Train ${trainNumber}` : "");
  // Dynamic Origin and Destination for compact summary (Origin → Destination)
  const origin =
    activeTrain?.source ||
    activeTrain?.origin ||
    activeTrain?.from ||
    (Array.isArray(activeTrain?.routeStations) && activeTrain.routeStations.length > 0
      ? activeTrain.routeStations[0]
      : null) ||
    (stations.length > 0
      ? (typeof stations[0] === "string" ? stations[0] : stations[0]?.name)
      : null) ||
    (typeof activeTrain?.route === "string" && activeTrain.route.includes("→")
      ? activeTrain.route.split("→")[0].trim()
      : "") ||
    "";

  const destination =
    activeTrain?.destination ||
    activeTrain?.dest ||
    activeTrain?.to ||
    (Array.isArray(activeTrain?.routeStations) && activeTrain.routeStations.length > 0
      ? activeTrain.routeStations[activeTrain.routeStations.length - 1]
      : null) ||
    (stations.length > 0
      ? (typeof stations[stations.length - 1] === "string"
          ? stations[stations.length - 1]
          : stations[stations.length - 1]?.name)
      : null) ||
    (typeof activeTrain?.route === "string" && activeTrain.route.includes("→")
      ? activeTrain.route.split("→").slice(-1)[0].trim()
      : "") ||
    "";

  const trainRoute = origin && destination
    ? `${origin} → ${destination}`
    : (origin || destination || activeTrain?.route || "");

  // Real GPS availability check
  const hasValidGps = (activeTrain?.latitude != null && activeTrain?.longitude != null) ||
                      (activeTrain?.currentLatitude != null && activeTrain?.currentLongitude != null);

  const initialPosition = hasValidGps
    ? [
        Number(activeTrain?.latitude ?? activeTrain?.currentLatitude),
        Number(activeTrain?.longitude ?? activeTrain?.currentLongitude),
      ]
    : null;

  const [livePosition, setLivePosition] = useState(initialPosition);
  const [backendPosition, setBackendPosition] = useState(initialPosition);
  const [lastUpdated, setLastUpdated] = useState(
    activeTrain?.lastUpdated || new Date().toISOString()
  );

  // Map interactive state
  const [mapLayer, setMapLayer] = useState("map"); // "map" or "satellite"
  const [autoFollow, setAutoFollow] = useState(true);
  const [flyTarget, setFlyTarget] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Re-snap immediately when trainNumber changes
  useEffect(() => {
    if (hasValidGps) {
      const pos = [
        Number(activeTrain?.latitude ?? activeTrain?.currentLatitude),
        Number(activeTrain?.longitude ?? activeTrain?.currentLongitude),
      ];
      setBackendPosition(pos);
      setLivePosition(pos);
      setLastUpdated(activeTrain?.lastUpdated || new Date().toISOString());
    } else {
      setBackendPosition(null);
      setLivePosition(null);
    }
  }, [trainNumber]);

  // Backend updates
  useEffect(() => {
    if (
      (activeTrain?.latitude != null && activeTrain?.longitude != null) ||
      (activeTrain?.currentLatitude != null && activeTrain?.currentLongitude != null)
    ) {
      const lat = Number(activeTrain.latitude ?? activeTrain.currentLatitude);
      const lng = Number(activeTrain.longitude ?? activeTrain.currentLongitude);
      setBackendPosition([lat, lng]);
      setLastUpdated(activeTrain.lastUpdated || new Date().toISOString());
    }
  }, [activeTrain?.latitude, activeTrain?.longitude, activeTrain?.currentLatitude, activeTrain?.currentLongitude, activeTrain?.lastUpdated]);

  // Smooth train interpolation
  useEffect(() => {
    if (!backendPosition) return;
    const startPosition = livePosition ? [...livePosition] : [...backendPosition];
    const endPosition = [...backendPosition];
    const duration = 4000;
    const startTime = performance.now();
    let animationFrame;

    const animateTrain = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress =
        progress < 0.5
          ? 2 * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 2) / 2;

      const latitude =
        startPosition[0] + (endPosition[0] - startPosition[0]) * easedProgress;
      const longitude =
        startPosition[1] + (endPosition[1] - startPosition[1]) * easedProgress;

      setLivePosition([latitude, longitude]);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animateTrain);
      }
    };

    animationFrame = requestAnimationFrame(animateTrain);
    return () => cancelAnimationFrame(animationFrame);
  }, [backendPosition]);

  // Stations: strictly dynamic from backend route data
  const baseStations = useMemo(() => {
    if (stations && stations.length > 0) {
      return stations
        .map((station) => {
          let pos = null;
          if (station.latitude != null && station.longitude != null) {
            pos = [Number(station.latitude), Number(station.longitude)];
          } else if (Array.isArray(station.position) && station.position.length === 2) {
            pos = station.position;
          }
          return {
            ...station,
            position: pos,
          };
        })
        .filter((s) => s.position !== null);
    }

    return [];
  }, [stations]);

  // Dynamic railway route polyline directly derived from real station coordinates
  const activeRailwayRoute = useMemo(() => {
    return baseStations
      .filter((s) => s.position && Array.isArray(s.position) && s.position.length === 2)
      .map((s) => s.position);
  }, [baseStations]);

  // Authoritative journey completed check for map passenger-facing view
  const isCompletedJourney = useMemo(() => {
    const rawStatus = (
      liveTrainData?.trainStatus ||
      liveTrainData?.status ||
      liveTrainData?.journeyStatus ||
      selectedTrain?.trainStatus ||
      selectedTrain?.status ||
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
    const destName = (liveTrainData?.destination || selectedTrain?.destination || "").trim().toLowerCase();
    const currLoc = (liveTrainData?.currentLocation || liveTrainData?.currentStation || selectedTrain?.currentLocation || "").trim().toLowerCase();
    if (destName && currLoc && destName === currLoc) {
      return true;
    }
    return false;
  }, [liveTrainData, selectedTrain]);

  // Current Station Index from ordered dynamic route matching currentLocation
  const currentStationIndex = useMemo(() => {
    if (!baseStations || baseStations.length === 0) return 0;
    // For COMPLETED trains, passenger-facing current station resolves to destination
    if (isCompletedJourney) {
      return baseStations.length - 1;
    }
    const rawLoc = liveTrainData?.currentStation || liveTrainData?.currentLocation;
    if (!rawLoc || typeof rawLoc !== "string") return 0;
    const cleaned = rawLoc.trim().toLowerCase();
    const idx = baseStations.findIndex((s) => {
      if (!s?.name) return false;
      const sName = s.name.trim().toLowerCase();
      return (
        sName === cleaned ||
        sName.includes(cleaned) ||
        cleaned.includes(sName)
      );
    });
    return idx >= 0 ? idx : 0;
  }, [baseStations, liveTrainData?.currentStation, liveTrainData?.currentLocation, isCompletedJourney]);

  // Station status and halt classification
  const trainStations = useMemo(() => {
    return baseStations.map((station, index) => ({
      ...station,
      isHalt: isHaltStation(station, index, baseStations.length),
      status: isCompletedJourney
        ? "completed"
        : (index < currentStationIndex
            ? "completed"
            : index === currentStationIndex
            ? "current"
            : "upcoming"),
    }));
  }, [baseStations, currentStationIndex, isCompletedJourney]);

  const currentStation = trainStations[currentStationIndex] || trainStations[0] || null;

  // Next Halt Station (Step 6 & 8): Passenger-facing next stop strictly resolves to the next scheduled halt
  const nextHaltStation = useMemo(() => {
    if (isCompletedJourney) return null;
    if (!trainStations || trainStations.length === 0) return null;
    for (let i = currentStationIndex + 1; i < trainStations.length; i++) {
      if (trainStations[i].isHalt) {
        return trainStations[i];
      }
    }
    return null;
  }, [trainStations, currentStationIndex, isCompletedJourney]);

  // Passenger-facing Next Station prefers the next scheduled halt station
  const nextStation = isCompletedJourney ? null : (nextHaltStation || (currentStationIndex < trainStations.length - 1 ? trainStations[currentStationIndex + 1] : null));

  // Authoritative semantic journey status
  const journeyStatus = useMemo(() => {
    return resolveTrainJourneyStatus(liveTrainData || selectedTrain, {
      currentStation,
      nextStation,
      currentStationIndex,
      totalStations: baseStations.length,
    });
  }, [liveTrainData, selectedTrain, currentStation, nextStation, currentStationIndex, baseStations.length]);

  // Center on real train GPS if available, otherwise on current station or default center
  const defaultMapCenter = [20.5937, 78.9629];
  const currentStationPos = currentStation?.position || baseStations[0]?.position || defaultMapCenter;

  const liveRoutePosition = (hasValidGps && livePosition)
    ? (activeRailwayRoute.length >= 2
        ? getNearestRoutePoint(livePosition, activeRailwayRoute)
        : { point: livePosition, segmentIndex: currentStationIndex })
    : { point: currentStationPos, segmentIndex: currentStationIndex };

  const displayedTrainPosition = liveRoutePosition.point || currentStationPos || defaultMapCenter;

  // Routes
  const completedRoute = activeRailwayRoute.length >= 2
    ? [
        ...activeRailwayRoute.slice(0, liveRoutePosition.segmentIndex + 1),
        displayedTrainPosition,
      ].filter(Boolean)
    : [];
  const remainingRoute = activeRailwayRoute.length >= 2
    ? [
        displayedTrainPosition,
        ...activeRailwayRoute.slice(liveRoutePosition.segmentIndex + 1),
      ].filter(Boolean)
    : [];

  // Journey progress
  let journeyProgress = 0;
  if (activeRailwayRoute.length > 1) {
    journeyProgress = Math.round(
      (currentStationIndex / (activeRailwayRoute.length - 1)) * 100
    );
    journeyProgress = Math.max(0, Math.min(100, journeyProgress));
  }

  // Speed and delay
  const activeSpeed = Number(currentSpeed ?? liveTrainData?.currentSpeed ?? 0);
  const activeDelay = Number(currentDelay ?? liveTrainData?.currentDelay ?? 0);

  // Distance to next station (railway route distance using distanceFromOrigin)
  const distanceToNext = useMemo(() => {
    if (!nextStation || !currentStation) return null;
    const nextDist =
      nextStation.distanceFromOrigin != null
        ? Number(nextStation.distanceFromOrigin)
        : nextStation.distanceKm != null
        ? Number(nextStation.distanceKm)
        : null;
    const currDist =
      currentStation.distanceFromOrigin != null
        ? Number(currentStation.distanceFromOrigin)
        : currentStation.distanceKm != null
        ? Number(currentStation.distanceKm)
        : null;

    if (
      nextDist != null &&
      currDist != null &&
      Number.isFinite(nextDist) &&
      Number.isFinite(currDist)
    ) {
      const diff = nextDist - currDist;
      return Math.max(0, diff);
    }

    // Coordinate fallback: Calculate distance between live position and next station coordinates
    if (nextStation?.position && displayedTrainPosition) {
      const dist = calculateDistance(displayedTrainPosition, nextStation.position);
      if (Number.isFinite(dist)) return Math.max(0, dist);
    }

    return null;
  }, [nextStation, currentStation, displayedTrainPosition]);

  const minutesToNext =
    nextStation && activeSpeed > 0 && distanceToNext != null && distanceToNext > 0
      ? Math.max(1, Math.round((distanceToNext / activeSpeed) * 60))
      : null;

  const formattedLastUpdated = new Date(lastUpdated).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  // Station search results
  const filteredStations = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return trainStations.filter((s) =>
      s.name && s.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, trainStations]);

  // Fullscreen handler
  const toggleFullscreen = () => {
    if (!mapCardRef.current) return;
    if (!document.fullscreenElement) {
      mapCardRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(console.error);
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(console.error);
    }
  };

  const recenterTrain = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo(displayedTrainPosition, 10, {
        animate: true,
        duration: 1.2,
      });
      setAutoFollow(true);
    }
  };

  if (!trainNumber) {
    return (
      <div className="page-animation live-train-map-page">
        <div style={{ padding: "64px 24px", textAlign: "center", background: "#ffffff", borderRadius: "16px", border: "1px solid #e2e8f0", margin: "24px" }}>
          <Train size={48} style={{ color: "#94a3b8", marginBottom: "16px" }} />
          <h2 style={{ fontSize: "1.25rem", fontWeight: "600", color: "#1e293b", marginBottom: "8px" }}>No Train Selected for Live Tracking</h2>
          <p style={{ color: "#64748b", maxWidth: "480px", margin: "0 auto", fontSize: "0.95rem" }}>
            Select an active train from the fleet on the Home or Search pages to track its route in real time.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-animation live-train-map-page">
      {!hasValidGps && (
        <div style={{ background: "#fef3c7", border: "1px solid #fde68a", borderRadius: "10px", padding: "12px 16px", color: "#92400e", fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
          <Radio size={18} />
          <span>Live GPS telemetry is currently pending from the RailRadar API for Train {trainNumber}. Tracking by scheduled stations and latest reported status.</span>
        </div>
      )}

      {/* =========================================
          SECTION 2: TOP TRAIN INFORMATION ROW (4 CARDS)
      ========================================= */}
      <div className="live-train-top-row">

        {/* CARD 1 — SELECTED TRAIN */}
        <div className="train-stat-card">
          <div className="train-stat-left">
            <div className="train-stat-icon purple">
              <Train size={22} />
            </div>
            <div className="train-stat-info">
              <span className="train-stat-label">SELECTED TRAIN</span>
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
                      padding: "2px 6px",
                      fontSize: "0.95rem",
                      fontWeight: "700",
                      color: "#0f172a",
                      cursor: "pointer",
                      outline: "none",
                      maxWidth: "240px",
                    }}
                  >
                    {trains.map((t) => {
                      const num = t.number || t.trainNumber;
                      const nm = t.name || t.trainName || `Train ${num}`;
                      return (
                        <option key={num} value={num}>
                          {num} - {nm}
                        </option>
                      );
                    })}
                  </select>
                  <span className="train-stat-subtitle">{trainRoute}</span>
                </div>
              ) : (
                <>
                  <h3 className="train-stat-title">{trainNumber} - {trainName}</h3>
                  <span className="train-stat-subtitle">{trainRoute}</span>
                </>
              )}
            </div>
          </div>
          <span className={`train-stat-badge ${activeDelay <= 0 ? "green" : "orange"}`}>
            {activeDelay < 0 ? `Early by ${Math.abs(Math.round(activeDelay))}m` : (activeDelay === 0 ? "On Time" : `+${activeDelay.toFixed(0)}m Delay`)}
          </span>
        </div>

        {/* CARD 2 — CURRENT LOCATION */}
        <div className="train-stat-card">
          <div className="train-stat-left">
            <div className="train-stat-icon blue">
              <MapPin size={22} />
            </div>
            <div className="train-stat-info">
              <span className="train-stat-label">CURRENT LOCATION</span>
              <h3 className="train-stat-title">{liveTrainData?.currentStation || liveTrainData?.currentLocation || currentStation?.name || "--"}</h3>
              <span className="train-stat-subtitle">
                {journeyStatus.isNotStarted
                  ? "Awaiting Departure"
                  : journeyStatus.isCompleted
                  ? "Terminated at Destination"
                  : "Live Railway Tracking"}
              </span>
            </div>
          </div>
        </div>

        {/* CARD 3 — CURRENT SPEED */}
        <div className="train-stat-card">
          <div className="train-stat-left">
            <div className="train-stat-icon green">
              <Gauge size={22} />
            </div>
            <div className="train-stat-info">
              <span className="train-stat-label">CURRENT SPEED</span>
              <h3 className="train-stat-title">{activeSpeed.toFixed(0)} km/h</h3>
              <span className="train-stat-subtitle">Cruising Speed</span>
            </div>
          </div>
        </div>

        {/* CARD 4 — CURRENT DELAY */}
        <div className="train-stat-card">
          <div className="train-stat-left">
            <div className="train-stat-icon orange">
              <Clock3 size={22} />
            </div>
            <div className="train-stat-info">
              <span className="train-stat-label">CURRENT DELAY</span>
              <h3 className="train-stat-title">
                {activeDelay < 0 ? `Early by ${Math.abs(Math.round(activeDelay))} min` : (activeDelay === 0 ? "On Time" : `+${activeDelay.toFixed(1)} min`)}
              </h3>
              <span className="train-stat-subtitle">AI Live Estimate</span>
            </div>
          </div>
        </div>

      </div>

      {/* =========================================
          SECTION 3: MAP TOOLBAR
      ========================================= */}
      <div className="map-toolbar">
        <div className="map-search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search station on map..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => setSearchFocused(false), 250)}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              style={{ border: "none", background: "transparent", cursor: "pointer", color: "#94a3b8" }}
              aria-label="Clear search"
            >
              <X size={16} />
            </button>
          )}

          {searchFocused && filteredStations.length > 0 && (
            <div className="map-search-results">
              {filteredStations.map((station) => (
                <div
                  key={station.name}
                  className="map-search-item"
                  onMouseDown={() => {
                    setFlyTarget(station.position);
                    setSearchQuery(station.name);
                    setAutoFollow(false);
                  }}
                >
                  <span>{station.name}</span>
                  <small style={{ color: "#64748b" }}>{formatTimeDisplay(station.time || station.scheduledArrival)}</small>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          className="map-fullscreen-btn"
          onClick={toggleFullscreen}
          aria-label="Toggle Fullscreen"
        >
          {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          <span>{isFullscreen ? "Exit Fullscreen" : "View in Fullscreen"}</span>
        </button>
      </div>

      {/* =========================================
          SECTION 4: MAIN CONTENT — TWO COLUMN LAYOUT
      ========================================= */}
      <div className="live-map-main-columns">

        {/* =========================================
            SECTION 5: JOURNEY PROGRESS PANEL (LEFT ~31%)
        ========================================= */}
        <div className="journey-progress-panel">
          <div className="journey-progress-header-row">
            <div className="journey-progress-title-wrap">
              <h2>Journey Progress</h2>
              <span className="journey-percent-badge">{journeyProgress}%</span>
            </div>
            <span className="journey-route-tag">{trainRoute}</span>
          </div>

          <div className="journey-progress-bar-bg">
            <div
              className="journey-progress-bar-fill"
              style={{ width: `${journeyProgress}%` }}
            />
          </div>

          <div className="journey-timeline-scroll">
            {trainStations.length > 0 ? (
              trainStations.map((station, index) => (
                <div key={station.name || index} className="timeline-station-item">
                  <div className="timeline-axis">
                    <div className={`timeline-node ${station.status}`}>
                      {station.status === "completed" && <Check size={13} strokeWidth={2.6} />}
                      {station.status === "current" && <Train size={13} strokeWidth={2.4} />}
                    </div>
                    {index < trainStations.length - 1 && (
                      <div
                        className={`timeline-connector-line ${
                          station.status === "completed" ? "completed" : ""
                        }`}
                      />
                    )}
                  </div>

                  <div className="timeline-info">
                    <div className="timeline-station-name-row">
                      <h4 className="timeline-station-name">{station.name}</h4>
                      <span className={`timeline-status-badge ${station.status}`}>
                        {station.status === "completed"
                          ? (station.isHalt === false ? "Passed" : "Completed")
                          : station.status === "current"
                          ? "Current Location"
                          : (station.isHalt === false ? "Pass-through" : "Upcoming Halt")}
                      </span>
                    </div>
                    <div className="timeline-times-row">
                      <span>Sched: {formatTimeDisplay(station.time || station.scheduledArrival)}</span>
                      <span>Status: {station.delay || "Not available"}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="timeline-empty-state" style={{ padding: "36px 16px", textAlign: "center", color: "#64748b" }}>
                <Route size={28} style={{ margin: "0 auto 8px", opacity: 0.5 }} />
                <p style={{ margin: "0 0 4px", fontSize: "0.95rem", fontWeight: 500, color: "#475569" }}>
                  Live route data unavailable
                </p>
                <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                  Station timeline will appear when route telemetry is active.
                </span>
              </div>
            )}
          </div>

          <div className="timeline-live-footer">
            <span className="live-footer-dot"></span>
            <span>{journeyStatus.timelineFooter}</span>
          </div>
        </div>

        {/* =========================================
            SECTION 6: LARGE INTERACTIVE LIVE MAP (RIGHT ~69%)
        ========================================= */}
        <div className="live-map-card" ref={mapCardRef}>

          {/* Map Top-Left: Layer Switch & Compass */}
          <div className="map-top-left-controls">
            <div className="map-layer-switch">
              <button
                className={`map-layer-btn ${mapLayer === "map" ? "active" : ""}`}
                onClick={() => setMapLayer("map")}
              >
                Map
              </button>
              <button
                className={`map-layer-btn ${mapLayer === "satellite" ? "active" : ""}`}
                onClick={() => setMapLayer("satellite")}
              >
                Satellite
              </button>
            </div>

            <div className="map-compass-badge" title="Compass Orientation">
              <Compass size={16} />
              <span>N</span>
            </div>
          </div>

          {/* Map Top-Right: Last Updated Indicator */}
          <div className="map-top-right-badge">
            <span className="map-live-pulse-dot"></span>
            <span>LIVE • {formattedLastUpdated}</span>
          </div>

          {/* Bottom-Left: Map Legend */}
          <div className="map-bottom-left-legend">
            <div className="legend-item">
              <span className="legend-marker train"></span>
              <span>Train Position</span>
            </div>
            <div className="legend-item">
              <span className="legend-marker completed"></span>
              <span>Completed Station</span>
            </div>
            <div className="legend-item">
              <span className="legend-marker upcoming"></span>
              <span>Upcoming Station</span>
            </div>
            <div className="legend-item">
              <span className="legend-line"></span>
              <span>Train Route</span>
            </div>
          </div>

          {/* Map Leaflet Container */}
          <div className="real-train-map-container">
            <MapContainer
              key={trainNumber}
              center={displayedTrainPosition}
              zoom={9}
              scrollWheelZoom={true}
              style={{ width: "100%", height: "100%" }}
              ref={(ref) => {
                if (ref) mapInstanceRef.current = ref;
              }}
            >
              <MapInteractiveHelper
                position={displayedTrainPosition}
                autoFollow={autoFollow}
                flyTarget={flyTarget}
                setFlyTarget={setFlyTarget}
              />

              {mapLayer === "satellite" ? (
                <TileLayer
                  attribution="&copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community"
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                  maxZoom={18}
                />
              ) : (
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
              )}

              {/* COMPLETED ROUTE */}
              {completedRoute.length > 1 && (
                <Polyline
                  positions={completedRoute}
                  pathOptions={{
                    color: "#10b981",
                    weight: 6,
                    opacity: 0.95,
                    lineCap: "round",
                    lineJoin: "round",
                  }}
                />
              )}

              {/* REMAINING ROUTE */}
              {remainingRoute.length > 1 && (
                <Polyline
                  positions={remainingRoute}
                  pathOptions={{
                    color: "#6366f1",
                    weight: 5,
                    opacity: 0.85,
                    dashArray: "8, 8",
                    lineCap: "round",
                  }}
                />
              )}

              {/* STATIONS */}
              {trainStations.map((station) => (
                station.position ? (
                  <CircleMarker
                    key={station.name || station.code}
                    center={station.position}
                    radius={station.status === "current" ? 10 : (station.isHalt === false ? 5 : 7)}
                    pathOptions={{
                      color: "#ffffff",
                      fillColor:
                        station.status === "completed"
                          ? "#10b981"
                          : station.status === "current"
                          ? "#6366f1"
                          : "#94a3b8",
                      fillOpacity: 1,
                      weight: 2.5,
                    }}
                  >
                    <Popup>
                      <div style={{ padding: "4px", minWidth: "130px" }}>
                        <strong style={{ fontSize: "13px", color: "#0f172a" }}>{station.name}{station.isHalt === false ? " (Pass-through)" : ""}</strong>
                        <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>
                          Scheduled: {formatTimeDisplay(station.time || station.scheduledArrival)}
                        </div>
                        <div style={{ fontSize: "11px", color: station.status === "completed" ? "#10b981" : "#6366f1", fontWeight: 700, marginTop: "2px" }}>
                          {station.delay || "Not available"}
                        </div>
                      </div>
                    </Popup>
                  </CircleMarker>
                ) : null
              ))}

              {/* LIVE TRAIN MARKER & POPUP */}
              {(hasValidGps || currentStation?.position) && displayedTrainPosition && (
                <Marker position={displayedTrainPosition} icon={customTrainIcon}>
                  <Popup className="train-live-popup">
                    <div className="map-train-popup-card">
                      <div className="popup-train-title">🚆 {trainNumber} - {trainName}</div>
                      <div className="popup-row">
                        <span>Location</span>
                        <strong>{liveTrainData?.currentStation || currentStation?.name || (journeyStatus.isNotStarted ? "At Origin" : "En Route")}</strong>
                      </div>
                      <div className="popup-row">
                        <span>Current Speed</span>
                        <strong className="green">{activeSpeed.toFixed(0)} km/h</strong>
                      </div>
                      <div className="popup-row">
                        <span>Current Delay</span>
                        <strong className={activeDelay > 0 ? "orange" : "green"}>
                          {activeDelay < 0 ? `Early by ${Math.abs(Math.round(activeDelay))} min` : (activeDelay === 0 ? "On Time" : `+${activeDelay.toFixed(1)} min`)}
                        </strong>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              )}

            </MapContainer>
          </div>

          {/* Bottom-Right Custom Map Controls */}
          <MapExternalControls
            mapRef={mapInstanceRef}
            onRecenter={recenterTrain}
            autoFollow={autoFollow}
            setAutoFollow={setAutoFollow}
          />
        </div>

      </div>

      {/* =========================================
          SECTION 10: BOTTOM INFORMATION CARDS (3 CARDS)
      ========================================= */}
      <div className="live-map-bottom-row">

        {/* CARD 1: NEXT STATION */}
        <div className="bottom-info-card">
          <div className="bottom-card-icon blue">
            <Navigation size={22} />
          </div>
          <div className="bottom-card-content">
            <div className="bottom-card-label-row">
              <span className="bottom-card-label">NEXT STATION</span>
              {nextStation && (
                <span className="bottom-card-pill blue">
                  {minutesToNext != null
                    ? `in ${minutesToNext} min`
                    : journeyStatus.nextStationPill}
                </span>
              )}
            </div>
            <h4 className="bottom-card-title">
              {baseStations.length === 0
                ? "Awaiting Route Data"
                : nextStation
                ? nextStation.name
                : "Journey Complete"}
            </h4>
            <span className="bottom-card-desc">
              {nextStation
                ? `Scheduled arrival: ${formatTimeDisplay(nextStation.scheduledArrival || nextStation.time || nextStation.arrivalTime)}`
                : baseStations.length === 0
                ? "Awaiting route telemetry"
                : "Train has reached destination"}
            </span>
          </div>
        </div>

        {/* CARD 2: DISTANCE TO NEXT STATION */}
        <div className="bottom-info-card">
          <div className="bottom-card-icon purple">
            <Activity size={22} />
          </div>
          <div className="bottom-card-content">
            <div className="bottom-card-label-row">
              <span className="bottom-card-label">DISTANCE TO NEXT STATION</span>
            </div>
            <h4 className="bottom-card-title">
              {!nextStation
                ? "0.0 km"
                : distanceToNext != null
                ? `${distanceToNext.toFixed(1)} km`
                : "Not available"}
            </h4>
            <span className="bottom-card-desc">
              {nextStation
                ? (minutesToNext != null
                    ? `Estimated arrival in ${minutesToNext} minutes`
                    : journeyStatus.distanceDesc)
                : baseStations.length === 0
                ? "Awaiting route telemetry"
                : "Journey completed"}
            </span>
          </div>
        </div>

        {/* CARD 3: JOURNEY STATUS */}
        <div className="bottom-info-card">
          <div className={`bottom-card-icon ${journeyStatus.badgeColor}`}>
            <Train size={22} />
          </div>
          <div className="bottom-card-content">
            <div className="bottom-card-label-row">
              <span className="bottom-card-label">JOURNEY STATUS</span>
              <span className={`bottom-card-pill ${journeyStatus.badgeColor}`}>
                {baseStations.length === 0 ? "ACTIVE" : journeyStatus.badge}
              </span>
            </div>
            <h4 className="bottom-card-title">
              {baseStations.length === 0
                ? "Tracking Active"
                : journeyStatus.title}
            </h4>
            <span className="bottom-card-desc">
              {baseStations.length === 0
                ? "Awaiting upcoming station schedule"
                : journeyStatus.description}
            </span>
          </div>
        </div>

      </div>

    </div>
  );
}

export default LiveTrainMap;
