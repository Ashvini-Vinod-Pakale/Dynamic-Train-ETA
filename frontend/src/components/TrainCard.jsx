import { Train, ChevronRight } from "lucide-react";

function TrainCard({
  trainNumber,
  trainName,
  route,
  status,
  delay,
  onTrack,
}) {
  return (
    <div className="train-card">

      {/* TRAIN ICON */}
      <div className="train-card-icon">
        <Train size={24} />
      </div>

      {/* TRAIN DETAILS */}
      <div className="train-card-info">
        <h3>
          {trainNumber} - {trainName}
        </h3>

        <p>{route}</p>
      </div>

      {/* TRAIN STATUS */}
      <div className="train-card-status">

        <span className="status-label">
          Current Status
        </span>

        <strong
          className={
            status === "On Time"
              ? "on-time"
              : "delayed"
          }
        >
          {status === "On Time"
            ? "On Time"
            : `${delay} min delay`}
        </strong>

      </div>

      {/* TRACK BUTTON */}
      <button
        className="track-train-btn"
        onClick={onTrack}
      >
        Track Train
        <ChevronRight size={18} />
      </button>

    </div>
  );
}

export default TrainCard;