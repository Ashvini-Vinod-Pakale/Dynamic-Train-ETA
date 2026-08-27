import {
  BrainCircuit,
  CircleAlert,
  MapPinned,
} from "lucide-react";

function FutureDelay({
  futureDelayData,
  futureDelayLoading,
  futureDelayError,
  predictFutureDelay,
  getDelayClass,
  getDelayLevel,
  stations,
  currentSpeed,
  setCurrentSpeed,
  currentDelay,
  setCurrentDelay,
  previousDelay,
  setPreviousDelay,
  weatherFactor,
  setWeatherFactor,
  trafficFactor,
  setTrafficFactor,
}) {
  return (
    <div className="page-animation page-container">

      {/* PAGE HEADING */}
      <div className="page-heading">
        <span>AI DELAY FORECAST</span>

        <h1>Future Delay Prediction</h1>

        <p>
          Analyze upcoming railway conditions and predict
          possible delays at future stations.
        </p>
      </div>


      <div className="future-page-grid">

        {/* LEFT MAIN CARD */}
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


          {/* INPUT DATA FORM */}
          <div
            className="prediction-form"
            style={{
              marginTop: "20px",
              display: "flex",
              flexDirection: "column",
              gap: "15px",
            }}
          >

            {/* SPEED + CURRENT DELAY */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "15px",
              }}
            >

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "12px",
                    fontWeight: "600",
                    color: "var(--text-light)",
                    marginBottom: "5px",
                  }}
                >
                  Current Speed (km/h)
                </label>

                <input
                  type="number"
                  value={currentSpeed}
                  onChange={(e) =>
                    setCurrentSpeed(e.target.value)
                  }
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "8px",
                    border: "1px solid var(--border)",
                    fontWeight: "bold",
                    background: "white",
                    color: "black",
                  }}
                />
              </div>


              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "12px",
                    fontWeight: "600",
                    color: "var(--text-light)",
                    marginBottom: "5px",
                  }}
                >
                  Current Delay (min)
                </label>

                <input
                  type="number"
                  value={currentDelay}
                  onChange={(e) =>
                    setCurrentDelay(e.target.value)
                  }
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "8px",
                    border: "1px solid var(--border)",
                    fontWeight: "bold",
                    background: "white",
                    color: "black",
                  }}
                />
              </div>

            </div>


            {/* PREVIOUS DELAY + WEATHER */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "15px",
              }}
            >

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "12px",
                    fontWeight: "600",
                    color: "var(--text-light)",
                    marginBottom: "5px",
                  }}
                >
                  Prev Station Delay (min)
                </label>

                <input
                  type="number"
                  value={previousDelay}
                  onChange={(e) =>
                    setPreviousDelay(e.target.value)
                  }
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "8px",
                    border: "1px solid var(--border)",
                    fontWeight: "bold",
                    background: "white",
                    color: "black",
                  }}
                />
              </div>


              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "12px",
                    fontWeight: "600",
                    color: "var(--text-light)",
                    marginBottom: "5px",
                  }}
                >
                  Weather Conditions
                </label>

                <select
                  value={weatherFactor}
                  onChange={(e) =>
                    setWeatherFactor(
                      parseInt(e.target.value)
                    )
                  }
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "8px",
                    border: "1px solid var(--border)",
                    fontWeight: "bold",
                    height: "41px",
                    background: "white",
                    color: "black",
                  }}
                >
                  <option value={0}>
                    Stable / Clear (Normal)
                  </option>

                  <option value={1}>
                    Rainy / Foggy / Heavy Wind
                  </option>
                </select>
              </div>

            </div>


            {/* TRAFFIC */}
            <div>

              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: "600",
                  color: "var(--text-light)",
                  marginBottom: "5px",
                }}
              >
                Traffic / Route Congestion
              </label>

              <select
                value={trafficFactor}
                onChange={(e) =>
                  setTrafficFactor(
                    parseInt(e.target.value)
                  )
                }
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "8px",
                  border: "1px solid var(--border)",
                  fontWeight: "bold",
                  height: "41px",
                  background: "white",
                  color: "black",
                }}
              >
                <option value={0}>
                  Normal / Clear Section
                </option>

                <option value={1}>
                  Heavy Congestion (Preceding Train Delay)
                </option>
              </select>

            </div>

          </div>


          <div style={{ marginBottom: "15px" }} />


          {/* PREDICTION BUTTON */}
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


          {/* ERROR */}
          {futureDelayError && (
            <div className="error-box">

              <CircleAlert size={18} />

              {futureDelayError}

            </div>
          )}

        </div>


        {/* RESULT CARD */}
        <div className="future-result-card">

          <span>AI PREDICTED DELAY</span>

          <h2>

            +{
              futureDelayData
                ? futureDelayData.predictedFutureDelay
                : "--"
            }

            <small>
              {futureDelayData
                ? " min"
                : ""}
            </small>

          </h2>

          <p>
            Expected additional delay at the next station.
          </p>


          {/* DELAY RISK */}
          {futureDelayData && (

            <div
              className={`delay-level ${
                getDelayClass(
                  futureDelayData.predictedFutureDelay
                )
              }`}
            >

              {getDelayLevel(
                futureDelayData.predictedFutureDelay
              )}{" "}
              Delay Risk

            </div>

          )}

        </div>

      </div>


      {/* UPCOMING STATIONS */}
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

              <strong>
                {station.name}
              </strong>

              <span>
                Scheduled {station.time}
              </span>

            </div>


            <div className="forecast-delay">

              <span>Predicted Delay</span>

              <strong>
                {index === 0 && futureDelayData
                  ? `+${Math.round(
                      futureDelayData.predictedFutureDelay
                    )} min`
                  : station.delay}
              </strong>

            </div>


            <div
              className={`forecast-risk ${
                index === 0
                  ? getDelayClass(
                      futureDelayData
                        ? futureDelayData.predictedFutureDelay
                        : 15
                    )
                  : "high"
              }`}
            >

              {index === 0
                ? getDelayLevel(
                    futureDelayData
                      ? futureDelayData.predictedFutureDelay
                      : 15
                  )
                : "High"}

            </div>

          </div>

        ))}

      </div>

    </div>
  );
}

export default FutureDelay;