import { useState } from "react";
import "./App.css";

function App() {
  // =========================
  // ETA PREDICTION STATES
  // =========================
  const [etaData, setEtaData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // =========================
  // FUTURE DELAY STATES
  // =========================
  const [futureDelayData, setFutureDelayData] = useState(null);
  const [futureDelayLoading, setFutureDelayLoading] = useState(false);
  const [futureDelayError, setFutureDelayError] = useState("");

  // =========================
  // ETA API
  // =========================
  const predictETA = async () => {
    setLoading(true);
    setError("");

    const requestData = {
      trainNumber: "12110",
      currentLocation: "Khopoli",
      routeDistance: 82,
      currentSpeed: 64,
      currentDelay: 15,
      previousDelay: 10,
      weatherFactor: 0,
      trafficFactor: 1,
      nextStation: "Panvel",
    };

    try {
      const response = await fetch(
        "http://localhost:8080/api/predict/eta",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestData),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to get ETA prediction");
      }

      const data = await response.json();

      console.log("ETA Response:", data);

      setEtaData(data);
    } catch (err) {
      console.error(err);

      setError(
        "Cannot connect to backend. Make sure Spring Boot is running on port 8080."
      );
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // FUTURE DELAY API
  // =========================
  const predictFutureDelay = async () => {
    setFutureDelayLoading(true);
    setFutureDelayError("");

    const requestData = {
      currentSpeed: 64,
      currentDelay: 15,
      previousDelay: 10,
      weatherFactor: 0,
      trafficFactor: 1,
    };

    try {
      const response = await fetch(
        "http://localhost:8080/api/predict/future-delay",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestData),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to get future delay prediction");
      }

      const data = await response.json();

      console.log("Future Delay Response:", data);

      setFutureDelayData(data);
    } catch (err) {
      console.error(err);

      setFutureDelayError(
        "Cannot connect to Future Delay service. Make sure backend is running."
      );
    } finally {
      setFutureDelayLoading(false);
    }
  };

  // =========================
  // TRAIN DATA
  // =========================
  const trains = [
    {
      number: "12110",
      name: "Deccan Queen",
      route: "Pune → Mumbai CST",
      delay: "15 min",
    },
    {
      number: "12951",
      name: "SBC Express",
      route: "Chennai → Bangalore",
      delay: "10 min",
    },
    {
      number: "22691",
      name: "Rajdhani Express",
      route: "Delhi → Jaipur",
      delay: "20 min",
    },
  ];

  const stations = [
    {
      name: "Pune Jn",
      time: "08:00",
      delay: "On Time",
      status: "green",
    },
    {
      name: "Lonavala",
      time: "08:43",
      delay: "+5 min",
      status: "orange",
    },
    {
      name: "Khopoli",
      time: "09:25",
      delay: "+15 min",
      status: "red",
    },
    {
      name: "Panvel",
      time: "10:10",
      delay: futureDelayData
        ? `+${futureDelayData.predictedFutureDelay} min`
        : "+15 min",
      status: "red",
    },
    {
      name: "Dadar",
      time: "10:58",
      delay: futureDelayData
        ? `+${futureDelayData.predictedFutureDelay + 3} min`
        : "+18 min",
      status: "red",
    },
    {
      name: "Mumbai CST",
      time: "11:38",
      delay: futureDelayData
        ? `+${futureDelayData.predictedFutureDelay + 3} min`
        : "+18 min",
      status: "red",
    },
  ];

  // =========================
  // HELPER FUNCTIONS
  // =========================
  const getDelayLevel = (delay) => {
    if (delay >= 15) return "High";
    if (delay >= 5) return "Moderate";
    return "Low";
  };

  const getDelayClass = (delay) => {
    if (delay >= 15) return "high";
    if (delay >= 5) return "moderate";
    return "low";
  };

  const predictedDelay =
    futureDelayData?.predictedFutureDelay;

  return (
    <div className="app">

      {/* ================= SIDEBAR ================= */}
      <aside className="sidebar">

        <div className="logo">
          <div className="logo-icon">🚆</div>

          <div>
            <h2>DynamicTrain AI</h2>
            <p>Smart ETA & Delay Prediction</p>
          </div>
        </div>

        <nav>
          <button className="nav-item active">
            🏠 <span>Home</span>
          </button>

          <button className="nav-item">
            🔍 <span>Search Train</span>
          </button>

          <button className="nav-item">
            🚆 <span>ETA Prediction</span>
          </button>

          <button className="nav-item">
            ⏳ <span>Future Delay</span>
          </button>

          <button className="nav-item">
            📍 <span>Live Train Map</span>
          </button>

          <button className="nav-item">
            📊 <span>Dashboard</span>
          </button>

          <button className="nav-item">
            🔔 <span>Alerts</span>
          </button>
        </nav>

        <div className="sidebar-info">
          <div className="ai-icon">🤖</div>

          <h3>AI-Powered Predictions</h3>

          <p>
            Smart train arrival and delay prediction using real-time data.
          </p>
        </div>

      </aside>

      {/* ================= MAIN CONTENT ================= */}
      <main className="main-content">

        {/* ================= HEADER ================= */}
        <header className="topbar">

          <button className="menu-btn">
            ☰
          </button>

          <div className="page-title">
            <h1>
              Dynamic <span>Train ETA</span> System
            </h1>

            <p>
              AI-Powered Real-Time Train Arrival & Delay Prediction
            </p>
          </div>

          <div className="system-status">
            <span className="online-dot">●</span>
            System Online
          </div>

          <div className="notification">
            🔔
          </div>

        </header>

        {/* ================= DASHBOARD ================= */}
        <section className="dashboard">

          {/* ================= SEARCH TRAIN ================= */}
          <div className="card search-card">

            <h3>🔎 Search & Select Train</h3>

            <p>
              Search your train to view live status
            </p>

            <div className="search-box">
              <input placeholder="Enter Train Number or Name" />

              <button>
                Search
              </button>
            </div>

            <h4>Popular Trains</h4>

            <div className="train-list">

              {trains.map((train) => (

                <div
                  className="train-item"
                  key={train.number}
                >

                  <div>
                    <strong>
                      {train.number}
                    </strong>

                    <p>
                      {train.name}
                    </p>
                  </div>

                  <div className="train-route">

                    <span>
                      {train.route}
                    </span>

                    <small>
                      {train.delay}
                    </small>

                  </div>

                  <span className="arrow">
                    ›
                  </span>

                </div>

              ))}

            </div>

          </div>

          {/* ================= JOURNEY ================= */}
          <div className="card journey-card">

            <div className="section-heading">

              <div>
                <h3>
                  🚆 Train Journey Overview
                </h3>

                <p>
                  12110 - Deccan Queen | Pune → Mumbai CST
                </p>
              </div>

              <span className="live-badge">
                ● LIVE
              </span>

            </div>

            <div className="journey-line">

              {stations.map((station, index) => (

                <div
                  className="station"
                  key={station.name}
                >

                  <div className="line-wrapper">

                    <div
                      className={`station-dot ${station.status}`}
                    >
                      {index === 2 ? "🚆" : ""}
                    </div>

                    {index < stations.length - 1 && (
                      <div className="route-line"></div>
                    )}

                  </div>

                  <strong>
                    {station.name}
                  </strong>

                  <span>
                    {station.time}
                  </span>

                  <small
                    className={station.status}
                  >
                    {station.delay}
                  </small>

                </div>

              ))}

            </div>

            <div className="stats-row">

              <div className="stat">
                <span>Total Delay</span>

                <strong className="danger">
                  +18 min
                </strong>
              </div>

              <div className="stat">
                <span>Current Delay</span>

                <strong className="warning">
                  +15 min
                </strong>
              </div>

              <div className="stat">
                <span>Avg. Speed</span>

                <strong>
                  64 km/h
                </strong>
              </div>

              <div className="stat">
                <span>Distance Covered</span>

                <strong>
                  110 / 192 km
                </strong>
              </div>

              <div className="stat">
                <span>Expected Arrival</span>

                <strong className="primary">
                  {etaData
                    ? etaData.predictedETA
                    : "11:38 AM"}
                </strong>
              </div>

            </div>

          </div>

          {/* ================= FUTURE DELAY ================= */}
          <div className="card future-card">

            <h3>
              ⏳ Future Delay Prediction
            </h3>

            <p>
              Upcoming delay at next stations
            </p>

            {/* PANVEL */}
            <div className="future-station">

              <div>
                <strong>Panvel</strong>
                <span>10:10 AM</span>
              </div>

              <b className="warning">
                +
                {predictedDelay ?? 15}
                {" "}min
              </b>

              <small
                className={getDelayClass(
                  predictedDelay ?? 15
                )}
              >
                {getDelayLevel(
                  predictedDelay ?? 15
                )}
              </small>

            </div>

            {/* DADAR */}
            <div className="future-station">

              <div>
                <strong>Dadar</strong>
                <span>10:58 AM</span>
              </div>

              <b className="danger">
                +
                {predictedDelay
                  ? predictedDelay + 3
                  : 18}
                {" "}min
              </b>

              <small className="high">
                High
              </small>

            </div>

            {/* MUMBAI */}
            <div className="future-station">

              <div>
                <strong>Mumbai CST</strong>
                <span>11:38 AM</span>
              </div>

              <b className="danger">
                +
                {predictedDelay
                  ? predictedDelay + 3
                  : 18}
                {" "}min
              </b>

              <small className="high">
                High
              </small>

            </div>

            <button
              className="predict-btn"
              onClick={predictFutureDelay}
              disabled={futureDelayLoading}
            >

              {futureDelayLoading
                ? "Predicting..."
                : "🔮 Predict Future Delay"}

            </button>

            {futureDelayData && (

              <div className="api-result">

                <p>
                  <strong>
                    AI Predicted Future Delay:
                  </strong>

                  {" "}
                  +{futureDelayData.predictedFutureDelay} min
                </p>

              </div>

            )}

            {futureDelayError && (

              <p className="error-message">
                {futureDelayError}
              </p>

            )}

          </div>

          {/* ================= LIVE MAP ================= */}
          <div className="card map-card">

            <h3>
              📍 Live Train Map
            </h3>

            <p>
              Real-time location of train on route
            </p>

            <div className="map-placeholder">

              <div className="map-route">

                <span className="map-point">
                  Pune
                </span>

                <div className="map-line"></div>

                <span className="train-marker">
                  🚆
                </span>

                <div className="map-line orange-line"></div>

                <span className="map-point">
                  Panvel
                </span>

                <div className="map-line red-line"></div>

                <span className="map-point">
                  Mumbai
                </span>

              </div>

              <p>
                Live map will be connected here.
              </p>

            </div>

          </div>

          {/* ================= ETA PREDICTION ================= */}
          <div className="card eta-card">

            <h3>
              ⏰ ETA Prediction
            </h3>

            <p>
              AI-powered estimated arrival
            </p>

            <div className="eta-main">

              <span>
                Estimated Arrival
              </span>

              <h2>
                {etaData
                  ? etaData.predictedETA
                  : "Not Predicted"}
              </h2>

              <p>
                {etaData
                  ? etaData.nextStation
                  : "Select a train"}
              </p>

            </div>

            <div className="eta-details">

              <div>
                <span>Current Location</span>

                <strong>
                  {etaData
                    ? etaData.currentLocation
                    : "Khopoli"}
                </strong>
              </div>

              <div>
                <span>Next Station</span>

                <strong>
                  {etaData
                    ? etaData.nextStation
                    : "Panvel"}
                </strong>
              </div>

              <div>
                <span>Confidence</span>

                <strong className="success">

                  {etaData
                    ? `${etaData.confidenceScore}%`
                    : "--"}

                </strong>

              </div>

            </div>

            <button
              className="predict-btn"
              onClick={predictETA}
              disabled={loading}
            >

              {loading
                ? "Predicting..."
                : "Predict ETA"}

            </button>

            {etaData && (

              <div className="api-result">

                <p>
                  <strong>
                    Future Delay:
                  </strong>

                  {" "}
                  {etaData.futureDelay} min
                </p>

                <p>
                  <strong>
                    Total ETA:
                  </strong>

                  {" "}
                  {etaData.etaMinutes} min
                </p>

                <p>
                  <strong>
                    Alert:
                  </strong>

                  {" "}
                  {etaData.delayAlert}
                </p>

              </div>

            )}

            {error && (

              <p className="error-message">
                {error}
              </p>

            )}

          </div>

          {/* ================= ALERTS ================= */}
          <div className="card alerts-card">

            <h3>
              🔔 Recent Alerts
            </h3>

            <div className="alert danger-alert">

              <strong>
                High Delay Expected
              </strong>

              <p>
                Train 12110 may arrive 18 minutes late.
              </p>

            </div>

            <div className="alert warning-alert">

              <strong>
                Traffic Congestion
              </strong>

              <p>
                Heavy railway traffic between Panvel and Dadar.
              </p>

            </div>

            <div className="alert info-alert">

              <strong>
                Weather Update
              </strong>

              <p>
                Current weather conditions are stable.
              </p>

            </div>

          </div>

        </section>

      </main>

    </div>
  );
}

export default App;