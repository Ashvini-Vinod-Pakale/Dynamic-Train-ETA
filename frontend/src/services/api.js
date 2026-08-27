const API_BASE_URL = "http://localhost:8080";

/* ================================
   BACKEND HEALTH CHECK
================================ */

export const checkBackendHealth = async () => {
  const response = await fetch(
    `${API_BASE_URL}/health`,
    {
      method: "GET",
      headers: {
        Accept: "text/plain, application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      `Backend health check failed: ${response.status}`
    );
  }

  const result = await response.text();

  return result || "Backend Online";
};


/* ================================
   ETA PREDICTION
================================ */

export const predictETA = async (data) => {
  const response = await fetch(
    `${API_BASE_URL}/api/predict/eta`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to generate ETA prediction: ${response.status}`
    );
  }

  return await response.json();
};


/* ================================
   FUTURE DELAY PREDICTION
================================ */

export const predictFutureDelay = async (data) => {
  const response = await fetch(
    `${API_BASE_URL}/api/predict/future-delay`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to predict future delay: ${response.status}`
    );
  }

  return await response.json();
};