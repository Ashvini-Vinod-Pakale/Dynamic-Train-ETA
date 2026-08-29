import { useEffect, useMemo, useState } from "react";

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
} from "lucide-react";

import "leaflet/dist/leaflet.css";

/* =========================================
   CUSTOM TRAIN ICON
========================================= */

const trainIcon = L.divIcon({
  className: "custom-train-marker",

  html: `
    <div class="train-marker">
      🚆
    </div>
  `,

  iconSize: [48, 48],
  iconAnchor: [24, 24],
});

/* =========================================
   STATION POSITIONS
========================================= */

const stationPositions = {
  "Pune Jn": [18.5284, 73.8747],

  Lonavala: [18.7546, 73.4062],

  Igatpuri: [19.6950, 73.5620],

  "Nashik Road": [19.9975, 73.7898],

  Manmad: [20.2530, 74.4380],

  Dadar: [19.0183, 72.8438],

  "Mumbai CST": [18.9402, 72.8356],
};

/* =========================================
   RAILWAY ROUTE

   This is the displayed railway corridor.

   The live train position from the backend
   is projected onto this route so the train
   marker stays visually on the railway path.
========================================= */

const railwayRoute = [

  /* PUNE JN → LONAVALA */

  [18.5284, 73.8747],
  [18.5450, 73.8300],
  [18.5650, 73.7800],
  [18.5900, 73.7300],
  [18.6250, 73.6800],
  [18.6650, 73.6200],
  [18.7050, 73.5500],
  [18.7546, 73.4062],

  /* LONAVALA → IGATPURI */

  [18.7700, 73.4000],
  [18.7900, 73.3950],
  [18.8150, 73.4000],
  [18.8400, 73.4150],
  [18.8700, 73.4400],
  [18.9000, 73.4700],
  [18.9300, 73.5000],
  [18.9600, 73.5300],
  [18.9950, 73.5550],
  [19.0300, 73.5750],
  [19.0700, 73.5850],
  [19.1200, 73.5750],
  [19.1800, 73.5650],
  [19.2400, 73.5550],
  [19.3000, 73.5550],
  [19.3600, 73.5600],
  [19.4200, 73.5650],
  [19.4800, 73.5700],
  [19.5400, 73.5680],
  [19.6000, 73.5650],
  [19.6500, 73.5620],
  [19.6950, 73.5620],

  /* IGATPURI → NASHIK ROAD */

  [19.7300, 73.5850],
  [19.7650, 73.6100],
  [19.8000, 73.6350],
  [19.8350, 73.6650],
  [19.8700, 73.6950],
  [19.9050, 73.7250],
  [19.9400, 73.7550],
  [19.9700, 73.7750],
  [19.9975, 73.7898],

  /* NASHIK ROAD → MANMAD */

  [20.0250, 73.8200],
  [20.0550, 73.8550],
  [20.0850, 73.8950],
  [20.1150, 73.9400],
  [20.1450, 73.9950],
  [20.1700, 74.0550],
  [20.1950, 74.1200],
  [20.2150, 74.1900],
  [20.2300, 74.2600],
  [20.2420, 74.3250],
  [20.2500, 74.3850],
  [20.2530, 74.4380],

  /* MANMAD → DADAR */

  [20.2450, 74.3900],
  [20.2300, 74.3300],
  [20.2100, 74.2700],
  [20.1850, 74.2100],
  [20.1550, 74.1500],
  [20.1200, 74.0900],
  [20.0800, 74.0200],
  [20.0400, 73.9500],
  [20.0000, 73.8800],
  [19.9600, 73.8100],
  [19.9200, 73.7400],
  [19.8800, 73.6700],
  [19.8400, 73.6000],
  [19.8000, 73.5300],
  [19.7500, 73.4600],
  [19.7000, 73.3900],
  [19.6500, 73.3200],
  [19.6000, 73.2500],
  [19.5500, 73.1800],
  [19.5000, 73.1200],
  [19.4500, 73.0600],
  [19.4000, 73.0100],
  [19.3500, 72.9600],
  [19.3000, 72.9200],
  [19.2500, 72.8900],
  [19.2000, 72.8700],
  [19.1500, 72.8550],
  [19.1000, 72.8500],
  [19.0600, 72.8470],
  [19.0183, 72.8438],

  /* DADAR → MUMBAI CST */

  [19.0000, 72.8400],
  [18.9800, 72.8380],
  [18.9600, 72.8370],
  [18.9402, 72.8356],
];

