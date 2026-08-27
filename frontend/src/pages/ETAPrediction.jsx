import {
  Clock3,
  BrainCircuit,
  CircleAlert,
} from "lucide-react";

import PredictionResult from "../components/PredictionResult";

function ETAPrediction({
  etaData,
  loading,
  error,
  predictETA,
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
        <span>AI ETA ENGINE</span>

        <h1>Estimated Time of Arrival</h1>

        <p>
          Predict dynamic arrival time based on train speed,
          current delay, weather, and traffic conditions.
        </p>
      </div>

      <div className="prediction-layout">

        {/* LEFT INPUT CARD */}
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

          {/* TRAIN DATA FORM */}
          <div className="prediction-form" style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-light)', marginBottom: '5px' }}>Current Location</label>
                <input 
                  type="text" 
                  value="Khopoli" 
                  disabled 
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: '#f3f4f6', cursor: 'not-allowed', fontWeight: 'bold' }} 
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-light)', marginBottom: '5px' }}>Next Station</label>
                <input 
                  type="text" 
                  value="Panvel" 
                  disabled 
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: '#f3f4f6', cursor: 'not-allowed', fontWeight: 'bold' }} 
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-light)', marginBottom: '5px' }}>Current Speed (km/h)</label>
                <input 
                  type="number" 
                  value={currentSpeed} 
                  onChange={(e) => setCurrentSpeed(e.target.value)} 
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', fontWeight: 'bold', background: 'white', color: 'black' }} 
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-light)', marginBottom: '5px' }}>Current Delay (min)</label>
                <input 
                  type="number" 
                  value={currentDelay} 
                  onChange={(e) => setCurrentDelay(e.target.value)} 
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', fontWeight: 'bold', background: 'white', color: 'black' }} 
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-light)', marginBottom: '5px' }}>Prev Station Delay (min)</label>
                <input 
                  type="number" 
                  value={previousDelay} 
                  onChange={(e) => setPreviousDelay(e.target.value)} 
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', fontWeight: 'bold', background: 'white', color: 'black' }} 
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-light)', marginBottom: '5px' }}>Weather Conditions</label>
                <select 
                  value={weatherFactor} 
                  onChange={(e) => setWeatherFactor(parseInt(e.target.value))}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', fontWeight: 'bold', height: '41px', background: 'white', color: 'black' }}
                >
                  <option value={0}>Stable / Clear (Normal)</option>
                  <option value={1}>Rainy / Foggy / Heavy Wind</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-light)', marginBottom: '5px' }}>Traffic / Route Congestion</label>
              <select 
                value={trafficFactor} 
                onChange={(e) => setTrafficFactor(parseInt(e.target.value))}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', fontWeight: 'bold', height: '41px', background: 'white', color: 'black' }}
              >
                <option value={0}>Normal / Clear Section</option>
                <option value={1}>Heavy Congestion (Preceding Train Delay)</option>
              </select>
            </div>

          </div>
          <div style={{ marginBottom: '15px' }}></div>

          {/* PREDICTION BUTTON */}
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

          {/* ERROR */}
          {error && (
            <div className="error-box">
              <CircleAlert size={18} />
              {error}
            </div>
          )}

        </div>

        {/* RESULT CARD */}
        <PredictionResult
          title="PREDICTED ARRIVAL"
          value={
            etaData
              ? etaData.predictedETA
              : "--:--"
          }
          subtitle={
            etaData
              ? `Expected arrival at ${etaData.nextStation}`
              : "Run prediction to calculate ETA"
          }
          metrics={[
            {
              label: "Future Delay",
              value: etaData
                ? `${etaData.futureDelay} min`
                : "--",
            },
            {
              label: "Total Journey ETA",
              value: etaData
                ? `${etaData.etaMinutes} min`
                : "--",
            },
            {
              label: "Confidence Score",
              value: etaData
                ? `${etaData.confidenceScore}%`
                : "--",
              className: "green-text",
            },
          ]}
          alert={
            etaData
              ? etaData.delayAlert
              : null
          }
        />

      </div>

    </div>
  );
}

export default ETAPrediction;
