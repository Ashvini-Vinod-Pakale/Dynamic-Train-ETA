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
   MAP STATION POSITIONS
========================================= */

const stationPositions = {
  "Pune Jn": [18.5286, 73.8743],

  "Pune Junction": [18.5286, 73.8743],

  Lonavala: [18.7546, 73.4062],

  Khopoli: [18.785, 73.345],

  Panvel: [18.9894, 73.1175],

  Dadar: [19.0178, 72.8478],

  "Mumbai CST": [18.9402, 72.8356],
};

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
  }, [position, map]);

  return null;
}

/* =========================================
   CALCULATE DISTANCE
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
     SELECTED TRAIN DATA
  ========================================= */

  const trainNumber =
    selectedTrain?.number ||
    liveTrainData?.trainNumber ||
    "12110";

  const trainName =
    selectedTrain?.name ||
    "Deccan Queen";

  const trainRoute =
    selectedTrain?.route ||
    "Pune → Mumbai CST";

  /* =========================================
     INITIAL LIVE POSITION
  ========================================= */

  const initialPosition = [
    liveTrainData?.currentLatitude ?? 18.785,
    liveTrainData?.currentLongitude ?? 73.345,
  ];

  const [livePosition, setLivePosition] =
    useState(initialPosition);

  /*
    Simulation starts at Khopoli.

    0 = Pune Jn
    1 = Lonavala
    2 = Khopoli
    3 = Panvel
    4 = Dadar
    5 = Mumbai CST
  */

  const [
    simulationStationIndex,
    setSimulationStationIndex,
  ] = useState(2);

  const [lastUpdated, setLastUpdated] =
    useState(
      liveTrainData?.lastUpdated ||
        new Date().toISOString()
    );

  /* =========================================
     UPDATE POSITION FROM BACKEND
  ========================================= */

  useEffect(() => {
    if (
      liveTrainData?.currentLatitude !== undefined &&
      liveTrainData?.currentLongitude !== undefined
    ) {
      setLivePosition([
        liveTrainData.currentLatitude,
        liveTrainData.currentLongitude,
      ]);

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
     BASE STATIONS
  ========================================= */

  const baseStations = useMemo(() => {
    if (stations.length > 0) {
      return stations.map((station) => ({
        ...station,

        position:
          stationPositions[station.name] ||
          [18.85, 73.2],
      }));
    }

    return [
      {
        name: "Pune Jn",
        time: "08:00",
        delay: "On Time",
        position: stationPositions["Pune Jn"],
      },

      {
        name: "Lonavala",
        time: "08:43",
        delay: "+5 min",
        position: stationPositions.Lonavala,
      },

      {
        name: "Khopoli",
        time: "09:25",
        delay: "+15 min",
        position: stationPositions.Khopoli,
      },

      {
        name: "Panvel",
        time: "10:10",
        delay: "+18 min",
        position: stationPositions.Panvel,
      },

      {
        name: "Dadar",
        time: "10:58",
        delay: "+21 min",
        position: stationPositions.Dadar,
      },

      {
        name: "Mumbai CST",
        time: "11:38",
        delay: "+21 min",
        position:
          stationPositions["Mumbai CST"],
      },
    ];
  }, [stations]);

  /* =========================================
     LIVE STATION STATUS

     Automatically changes station status
     according to simulation position.
  ========================================= */

  const trainStations = useMemo(() => {
    return baseStations.map(
      (station, index) => ({
        ...station,

        status:
          index < simulationStationIndex
            ? "completed"
            : index === simulationStationIndex
            ? "current"
            : "upcoming",
      })
    );
  }, [
    baseStations,
    simulationStationIndex,
  ]);

  /* =========================================
     ROUTE POSITIONS
  ========================================= */

  const routePositions =
    trainStations.map(
      (station) => station.position
    );

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
    trainStations[
      simulationStationIndex + 1
    ] || null;

  /* =========================================
     COMPLETED ROUTE
  ========================================= */

  const completedRoute = [
    ...routePositions.slice(
      0,
      simulationStationIndex + 1
    ),

    livePosition,
  ];

  /* =========================================
     REMAINING ROUTE
  ========================================= */

  const remainingRoute = nextStation
    ? [
        livePosition,

        ...routePositions.slice(
          simulationStationIndex + 1
        ),
      ]
    : [];

  /* =========================================
     JOURNEY PROGRESS
  ========================================= */

  const totalStations =
    trainStations.length;

  const journeyProgress =
    totalStations > 1
      ? Math.round(
          (simulationStationIndex /
            (totalStations - 1)) *
            100
        )
      : 0;

  /* =========================================
     DISTANCE TO NEXT STATION
  ========================================= */

  const distanceToNext =
    nextStation
      ? calculateDistance(
          livePosition,
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
        64
    );

  /* =========================================
     ESTIMATED TIME
  ========================================= */

  const minutesToNext =
    nextStation && activeSpeed > 0
      ? Math.max(
          1,
          Math.round(
            (distanceToNext /
              activeSpeed) *
              60
          )
        )
      : 0;

  /* =========================================
     LIVE TRAIN SIMULATION

     Train moves toward the next station.

     When it reaches the station:
     - Previous becomes completed
     - Next becomes current
     - Simulation continues
  ========================================= */

  useEffect(() => {
    if (!nextStation?.position) return;

    const interval = setInterval(() => {
      setLivePosition((previousPosition) => {
        const target =
          nextStation.position;

        const latitudeDifference =
          target[0] -
          previousPosition[0];

        const longitudeDifference =
          target[1] -
          previousPosition[1];

        /*
          Check whether train has reached
          the next station.
        */

        const closeToStation =
          Math.abs(
            latitudeDifference
          ) < 0.001 &&
          Math.abs(
            longitudeDifference
          ) < 0.001;

        if (closeToStation) {
          /*
            Move exactly to station.
          */

          setSimulationStationIndex(
            (previousIndex) =>
              Math.min(
                previousIndex + 1,
                trainStations.length - 1
              )
          );

          setLastUpdated(
            new Date().toISOString()
          );

          return target;
        }

        /*
          Move train toward target station.
        */

        const movementSpeed =
          0.03;

        const newPosition = [
          previousPosition[0] +
            latitudeDifference *
              movementSpeed,

          previousPosition[1] +
            longitudeDifference *
              movementSpeed,
        ];

        setLastUpdated(
          new Date().toISOString()
        );

        return newPosition;
      });
    }, 2000);

    return () =>
      clearInterval(interval);
  }, [
    nextStation?.name,
    trainStations.length,
  ]);

  /* =========================================
     FORMAT LAST UPDATED
  ========================================= */

  const formattedLastUpdated =
    new Date(
      lastUpdated
    ).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

  return (
    <div className="page-animation page-container">

      {/* PAGE HEADING */}

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

      {/* TRAIN STATUS */}

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

        <div className="live-stat-card">
          <MapPin size={22} />

          <div>
            <span>
              CURRENT LOCATION
            </span>

            <strong>
              {currentStation?.name ||
                "Khopoli"}
            </strong>
          </div>
        </div>

        <div className="live-stat-card">
          <Gauge size={22} />

          <div>
            <span>
              CURRENT SPEED
            </span>

            <strong>
              {activeSpeed} km/h
            </strong>
          </div>
        </div>

        <div className="live-stat-card">
          <Clock3 size={22} />

          <div>
            <span>
              CURRENT DELAY
            </span>

            <strong>
              +
              {currentDelay ??
                liveTrainData?.currentDelay ??
                15}{" "}
              min
            </strong>
          </div>
        </div>

      </div>

      {/* JOURNEY PROGRESS */}

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
              width: `${journeyProgress}%`,
            }}
          />
        </div>

        <div className="map-progress-labels">
          <span>
            {trainStations[0]?.name}
          </span>

          <span>
            Current:{" "}
            {currentStation?.name}
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

      {/* JOURNEY + MAP */}

      <div className="live-map-content">

        {/* LEFT JOURNEY */}

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
                      className={`vertical-dot ${station.status}`}
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
                      trainStations.length -
                        1 && (

                      <div
                        className={`vertical-line ${
                          station.status ===
                          "completed"
                            ? "completed-line"
                            : ""
                        }`}
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

        {/* REAL MAP */}

        <div className="live-map-wrapper">

          <div className="map-live-label">
            <span></span>

            LIVE TRACKING
          </div>

          <MapContainer
            center={livePosition}
            zoom={10}
            scrollWheelZoom={true}
            className="real-train-map"
          >

            <MapFollowTrain
              position={livePosition}
            />

            <TileLayer
              attribution="&copy; OpenStreetMap contributors"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* COMPLETED ROUTE */}

            {completedRoute.length > 1 && (
              <Polyline
                positions={completedRoute}
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
                positions={remainingRoute}
                pathOptions={{
                  color: "#6d4bd3",
                  weight: 5,
                  opacity: 0.8,
                  dashArray: "10 10",
                }}
              />
            )}

            {/* STATION MARKERS */}

            {trainStations.map(
              (station) => (

                <CircleMarker
                  key={station.name}
                  center={station.position}
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

            {/* LIVE TRAIN */}

            <Marker
              position={livePosition}
              icon={trainIcon}
            >

              <Popup>

                <strong>
                  🚆 Train {trainNumber}
                </strong>

                <br />

                Current location:{" "}
                {currentStation?.name}

                <br />

                Speed:{" "}
                {activeSpeed} km/h

              </Popup>

            </Marker>

          </MapContainer>

          {/* LAST UPDATED */}

          <div className="map-update-info">
            <Radio size={14} />

            <span>
              Last updated:{" "}
              {formattedLastUpdated}
            </span>
          </div>

        </div>

      </div>

      {/* BOTTOM INFORMATION */}

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
              {nextStation?.name ||
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
              {nextStation
                ? "On The Way"
                : "Journey Completed"}
            </h3>

            <p>
              {nextStation
                ? `Currently travelling towards ${nextStation.name}`
                : "Train has reached Mumbai CST"}
            </p>
          </div>
        </div>

      </div>

    </div>
  );
}

export default LiveTrainMap;