/* =========================================
   MAP FOLLOW TRAIN
========================================= */

function MapFollowTrain({ position }) {
  const map = useMap();

  useEffect(() => {
    if (!position) return;

    map.flyTo(position, map.getZoom(), {
      animate: true,
      duration: 1.2,
    });
  }, [
    position?.[0],
    position?.[1],
    map,
  ]);

  return null;
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

  const dLat =
    ((lat2 - lat1) * Math.PI) / 180;

  const dLon =
    ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) *
      Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c =
    2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    );

  return R * c;
};

/* =========================================
   FIND CLOSEST POINT ON RAILWAY ROUTE

   Backend GPS position may not fall exactly
   on our displayed route.

   This projects it onto the nearest route
   segment so the train marker stays on the
   railway line.
========================================= */

const getNearestRoutePoint = (position) => {

  if (
    !position ||
    railwayRoute.length < 2
  ) {
    return {
      point: position,
      segmentIndex: 0,
    };
  }

  let nearestPoint = railwayRoute[0];

  let nearestDistance = Infinity;

  let nearestSegmentIndex = 0;

  for (
    let i = 0;
    i < railwayRoute.length - 1;
    i++
  ) {

    const start = railwayRoute[i];

    const end = railwayRoute[i + 1];

    const latitudeScale = 111.32;

    const longitudeScale =
      111.32 *
      Math.cos(
        (position[0] * Math.PI) / 180
      );

    const x =
      (position[1] - start[1]) *
      longitudeScale;

    const y =
      (position[0] - start[0]) *
      latitudeScale;

    const segmentX =
      (end[1] - start[1]) *
      longitudeScale;

    const segmentY =
      (end[0] - start[0]) *
      latitudeScale;

    const segmentLengthSquared =
      segmentX * segmentX +
      segmentY * segmentY;

    let t = 0;

    if (segmentLengthSquared > 0) {

      t =
        (
          x * segmentX +
          y * segmentY
        ) /
        segmentLengthSquared;
    }

    t = Math.max(
      0,
      Math.min(1, t)
    );

    const projectedPoint = [
      start[0] +
        (end[0] - start[0]) * t,

      start[1] +
        (end[1] - start[1]) * t,
    ];

    const distance =
      calculateDistance(
        position,
        projectedPoint
      );

    if (
      distance <
      nearestDistance
    ) {

      nearestDistance =
        distance;

      nearestPoint =
        projectedPoint;

      nearestSegmentIndex =
        i;
    }
  }

  return {
    point: nearestPoint,
    segmentIndex:
      nearestSegmentIndex,
  };
};

/* =========================================
   COMPONENT
========================================= */

