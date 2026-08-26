import { useState } from "react";
import {
  LayoutDashboard,
  Search,
  Clock3,
  BrainCircuit,
  MapPinned,
  Bell,
  Train,
  Menu,
  ChevronRight,
  Navigation,
  Activity,
  Route,
  Gauge,
  CircleAlert,
  CheckCircle2,
  CloudSun,
  Signal,
} from "lucide-react";

import "./App.css";

function App() {
  const [activePage, setActivePage] = useState("home");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

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
  // TRAIN DATA
  // =========================
  const trains = [
    {
      number: "12110",
      name: "Deccan Queen",
      route: "Pune → Mumbai CST",
      delay: "15 min delay",
      status: "Delayed",
    },
    {
      number: "12951",
      name: "SBC Express",
      route: "Chennai → Bangalore",
      delay: "10 min delay",
      status: "Delayed",
    },
    {
      number: "22691",
      name: "Rajdhani Express",
      route: "Delhi → Jaipur",
      delay: "On time",
      status: "On Time",
    },
  ];

    // =========================
    // STATION DATA
    // =========================
    const predictedDelay =
      futureDelayData?.predictedFutureDelay;

    const stations = [
      {
        name: "Pune Jn",
        time: "08:00",
        delay: "On Time",
        status: "completed",
      },
      {
        name: "Lonavala",
        time: "08:43",
        delay: "+5 min",
        status: "completed",
      },
      {
        name: "Khopoli",
        time: "09:25",
        delay: "+15 min",
        status: "current",
      },
      {
        name: "Panvel",
        time: "10:10",
        delay: predictedDelay
          ? `+${predictedDelay} min`
          : "+15 min",
        status: "upcoming",
      },
      {
        name: "Dadar",
        time: "10:58",
        delay: predictedDelay
          ? `+${predictedDelay + 3} min`
          : "+18 min",
        status: "upcoming",
      },
      {
        name: "Mumbai CST",
        time: "11:38",
        delay: predictedDelay
          ? `+${predictedDelay + 3} min`
          : "+18 min",
        status: "upcoming",
      },
    ];

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
  // HELPERS
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

  // =========================
  // NAVIGATION
  // =========================
  const navItems = [
    {
      id: "home",
      label: "Home",
      icon: LayoutDashboard,
    },
    {
      id: "search",
      label: "Search Train",
      icon: Search,
    },
    {
      id: "eta",
      label: "ETA Prediction",
      icon: Clock3,
    },
    {
      id: "future",
      label: "Future Delay",
      icon: BrainCircuit,
    },
    {
      id: "map",
      label: "Live Train Map",
      icon: MapPinned,
    },
    {
      id: "dashboard",
      label: "Dashboard",
      icon: Activity,
    },
    {
      id: "alerts",
      label: "Alerts",
      icon: Bell,
    },
  ];

  const selectTrain = (train) => {
    setSearchQuery(`${train.number} - ${train.name}`);
    setActivePage("dashboard");
  };

  // =========================
  // HOME PAGE
  // =========================
  const renderHome = () => (
    <div className="page-animation">

      <section className="hero-section">
        <div className="hero-content">

          <div className="hero-badge">
            <Activity size={15} />
            AI-Powered Railway Intelligence
          </div>

          <h1>
            Predict Every Journey
            <span> Before It Happens.</span>
          </h1>

          <p>
            Dynamic Train ETA uses intelligent prediction to estimate
            arrival times, analyze delays, and track train journeys
            in real time.
          </p>

          <div className="hero-actions">
            <button
              className="primary-btn"
              onClick={() => setActivePage("search")}
            >
              <Search size={18} />
              Search Train
            </button>

            <button
              className="secondary-btn"
              onClick={() => setActivePage("dashboard")}
            >
              View Live Dashboard
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="hero-stats">
            <div>
              <strong>24/7</strong>
              <span>Live Monitoring</span>
            </div>

            <div>
              <strong>AI</strong>
              <span>Delay Prediction</span>
            </div>

            <div>
              <strong>99%</strong>
              <span>System Availability</span>
            </div>
          </div>

        </div>

        <div className="hero-visual">

          <div className="railway-image"></div>

          <div className="image-overlay"></div>
          <div className="train-motion-effect"></div>

          <div className="speed-lines">
            <span></span>
            <span></span>
            <span></span>
          </div>

          <div className="hero-train-content">

            <div className="tracking-label">
              CURRENTLY TRACKING
            </div>

            <h3>12110</h3>

            <h2>Deccan Queen</h2>

            <p>Pune → Mumbai CST</p>

          </div>

          <div className="live-status">
            <span></span>
            LIVE
          </div>

          <div className="train-card-footer">

            <div>
              <span>Current Speed</span>
              <strong>64 km/h</strong>
            </div>

            <div>
              <span>Current Delay</span>
              <strong className="orange-text">+15 min</strong>
            </div>

            <div>
              <span>Confidence</span>
              <strong className="green-text">
                {etaData
                  ? `${etaData.confidenceScore}%`
                  : "92%"}
              </strong>
            </div>

          </div>

        </div>
      </section>

      <section className="home-section">

        <div className="section-title">
          <div>
            <span>LIVE NETWORK</span>
            <h2>Popular Train Tracking</h2>
          </div>

          <button onClick={() => setActivePage("search")}>
            View All <ChevronRight size={17} />
          </button>
        </div>

        <div className="popular-trains-grid">

          {trains.map((train, index) => (
            <div
              className="popular-train-card"
              key={train.number}
              style={{ animationDelay: `${index * 0.1}s` }}
              onClick={() => selectTrain(train)}
            >

              <div className="train-card-header">
                <div className="train-number-icon">
                  <Train size={21} />
                </div>

                <span
                  className={
                    train.status === "On Time"
                      ? "status-green"
                      : "status-orange"
                  }
                >
                  {train.status}
                </span>
              </div>

              <h3>{train.number}</h3>
              <h4>{train.name}</h4>

              <p>{train.route}</p>

              <div className="train-card-bottom">
                <span>{train.delay}</span>

                <ChevronRight size={19} />
              </div>

            </div>
          ))}

        </div>

      </section>

      <section className="insight-grid">

        <div className="insight-card blue-card">
          <div className="insight-icon">
            <Navigation size={25} />
          </div>

          <div>
            <span>ACTIVE TRAINS</span>
            <h3>1,248</h3>
            <p>Being monitored across the network</p>
          </div>
        </div>

        <div className="insight-card orange-card">
          <div className="insight-icon">
            <Clock3 size={25} />
          </div>

          <div>
            <span>AVERAGE DELAY</span>
            <h3>8.4 min</h3>
            <p>Based on current railway conditions</p>
          </div>
        </div>

        <div className="insight-card green-card">
          <div className="insight-icon">
            <BrainCircuit size={25} />
          </div>

          <div>
            <span>PREDICTION CONFIDENCE</span>
            <h3>94.6%</h3>
            <p>AI model prediction confidence</p>
          </div>
        </div>

      </section>

    </div>
  );

  // =========================
  // SEARCH PAGE
  // =========================
  const renderSearch = () => {
    const filteredTrains = trains.filter((train) =>
      `${train.number} ${train.name}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase())
    );

    return (
      <div className="page-animation page-container">

        <div className="page-heading">
          <span>TRAIN SEARCH</span>
          <h1>Find Your Train</h1>
          <p>
            Search by train number or train name to access
            live journey and prediction data.
          </p>
        </div>

        <div className="search-page-box">
          <Search size={23} />

          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Enter train number or train name..."
          />

          <button
            className="primary-btn"
            onClick={() => { }}
          >
            Search Train
          </button>
        </div>

        <div className="search-results">

          {filteredTrains.map((train) => (
            <div
              className="search-result-card"
              key={train.number}
            >

              <div className="result-train-icon">
                <Train size={30} />
              </div>

              <div className="result-info">
                <h3>
                  {train.number} - {train.name}
                </h3>

                <p>{train.route}</p>
              </div>

              <div className="result-delay">
                <span>Current Status</span>

                <strong
                  className={
                    train.status === "On Time"
                      ? "green-text"
                      : "orange-text"
                  }
                >
                  {train.delay}
                </strong>
              </div>

              <button
                className="view-btn"
                onClick={() => selectTrain(train)}
              >
                Track Train
                <ChevronRight size={17} />
              </button>

            </div>
          ))}

        </div>

      </div>
    );
  };

  // =========================
  // ETA PAGE
  // =========================
  const renderETA = () => (
    <div className="page-animation page-container">

      <div className="page-heading">
        <span>AI ETA ENGINE</span>
        <h1>Estimated Time of Arrival</h1>

        <p>
          Predict dynamic arrival time based on train speed,
          current delay, weather, and traffic conditions.
        </p>
      </div>

      <div className="prediction-layout">

        <div className="prediction-info-card">

          <div className="prediction-card-header">
            <div className="gradient-icon blue-gradient">
              <Clock3 size={28} />
            </div>

            <div>
              <span>SELECTED TRAIN</span>
              <h3>12110 - Deccan Queen</h3>
            </div>
          </div>

          <div className="prediction-input-summary">

            <div>
              <span>Current Location</span>
              <strong>Khopoli</strong>
            </div>

            <div>
              <span>Next Station</span>
              <strong>Panvel</strong>
            </div>

            <div>
              <span>Current Speed</span>
              <strong>64 km/h</strong>
            </div>

            <div>
              <span>Current Delay</span>
              <strong className="orange-text">15 min</strong>
            </div>

          </div>

          <button
            className="prediction-button"
            onClick={predictETA}
            disabled={loading}
          >
            <BrainCircuit size={20} />

            {loading
              ? "Analyzing Train Data..."
              : "Generate ETA Prediction"}
          </button>

          {error && (
            <div className="error-box">
              <CircleAlert size={18} />
              {error}
            </div>
          )}

        </div>

        <div className="prediction-result-card">

          <span className="result-label">
            PREDICTED ARRIVAL
          </span>

          <div className="eta-result-time">
            {etaData
              ? etaData.predictedETA
              : "--:--"}
          </div>

          <p>
            {etaData
              ? `Expected arrival at ${etaData.nextStation}`
              : "Run prediction to calculate ETA"}
          </p>

          <div className="result-metrics">

            <div>
              <span>Future Delay</span>
              <strong>
                {etaData
                  ? `${etaData.futureDelay} min`
                  : "--"}
              </strong>
            </div>

            <div>
              <span>Total Journey ETA</span>
              <strong>
                {etaData
                  ? `${etaData.etaMinutes} min`
                  : "--"}
              </strong>
            </div>

            <div>
              <span>Confidence Score</span>
              <strong className="green-text">
                {etaData
                  ? `${etaData.confidenceScore}%`
                  : "--"}
              </strong>
            </div>

          </div>

          {etaData && (
            <div className="prediction-alert">
              <CircleAlert size={18} />
              {etaData.delayAlert}
            </div>
          )}

        </div>

      </div>

    </div>
  );

  // =========================
  // FUTURE DELAY PAGE
  // =========================
  const renderFutureDelay = () => (
    <div className="page-animation page-container">

      <div className="page-heading">
        <span>AI DELAY FORECAST</span>
        <h1>Future Delay Prediction</h1>

        <p>
          Analyze upcoming railway conditions and predict
          possible delays at future stations.
        </p>
      </div>

      <div className="future-page-grid">

        <div className="future-main-card">

          <div className="prediction-card-header">
            <div className="gradient-icon purple-gradient">
              <BrainCircuit size={28} />
            </div>

            <div>
              <span>AI PREDICTION MODEL</span>
              <h3>Future Railway Delay Analysis</h3>
            </div>
          </div>

          <div className="delay-input-grid">

            <div className="input-stat">
              <Gauge size={20} />
              <span>Current Speed</span>
              <strong>64 km/h</strong>
            </div>

            <div className="input-stat">
              <Clock3 size={20} />
              <span>Current Delay</span>
              <strong>15 min</strong>
            </div>

            <div className="input-stat">
              <CloudSun size={20} />
              <span>Weather</span>
              <strong>Stable</strong>
            </div>

            <div className="input-stat">
              <Route size={20} />
              <span>Traffic</span>
              <strong>Moderate</strong>
            </div>

          </div>

          <button
            className="prediction-button purple-button"
            onClick={predictFutureDelay}
            disabled={futureDelayLoading}
          >
            <BrainCircuit size={20} />

            {futureDelayLoading
              ? "AI Is Predicting..."
              : "Predict Future Delay"}
          </button>

          {futureDelayError && (
            <div className="error-box">
              <CircleAlert size={18} />
              {futureDelayError}
            </div>
          )}

        </div>

        <div className="future-result-card">

          <span>AI PREDICTED DELAY</span>

          <h2>
            +{predictedDelay ?? "--"}
            <small>
              {predictedDelay !== undefined
                ? " min"
                : ""}
            </small>
          </h2>

          <p>
            Expected additional delay at the next station.
          </p>

          {predictedDelay !== undefined && (
            <div
              className={`delay-level ${getDelayClass(
                predictedDelay
              )}`}
            >
              {getDelayLevel(predictedDelay)} Delay Risk
            </div>
          )}

        </div>

      </div>

      <div className="station-prediction-list">

        <h2>Upcoming Station Forecast</h2>

        {stations.slice(3).map((station, index) => (
          <div
            className="station-forecast-row"
            key={station.name}
          >

            <div className="forecast-station-icon">
              <MapPinned size={20} />
            </div>

            <div className="forecast-station-name">
              <strong>{station.name}</strong>
              <span>Scheduled {station.time}</span>
            </div>

            <div className="forecast-delay">
              <span>Predicted Delay</span>
              <strong>
                {station.delay}
              </strong>
            </div>

            <div
              className={`forecast-risk ${index === 0
                ? getDelayClass(predictedDelay ?? 15)
                : "high"
                }`}
            >
              {index === 0
                ? getDelayLevel(predictedDelay ?? 15)
                : "High"}
            </div>

          </div>
        ))}

      </div>

    </div>
  );

  // =========================
  // LIVE MAP PAGE
  // =========================
  const renderMap = () => (
    <div className="page-animation page-container">

      <div className="page-heading">
        <span>LIVE JOURNEY</span>
        <h1>Train Route Tracking</h1>

        <p>
          Visual journey progress from Pune Junction
          to Mumbai CST.
        </p>
      </div>

      <div className="live-map-card">

        <div className="map-header">
          <div>
            <span>TRAIN 12110</span>
            <h2>Deccan Queen</h2>
            <p>Pune → Mumbai CST</p>
          </div>

          <div className="map-live-badge">
            <span></span>
            LIVE LOCATION
          </div>
        </div>

        <div className="journey-timeline">

          {stations.map((station, index) => (
            <div
              className="timeline-item"
              key={station.name}
            >

              <div className="timeline-track">
                <div
                  className={`timeline-dot ${station.status}`}
                >
                  {station.status === "current" && (
                    <Train size={16} />
                  )}
                </div>

                {index < stations.length - 1 && (
                  <div
                    className={`timeline-line ${index < 2
                      ? "finished"
                      : ""
                      }`}
                  ></div>
                )}
              </div>

              <div className="timeline-content">
                <strong>{station.name}</strong>

                <span>{station.time}</span>

                <small>{station.delay}</small>
              </div>

            </div>
          ))}

        </div>

        <div className="live-train-info">
          <div>
            <Navigation size={20} />
            <span>Current Location</span>
            <strong>Khopoli</strong>
          </div>

          <div>
            <Gauge size={20} />
            <span>Speed</span>
            <strong>64 km/h</strong>
          </div>

          <div>
            <Route size={20} />
            <span>Distance Covered</span>
            <strong>110 / 192 km</strong>
          </div>

          <div>
            <Clock3 size={20} />
            <span>Current Delay</span>
            <strong className="orange-text">
              +15 min
            </strong>
          </div>
        </div>

      </div>

    </div>
  );

  // =========================
  // DASHBOARD PAGE
  // =========================
  const renderDashboard = () => (
    <div className="page-animation page-container">

      <div className="page-heading dashboard-heading">
        <span>LIVE DASHBOARD</span>
        <h1>Train Intelligence Center</h1>
        <p>
          Real-time overview of train status,
          ETA prediction, and future delays.
        </p>
      </div>

      <div className="dashboard-top-grid">

        <div className="dashboard-summary-card">
          <div className="summary-icon">
            <Train size={25} />
          </div>

          <span>SELECTED TRAIN</span>
          <h2>12110</h2>
          <p>Deccan Queen</p>

          <button onClick={() => setActivePage("map")}>
            View Journey
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="dashboard-summary-card">
          <div className="summary-icon orange-summary">
            <Clock3 size={25} />
          </div>

          <span>ESTIMATED ARRIVAL</span>

          <h2>
            {etaData
              ? etaData.predictedETA
              : "11:38 AM"}
          </h2>

          <p>
            {etaData
              ? etaData.nextStation
              : "Mumbai CST"}
          </p>

          <button onClick={() => setActivePage("eta")}>
            Predict ETA
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="dashboard-summary-card">
          <div className="summary-icon purple-summary">
            <BrainCircuit size={25} />
          </div>

          <span>FUTURE DELAY</span>

          <h2>
            +{predictedDelay ?? 15} min
          </h2>

          <p>
            AI delay forecast
          </p>

          <button onClick={() => setActivePage("future")}>
            View Prediction
            <ChevronRight size={16} />
          </button>
        </div>

      </div>

      <div className="dashboard-journey-card">

        <div className="section-title">
          <div>
            <span>JOURNEY PROGRESS</span>
            <h2>Pune → Mumbai CST</h2>
          </div>

          <div className="journey-live-pill">
            <span></span>
            LIVE
          </div>
        </div>

        <div className="dashboard-route">

          {stations.map((station, index) => (
            <div
              className="dashboard-station"
              key={station.name}
            >

              <div className="dashboard-route-line">
                <div
                  className={`dashboard-dot ${station.status}`}
                >
                  {station.status === "current" && (
                    <Train size={15} />
                  )}
                </div>

                {index < stations.length - 1 && (
                  <div className="dashboard-line"></div>
                )}
              </div>

              <strong>{station.name}</strong>
              <span>{station.time}</span>
              <small>{station.delay}</small>

            </div>
          ))}

        </div>

      </div>

    </div>
  );

  // =========================
  // ALERTS PAGE
  // =========================
  const renderAlerts = () => (
    <div className="page-animation page-container">

      <div className="page-heading">
        <span>RAILWAY NOTIFICATIONS</span>
        <h1>Live Alerts</h1>

        <p>
          Important updates generated from
          current train and prediction data.
        </p>
      </div>

      <div className="alerts-page-list">

        <div className="modern-alert danger-modern">
          <div className="modern-alert-icon">
            <CircleAlert size={24} />
          </div>

          <div>
            <span>HIGH PRIORITY</span>
            <h3>High Delay Expected</h3>

            <p>
              Train 12110 may arrive with an
              additional predicted delay.
            </p>
          </div>

          <strong>+18 min</strong>
        </div>

        <div className="modern-alert warning-modern">
          <div className="modern-alert-icon">
            <Signal size={24} />
          </div>

          <div>
            <span>NETWORK UPDATE</span>
            <h3>Traffic Congestion</h3>

            <p>
              Moderate railway traffic detected
              between Panvel and Dadar.
            </p>
          </div>

          <strong>Monitor</strong>
        </div>

        <div className="modern-alert info-modern">
          <div className="modern-alert-icon">
            <CloudSun size={24} />
          </div>

          <div>
            <span>WEATHER UPDATE</span>
            <h3>Weather Conditions Stable</h3>

            <p>
              Current weather conditions are not
              expected to cause major delays.
            </p>
          </div>

          <strong>Stable</strong>
        </div>

        <div className="modern-alert success-modern">
          <div className="modern-alert-icon">
            <CheckCircle2 size={24} />
          </div>

          <div>
            <span>SYSTEM STATUS</span>
            <h3>AI Prediction Engine Online</h3>

            <p>
              Backend prediction services are
              available and ready for analysis.
            </p>
          </div>

          <strong>Online</strong>
        </div>

      </div>

    </div>
  );

  // =========================
  // PAGE RENDERER
  // =========================
  const renderPage = () => {
    switch (activePage) {
      case "home":
        return renderHome();

      case "search":
        return renderSearch();

      case "eta":
        return renderETA();

      case "future":
        return renderFutureDelay();

      case "map":
        return renderMap();

      case "dashboard":
        return renderDashboard();

      case "alerts":
        return renderAlerts();

      default:
        return renderHome();
    }
  };

  const currentPageTitle =
    navItems.find((item) => item.id === activePage)?.label;

  return (
    <div className="app">

      {/* SIDEBAR */}
      <aside
        className={`sidebar ${sidebarOpen ? "open" : "collapsed"
          }`}
      >

        <div className="brand">

          <div className="brand-icon">
            <Train size={27} />
          </div>

          {sidebarOpen && (
            <div className="brand-text">
              <h2>DynamicTrain</h2>
              <span>AI Railway Intelligence</span>
            </div>
          )}

        </div>

        <div className="nav-section-label">
          {sidebarOpen && "MAIN MENU"}
        </div>

        <nav className="sidebar-nav">

          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                className={`nav-item ${activePage === item.id
                  ? "active"
                  : ""
                  }`}
                onClick={() => setActivePage(item.id)}
              >

                <Icon size={20} />

                {sidebarOpen && (
                  <span>{item.label}</span>
                )}

              </button>
            );
          })}

        </nav>

        <div className="sidebar-bottom">

          {sidebarOpen && (
            <div className="ai-powered-card">

              <div className="ai-powered-icon">
                <BrainCircuit size={22} />
              </div>

              <div>
                <strong>AI Powered</strong>
                <span>Smart predictions active</span>
              </div>

            </div>
          )}

        </div>

      </aside>

      {/* MAIN */}
      <main className="main-content">

        {/* TOP BAR */}
        <header className="topbar">

          <button
            className="menu-toggle"
            onClick={() =>
              setSidebarOpen(!sidebarOpen)
            }
          >
            <Menu size={21} />
          </button>

          <div className="topbar-page-name">
            <span>Dynamic Train ETA</span>
            <strong>{currentPageTitle}</strong>
          </div>

          <div className="topbar-right">

            <div className="system-online">
              <span></span>
              System Online
            </div>

            <button
              className="notification-btn"
              onClick={() => setActivePage("alerts")}
            >
              <Bell size={20} />
            </button>

          </div>

        </header>

        {/* PAGE */}
        <div className="content-wrapper">
          {renderPage()}
        </div>

      </main>

    </div>
  );
}

export default App;