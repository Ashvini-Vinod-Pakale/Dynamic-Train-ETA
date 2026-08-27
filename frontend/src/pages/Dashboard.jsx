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
  stations,
  setActivePage,
}) {

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
     SPEED CHART DATA
  ========================================= */

  const speedData = [
    { time: "08:00", actual: 62, predicted: 64 },
    { time: "08:30", actual: 72, predicted: 68 },
    { time: "09:00", actual: 70, predicted: 69 },
    { time: "09:30", actual: 65, predicted: 67 },
    { time: "10:00", actual: 71, predicted: 69 },
    { time: "10:30", actual: 66, predicted: 65 },
    { time: "11:00", actual: 74, predicted: 70 },
    { time: "11:30", actual: 69, predicted: 68 },
  ];


  /* =========================================
     DELAY TREND DATA
  ========================================= */

  const delayData = [
    { time: "08:00", delay: 0 },
    { time: "08:30", delay: 5 },
    { time: "09:00", delay: 4 },
    { time: "09:30", delay: 6 },
    { time: "10:00", delay: 8 },
    { time: "10:30", delay: 12 },
    { time: "11:00", delay: 15 },
    { time: "11:30", delay: totalDelay },
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

        <span>TRAIN INTELLIGENCE</span>

        <h1>
          Live Analytics Dashboard
        </h1>

        <p>
          Real-time route progress, AI prediction,
          train speed and delay analysis.
        </p>

      </div>


      {/* =====================================
          MAIN DASHBOARD GRID
      ===================================== */}

      <div className="analytics-dashboard-grid">


        {/* =================================
            LEFT - ROUTE PROGRESS
        ================================= */}

        <div className="analytics-card route-progress-card">


          <div className="analytics-card-header">

            <Route size={19} />

            <div>

              <span>ROUTE & PROGRESS</span>

              <h3>
                Pune → Mumbai CST
              </h3>

            </div>

          </div>


          <div className="analytics-route-list">

            {stations.map((station, index) => (

              <div
                className="analytics-station"
                key={station.name}
              >


                {/* TIMELINE */}

                <div className="analytics-timeline">


                  <div
                    className={`analytics-dot ${station.status}`}
                  >

                    {station.status === "completed" && (
                      <Check size={12} />
                    )}

                    {station.status === "current" && (
                      <Train size={13} />
                    )}

                    {station.status === "upcoming" && (
                      <Circle size={8} />
                    )}

                  </div>


                  {index <
                    stations.length - 1 && (

                    <div
                      className={`analytics-line ${
                        station.status === "completed"
                          ? "completed-line"
                          : ""
                      }`}
                    />

                  )}

                </div>


                {/* STATION INFO */}

                <div className="analytics-station-info">

                  <strong>
                    {station.name}
                  </strong>

                  <span>
                    {station.time}
                  </span>


                  {station.status === "current" && (

                    <small className="current-station-label">
                      Current Location
                    </small>

                  )}


                  {station.status === "upcoming" &&
                    index ===
                      stations.findIndex(
                        station =>
                          station.status === "upcoming"
                      ) && (

                    <small className="next-station-label">
                      Next Station
                    </small>

                  )}

                </div>


                {/* DELAY */}

                <div className="analytics-station-delay">

                  {station.delay}

                </div>


              </div>

            ))}

          </div>


          <div className="route-footer">

            <span>
              🚆 Train 12110
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



        {/* =================================
            MIDDLE - AI PREDICTION
        ================================= */}

        <div className="analytics-card ai-prediction-card">


          <div className="analytics-card-header">

            <BrainCircuit size={20} />

            <div>

              <span>AI PREDICTION</span>

              <h3>
                Arrival Analysis
              </h3>

            </div>

          </div>


          {/* PREDICTED ETA */}

          <div className="prediction-stat">

            <span>
              Predicted ETA
            </span>

            <strong className="prediction-time">

              {predictedETA}

            </strong>

          </div>


          {/* SCHEDULED */}

          <div className="prediction-stat">

            <span>
              Scheduled ETA
            </span>

            <strong>

              {scheduledArrival}

            </strong>

          </div>


          {/* DELAY */}

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

                  width:
                    `${confidenceScore}%`

                }}
              />

            </div>

          </div>


          {/* AI FACTORS */}

          <div className="prediction-factors">

            <span>
              Factors Considered
            </span>


            <ul>

              <li>
                <Train size={14} />
                Historical movement data
              </li>

              <li>
                <Route size={14} />
                Route congestion
              </li>

              <li>
                <Clock3 size={14} />
                Previous station delay
              </li>

              <li>
                <CloudSun size={14} />
                Weather conditions
              </li>

              <li>
                <Signal size={14} />
                Signal & track conditions
              </li>

            </ul>

          </div>


          <button
            className="dashboard-prediction-button"
            onClick={() =>
              setActivePage("eta")
            }
          >

            <BrainCircuit size={16} />

            View Prediction Details

          </button>


        </div>



        {/* =================================
            RIGHT - CHARTS
        ================================= */}

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

                <LineChart
                  data={speedData}
                >

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

                <LineChart
                  data={delayData}
                >

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

    </div>

  );

}

export default Dashboard;