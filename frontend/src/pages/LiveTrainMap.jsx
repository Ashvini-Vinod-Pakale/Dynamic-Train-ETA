import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  CircleMarker,
} from "react-leaflet";

import L from "leaflet";

import {
  Train,
  MapPin,
  Gauge,
  Clock3,
  Navigation,
  Check,
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

  iconSize: [45, 45],

  iconAnchor: [22, 22],
});


/* =========================================
   MAP STATION POSITIONS
========================================= */

const stationPositions = {
  "Pune Jn": [18.5286, 73.8743],
  "Pune Junction": [18.5286, 73.8743],

  "Lonavala": [18.7546, 73.4062],

  "Khopoli": [18.7850, 73.3450],

  "Panvel": [18.9894, 73.1175],

  "Dadar": [19.0178, 72.8478],

  "Mumbai CST": [18.9402, 72.8356],
};


/* =========================================
   COMPONENT
========================================= */

function LiveTrainMap({
  currentSpeed,
  currentDelay,
  stations = [],
}) {

  /* =========================================
     COMBINE APP STATIONS WITH MAP POSITIONS
  ========================================= */

  const trainStations = stations.map((station) => ({
    ...station,

    position:
      stationPositions[station.name] ||
      [18.8500, 73.2000],
  }));


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
    trainStations.find(
      (station) =>
        station.status === "current"
    ) ||
    trainStations[2];


  /* =========================================
     NEXT STATION
  ========================================= */

  const currentIndex =
    trainStations.findIndex(
      (station) =>
        station.status === "current"
    );

  const nextStation =
    trainStations[currentIndex + 1] ||
    trainStations[3];


  return (

    <div className="page-animation page-container">


      {/* PAGE HEADING */}

      <div className="page-heading">

        <span>LIVE TRAIN TRACKING</span>

        <h1>Live Train Map</h1>

        <p>
          Track the current location and journey
          progress of the train in real time.
        </p>

      </div>


      {/* =====================================
          TRAIN STATUS
      ===================================== */}

      <div className="live-map-status-grid">


        {/* TRAIN INFO */}

        <div className="live-train-info-card">

          <div className="live-train-icon">

            <Train size={28} />

          </div>


          <div>

            <span>SELECTED TRAIN</span>

            <h2>
              12110 - Deccan Queen
            </h2>

            <p>
              Pune → Mumbai CST
            </p>

          </div>

        </div>


        {/* CURRENT LOCATION */}

        <div className="live-stat-card">

          <MapPin size={22} />

          <div>

            <span>CURRENT LOCATION</span>

            <strong>
              {currentStation?.name || "Khopoli"}
            </strong>

          </div>

        </div>


        {/* SPEED */}

        <div className="live-stat-card">

          <Gauge size={22} />

          <div>

            <span>CURRENT SPEED</span>

            <strong>
              {currentSpeed ?? 64} km/h
            </strong>

          </div>

        </div>


        {/* DELAY */}

        <div className="live-stat-card">

          <Clock3 size={22} />

          <div>

            <span>CURRENT DELAY</span>

            <strong>
              +{currentDelay ?? 15} min
            </strong>

          </div>

        </div>

      </div>


      {/* =====================================
          JOURNEY + MAP
      ===================================== */}

      <div className="live-map-content">


        {/* LEFT SIDE VERTICAL JOURNEY */}

        <div className="vertical-journey-card">

          <div className="vertical-journey-header">

            <span>JOURNEY PROGRESS</span>

            <h2>
              Pune → Mumbai CST
            </h2>

          </div>


          <div className="vertical-stations">

            {trainStations.map(
              (station, index) => (

                <div
                  className="vertical-station"
                  key={station.name}
                >


                  {/* TIMELINE */}

                  <div className="vertical-timeline">


                    {/* DOT */}

                    <div
                      className={`vertical-dot ${station.status}`}
                    >

                      {station.status === "completed" && (
                        <Check size={14} />
                      )}

                      {station.status === "current" && (
                        <Train size={14} />
                      )}

                    </div>


                    {/* CONNECTING LINE */}

                    {index <
                      trainStations.length - 1 && (

                      <div
                        className={`vertical-line ${
                          station.status === "completed"
                            ? "completed-line"
                            : ""
                        }`}
                      />

                    )}

                  </div>


                  {/* STATION INFORMATION */}

                  <div className="vertical-station-info">

                    <strong>
                      {station.name}
                    </strong>


                    <span>
                      Scheduled: {station.time}
                    </span>


                    {/* DELAY */}

                    <small className="station-delay-text">

                      {station.delay}

                    </small>


                    {/* STATUS */}

                    {station.status === "completed" && (

                      <small className="completed-text">

                        ✓ Completed

                      </small>

                    )}


                    {station.status === "current" && (

                      <small className="current-text">

                        🚆 Current Location

                      </small>

                    )}


                    {station.status === "upcoming" && (

                      <small className="upcoming-text">

                        Upcoming

                      </small>

                    )}

                  </div>

                </div>

              )
            )}

          </div>


          {/* LIVE STATUS */}

          <div className="journey-live-status">

            <span></span>

            TRAIN IS LIVE

          </div>

        </div>


        {/* =====================================
            REAL MAP
        ===================================== */}

        <div className="live-map-wrapper">


          <div className="map-live-label">

            <span></span>

            LIVE TRACKING

          </div>


          <MapContainer

            center={[
              18.8500,
              73.2000,
            ]}

            zoom={9}

            scrollWheelZoom={true}

            className="real-train-map"

          >


            {/* OPENSTREETMAP */}

            <TileLayer

              attribution='&copy; OpenStreetMap contributors'

              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"

            />


            {/* TRAIN ROUTE */}

            <Polyline

              positions={routePositions}

              pathOptions={{

                color: "#6d4bd3",

                weight: 5,

                opacity: 0.85,

              }}

            />


            {/* STATION MARKERS */}

            {trainStations.map(
              (station) => (

                <CircleMarker

                  key={station.name}

                  center={station.position}

                  radius={
                    station.status === "current"
                      ? 9
                      : 6
                  }

                  pathOptions={{

                    color:
                      station.status === "current"
                        ? "#6d4bd3"
                        : "#ffffff",

                    fillColor:

                      station.status === "completed"
                        ? "#22c55e"

                        : station.status === "current"
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

                    Scheduled:
                    {" "}
                    {station.time}

                    <br />

                    Status:
                    {" "}
                    {station.delay}

                  </Popup>

                </CircleMarker>

              )
            )}


            {/* CURRENT TRAIN */}

            {currentStation && (

              <Marker

                position={
                  currentStation.position
                }

                icon={trainIcon}

              >

                <Popup>

                  <strong>
                    🚆 Train 12110
                  </strong>

                  <br />

                  Current location:
                  {" "}
                  {currentStation.name}

                  <br />

                  Speed:
                  {" "}
                  {currentSpeed ?? 64}
                  {" "}
                  km/h

                  <br />

                  Delay:
                  {" "}
                  +{currentDelay ?? 15}
                  {" "}
                  min

                </Popup>

              </Marker>

            )}


          </MapContainer>


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

            <span>NEXT STATION</span>

            <h3>
              {nextStation?.name || "Panvel"}
            </h3>

            <p>

              Scheduled arrival:
              {" "}
              {nextStation?.time || "10:10"}

            </p>

          </div>

        </div>


        {/* JOURNEY STATUS */}

        <div className="map-info-panel">

          <div className="map-panel-icon purple-panel-icon">

            <Train size={23} />

          </div>


          <div>

            <span>JOURNEY STATUS</span>

            <h3>
              On The Way
            </h3>

            <p>

              Currently travelling towards
              {" "}
              {nextStation?.name || "Panvel"}

            </p>

          </div>

        </div>


      </div>

    </div>

  );

}

export default LiveTrainMap;