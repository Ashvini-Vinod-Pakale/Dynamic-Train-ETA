const API_BASE_URL = "http://localhost:8080/api";

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