import { useEffect, useState } from "react";

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

// API
import { checkBackendHealth } from "./services/api";

function App() {

  // =========================
  // MAIN UI STATES
  // =========================

  const [activePage, setActivePage] =
    useState("home");

  const [sidebarOpen, setSidebarOpen] =
    useState(true);

  const [searchQuery, setSearchQuery] =
    useState("");

  // =========================
  // SELECTED TRAIN
  // =========================

  const [selectedTrain, setSelectedTrain] =
    useState(null);

  // =========================
  // LIVE TRAIN DATA
  // =========================

  const [liveTrainData, setLiveTrainData] =
    useState({
      trainNumber: "12110",
      trainName: "Deccan Queen",

      currentLatitude: 18.892,
      currentLongitude: 73.325,

      currentSpeed: 64,
      currentDelay: 15,
      previousDelay: 12,

      currentStation: "Khopoli",
      nextStation: "Panvel",

      weatherFactor: 0,
      trafficFactor: 1,

      lastUpdated: new Date().toISOString(),
    });

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

    const checkBackend = async () => {

      try {

        await checkBackendHealth();

        console.log(
          "Backend connected successfully"
        );

        setBackendStatus("online");

      } catch (error) {

        console.warn(
          "Backend is offline",
          error
        );

        setBackendStatus("offline");
      }
    };

    checkBackend();

    const interval = setInterval(
      checkBackend,
      10000
    );

    return () =>
      clearInterval(interval);

  }, []);

  // =========================
  // LIVE SIMULATION UPDATES
  // =========================

  useEffect(() => {

    const fetchSimulationData = async () => {

      try {

        const response = await fetch(
          "http://localhost:8080/api/simulation/status"
        );

        if (!response.ok) {
          throw new Error(
            "Simulation backend error"
          );
        }

        const data =
          await response.json();

        console.log(
          "Live simulation update:",
          data
        );

        setLiveTrainData({

          trainNumber:
            data.trainNumber ||
            "12110",

          trainName:
            "Deccan Queen",

          currentLatitude:
            data.latitude ??
            18.892,

          currentLongitude:
            data.longitude ??
            73.325,

          currentSpeed:
            data.currentSpeed ??
            64,

          currentDelay:
            data.currentDelay ??
            15,

          previousDelay:
            data.previousDelay ??
            12,

          currentStation:
            data.currentLocation ||
            "Khopoli",

          nextStation:
            data.nextStation ||
            "Panvel",

          weatherFactor:
            data.weatherFactor ??
            0,

          trafficFactor:
            data.trafficFactor ??
            0,

          lastUpdated:
            new Date().toISOString(),

        });
        // ADD THIS BELOW setLiveTrainData

        setFutureDelayData({
          predictedFutureDelay:
            data.futureDelay ?? 0,

          confidenceScore:
            data.confidenceScore ?? 0,
        });

        setEtaData((previousData) => ({
          ...previousData,

          scheduledArrival:
            previousData?.scheduledArrival ||
            "11:38 AM",

          currentDelay:
            data.currentDelay ?? 0,

          futureDelay:
            data.futureDelay ?? 0,

          predictedETA:
            data.predictedETA ||
            previousData?.predictedETA ||
            "",

          confidenceScore:
            data.confidenceScore ?? 0,
        }));

      } catch (error) {

        console.warn(
          "Unable to fetch live simulation:",
          error
        );

      }
    };

    fetchSimulationData();

    const interval = setInterval(
      fetchSimulationData,
      10000
    );

    return () =>
      clearInterval(interval);

  }, []);

  // =========================
  // EASY ACCESS VARIABLES
  // =========================

  const currentSpeed =
    liveTrainData.currentSpeed;

  const currentDelay =
    liveTrainData.currentDelay;

  const previousDelay =
    liveTrainData.previousDelay;

  const weatherFactor =
    liveTrainData.weatherFactor;

  const trafficFactor =
    liveTrainData.trafficFactor;

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
    etaData?.futureDelay ??
    null;

  // =========================
  // FETCH LIVE TRAIN DATA
  // =========================

  const fetchLiveTrainData = async (
    trainNumber = "12110"
  ) => {

    try {

      const response = await fetch(
        "http://localhost:8080/api/simulation/status"
      );

      if (!response.ok) {

        throw new Error(
          `HTTP error! status: ${response.status}`
        );
      }

      const data =
        await response.json();

      const freshTrainData = {

        trainNumber:
          data.trainNumber ||
          trainNumber,

        trainName:
          "Deccan Queen",

        currentLatitude:
          data.latitude ??
          18.892,

        currentLongitude:
          data.longitude ??
          73.325,

        currentSpeed:
          data.currentSpeed ??
          64,

        currentDelay:
          data.currentDelay ??
          15,

        previousDelay:
          data.previousDelay ??
          12,

        currentStation:
          data.currentLocation ||
          "Khopoli",

        nextStation:
          data.nextStation ||
          "Panvel",

        weatherFactor:
          data.weatherFactor ??
          0,

        trafficFactor:
          data.trafficFactor ??
          0,

        lastUpdated:
          new Date().toISOString(),
      };

      setLiveTrainData(
        freshTrainData
      );

      return freshTrainData;

    } catch (error) {

      console.warn(
        "Simulation backend unavailable",
        error
      );

      return liveTrainData;
    }
  };

  // =========================
  // CALCULATE PREDICTED TIME
  // =========================

  const calculatePredictedTime = (
    scheduledArrival,
    totalDelay
  ) => {

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

    const predictedTime =
      new Date();

    predictedTime.setHours(hours);

    predictedTime.setMinutes(
      minutes + Number(totalDelay)
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

    return `${formattedHours}:${formattedMinutes} ${predictedPeriod}`;
  };

  // =========================
  // ETA PREDICTION
  // =========================

  const predictETA = async (
    trainNumber = "12110",
    trainData = liveTrainData
  ) => {

    setLoading(true);

    setError("");

    const scheduledArrival =
      "11:38 AM";

    try {

      const response =
        await fetch(
          "http://localhost:8080/api/predict/eta",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({

              trainNumber,

              currentLocation:
                trainData.currentStation,

              routeDistance: 82,

              currentSpeed:
                Number(
                  trainData.currentSpeed
                ),

              currentDelay:
                Number(
                  trainData.currentDelay
                ),

              previousDelay:
                Number(
                  trainData.previousDelay
                ),

              weatherFactor:
                Number(
                  trainData.weatherFactor
                ),

              trafficFactor:
                Number(
                  trainData.trafficFactor
                ),

              nextStation:
                trainData.nextStation,
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

      setEtaData({

        ...data,

        scheduledArrival:
          data.scheduledArrival ||
          scheduledArrival,

        currentDelay:
          data.currentDelay ??
          trainData.currentDelay,

        nextStation:
          data.nextStation ||
          trainData.nextStation,

        confidenceScore:
          data.confidenceScore ??
          91,
      });

    } catch (err) {

      const simulatedFutureDelay =
        Math.max(
          0,

          Number(
            trainData.currentDelay
          ) * 0.4 +

          Number(
            trainData.previousDelay
          ) * 0.3 -

          Number(
            trainData.currentSpeed
          ) * 0.1 +

          Number(
            trainData.weatherFactor
          ) * 2 +

          Number(
            trainData.trafficFactor
          ) * 3
        );

      const roundedFutureDelay =
        Math.round(
          simulatedFutureDelay
        );

      const totalDelay =
        Number(
          trainData.currentDelay
        ) +
        roundedFutureDelay;

      const predictedETA =
        calculatePredictedTime(
          scheduledArrival,
          totalDelay
        );

      setEtaData({

        scheduledArrival,

        currentDelay:
          Number(
            trainData.currentDelay
          ),

        futureDelay:
          roundedFutureDelay,

        totalDelay:
          Math.round(totalDelay),

        predictedETA,

        nextStation:
          trainData.nextStation,

        etaMinutes:
          Math.round(
            (
              82 /
              Math.max(
                1,
                Number(
                  trainData.currentSpeed
                )
              )
            ) * 60
          ),

        confidenceScore:
          92,
      });

    } finally {

      setLoading(false);
    }
  };

  // =========================
  // FUTURE DELAY PREDICTION
  // =========================

  const predictFutureDelay =
    async (
      trainData = liveTrainData
    ) => {

      setFutureDelayLoading(true);

      try {

        const response =
          await fetch(
            "http://localhost:8080/api/predict/future-delay",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({

                currentSpeed:
                  Number(
                    trainData.currentSpeed
                  ),

                currentDelay:
                  Number(
                    trainData.currentDelay
                  ),

                previousDelay:
                  Number(
                    trainData.previousDelay
                  ),

                weatherFactor:
                  Number(
                    trainData.weatherFactor
                  ),

                trafficFactor:
                  Number(
                    trainData.trafficFactor
                  ),
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

      } catch (err) {

        const simulatedFutureDelay =
          Math.max(
            0,

            Number(
              trainData.currentDelay
            ) * 0.4 +

            Number(
              trainData.previousDelay
            ) * 0.3 -

            Number(
              trainData.currentSpeed
            ) * 0.1 +

            Number(
              trainData.weatherFactor
            ) * 2 +

            Number(
              trainData.trafficFactor
            ) * 3
          );

        setFutureDelayData({

          predictedFutureDelay:
            Math.round(
              simulatedFutureDelay
            ),

          confidenceScore:
            92,
        });

      } finally {

        setFutureDelayLoading(false);
      }
    };

  // =========================
  // STATION-WISE PREDICTION
  // =========================

  const predictStationWiseETA =
    async (
      trainNumber = "12110",
      trainData = liveTrainData
    ) => {

      try {

        const response =
          await fetch(
            "http://localhost:8080/api/predict/station-wise",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({

                trainNumber,

                currentLocation:
                  trainData.currentStation,

                currentSpeed:
                  Number(
                    trainData.currentSpeed
                  ),

                currentDelay:
                  Number(
                    trainData.currentDelay
                  ),

                previousDelay:
                  Number(
                    trainData.previousDelay
                  ),

                weatherFactor:
                  Number(
                    trainData.weatherFactor
                  ),

                trafficFactor:
                  Number(
                    trainData.trafficFactor
                  ),
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

        const predictions =
          data.stationPredictions;

        if (
          Array.isArray(predictions) &&
          predictions.length > 0
        ) {

          setStationPredictions(
            predictions
          );

        } else {

          throw new Error(
            "No station predictions received"
          );
        }

      } catch (err) {

        const currentTrainDelay =
          Number(
            trainData.currentDelay
          );

        const simulatedPredictions = [

          {
            station:
              trainData.nextStation ||
              "Panvel",

            scheduledTime:
              "10:10 AM",

            predictedDelay:
              Math.round(
                currentTrainDelay + 3
              ),

            predictedETA:
              calculatePredictedTime(
                "10:10 AM",
                currentTrainDelay + 3
              ),
          },

          {
            station: "Dadar",

            scheduledTime:
              "10:58 AM",

            predictedDelay:
              Math.round(
                currentTrainDelay + 6
              ),

            predictedETA:
              calculatePredictedTime(
                "10:58 AM",
                currentTrainDelay + 6
              ),
          },

          {
            station:
              "Mumbai CST",

            scheduledTime:
              "11:38 AM",

            predictedDelay:
              Math.round(
                currentTrainDelay + 6
              ),

            predictedETA:
              calculatePredictedTime(
                "11:38 AM",
                currentTrainDelay + 6
              ),
          },
        ];

        setStationPredictions(
          simulatedPredictions
        );
      }
    };

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
      name:
        liveTrainData.currentStation ||
        "Khopoli",

      time: "09:25",

      delay:
        `+${currentDelay} min`,

      status: "current",
    },

    {
      name:
        liveTrainData.nextStation ||
        "Panvel",

      time: "10:10",

      delay:
        stationPredictions[0]
          ?.predictedDelay !== undefined
          ? `+${stationPredictions[0].predictedDelay} min`
          : predictedDelay !== null
            ? `+${Math.round(predictedDelay)} min`
            : `+${currentDelay} min`,

      status: "upcoming",
    },

    {
      name: "Dadar",

      time: "10:58",

      delay:
        stationPredictions[1]
          ?.predictedDelay !== undefined
          ? `+${stationPredictions[1].predictedDelay} min`
          : "+18 min",

      status: "upcoming",
    },

    {
      name: "Mumbai CST",

      time: "11:38",

      delay:
        stationPredictions[2]
          ?.predictedDelay !== undefined
          ? `+${stationPredictions[2].predictedDelay} min`
          : etaData?.totalDelay !== undefined
            ? `+${Math.round(
              etaData.totalDelay
            )} min`
            : "+18 min",

      status: "upcoming",
    },
  ];

  // =========================
  // SELECT TRAIN
  // =========================

  const selectTrain =
    async (train) => {

      setSelectedTrain(train);

      setSearchQuery(
        train.number
      );

      setEtaData(null);

      setFutureDelayData(null);

      setStationPredictions([]);

      setActivePage(
        "dashboard"
      );

      const freshTrainData =
        await fetchLiveTrainData(
          train.number
        );

      await Promise.all([

        predictETA(
          train.number,
          freshTrainData
        ),

        predictFutureDelay(
          freshTrainData
        ),

        predictStationWiseETA(
          train.number,
          freshTrainData
        ),
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

      case "dashboard":
        return (
          <Dashboard
            etaData={etaData}
            predictedDelay={predictedDelay}
            stations={stations}
            stationPredictions={
              stationPredictions
            }
            setActivePage={setActivePage}
            selectedTrain={selectedTrain}
            loading={
              loading ||
              futureDelayLoading
            }
            backendStatus={backendStatus}
          />
        );

      case "map":
        return (
          <LiveTrainMap
            stations={stations}
            currentSpeed={currentSpeed}
            currentDelay={currentDelay}
            selectedTrain={selectedTrain}
            liveTrainData={liveTrainData}
          />
        );

      case "alerts":
        return (
          <Alerts
            predictedDelay={predictedDelay}
            etaData={etaData}
            currentDelay={currentDelay}
            setActivePage={setActivePage}
            selectedTrain={selectedTrain}
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

      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
        sidebarOpen={sidebarOpen}
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