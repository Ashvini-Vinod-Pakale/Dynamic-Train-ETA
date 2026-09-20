const API_BASE_URL =
  `${import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? "http://localhost:8080" : "https://dynamic-train-eta.onrender.com")}/api`;

/* =========================================
   PREDICT TRAIN ETA
========================================= */

export const predictETA = async (data) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/predict/eta`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          trainNumber: data.trainNumber,
          currentLocation: data.currentLocation,
          routeDistance: Number(data.routeDistance),
          currentSpeed: Number(data.currentSpeed),
          currentDelay: Number(data.currentDelay),
          previousDelay: Number(data.previousDelay),
          weatherFactor: Number(data.weatherFactor),
          trafficFactor: Number(data.trafficFactor),
          nextStation: data.nextStation,
          route: Array.isArray(data.route) ? data.route : (Array.isArray(data.routeStations) ? data.routeStations : undefined),
        }),
      }
    );

    if (!response.ok) {
      throw new Error(
        "Failed to predict ETA"
      );
    }

    return await response.json();

  } catch (error) {
    console.error(
      "ETA API Error:",
      error
    );

    throw error;
  }
};


/* =========================================
   PREDICT FUTURE DELAY
========================================= */

export const predictFutureDelay = async (
  data
) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/predict/future-delay`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          currentSpeed: Number(
            data.currentSpeed
          ),

          currentDelay: Number(
            data.currentDelay
          ),

          previousDelay: Number(
            data.previousDelay
          ),

          weatherFactor: Number(
            data.weatherFactor
          ),

          trafficFactor: Number(
            data.trafficFactor
          ),
        }),
      }
    );

    if (!response.ok) {
      throw new Error(
        "Failed to predict future delay"
      );
    }

    return await response.json();

  } catch (error) {
    console.error(
      "Future Delay API Error:",
      error
    );

    throw error;
  }
};


/* =========================================
   GET ALL LIVE TRAINS (REAL MONITORED FLEET)
========================================= */

export const getAllLiveTrains = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/live-train/all`);

    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        return data;
      }
    }
  } catch (error) {
    console.warn("getAllLiveTrains (/live-train/all) failed:", error);
  }

  return [];
};

/* =========================================
   GET LIVE TRAIN DATA (REAL RAILRADAR API)
========================================= */

export const getLiveTrainData = async (trainNumber) => {
  if (!trainNumber) {
    throw new Error("trainNumber is required");
  }
  try {
    const response = await fetch(
      `${API_BASE_URL}/live-train/${encodeURIComponent(trainNumber)}`
    );

    if (response.ok) {
      return await response.json();
    }

    throw new Error(
      `Failed to get live train data: ${response.status}`
    );
  } catch (error) {
    console.error(
      `Live Train API Error for ${trainNumber}:`,
      error
    );

    throw error;
  }
};


/* =========================================
   TRAIN SIMULATION
========================================= */

export const startTrainSimulation = async () => {
  const response = await fetch(
    `${API_BASE_URL}/simulation/start`,
    {
      method: "POST",
    }
  );

  if (!response.ok) {
    throw new Error(
      "Failed to start train simulation"
    );
  }

  return await response.text();
};


export const stopTrainSimulation = async () => {
  const response = await fetch(
    `${API_BASE_URL}/simulation/stop`,
    {
      method: "POST",
    }
  );

  if (!response.ok) {
    throw new Error(
      "Failed to stop train simulation"
    );
  }

  return await response.text();
};


export const getSimulationStatus = async () => {
  const response = await fetch(
    `${API_BASE_URL}/simulation/status`
  );

  if (!response.ok) {
    throw new Error(
      "Failed to get live simulation status"
    );
  }

  return await response.json();
};

/* =========================================
   STATION-WISE PREDICTION
========================================= */

export const predictStationWise = async (data) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/predict/station-wise`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          trainNumber: String(data.trainNumber || ""),
          currentLocation: String(data.currentLocation || data.currentStation || ""),
          currentSpeed: Number(data.currentSpeed || 0),
          currentDelay: Number(data.currentDelay || 0),
          previousDelay: Number(data.previousDelay || 0),
          weatherFactor: Number(data.weatherFactor || 0),
          trafficFactor: Number(data.trafficFactor || 0),
          stations: Array.isArray(data.stations)
            ? data.stations.map((s) => (typeof s === "object" && s !== null ? s.name || s.stationName : String(s)))
            : (Array.isArray(data.routeStations) ? data.routeStations : undefined),
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to predict station-wise ETA: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Station-Wise Prediction API Error:", error);
    throw error;
  }
};
