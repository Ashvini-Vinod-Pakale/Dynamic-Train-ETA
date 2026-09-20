import { useMemo } from "react";
import "./Alerts.css";
import {
  Bell,
  CircleAlert,
  Clock3,
  CheckCircle2,
  BrainCircuit,
  MapPin,
} from "lucide-react";
import { resolveTrainJourneyStatus, formatTimeDisplay } from "../services/trainMapper";

function Alerts({
  trains = [],
  selectTrain,
  predictedDelay,
  setActivePage,
  etaData,
  currentDelay,
  selectedTrain,
  liveTrainData,
  stations = [],
  stationPredictions = [],
}) {
  const activeTrain = liveTrainData || selectedTrain || null;

  const trainNumber =
    activeTrain?.number ||
    activeTrain?.trainNumber ||
    "";
  const trainName =
    activeTrain?.name ||
    activeTrain?.trainName ||
    (trainNumber ? `Train ${trainNumber}` : "");

  const destination =
    activeTrain?.destination ||
    (Array.isArray(stations) && stations.length > 0
      ? (stations[stations.length - 1]?.name || stations[stations.length - 1]?.stationName)
      : (Array.isArray(activeTrain?.routeStations) && activeTrain.routeStations.length > 0
        ? activeTrain.routeStations[activeTrain.routeStations.length - 1]
        : (Array.isArray(activeTrain?.stations) && activeTrain.stations.length > 0
          ? (activeTrain.stations[activeTrain.stations.length - 1]?.name || activeTrain.stations[activeTrain.stations.length - 1])
          : "--")));

  const rawStatusLower = (activeTrain?.trainStatus || activeTrain?.status || "").toLowerCase().trim();
  const isExplicitCompleted = [
    "completed",
    "terminated",
    "journey_completed",
    "reached",
    "arrived_destination",
    "arrived",
  ].includes(rawStatusLower) || (destination && destination !== "--" && activeTrain?.currentLocation && destination.toLowerCase() === activeTrain.currentLocation.trim().toLowerCase());

  const currentStation = (isExplicitCompleted && destination !== "--")
    ? destination
    : (activeTrain?.currentStation ||
       activeTrain?.currentLocation ||
       activeTrain?.source ||
       "--");

  const stationsList = Array.isArray(activeTrain?.stations) && activeTrain.stations.length > 0
    ? activeTrain.stations
    : (Array.isArray(activeTrain?.routeStations) ? activeTrain.routeStations : (Array.isArray(stations) ? stations : []));

  const totalStations = stationsList.length;

  const currentStationIndex = totalStations > 0
    ? (isExplicitCompleted
        ? totalStations - 1
        : stationsList.findIndex((stn) => {
            const name = (typeof stn === "object" && stn !== null ? (stn.name || stn.stationName) : String(stn)).toLowerCase();
            const curr = currentStation.toLowerCase();
            return name === curr || name.includes(curr) || curr.includes(name);
          }))
    : -1;

  const nextStation = isExplicitCompleted
    ? null
    : (liveTrainData?.nextStation ||
       (currentStationIndex >= 0 && currentStationIndex < totalStations - 1
         ? (typeof stationsList[currentStationIndex + 1] === "object"
           ? stationsList[currentStationIndex + 1].name
           : stationsList[currentStationIndex + 1])
         : selectedTrain?.destination || "--"));

  const journeyStatus = useMemo(() => {
    return resolveTrainJourneyStatus(activeTrain, {
      currentStation: { name: currentStation },
      nextStation: nextStation ? { name: nextStation } : null,
      currentStationIndex: currentStationIndex >= 0 ? currentStationIndex : 0,
      totalStations,
    });
  }, [activeTrain, currentStation, nextStation, currentStationIndex, totalStations]);

  const isCompleted = journeyStatus?.isCompleted === true;

  const destinationStationName =
    (Array.isArray(stations) && stations.length > 0 && (stations[stations.length - 1]?.name || stations[stations.length - 1]?.stationName)) ||
    (destination !== "--" ? destination : "");

  const destPredObj = (Array.isArray(stationPredictions) && stationPredictions.length > 0 && destinationStationName)
    ? (
        stationPredictions.find(
          (p) => p?.station?.trim().toLowerCase() === destinationStationName.trim().toLowerCase()
        ) ||
        stationPredictions.find(
          (p) => p?.station?.trim().toLowerCase().includes(destinationStationName.trim().toLowerCase()) ||
                 destinationStationName.trim().toLowerCase().includes(p?.station?.trim().toLowerCase())
        ) ||
        stationPredictions[stationPredictions.length - 1]
      )
    : null;

  const isDestPredValid = !isCompleted &&
    Boolean(destPredObj?.predictedETA) &&
    destPredObj.predictedETA !== "Not available" &&
    destPredObj.predictedETA !== "--";

  const finalArrivalDelay =
    etaData?.finalArrivalDelay != null
      ? Number(etaData.finalArrivalDelay)
      : (activeTrain?.finalArrivalDelay != null ? Number(activeTrain.finalArrivalDelay) : null);

  const delay = Number(
    liveTrainData?.futureDelay ??
    predictedDelay ??
    etaData?.futureDelay ??
    0
  );

  const currentTrainDelay = Number(
    liveTrainData?.currentDelay ??
    currentDelay ??
    etaData?.currentDelay ??
    0
  );

  const rawPredictedETA = isDestPredValid
    ? destPredObj.predictedETA
    : (etaData?.predictedETA ||
       liveTrainData?.predictedETA ||
       "--");

  const scheduledArrival = formatTimeDisplay(
    (destPredObj?.scheduledTime && destPredObj.scheduledTime !== "--")
      ? destPredObj.scheduledTime
      : (etaData?.scheduledArrival ||
         liveTrainData?.scheduledArrival ||
         selectedTrain?.scheduledArrival ||
         liveTrainData?.scheduledDeparture ||
         "--"),
    "--"
  );

  const displayArrival = (() => {
    if (isCompleted) {
      const actual =
        activeTrain?.actualArrival ||
        (rawPredictedETA && rawPredictedETA !== "--" && rawPredictedETA !== "N/A" ? rawPredictedETA : null);
      return actual ? formatTimeDisplay(actual) : "Arrived";
    }
    return formatTimeDisplay(rawPredictedETA);
  })();

  const predictedETA = displayArrival;

  const totalDelay = Number(
    (isCompleted && finalArrivalDelay != null)
      ? finalArrivalDelay
      : (isDestPredValid && destPredObj?.predictedDelay != null
          ? destPredObj.predictedDelay
          : (etaData?.expectedDelay ??
             etaData?.totalDelay ??
             liveTrainData?.expectedDelay ??
             liveTrainData?.totalDelay ??
             (currentTrainDelay + delay)))
  );

  const getRiskLevel = () => {
    if (totalDelay <= 10) {
      return "Low";
    }

    if (totalDelay <= 20) {
      return "Medium";
    }

    return "High";
  };

  const riskLevel = getRiskLevel();

  if (!trainNumber) {
    return (
      <div className="page-animation page-container alerts-page">
        <div className="page-heading">
          <span>SMART ALERTS</span>
          <h1 className="alerts-main-title">Train Notifications & Alerts</h1>
          <p>AI-powered notifications based on current train conditions and predictions.</p>
        </div>
        <div style={{ padding: "64px 24px", textAlign: "center", background: "#ffffff", borderRadius: "16px", border: "1px solid #e2e8f0", margin: "24px 0" }}>
          <Bell size={48} style={{ color: "#94a3b8", marginBottom: "16px" }} />
          <h2 style={{ fontSize: "1.25rem", fontWeight: "600", color: "#1e293b", marginBottom: "8px" }}>No Train Selected for Alerts</h2>
          <p style={{ color: "#64748b", maxWidth: "480px", margin: "0 auto", fontSize: "0.95rem" }}>
            Select an active train from the fleet on the Home or Search pages to view live system alerts and AI delay predictions.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-animation page-container alerts-page">

      {/* PAGE HEADING */}

      <div className="page-heading">

        <span>SMART ALERTS</span>

        <h1 className="alerts-main-title">
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
              {isCompleted ? "Arrival Delay" : "Current Delay"}
            </span>

            <strong>
              {isCompleted && finalArrivalDelay != null
                ? (finalArrivalDelay < 0 ? `Early by ${Math.abs(Math.round(finalArrivalDelay))} min` : (finalArrivalDelay === 0 ? "On Time" : `+${finalArrivalDelay.toFixed(0)} min`))
                : (currentTrainDelay < 0 ? `Early by ${Math.abs(Math.round(currentTrainDelay))} min` : (currentTrainDelay === 0 ? "On Time" : `+${currentTrainDelay.toFixed(1)} min`))}
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
              +{delay.toFixed(1)} min
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


        {/* PREDICTED ARRIVAL / ACTUAL ARRIVAL */}

        <div className="alert-summary-item">

          <div className="summary-small-icon eta">
            <Clock3 size={18} />
          </div>

          <div>

            <span>
              {isCompleted ? "Actual Arrival" : "Predicted Arrival"}
            </span>

            <strong>
              {displayArrival}
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
                {isCompleted ? "Latest Telemetry Delay" : "Current Train Delay"}
              </h3>

              <span className={`alert-badge ${isCompleted ? "info" : "warning"}`}>
                {isCompleted ? "TELEMETRY" : "ACTIVE"}
              </span>

            </div>

            <p>

              {isCompleted ? (
                currentTrainDelay < 0 ? (
                  <>
                    Train {trainNumber} - {trainName} was running ahead of schedule by approximately{" "}
                    <strong>{Math.abs(currentTrainDelay).toFixed(1)} minutes</strong> at its latest physical checkpoint.
                  </>
                ) : currentTrainDelay === 0 ? (
                  <>
                    Train {trainNumber} - {trainName} was on time at its latest physical checkpoint.
                  </>
                ) : (
                  <>
                    Train {trainNumber} - {trainName} reported a delay of approximately{" "}
                    <strong>{currentTrainDelay.toFixed(1)} minutes</strong> at its latest physical checkpoint.
                  </>
                )
              ) : (
                currentTrainDelay < 0 ? (
                  <>
                    Train {trainNumber} - {trainName} is currently running ahead of schedule by approximately{" "}
                    <strong>{Math.abs(currentTrainDelay).toFixed(1)} minutes</strong>.
                  </>
                ) : currentTrainDelay === 0 ? (
                  <>
                    Train {trainNumber} - {trainName} is currently running on time.
                  </>
                ) : (
                  <>
                    Train {trainNumber} - {trainName} is currently
                    delayed by approximately{" "}
                    <strong>{currentTrainDelay.toFixed(1)} minutes</strong>.
                  </>
                )
              )}

            </p>

            <span className="alert-time">

              <Clock3 size={15} />

              {isCompleted ? "Latest recorded checkpoint telemetry" : "Current railway status"}

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

              {liveTrainData?.delayAlert ? (
                <>
                  {liveTrainData.delayAlert}. Predicted additional{" "}
                  <strong>{delay.toFixed(1)} minutes</strong> of possible delay at upcoming stations.
                </>
              ) : (
                <>
                  The AI model predicts an additional{" "}
                  <strong>{delay.toFixed(1)} minutes</strong> of possible delay at upcoming stations.
                </>
              )}

            </p>

            <span className="alert-time">

              <BrainCircuit size={15} />

              AI prediction active

            </span>

          </div>

        </div>


        {/* ETA UPDATE / ARRIVAL STATUS */}

        <div className="alert-card success-alert">

          <div className="alert-icon">
            <Clock3 size={24} />
          </div>

          <div className="alert-content">

            <div className="alert-title-row">

              <h3>
                {isCompleted ? "Arrival Confirmed" : "ETA Updated"}
              </h3>

              <span className="alert-badge success">
                {isCompleted ? "ARRIVED" : "UPDATED"}
              </span>

            </div>

            <p>
              {isCompleted ? (
                <>
                  Scheduled arrival was <strong>{scheduledArrival}</strong>.{" "}
                  {displayArrival !== "Arrived" && displayArrival !== "--" ? (
                    <>
                      The train arrived at <strong>{displayArrival}</strong>
                      {finalArrivalDelay != null ? (
                        <> (Arrival delay: <strong>{finalArrivalDelay < 0 ? `Early by ${Math.abs(Math.round(finalArrivalDelay))} min` : (finalArrivalDelay === 0 ? "On Time" : `+${finalArrivalDelay.toFixed(0)} min`)}</strong>).</>
                      ) : (
                        "."
                      )}
                    </>
                  ) : (
                    <>The train has reached its destination.</>
                  )}
                </>
              ) : (
                <>
                  Scheduled arrival was{" "}
                  <strong>
                    {scheduledArrival}
                  </strong>
                  . The AI currently predicts arrival at{" "}
                  <strong>
                    {predictedETA}
                  </strong>
                  .
                </>
              )}
            </p>

            <span className="alert-time">

              <Clock3 size={15} />

              {isCompleted ? "Journey completed" : "Based on latest prediction"}

            </span>

          </div>

        </div>


        {/* NEXT STATION / DESTINATION REACHED */}

        <div className={`alert-card ${isCompleted ? "success-alert" : "info-alert"}`}>

          <div className="alert-icon">
            {isCompleted ? <CheckCircle2 size={24} /> : <MapPin size={24} />}
          </div>

          <div className="alert-content">

            <div className="alert-title-row">

              <h3>
                {isCompleted ? "Destination Reached" : "Approaching Next Station"}
              </h3>

              <span className={`alert-badge ${isCompleted ? "success" : "info"}`}>
                {isCompleted ? "COMPLETED" : "LIVE"}
              </span>

            </div>

            <p>
              {isCompleted ? (
                <>
                  Train {trainNumber} has reached{" "}
                  <strong>{destination !== "--" ? destination : currentStation}</strong>.
                </>
              ) : (
                <>
                  Train {trainNumber} is currently travelling
                  from {currentStation} towards{" "}
                  <strong>
                    {nextStation}
                  </strong>
                  .
                </>
              )}
            </p>

            <span className="alert-time">
              {isCompleted ? (
                <>
                  <CheckCircle2 size={15} />
                  Journey completed at {destination !== "--" ? destination : currentStation}
                </>
              ) : (
                <>
                  <MapPin size={15} />
                  Next station: {nextStation}
                </>
              )}
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

    </div>
  );
}

export default Alerts;