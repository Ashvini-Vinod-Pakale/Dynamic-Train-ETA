const API_BASE_URL =
  `${import.meta.env.VITE_API_BASE_URL || "http://localhost:8080"}/api`;

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
   GET LIVE TRAIN DATA
========================================= */

export const getLiveTrainData = async (
  trainNumber
) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/train/${trainNumber}/live`
    );

    if (!response.ok) {
      throw new Error(
        "Failed to get live train data"
      );
    }

    return await response.json();

  } catch (error) {
    console.error(
      "Live Train API Error:",
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