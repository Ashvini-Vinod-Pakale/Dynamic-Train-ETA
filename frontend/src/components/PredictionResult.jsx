import {
  CircleAlert,
  Clock3,
  BrainCircuit,
  BadgeCheck,
} from "lucide-react";

function PredictionResult({
  title,
  value,
  subtitle,
  metrics = [],
  alert,
  valueClass = "",
}) {
  return (
    <div className="prediction-result-card">

      {/* RESULT HEADER */}
      <div className="prediction-result-header">

        <div className="result-icon">
          <BrainCircuit size={26} />
        </div>

        <div>
          <span className="result-label">
            AI PREDICTION RESULT
          </span>

          <h3>{title}</h3>
        </div>

      </div>

      {/* MAIN ETA RESULT */}
      <div className="prediction-main-result">

        <div className={`eta-result-time ${valueClass}`}>
          {value}
        </div>

        <p>{subtitle}</p>

      </div>

      {/* METRICS */}
      {metrics.length > 0 && (
        <div className="result-metrics">

          {metrics.map((metric, index) => (

            <div
              className="result-metric-card"
              key={index}
            >

              {index === 0 && (
                <Clock3 size={18} />
              )}

              {index === 1 && (
                <BrainCircuit size={18} />
              )}

              {index === 2 && (
                <BadgeCheck size={18} />
              )}

              <span>{metric.label}</span>

              <strong
                className={metric.className || ""}
              >
                {metric.value}
              </strong>

            </div>

          ))}

        </div>
      )}

      {/* ALERT */}
      {alert && (
        <div className="prediction-alert">

          <CircleAlert size={18} />

          <span>{alert}</span>

        </div>
      )}

    </div>
  );
}

export default PredictionResult;