function LiveTrainMap({
  currentSpeed,
  currentDelay,
  stations = [],
  selectedTrain,
  liveTrainData,
}) {

  /* =========================================
     TRAIN INFORMATION
  ========================================= */

  const trainNumber =
    selectedTrain?.number ||
    liveTrainData?.trainNumber ||
    "12123";

  const trainName =
    selectedTrain?.name ||
    liveTrainData?.trainName ||
    "Dynamic Train";

  const trainRoute =
    selectedTrain?.route ||
    "Pune → Mumbai CST";

  /* =========================================
     LIVE BACKEND POSITION
  ========================================= */

  const initialPosition = [
    Number(
      liveTrainData?.currentLatitude ??
      19.9975
    ),

    Number(
      liveTrainData?.currentLongitude ??
      73.7898
    ),
  ];

  const [livePosition, setLivePosition] =
    useState(initialPosition);

  const [backendPosition, setBackendPosition] =
    useState(initialPosition);

  const [lastUpdated, setLastUpdated] =
    useState(
      liveTrainData?.lastUpdated ||
      new Date().toISOString()
    );

  /* =========================================
     UPDATE BACKEND POSITION
  ========================================= */

  useEffect(() => {

    if (
      liveTrainData?.currentLatitude !==
        undefined &&
      liveTrainData?.currentLongitude !==
        undefined
    ) {

      const newPosition = [

        Number(
          liveTrainData.currentLatitude
        ),

        Number(
          liveTrainData.currentLongitude
        ),

      ];

      setBackendPosition(
        newPosition
      );

      setLastUpdated(
        liveTrainData.lastUpdated ||
        new Date().toISOString()
      );
    }

  }, [
    liveTrainData?.currentLatitude,
    liveTrainData?.currentLongitude,
    liveTrainData?.lastUpdated,
  ]);

  /* =========================================
     SMOOTH TRAIN MOVEMENT

     Backend updates every few seconds.

     Instead of jumping between positions,
     animate the train smoothly.
  ========================================= */

  useEffect(() => {

    if (!backendPosition) return;

    const startPosition =
      [...livePosition];

    const endPosition =
      [...backendPosition];

    const duration = 4500;

    const startTime =
      performance.now();

    let animationFrame;

    const animateTrain =
      (currentTime) => {

        const elapsed =
          currentTime -
          startTime;

        const progress =
          Math.min(
            elapsed / duration,
            1
          );

        const easedProgress =
          progress < 0.5
            ? 2 *
              progress *
              progress
            : 1 -
              Math.pow(
                -2 *
                  progress +
                  2,
                2
              ) /
                2;

        const latitude =
          startPosition[0] +
          (
            endPosition[0] -
            startPosition[0]
          ) *
          easedProgress;

        const longitude =
          startPosition[1] +
          (
            endPosition[1] -
            startPosition[1]
          ) *
          easedProgress;

        setLivePosition([
          latitude,
          longitude,
        ]);

        if (progress < 1) {

          animationFrame =
            requestAnimationFrame(
              animateTrain
            );
        }
      };

    animationFrame =
      requestAnimationFrame(
        animateTrain
      );

    return () => {

      cancelAnimationFrame(
        animationFrame
      );

    };

  }, [backendPosition]);

  /* =========================================
     BASE STATIONS
  ========================================= */

  const baseStations =
    useMemo(() => {

      if (stations.length > 0) {

        return stations.map(
          (station) => ({

            ...station,

            position:
              stationPositions[
                station.name
              ] ||
              [19.9975, 73.7898],

          })
        );
      }

      return [

        {
          name: "Pune Jn",
          time: "08:00",
          delay: "On Time",
          position:
            stationPositions[
              "Pune Jn"
            ],
        },

        {
          name: "Lonavala",
          time: "08:43",
          delay: "+5 min",
          position:
            stationPositions.Lonavala,
        },

        {
          name: "Nashik Road",
          time: "09:25",

          delay:
            liveTrainData
              ?.currentDelay !==
            undefined
              ? `+${Number(
                  liveTrainData.currentDelay
                ).toFixed(1)} min`
              : "+18 min",

          position:
            stationPositions[
              "Nashik Road"
            ],
        },

        {
          name: "Manmad",
          time: "10:10",

          delay:
            liveTrainData
              ?.futureDelay !==
            undefined
              ? `+${Number(
                  liveTrainData.futureDelay
                ).toFixed(1)} min`
              : "Upcoming",

          position:
            stationPositions.Manmad,
        },

        {
          name: "Dadar",
          time: "10:58",
          delay:
            liveTrainData
              ?.futureDelay !==
            undefined
              ? `+${Number(
                  liveTrainData.futureDelay
                ).toFixed(1)} min`
              : "Upcoming",

          position:
            stationPositions.Dadar,
        },

        {
          name: "Mumbai CST",
          time: "11:38",
          delay:
            liveTrainData
              ?.futureDelay !==
            undefined
              ? `+${Number(
                  liveTrainData.futureDelay
                ).toFixed(1)} min`
              : "Upcoming",

          position:
            stationPositions[
              "Mumbai CST"
            ],
        },

      ];

    }, [
      stations,
      liveTrainData?.currentDelay,
      liveTrainData?.futureDelay,
    ]);

  /* =========================================
     CURRENT STATION
  ========================================= */

  const foundStationIndex =
    baseStations.findIndex(
      (station) =>
        station.name ===
        liveTrainData?.currentStation
    );

  const simulationStationIndex =
    foundStationIndex >= 0
      ? foundStationIndex
      : 0;

  /* =========================================
     STATION STATUS
  ========================================= */

  const trainStations =
    useMemo(() => {

      return baseStations.map(
        (station, index) => ({

          ...station,

          status:
            index <
            simulationStationIndex
              ? "completed"
              : index ===
                simulationStationIndex
                ? "current"
                : "upcoming",

        })
      );

    }, [
      baseStations,
      simulationStationIndex,
    ]);

  /* =========================================
     CURRENT STATION
  ========================================= */

  const currentStation =
    trainStations[
      simulationStationIndex
    ] ||
    trainStations[0];

  /* =========================================
     NEXT STATION
  ========================================= */

  const nextStation =
    trainStations.find(
      (station) =>
        station.name ===
        liveTrainData?.nextStation
    ) ||
    trainStations[
      simulationStationIndex + 1
    ] ||
    null;

  /* =========================================
     PROJECT LIVE GPS ONTO ROUTE
  ========================================= */

  const liveRoutePosition =
    getNearestRoutePoint(
      livePosition
    );

  const displayedTrainPosition =
    liveRoutePosition.point;

  /* =========================================
     COMPLETED ROUTE

     Green = route already travelled.
  ========================================= */

  const completedRoute = [

    ...railwayRoute.slice(
      0,
      liveRoutePosition.segmentIndex + 1
    ),

    displayedTrainPosition,

  ];

  /* =========================================
     REMAINING ROUTE

     Purple = route still remaining.
  ========================================= */

  const remainingRoute = [

    displayedTrainPosition,

    ...railwayRoute.slice(
      liveRoutePosition.segmentIndex + 1
    ),

  ];

  /* =========================================
     JOURNEY PROGRESS
  ========================================= */

  let journeyProgress = 0;

  if (
    railwayRoute.length > 1
  ) {

    journeyProgress =
      Math.round(
        (
          liveRoutePosition.segmentIndex /
          (railwayRoute.length - 1)
        ) *
        100
      );

    journeyProgress =
      Math.max(
        0,
        Math.min(
          100,
          journeyProgress
        )
      );
  }

  /* =========================================
     DISTANCE TO NEXT STATION
  ========================================= */

  const distanceToNext =
    nextStation
      ? calculateDistance(
          displayedTrainPosition,
          nextStation.position
        )
      : 0;

  /* =========================================
     ACTIVE SPEED
  ========================================= */

  const activeSpeed =
    Number(
      currentSpeed ??
      liveTrainData?.currentSpeed ??
      68
    );

  /* =========================================
     ACTIVE DELAY
  ========================================= */

  const activeDelay =
    Number(
      currentDelay ??
      liveTrainData?.currentDelay ??
      0
    );

  /* =========================================
     ESTIMATED TIME
  ========================================= */

  const minutesToNext =
    nextStation &&
    activeSpeed > 0
      ? Math.max(
          1,

          Math.round(
            (
              distanceToNext /
              activeSpeed
            ) *
              60
          )
        )
      : 0;

  /* =========================================
     LAST UPDATED
  ========================================= */

  const formattedLastUpdated =
    new Date(
      lastUpdated
    ).toLocaleTimeString(
      [],
      {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }
    );

  /* =========================================
     RENDER
  ========================================= */

  return (

    <div className="page-animation page-container">

      {/* PAGE HEADER */}

      <div className="page-heading">

        <span>
          LIVE TRAIN TRACKING
        </span>

        <h1>
          Live Train Map
        </h1>

        <p>
          Track the current location and
          journey progress of the train in
          real time.
        </p>

      </div>


      {/* =====================================
          TRAIN STATUS
      ===================================== */}

      <div className="live-map-status-grid">

        <div className="live-train-info-card">

          <div className="live-train-icon">
            <Train size={28} />
          </div>

          <div>

            <span>
              SELECTED TRAIN
            </span>

            <h2>
              {trainNumber} - {trainName}
            </h2>

            <p>
              {trainRoute}
            </p>

          </div>

        </div>


        {/* CURRENT LOCATION */}

        <div className="live-stat-card">

          <MapPin size={22} />

          <div>

            <span>
              CURRENT LOCATION
            </span>

            <strong>
              {liveTrainData?.currentStation ||
                currentStation?.name ||
                "Nashik Road"}
            </strong>

          </div>

        </div>


        {/* SPEED */}

        <div className="live-stat-card">

          <Gauge size={22} />

          <div>

            <span>
              CURRENT SPEED
            </span>

            <strong>
              {activeSpeed.toFixed(1)}
              {" "}km/h
            </strong>

          </div>

        </div>


        {/* DELAY */}

        <div className="live-stat-card">

          <Clock3 size={22} />

          <div>

            <span>
              CURRENT DELAY
            </span>

            <strong>
              +{activeDelay.toFixed(1)}
              {" "}min
            </strong>

          </div>

        </div>

      </div>


      {/* =====================================
          JOURNEY PROGRESS
      ===================================== */}

      <div className="map-progress-card">

        <div className="map-progress-header">

          <div>

            <span>
              JOURNEY PROGRESS
            </span>

            <h2>
              {journeyProgress}% Complete
            </h2>

          </div>

          <Route size={24} />

        </div>


        <div className="map-progress-bar">

          <div
            className="map-progress-fill"
            style={{
              width:
                `${journeyProgress}%`,
            }}
          />

        </div>


        <div className="map-progress-labels">

          <span>
            {trainStations[0]?.name}
          </span>

          <span>
            Current:{" "}
            {liveTrainData?.currentStation ||
              currentStation?.name}
          </span>

          <span>
            {
              trainStations[
                trainStations.length - 1
              ]?.name
            }
          </span>

        </div>

      </div>


      {/* =====================================
          JOURNEY + MAP
      ===================================== */}

      <div className="live-map-content">


        {/* ===================================
            LEFT JOURNEY PANEL
        =================================== */}

        <div className="vertical-journey-card">

          <div className="vertical-journey-header">

            <span>
              JOURNEY PROGRESS
            </span>

            <h2>
              {trainRoute}
            </h2>

          </div>


          <div className="vertical-stations">

            {trainStations.map(
              (station, index) => (

                <div
                  className="vertical-station"
                  key={station.name}
                >

                  <div className="vertical-timeline">

                    <div
                      className={
                        `vertical-dot ${station.status}`
                      }
                    >

                      {station.status ===
                        "completed" && (
                        <Check size={14} />
                      )}

                      {station.status ===
                        "current" && (
                        <Train size={14} />
                      )}

                    </div>


                    {index <
                      trainStations.length - 1 && (

                      <div
                        className={
                          `vertical-line ${
                            station.status ===
                            "completed"
                              ? "completed-line"
                              : ""
                          }`
                        }
                      />

                    )}

                  </div>


                  <div className="vertical-station-info">

                    <strong>
                      {station.name}
                    </strong>

                    <span>
                      Scheduled:{" "}
                      {station.time}
                    </span>

                    <small className="station-delay-text">
                      {station.delay}
                    </small>


                    {station.status ===
                      "completed" && (

                      <small className="completed-text">
                        ✓ Completed
                      </small>

                    )}


                    {station.status ===
                      "current" && (

                      <small className="current-text">
                        🚆 Current Location
                      </small>

                    )}


                    {station.status ===
                      "upcoming" && (

                      <small className="upcoming-text">
                        Upcoming
                      </small>

                    )}

                  </div>

                </div>

              )
            )}

          </div>


          <div className="journey-live-status">

            <span></span>

            TRAIN IS LIVE

          </div>

        </div>


        {/* ===================================
            MAP
        =================================== */}

        <div className="live-map-wrapper">

          <div className="map-live-label">

            <span></span>

            LIVE TRACKING

          </div>


          <MapContainer
            center={
              displayedTrainPosition
            }
            zoom={9}
            scrollWheelZoom={true}
            className="real-train-map"
          >

            <MapFollowTrain
              position={
                displayedTrainPosition
              }
            />


            <TileLayer
              attribution="&copy; OpenStreetMap contributors"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />


            {/* COMPLETED ROUTE */}

            {completedRoute.length > 1 && (

              <Polyline
                positions={
                  completedRoute
                }
                pathOptions={{
                  color: "#22c55e",
                  weight: 6,
                  opacity: 0.9,
                }}
              />

            )}


            {/* REMAINING ROUTE */}

            {remainingRoute.length > 1 && (

              <Polyline
                positions={
                  remainingRoute
                }
                pathOptions={{
                  color: "#6d4bd3",
                  weight: 5,
                  opacity: 0.85,
                  dashArray: "10 10",
                }}
              />

            )}


            {/* STATIONS */}

            {trainStations.map(
              (station) => (

                <CircleMarker
                  key={station.name}
                  center={
                    station.position
                  }
                  radius={
                    station.status ===
                    "current"
                      ? 10
                      : 7
                  }
                  pathOptions={{

                    color: "#ffffff",

                    fillColor:
                      station.status ===
                      "completed"
                        ? "#22c55e"
                        : station.status ===
                          "current"
                          ? "#6d4bd3"
                          : "#94a3b8",

                    fillOpacity: 1,

                    weight: 3,

                  }}
                >

                  <Popup>

                    <strong>
                      {station.name}
                    </strong>

                    <br />

                    Scheduled:{" "}
                    {station.time}

                    <br />

                    Status:{" "}
                    {station.delay}

                  </Popup>

                </CircleMarker>

              )
            )}


            {/* =================================
                LIVE TRAIN MARKER

                IMPORTANT:
                This uses the projected
                railway position, not raw GPS.
            ================================= */}

            <Marker
              position={
                displayedTrainPosition
              }
              icon={trainIcon}
            >

              <Popup>

                <strong>
                  🚆 Train {trainNumber}
                </strong>

                <br />

                Current location:{" "}
                {liveTrainData?.currentStation ||
                  currentStation?.name}

                <br />

                Speed:{" "}
                {activeSpeed.toFixed(1)}
                {" "}km/h

                <br />

                Delay: +
                {activeDelay.toFixed(1)}
                {" "}min

              </Popup>

            </Marker>


          </MapContainer>


          <div className="map-update-info">

            <Radio size={14} />

            <span>
              Last updated:{" "}
              {formattedLastUpdated}
            </span>

          </div>

        </div>

      </div>


      {/* =====================================
          BOTTOM INFORMATION
      ===================================== */}

      <div className="live-map-bottom-grid">


        {/* NEXT STATION */}

        <div className="map-info-panel">

          <div className="map-panel-icon">
            <Navigation size={23} />
          </div>

          <div>

            <span>
              NEXT STATION
            </span>

            <h3>
              {liveTrainData?.nextStation ||
                nextStation?.name ||
                "Journey Complete"}
            </h3>

            <p>

              {nextStation
                ? `Scheduled arrival: ${nextStation.time}`
                : "Train has reached destination"}

            </p>

          </div>

        </div>


        {/* DISTANCE */}

        <div className="map-info-panel">

          <div className="map-panel-icon purple-panel-icon">

            <Activity size={23} />

          </div>

          <div>

            <span>
              DISTANCE TO NEXT STATION
            </span>

            <h3>

              {nextStation
                ? `${distanceToNext.toFixed(1)} km`
                : "0 km"}

            </h3>

            <p>

              {nextStation
                ? `Estimated arrival in ${minutesToNext} minutes`
                : "Journey completed"}

            </p>

          </div>

        </div>


        {/* JOURNEY STATUS */}

        <div className="map-info-panel">

          <div className="map-panel-icon purple-panel-icon">

            <Train size={23} />

          </div>

          <div>

            <span>
              JOURNEY STATUS
            </span>

            <h3>

              {liveTrainData?.running === false
                ? "Simulation Stopped"
                : nextStation
                  ? "On The Way"
                  : "Journey Completed"}

            </h3>

            <p>

              {nextStation
                ? `Currently travelling towards ${
                    liveTrainData?.nextStation ||
                    nextStation.name
                  }`
                : "Train has reached destination"}

            </p>

          </div>

        </div>


      </div>

    </div>
  );
}

export default LiveTrainMap;