import { useEffect, useState } from "react";

import { checkBackendHealth } from "../services/api";

import {
  Train,
  Check,
  Circle,
  BrainCircuit,
  Clock3,
  CloudSun,
  Route,
  Signal,
  MapPin,
  X,
  Activity,
} from "lucide-react";

import {
  LineChart,
  Line,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

function Dashboard({
  etaData,
  predictedDelay,
  stations = [],
  stationPredictions = [],
  setActivePage,
  selectedTrain,
}) {

  /* =========================================
     POPUP STATE
  ========================================= */

  const [
    showPredictionDetails,
    setShowPredictionDetails,
  ] = useState(false);


  /* =========================================
     BACKEND STATUS
  ========================================= */

  const [
    backendStatus,
    setBackendStatus,
  ] = useState("Checking backend...");


  useEffect(() => {

    const checkBackend = async () => {

      try {

        const result =
          await checkBackendHealth();

        setBackendStatus(result);

      } catch (error) {

        setBackendStatus(
          "Backend Offline"
        );

      }

    };

    checkBackend();

  }, []);


  /* =========================================
     SELECTED TRAIN DATA
  ========================================= */

  const trainNumber =
    selectedTrain?.number || "12110";

  const trainName =
    selectedTrain?.name || "Deccan Queen";

  const trainRoute =
    selectedTrain?.route ||
    "Pune → Mumbai CST";


  /* =========================================
     DEFAULT VALUES
  ========================================= */

  const predictedETA =
    etaData?.predictedETA || "11:56 AM";

  const scheduledArrival =
    etaData?.scheduledArrival || "11:38 AM";

  const totalDelay =
    etaData?.totalDelay ??
    predictedDelay ??
    18;

  const confidenceScore =
    etaData?.confidenceScore || 91;


  /* =========================================
     CURRENT & NEXT STATION
  ========================================= */

  const currentStation =
    stations.find(
      (station) =>
        station.status === "current"
    ) || stations[0];

  const nextStation =
    stations.find(
      (station) =>
        station.status === "upcoming"
    ) || stations[0];


  /* =========================================
     SPEED CHART DATA
  ========================================= */

  const speedData = [
    {
      time: "08:00",
      actual: 62,
      predicted: 64,
    },
    {
      time: "08:30",
      actual: 72,
      predicted: 68,
    },
    {
      time: "09:00",
      actual: 70,
      predicted: 69,
    },
    {
      time: "09:30",
      actual: 65,
      predicted: 67,
    },
    {
      time: "10:00",
      actual: 71,
      predicted: 69,
    },
    {
      time: "10:30",
      actual: 66,
      predicted: 65,
    },
    {
      time: "11:00",
      actual: 74,
      predicted: 70,
    },
    {
      time: "11:30",
      actual: 69,
      predicted: 68,
    },
  ];


  /* =========================================
     DELAY TREND DATA
  ========================================= */

  const delayData = [
    {
      time: "08:00",
      delay: 0,
    },
    {
      time: "08:30",
      delay: 5,
    },
    {
      time: "09:00",
      delay: 4,
    },
    {
      time: "09:30",
      delay: 6,
    },
    {
      time: "10:00",
      delay: 8,
    },
    {
      time: "10:30",
      delay: 12,
    },
    {
      time: "11:00",
      delay: 15,
    },
    {
      time: "11:30",
      delay: totalDelay,
    },
  ];


  /* =========================================
     DELAY COLOR
  ========================================= */

  const getDelayColor = () => {

    if (totalDelay <= 5) {
      return "low";
    }

    if (totalDelay <= 15) {
      return "medium";
    }

    return "high";

  };


  return (

    <div className="page-animation dashboard-page">


      {/* =====================================
          PAGE HEADING
      ===================================== */}

      <div className="page-heading dashboard-heading">

        <span>
          TRAIN INTELLIGENCE
        </span>

        <h1>
          Live Analytics Dashboard
        </h1>

        <p>
          Real-time route progress, AI prediction,
          train speed and delay analysis.
        </p>

        {/* TEMPORARY BACKEND CONNECTION TEST */}

        <p
          style={{
            marginTop: "10px",
            fontSize: "14px",
            fontWeight: "600",
          }}
        >
          Backend Status: {backendStatus}
        </p>

      </div>


      {/* =====================================
          MAIN DASHBOARD GRID
      ===================================== */}

      <div className="analytics-dashboard-grid">


        {/* ROUTE PROGRESS */}

        <div className="analytics-card route-progress-card">

          <div className="analytics-card-header">

            <Route size={19} />

            <div>

              <span>
                ROUTE & PROGRESS
              </span>

              <h3>
                {trainRoute}
              </h3>

            </div>

          </div>


          <div className="analytics-route-list">

            {stations.map(
              (station, index) => (

                <div
                  className="analytics-station"
                  key={station.name}
                >

                  <div className="analytics-timeline">

                    <div
                      className={`analytics-dot ${station.status}`}
                    >

                      {station.status ===
                        "completed" && (
                        <Check size={12} />
                      )}

                      {station.status ===
                        "current" && (
                        <Train size={13} />
                      )}

                      {station.status ===
                        "upcoming" && (
                        <Circle size={8} />
                      )}

                    </div>


                    {index <
                      stations.length - 1 && (

                      <div
                        className={`analytics-line ${
                          station.status ===
                          "completed"
                            ? "completed-line"
                            : ""
                        }`}
                      />

                    )}

                  </div>


                  <div className="analytics-station-info">

                    <strong>
                      {station.name}
                    </strong>

                    <span>
                      {station.time}
                    </span>


                    {station.status ===
                      "current" && (

                      <small className="current-station-label">
                        Current Location
                      </small>

                    )}


                    {station.status ===
                      "upcoming" &&
                      index ===
                      stations.findIndex(
                        (item) =>
                          item.status ===
                          "upcoming"
                      ) && (

                        <small className="next-station-label">
                          Next Station
                        </small>

                      )}

                  </div>


                  <div className="analytics-station-delay">

                    {station.delay}

                  </div>

                </div>

              )
            )}

          </div>


          <div className="route-footer">

            <span>
              🚆 Train {trainNumber}
            </span>

            <button
              onClick={() =>
                setActivePage("map")
              }
            >

              View Live Map

            </button>

          </div>

        </div>


        {/* AI PREDICTION */}

        <div className="analytics-card ai-prediction-card">

          <div className="analytics-card-header">

            <BrainCircuit size={20} />

            <div>

              <span>
                AI PREDICTION
              </span>

              <h3>
                Arrival Analysis
              </h3>

            </div>

          </div>


          <div className="prediction-stat">

            <span>
              Predicted ETA
            </span>

            <strong className="prediction-time">

              {predictedETA}

            </strong>

          </div>


          <div className="prediction-stat">

            <span>
              Scheduled ETA
            </span>

            <strong>

              {scheduledArrival}

            </strong>

          </div>


          <div className="prediction-stat">

            <span>
              Expected Delay
            </span>

            <strong
              className={`delay-value ${getDelayColor()}`}
            >

              +{totalDelay} min

            </strong>

          </div>


          {/* CONFIDENCE */}

          <div className="confidence-section">

            <div className="confidence-header">

              <span>
                Confidence Score
              </span>

              <strong>

                {confidenceScore}%

              </strong>

            </div>


            <div className="confidence-bar">

              <div
                className="confidence-progress"
                style={{
                  width: `${confidenceScore}%`,
                }}
              />

            </div>

          </div>


          {/* AI INPUTS */}

          <div className="prediction-factors">

            <span className="prediction-factors-title">

              AI INPUTS ANALYZED

            </span>


            <div className="prediction-input-grid">

              <div className="prediction-input-item">

                <MapPin size={13} />

                <span>
                  Live GPS Location
                </span>

              </div>


              <div className="prediction-input-item">

                <Train size={13} />

                <span>
                  Current Train Speed
                </span>

              </div>


              <div className="prediction-input-item">

                <Activity size={13} />

                <span>
                  Historical Delay Pattern
                </span>

              </div>


              <div className="prediction-input-item">

                <Clock3 size={13} />

                <span>
                  Previous Station Delay
                </span>

              </div>


              <div className="prediction-input-item">

                <Route size={13} />

                <span>
                  Route & Track Congestion
                </span>

              </div>


              <div className="prediction-input-item">

                <Signal size={13} />

                <span>
                  Signal Conditions
                </span>

              </div>


              <div className="prediction-input-item">

                <CloudSun size={13} />

                <span>
                  Weather Conditions
                </span>

              </div>


              <div className="prediction-input-item">

                <Clock3 size={13} />

                <span>
                  Sectional Running Time
                </span>

              </div>

            </div>

          </div>


          <button
            className="dashboard-prediction-button"
            onClick={() =>
              setShowPredictionDetails(true)
            }
          >

            <BrainCircuit size={16} />

            View Prediction Details

          </button>

        </div>


        {/* CHARTS */}

        <div className="analytics-charts-column">


          {/* SPEED CHART */}

          <div className="analytics-card chart-card">

            <div className="chart-header">

              <div>

                <span>
                  SPEED CHART
                </span>

                <h3>
                  Speed (km/h)
                </h3>

              </div>


              <div className="chart-legend">

                <span className="actual-speed">
                  Actual Speed
                </span>

                <span className="predicted-speed">
                  Predicted Speed
                </span>

              </div>

            </div>


            <div className="chart-container">

              <ResponsiveContainer
                width="100%"
                height={190}
              >

                <LineChart data={speedData}>

                  <XAxis
                    dataKey="time"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                  />

                  <YAxis
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                  />

                  <Tooltip />

                  <Line
                    type="monotone"
                    dataKey="actual"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={false}
                  />

                  <Line
                    type="monotone"
                    dataKey="predicted"
                    stroke="#22c55e"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                  />

                </LineChart>

              </ResponsiveContainer>

            </div>

          </div>


          {/* DELAY TREND */}

          <div className="analytics-card chart-card">

            <div className="chart-header">

              <div>

                <span>
                  DELAY TREND
                </span>

                <h3>
                  Delay (min)
                </h3>

              </div>

            </div>


            <div className="chart-container">

              <ResponsiveContainer
                width="100%"
                height={190}
              >

                <LineChart data={delayData}>

                  <XAxis
                    dataKey="time"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                  />

                  <YAxis
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                  />

                  <Tooltip />

                  <Line
                    type="monotone"
                    dataKey="delay"
                    stroke="#ef4444"
                    strokeWidth={2}
                    dot={false}
                  />

                </LineChart>

              </ResponsiveContainer>

            </div>

          </div>

        </div>

      </div>


      {/* =====================================
          STATION-WISE AI PREDICTION
      ===================================== */}

      <div className="station-prediction-section">

        <div className="station-prediction-header">

          <div>

            <span>
              AI STATION-WISE PREDICTION
            </span>

            <h2>
              Predicted Arrival at Upcoming Stations
            </h2>

            <p>
              AI-based ETA and delay prediction
              for each remaining station.
            </p>

          </div>

          <BrainCircuit size={28} />

        </div>


        <div className="station-prediction-grid">

          {stationPredictions.length > 0 ? (

            stationPredictions.map(
              (prediction, index) => (

                <div
                  className="station-prediction-card"
                  key={
                    prediction.station ||
                    index
                  }
                >

                  <div className="station-prediction-card-top">

                    <div className="station-prediction-number">

                      {index + 1}

                    </div>


                    <div>

                      <span>
                        UPCOMING STATION
                      </span>

                      <h3>
                        {prediction.station}
                      </h3>

                    </div>

                  </div>


                  <div className="station-prediction-details">

                    <div>

                      <span>
                        Scheduled Arrival
                      </span>

                      <strong>

                        {prediction.scheduledTime}

                      </strong>

                    </div>


                    <div>

                      <span>
                        Predicted ETA
                      </span>

                      <strong className="station-predicted-eta">

                        {prediction.predictedETA}

                      </strong>

                    </div>


                    <div>

                      <span>
                        Predicted Delay
                      </span>

                      <strong
                        className={
                          prediction.predictedDelay <= 5
                            ? "low"
                            : prediction.predictedDelay <= 15
                              ? "medium"
                              : "high"
                        }
                      >

                        +{prediction.predictedDelay} min

                      </strong>

                    </div>

                  </div>


                  <div className="station-ai-footer">

                    <BrainCircuit size={14} />

                    AI prediction based on
                    live train conditions

                  </div>

                </div>

              )
            )

          ) : (

            <div className="station-prediction-empty">

              <BrainCircuit size={25} />

              <p>
                Station-wise predictions
                will appear here.
              </p>

            </div>

          )}

        </div>

      </div>


      {/* =====================================
          PREDICTION DETAILS POPUP
      ===================================== */}

      {showPredictionDetails && (

        <div
          className="prediction-modal-overlay"
          onClick={() =>
            setShowPredictionDetails(false)
          }
        >

          <div
            className="prediction-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <button
              className="prediction-modal-close"
              onClick={() =>
                setShowPredictionDetails(false)
              }
            >

              <X size={20} />

            </button>


            <div className="prediction-modal-header">

              <div className="prediction-modal-icon">

                <BrainCircuit size={26} />

              </div>


              <div>

                <span>
                  AI PREDICTION DETAILS
                </span>

                <h2>
                  Train Arrival Analysis
                </h2>

              </div>

            </div>


            <div className="prediction-details-grid">


              <div className="prediction-detail-item">

                <Train size={18} />

                <div>

                  <span>
                    Train
                  </span>

                  <strong>

                    {trainNumber} - {trainName}

                  </strong>

                </div>

              </div>


              <div className="prediction-detail-item">

                <MapPin size={18} />

                <div>

                  <span>
                    Current Location
                  </span>

                  <strong>

                    {currentStation?.name || "Khopoli"}

                  </strong>

                </div>

              </div>


              <div className="prediction-detail-item">

                <Route size={18} />

                <div>

                  <span>
                    Next Station
                  </span>

                  <strong>

                    {etaData?.nextStation ||
                      nextStation?.name ||
                      "Panvel"}

                  </strong>

                </div>

              </div>


              <div className="prediction-detail-item">

                <Clock3 size={18} />

                <div>

                  <span>
                    Current Delay
                  </span>

                  <strong>

                    +{etaData?.currentDelay ?? 15} min

                  </strong>

                </div>

              </div>


              <div className="prediction-detail-item">

                <BrainCircuit size={18} />

                <div>

                  <span>
                    Predicted Future Delay
                  </span>

                  <strong>

                    +{predictedDelay ?? 3} min

                  </strong>

                </div>

              </div>


              <div className="prediction-detail-item">

                <Signal size={18} />

                <div>

                  <span>
                    Confidence Score
                  </span>

                  <strong>

                    {confidenceScore}%

                  </strong>

                </div>

              </div>

            </div>


            <div className="prediction-final-result">

              <span>
                AI PREDICTED ARRIVAL
              </span>

              <strong>

                {predictedETA}

              </strong>

              <p>

                Scheduled Arrival:
                {" "}
                {scheduledArrival}

              </p>


              <div
                className={`prediction-result-delay ${getDelayColor()}`}
              >

                Expected total delay:
                {" "}
                +{totalDelay} min

              </div>

            </div>


            <button
              className="prediction-modal-done"
              onClick={() =>
                setShowPredictionDetails(false)
              }
            >

              Close Details

            </button>

          </div>

        </div>

      )}

    </div>

  );

}

export default Dashboard;