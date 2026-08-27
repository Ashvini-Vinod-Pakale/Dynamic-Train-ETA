import { useState } from "react";

import "./App.css";

// COMPONENTS
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";

// PAGES
import Home from "./pages/Home";
import SearchTrain from "./pages/SearchTrain";
import ETAPrediction from "./pages/ETAPrediction";
import FutureDelay from "./pages/FutureDelay";
import LiveTrainMap from "./pages/LiveTrainMap";
import Dashboard from "./pages/Dashboard";
import Alerts from "./pages/Alerts";

function App() {
  // =========================
  // MAIN UI STATES
  // =========================
  const [activePage, setActivePage] = useState("home");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // =========================
  // DYNAMIC PREDICTION INPUTS
  // =========================
  const [currentSpeed, setCurrentSpeed] = useState(64);
  const [currentDelay, setCurrentDelay] = useState(15);
  const [previousDelay, setPreviousDelay] = useState(12);
  const [weatherFactor, setWeatherFactor] = useState(0);
  const [trafficFactor, setTrafficFactor] = useState(0);

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
  const [futureDelayLoading, setFutureDelayLoading] =
    useState(false);
  const [futureDelayError, setFutureDelayError] =
    useState("");

  // =========================
  // TRAIN DATA
  // =========================
  const trains = [
    {
      number: "12110",
      name: "Deccan Queen",
      route: "Pune → Mumbai CST",
      status: "Delayed",
      delay: "+15 min",
    },
    {
      number: "12951",
      name: "Mumbai Rajdhani",
      route: "Mumbai Central → New Delhi",
      status: "On Time",
      delay: "On Time",
    },
    {
      number: "22691",
      name: "Rajdhani Express",
      route: "Bengaluru → New Delhi",
      status: "Delayed",
      delay: "+8 min",
    },
  ];

  // =========================
  // PREDICTED DELAY
  // =========================
  const predictedDelay =
    futureDelayData?.predictedFutureDelay ??
    etaData?.futureDelay;

  // =========================
  // STATION DATA
  // =========================
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
        ? `+${Math.round(predictedDelay + 3)} min`
        : "+18 min",
      status: "upcoming",
    },
    {
      name: "Mumbai CST",
      time: "11:38",
      delay: predictedDelay
        ? `+${Math.round(predictedDelay + 3)} min`
        : "+18 min",
      status: "upcoming",
    },
  ];

  // =========================
  // SELECT TRAIN
  // =========================
  const selectTrain = (train) => {
    setSearchQuery(train.number);
    setActivePage("eta");
  };

  // =========================
  // ETA PREDICTION
  // =========================
  const predictETA = async () => {
    setLoading(true);
    setError("");

    const scheduledArrival = "11:38 AM";

    try {
      const response = await fetch(
        "http://localhost:8080/api/predict/eta",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            trainNumber: "12110",
            currentLocation: "Khopoli",
            routeDistance: 82.0,
            currentSpeed: parseFloat(currentSpeed),
            currentDelay: parseFloat(currentDelay),
            previousDelay: parseFloat(previousDelay),
            weatherFactor: parseInt(weatherFactor),
            trafficFactor: parseInt(trafficFactor),
            nextStation: "Panvel",
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          `HTTP error! status: ${response.status}`
        );
      }

      const data = await response.json();

      const futureDelay =
        parseFloat(data.futureDelay) || 0;

      const totalDelay =
        parseFloat(currentDelay) + futureDelay;

      const [time, period] =
        scheduledArrival.split(" ");

      let [hours, minutes] =
        time.split(":").map(Number);

      if (period === "PM" && hours !== 12) {
        hours += 12;
      }

      if (period === "AM" && hours === 12) {
        hours = 0;
      }

      const predictedTime = new Date();

      predictedTime.setHours(hours);
      predictedTime.setMinutes(
        minutes + totalDelay
      );
      predictedTime.setSeconds(0);

      const predictedHours =
        predictedTime.getHours();

      const predictedMinutes =
        predictedTime.getMinutes();

      const predictedPeriod =
        predictedHours >= 12
          ? "PM"
          : "AM";

      const formattedHours =
        predictedHours % 12 || 12;

      const formattedMinutes =
        predictedMinutes < 10
          ? `0${predictedMinutes}`
          : predictedMinutes;

      const predictedArrivalTime =
        `${formattedHours}:${formattedMinutes} ${predictedPeriod}`;

      setEtaData({
        ...data,
        scheduledArrival,
        currentDelay: parseFloat(currentDelay),
        futureDelay: Math.round(futureDelay),
        totalDelay: Math.round(totalDelay),
        predictedETA: predictedArrivalTime,
      });

      setLoading(false);

    } catch (err) {
      console.warn(
        "Backend unavailable, using frontend simulation:",
        err
      );

      setTimeout(() => {
        const simulatedFutureDelay =
          Math.max(
            0,
            (parseFloat(currentDelay) * 0.4) +
            (parseFloat(previousDelay) * 0.3) +
            (parseFloat(currentSpeed) * -0.1) +
            (parseInt(weatherFactor) * 2) +
            (parseInt(trafficFactor) * 3)
          );

        const roundedFutureDelay =
          Math.round(simulatedFutureDelay);

        const totalDelay =
          parseFloat(currentDelay) +
          roundedFutureDelay;

        const [time, period] =
          scheduledArrival.split(" ");

        let [hours, minutes] =
          time.split(":").map(Number);

        if (
          period === "PM" &&
          hours !== 12
        ) {
          hours += 12;
        }

        if (
          period === "AM" &&
          hours === 12
        ) {
          hours = 0;
        }

        const predictedTime = new Date();

        predictedTime.setHours(hours);

        predictedTime.setMinutes(
          minutes + totalDelay
        );

        predictedTime.setSeconds(0);

        const predictedHours =
          predictedTime.getHours();

        const predictedMinutes =
          predictedTime.getMinutes();

        const predictedPeriod =
          predictedHours >= 12
            ? "PM"
            : "AM";

        const formattedHours =
          predictedHours % 12 || 12;

        const formattedMinutes =
          predictedMinutes < 10
            ? `0${predictedMinutes}`
            : predictedMinutes;

        const predictedArrivalTime =
          `${formattedHours}:${formattedMinutes} ${predictedPeriod}`;

        setEtaData({
          scheduledArrival,

          currentDelay:
            parseFloat(currentDelay),

          futureDelay:
            roundedFutureDelay,

          totalDelay:
            Math.round(totalDelay),

          predictedETA:
            predictedArrivalTime,

          nextStation:
            "Panvel",

          etaMinutes:
            Math.round(
              (82.0 / parseFloat(currentSpeed)) * 60
            ),

          confidenceScore:
            Math.round(
              Math.max(
                50,
                Math.min(
                  99,
                  95 -
                  (
                    Math.abs(
                      parseFloat(currentDelay) -
                      parseFloat(previousDelay)
                    ) * 1.5
                  ) -
                  (
                    parseInt(weatherFactor) * 5
                  ) -
                  (
                    parseInt(trafficFactor) * 4
                  )
                )
              )
            ),

          delayAlert:
            roundedFutureDelay >= 10
              ? `Additional ${roundedFutureDelay} min delay predicted`
              : "Minor future delay predicted",
        });

        setLoading(false);

      }, 1000);
    }
  };

  // =========================
  // FUTURE DELAY PREDICTION
  // =========================
  const predictFutureDelay = async () => {
    setFutureDelayLoading(true);
    setFutureDelayError("");

    try {
      const response = await fetch(
        "http://localhost:8080/api/predict/future-delay",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            currentSpeed:
              parseFloat(currentSpeed),

            currentDelay:
              parseFloat(currentDelay),

            previousDelay:
              parseFloat(previousDelay),

            weatherFactor:
              parseInt(weatherFactor),

            trafficFactor:
              parseInt(trafficFactor),
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          `HTTP error! status: ${response.status}`
        );
      }

      const data =
        await response.json();

      setFutureDelayData(data);

      setFutureDelayLoading(false);

    } catch (err) {

      console.warn(
        "Backend unavailable, using frontend simulation:",
        err
      );

      setTimeout(() => {

        const simulatedFutureDelay =
          Math.max(
            0,
            (parseFloat(currentDelay) * 0.4) +
            (parseFloat(previousDelay) * 0.3) +
            (parseFloat(currentSpeed) * -0.1) +
            (parseInt(weatherFactor) * 2) +
            (parseInt(trafficFactor) * 3)
          );

        setFutureDelayData({
          predictedFutureDelay:
            Math.round(
              simulatedFutureDelay * 100
            ) / 100,

          confidenceScore:
            92.4,
        });

        setFutureDelayLoading(false);

      }, 1000);
    }
  };

  // =========================
  // DELAY HELPERS
  // =========================
  const getDelayClass = (delay) => {
    if (delay <= 5) return "low";
    if (delay <= 15) return "medium";

    return "high";
  };

  const getDelayLevel = (delay) => {
    if (delay <= 5) return "Low";
    if (delay <= 15) return "Medium";

    return "High";
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
          />
        );

      case "search":
        return (
          <SearchTrain
            trains={trains}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            selectTrain={selectTrain}
          />
        );

      case "eta":
        return (
          <ETAPrediction
            etaData={etaData}
            loading={loading}
            error={error}
            predictETA={predictETA}

            currentSpeed={currentSpeed}
            setCurrentSpeed={setCurrentSpeed}

            currentDelay={currentDelay}
            setCurrentDelay={setCurrentDelay}

            previousDelay={previousDelay}
            setPreviousDelay={setPreviousDelay}

            weatherFactor={weatherFactor}
            setWeatherFactor={setWeatherFactor}

            trafficFactor={trafficFactor}
            setTrafficFactor={setTrafficFactor}
          />
        );

      case "future":
        return (
          <FutureDelay
            futureDelayData={futureDelayData}
            futureDelayLoading={futureDelayLoading}
            futureDelayError={futureDelayError}

            predictFutureDelay={
              predictFutureDelay
            }

            predictedDelay={predictedDelay}

            getDelayClass={getDelayClass}
            getDelayLevel={getDelayLevel}

            stations={stations}

            currentSpeed={currentSpeed}
            setCurrentSpeed={setCurrentSpeed}

            currentDelay={currentDelay}
            setCurrentDelay={setCurrentDelay}

            previousDelay={previousDelay}
            setPreviousDelay={setPreviousDelay}

            weatherFactor={weatherFactor}
            setWeatherFactor={setWeatherFactor}

            trafficFactor={trafficFactor}
            setTrafficFactor={setTrafficFactor}
          />
        );

      case "map":
        return (
          <LiveTrainMap
            stations={stations}
            currentSpeed={currentSpeed}
            currentDelay={currentDelay}
          />
        );

      case "dashboard":
        return (
          <Dashboard
            etaData={etaData}
            predictedDelay={predictedDelay}
            stations={stations}
            setActivePage={setActivePage}
          />
        );

      case "alerts":
        return (
          <Alerts
            predictedDelay={predictedDelay}
            etaData={etaData}
            currentDelay={currentDelay}
            setActivePage={setActivePage}
          />
        );

      default:
        return (
          <Home
            trains={trains}
            etaData={etaData}
            selectTrain={selectTrain}
            setActivePage={setActivePage}
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
    eta: "ETA Prediction",
    future: "Future Delay",
    map: "Live Train Map",
    dashboard: "Dashboard",
    alerts: "Alerts",
  };

  const currentPageTitle =
    pageTitles[activePage];

  // =========================
  // APP
  // =========================
  return (
    <div className="app">

      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
        sidebarOpen={sidebarOpen}
      />

      <main className="main-content">

        <Topbar
          currentPageTitle={currentPageTitle}
          setSidebarOpen={setSidebarOpen}
          sidebarOpen={sidebarOpen}
          setActivePage={setActivePage}
        />

        <div className="content-wrapper">
          {renderPage()}
        </div>

      </main>

    </div>
  );
}

export default App;