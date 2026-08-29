import {
  Activity,
  Search,
  ChevronRight,
  Train,
  Navigation,
  Clock3,
  BrainCircuit,
} from "lucide-react";

import StatCard from "../components/StatCard";
import trainImage from "../assets/image.png";

function Home({
  trains,
  etaData,
  selectTrain,
  setActivePage,
  liveTrainData,
}) {

  const currentDelay =
    Number(liveTrainData?.currentDelay ?? 0);

  const confidenceScore =
    Number(liveTrainData?.confidenceScore ?? 0);

  return (
    <div className="page-animation">

      {/* HERO SECTION */}
      <section className="hero-section">

        {/* LEFT HERO CONTENT */}
        <div className="hero-content">

          <div className="hero-badge">
            <Activity size={15} />
            AI-Powered Railway Intelligence
          </div>

          <h1>
            Predict Every Journey
            <span> Before It Happens.</span>
          </h1>

          <p>
            Dynamic Train ETA uses intelligent prediction to estimate
            arrival times, analyze delays, and track train journeys
            in real time.
          </p>

          <div className="hero-actions">

            <button
              className="primary-btn"
              onClick={() => setActivePage("search")}
            >
              <Search size={18} />
              Search Train
            </button>

            <button
              className="secondary-btn"
              onClick={() => setActivePage("dashboard")}
            >
              View Live Dashboard
              <ChevronRight size={18} />
            </button>

          </div>

          <div className="hero-stats">

            <div>
              <strong>24/7</strong>
              <span>Live Monitoring</span>
            </div>

            <div>
              <strong>AI</strong>
              <span>Delay Prediction</span>
            </div>

            <div>
              <strong>99%</strong>
              <span>System Availability</span>
            </div>

          </div>

        </div>

        {/* =====================================
            HERO TRAIN IMAGE SECTION
        ===================================== */}

        <div className="hero-visual">

          {/* TRAIN IMAGE */}
          <img
            src={trainImage}
            alt="Train travelling on railway track"
            className="hero-train-image"
          />

          {/* DARK IMAGE OVERLAY */}
          <div className="hero-image-overlay"></div>

          {/* LIVE STATUS */}
          <div className="hero-live-status">
            <span></span>
            LIVE
          </div>

          {/* TRAIN INFORMATION */}
          <div className="hero-train-info">

            <span className="tracking-label">
              CURRENTLY TRACKING
            </span>

            <h2>12110</h2>

            <h3>Deccan Queen</h3>

            <p>
              Pune <span>→</span> Mumbai
            </p>

          </div>

          {/* BOTTOM STATISTICS */}
          <div className="hero-image-stats">

            <div>
              <span>Current Speed</span>

              <strong>
                {Number(
                  liveTrainData?.currentSpeed ?? 0
                ).toFixed(1)} km/h
              </strong>
            </div>


            <div>
              <span>Current Delay</span>

              <strong className="orange-text">
                +{Number(
                  liveTrainData?.currentDelay ?? 0
                ).toFixed(1)} min
              </strong>
            </div>


            <div>
              <span>Confidence</span>

              <strong className="green-text">
                {Number(
                  liveTrainData?.confidenceScore ??
                  etaData?.confidenceScore ??
                  0
                ).toFixed(2)}%
              </strong>
            </div>

          </div>

        </div>

      </section>


      {/* =====================================
          POPULAR TRAINS
      ===================================== */}

      <section className="home-section">

        <div className="section-title">

          <div>
            <span>LIVE NETWORK</span>
            <h2>Popular Train Tracking</h2>
          </div>

          <button
            onClick={() => setActivePage("search")}
          >
            View All
            <ChevronRight size={17} />
          </button>

        </div>


        <div className="popular-trains-grid">

          {trains.map((train, index) => (

            <div
              className="popular-train-card"
              key={train.number}
              style={{
                animationDelay: `${index * 0.1}s`,
              }}
              onClick={() => selectTrain(train)}
            >

              <div className="train-card-header">

                <div className="train-number-icon">
                  <Train size={21} />
                </div>

                <span
                  className={
                    train.status === "On Time"
                      ? "status-green"
                      : "status-orange"
                  }
                >
                  {train.status}
                </span>

              </div>


              <h3>{train.number}</h3>

              <h4>{train.name}</h4>

              <p>{train.route}</p>


              <div className="train-card-bottom">

                <span>{train.delay}</span>

                <ChevronRight size={19} />

              </div>

            </div>

          ))}

        </div>

      </section>


      {/* =====================================
          INSIGHT CARDS
      ===================================== */}

      <section className="insight-grid">

        <StatCard
          icon={Navigation}
          label="ACTIVE TRAINS"
          value="1,248"
          description="Being monitored across the network"
          cardClass="blue-card"
        />

        <StatCard
          icon={Clock3}
          label="AVERAGE DELAY"
          value={`${currentDelay.toFixed(1)} min`}
          description="Based on current railway conditions"
          cardClass="orange-card"
        />

        <StatCard
          icon={BrainCircuit}
          label="PREDICTION CONFIDENCE"
          value={`${confidenceScore.toFixed(1)}%`}
          description="AI model prediction confidence"
          cardClass="green-card"
        />

      </section>

    </div>
  );
}

export default Home;