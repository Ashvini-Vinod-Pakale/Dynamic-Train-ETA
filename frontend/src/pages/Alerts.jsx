import {
  Bell,
  CircleAlert,
  Clock3,
  CheckCircle2,
  BrainCircuit,
  MapPin,
} from "lucide-react";

function Alerts({
  predictedDelay,
  setActivePage,
  etaData,
  currentDelay,
}) {
  const delay = predictedDelay ?? 15;

  const currentTrainDelay = currentDelay ?? 15;

  const predictedETA =
    etaData?.predictedETA || "11:56 AM";

  const getRiskLevel = () => {
    const totalDelay =
      Number(currentTrainDelay) + Number(delay);

    if (totalDelay <= 10) {
      return "Low";
    }

    if (totalDelay <= 20) {
      return "Medium";
    }

    return "High";
  };

  const riskLevel = getRiskLevel();

  return (
    <div className="page-animation page-container alerts-page">

      {/* PAGE HEADING */}

      <div className="page-heading">

        <span>SMART ALERTS</span>

        <h1>
          Train Notifications & Alerts
        </h1>

        <p>
          AI-powered notifications based on current
          train conditions and predictions.
        </p>

      </div>


      {/* ALERT SUMMARY */}

      <div className="alerts-summary">

        {/* CURRENT DELAY */}

        <div className="alert-summary-item">

          <div className="summary-small-icon delay">

            <Clock3 size={18} />

          </div>

          <div>

            <span>
              Current Delay
            </span>

            <strong>
              +{currentTrainDelay} min
            </strong>

          </div>

        </div>


        {/* AI FUTURE DELAY */}

        <div className="alert-summary-item">

          <div className="summary-small-icon future">

            <BrainCircuit size={18} />

          </div>

          <div>

            <span>
              AI Future Delay
            </span>

            <strong>
              +{delay} min
            </strong>

          </div>

        </div>


        {/* DELAY RISK */}

        <div className="alert-summary-item">

          <div className="summary-small-icon risk">

            <CircleAlert size={18} />

          </div>

          <div>

            <span>
              Delay Risk
            </span>

            <strong className="risk-text">

              {riskLevel}

            </strong>

          </div>

        </div>


        {/* PREDICTED ARRIVAL */}

        <div className="alert-summary-item">

          <div className="summary-small-icon eta">

            <Clock3 size={18} />

          </div>

          <div>

            <span>
              Predicted Arrival
            </span>

            <strong>

              {predictedETA}

            </strong>

          </div>

        </div>

      </div>


      {/* ALERT CARDS */}

      <div className="alerts-grid">


        {/* CURRENT DELAY ALERT */}

        <div className="alert-card warning-alert">

          <div className="alert-icon">

            <CircleAlert size={24} />

          </div>

          <div className="alert-content">

            <div className="alert-title-row">

              <h3>
                Current Train Delay
              </h3>

              <span className="alert-badge warning">

                ACTIVE

              </span>

            </div>

            <p>

              Train 12110 - Deccan Queen is currently
              delayed by approximately{" "}

              <strong>
                {currentTrainDelay} minutes
              </strong>

              .

            </p>

            <span className="alert-time">

              <Clock3 size={15} />

              Current railway status

            </span>

          </div>

        </div>


        {/* AI FUTURE DELAY */}

        <div className="alert-card info-alert">

          <div className="alert-icon">

            <BrainCircuit size={24} />

          </div>

          <div className="alert-content">

            <div className="alert-title-row">

              <h3>
                AI Future Delay Prediction
              </h3>

              <span className="alert-badge info">

                LIVE

              </span>

            </div>

            <p>

              The AI model predicts an additional{" "}

              <strong>
                {delay} minutes
              </strong>

              {" "}of possible delay at upcoming stations.

            </p>

            <span className="alert-time">

              <BrainCircuit size={15} />

              AI prediction active

            </span>

          </div>

        </div>


        {/* ETA UPDATE */}

        <div className="alert-card success-alert">

          <div className="alert-icon">

            <Clock3 size={24} />

          </div>

          <div className="alert-content">

            <div className="alert-title-row">

              <h3>
                ETA Updated
              </h3>

              <span className="alert-badge success">

                UPDATED

              </span>

            </div>

            <p>

              Scheduled arrival was{" "}

              <strong>
                11:38 AM
              </strong>

              . The AI currently predicts arrival at{" "}

              <strong>
                {predictedETA}
              </strong>

              .

            </p>

            <span className="alert-time">

              <Clock3 size={15} />

              Based on latest prediction

            </span>

          </div>

        </div>


        {/* NEXT STATION */}

        <div className="alert-card info-alert">

          <div className="alert-icon">

            <MapPin size={24} />

          </div>

          <div className="alert-content">

            <div className="alert-title-row">

              <h3>
                Approaching Next Station
              </h3>

              <span className="alert-badge info">

                LIVE

              </span>

            </div>

            <p>

              Train 12110 is currently travelling
              from Khopoli towards{" "}

              <strong>
                Panvel
              </strong>

              .

            </p>

            <span className="alert-time">

              <MapPin size={15} />

              Next station: Panvel

            </span>

          </div>

        </div>


        {/* SYSTEM STATUS */}

        <div className="alert-card success-alert">

          <div className="alert-icon">

            <CheckCircle2 size={24} />

          </div>

          <div className="alert-content">

            <div className="alert-title-row">

              <h3>
                AI Railway System Online
              </h3>

              <span className="alert-badge success">

                ONLINE

              </span>

            </div>

            <p>

              DynamicTrain ETA prediction, future delay
              analysis and live monitoring services
              are active.

            </p>

            <span className="alert-time">

              <CheckCircle2 size={15} />

              System operating normally

            </span>

          </div>

        </div>

      </div>


      {/* ACTION SECTION */}

      <div className="alert-action-card">

        <div>

          <h2>
            View Complete Train Intelligence
          </h2>

          <p>

            Check the live dashboard for route progress,
            AI predictions, train speed, delay trends
            and arrival analysis.

          </p>

        </div>

        <button
          className="primary-btn"
          onClick={() =>
            setActivePage("dashboard")
          }
        >

          View Dashboard

        </button>

      </div>

    </div>
  );
}

export default Alerts;