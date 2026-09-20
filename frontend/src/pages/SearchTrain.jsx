import { Search, Train, ArrowRight, X } from "lucide-react";
import "./SearchTrain.css";

function SearchTrain({
  trains = [],
  searchQuery = "",
  setSearchQuery,
  selectTrain,
}) {
  const isSearching = searchQuery.trim().length > 0;

  const filteredTrains = isSearching
    ? trains.filter((train) =>
        `${train.number || train.trainNumber || ""} ${train.name || train.trainName || ""} ${train.currentLocation || ""} ${train.nextStation || ""}`
          .toLowerCase()
          .includes(searchQuery.trim().toLowerCase())
      )
    : trains;

  const handleClear = () => {
    if (setSearchQuery) {
      setSearchQuery("");
    }
  };

  const getTrainRouteEndpoints = (train) => {
    const origin = train.source || train.origin || (train.routeStations && train.routeStations.length > 0 ? train.routeStations[0] : "");
    const destination = train.destination || (train.routeStations && train.routeStations.length > 0 ? train.routeStations[train.routeStations.length - 1] : "");
    if (origin && destination) {
      return { origin, destination };
    }
    const route = train.route;
    if (!route) return { origin: origin || "Origin", destination: destination || "Destination" };
    const parts = route.includes("→")
      ? route.split("→")
      : route.includes("->")
      ? route.split("->")
      : route.includes(" to ")
      ? route.split(" to ")
      : route.includes(" - ")
      ? route.split(" - ")
      : [route];

    if (parts.length >= 2) {
      return {
        origin: origin || parts[0].trim(),
        destination: destination || parts[parts.length - 1].trim(),
      };
    }
    return { origin: origin || route.trim(), destination: destination || "" };
  };

  return (
    <div className="search-train-page">
      {/* 1. PAGE HEADER */}
      <header className="search-train-header">
        <div className="search-train-eyebrow">
          <span className="search-train-eyebrow-dot" />
          SEARCH TRAIN
        </div>

        <h1 className="search-train-title">Find Your Train</h1>

        <p className="search-train-desc">
          Search by train number or train name to view live journey information.
        </p>
      </header>

      {/* 2. SEARCH BAR (Primary interactive control) */}
      <div className="search-train-search-container">
        <div className="search-train-search-box">
          <div className="search-train-search-icon">
            <Search size={21} />
          </div>

          <input
            type="text"
            className="search-train-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery && setSearchQuery(e.target.value)}
            placeholder="Enter train number or train name..."
            autoComplete="off"
            spellCheck="false"
          />

          {searchQuery && (
            <button
              type="button"
              className="search-train-clear-btn"
              onClick={handleClear}
              aria-label="Clear search"
              title="Clear search"
            >
              <X size={16} />
            </button>
          )}

          <button
            type="button"
            className="search-train-search-btn"
            tabIndex={-1}
            aria-label="Search"
          >
            <Search size={15} />
            <span>Search</span>
          </button>
        </div>
      </div>

      {/* 3. SEARCH RESULTS & MONITORED FLEET */}
      <section className="search-train-results-section">
        <div className="search-train-results-header">
          <span className="search-train-results-label">
            {isSearching ? "SEARCH RESULTS" : "MONITORED REAL FLEET"}
          </span>
          <span className="search-train-results-count">
            {filteredTrains.length}{" "}
            {filteredTrains.length === 1 ? "TRAIN ACTIVE" : "TRAINS ACTIVE"}
          </span>
        </div>

        {filteredTrains.length > 0 ? (
          <div className="search-train-results-list">
            {filteredTrains.map((train) => {
              const currentDel = Number(train.currentDelay ?? 0);
              const isEarly =
                train.status?.toLowerCase().includes("early") ||
                (train.delay && train.delay.toLowerCase().includes("early")) ||
                currentDel < 0;
              const isDelayed =
                !isEarly &&
                (train.status?.toLowerCase().includes("delayed") ||
                  (train.delay &&
                    train.delay.toLowerCase() !== "on time" &&
                    train.delay !== "0 min" &&
                    train.delay !== "+0 min" &&
                    train.delay.includes("+")) ||
                  currentDel > 0);

              const { origin, destination } = getTrainRouteEndpoints(train);

              return (
                <article className="search-train-card" key={train.number || train.trainNumber}>
                  {/* LEFT: Train Icon, Number, Name */}
                  <div className="search-train-card-left">
                    <div className="search-train-icon-wrapper">
                      <Train size={20} />
                    </div>
                    <div className="search-train-identity">
                      <span className="search-train-number">
                        {train.number || train.trainNumber}
                      </span>
                      <h3 className="search-train-name">{train.name || train.trainName}</h3>
                    </div>
                  </div>

                  {/* MIDDLE: Route line (Origin ─────────→ Destination) */}
                  <div className="search-train-card-middle">
                    <div className="search-train-route">
                      <div className="search-train-station origin">
                        <span className="search-train-node" />
                        <span className="search-train-station-name">
                          {origin}
                        </span>
                      </div>

                      <div className="search-train-track">
                        <div className="search-train-track-line" />
                        <ArrowRight
                          size={13}
                          className="search-train-track-arrow"
                        />
                      </div>

                      {destination && (
                        <div className="search-train-station destination">
                          <span className="search-train-node" />
                          <span className="search-train-station-name">
                            {destination}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* RIGHT: Status, Delay, Track Train button */}
                  <div className="search-train-card-right">
                    <div className="search-train-status-wrap">
                      <div
                        className={`search-train-status-badge ${
                          isEarly ? "status-early" : (isDelayed ? "status-delayed" : "status-ontime")
                        }`}
                      >
                        <span className="search-train-status-dot" />
                        <span>{isEarly ? "EARLY" : (isDelayed ? "DELAYED" : "ON TIME")}</span>
                      </div>

                      <span
                        className={`search-train-delay-text ${
                          isEarly ? "status-early" : (isDelayed ? "status-delayed" : "status-ontime")
                        }`}
                      >
                        Delay: {isEarly ? train.delay || `Early by ${Math.abs(Math.round(currentDel))} min` : (isDelayed ? train.delay || (train.currentDelay ? `+${Math.round(train.currentDelay)} min` : "Delayed") : "0 min")}
                      </span>
                    </div>

                    <button
                      type="button"
                      className="search-train-track-btn"
                      onClick={() => selectTrain && selectTrain(train)}
                    >
                      <span>Track Train</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          /* 4. NO RESULTS / EMPTY STATE */
          <div className="search-train-no-results">
            <div className="search-train-no-results-icon-box">
              <Search size={26} />
            </div>
            <h2 className="search-train-no-results-title">
              {isSearching ? "No trains found" : "No monitored trains active"}
            </h2>
            <p className="search-train-no-results-desc">
              {isSearching
                ? "Try searching with a different train number or station."
                : "The real backend fleet is currently empty. Trains will appear once polled from RailRadar."}
            </p>
          </div>
        )}
      </section>

      {/* 4. DECORATIVE RAILWAY VISUAL COMPOSITION (Lightweight Background Architecture) */}
      <div className="search-train-network-decoration" aria-hidden="true">
        <div className="search-train-network-svg-wrap">
          <svg className="search-train-network-svg" viewBox="0 0 760 100" fill="none">
            <defs>
              <linearGradient id="searchTrunkGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#2563eb" stopOpacity="0.10" />
                <stop offset="30%" stopColor="#3b82f6" stopOpacity="0.32" />
                <stop offset="70%" stopColor="#6366f1" stopOpacity="0.32" />
                <stop offset="100%" stopColor="#2563eb" stopOpacity="0.10" />
              </linearGradient>
              <linearGradient id="searchReliefGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.08" />
                <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#6366f1" stopOpacity="0.08" />
              </linearGradient>
            </defs>

            {/* Relief / Bypass Tracks */}
            <path
              d="M 20 80 Q 200 85, 380 40 T 740 20"
              stroke="url(#searchReliefGrad)"
              strokeWidth="2"
              strokeDasharray="5 5"
              className="search-network-dash-line"
            />
            <path
              d="M 20 20 Q 220 15, 380 60 T 740 80"
              stroke="url(#searchTrunkGrad)"
              strokeWidth="2"
              strokeDasharray="5 5"
              className="search-network-dash-line reverse"
            />

            {/* Primary Railway Trunk Corridor */}
            <path
              d="M 20 50 C 200 50, 240 20, 380 50 C 520 80, 560 50, 740 50"
              stroke="url(#searchTrunkGrad)"
              strokeWidth="2.5"
            />

            {/* Station Nodes along Trunk Line */}
            <circle cx="20" cy="50" r="4" fill="#ffffff" stroke="#2563eb" strokeWidth="2.5" />

            <circle cx="190" cy="46" r="3.5" fill="#ffffff" stroke="#3b82f6" strokeWidth="2" />
            <circle cx="190" cy="46" r="7" stroke="rgba(59, 130, 246, 0.25)" strokeWidth="1" />

            <circle cx="380" cy="50" r="5.5" fill="#ffffff" stroke="#6366f1" strokeWidth="3" />
            <circle cx="380" cy="50" r="10" stroke="rgba(99, 102, 241, 0.25)" strokeWidth="1.5" />
            <circle cx="380" cy="50" r="6" fill="rgba(99, 102, 241, 0.35)" className="search-network-beacon" />

            <circle cx="570" cy="54" r="3.5" fill="#ffffff" stroke="#3b82f6" strokeWidth="2" />
            <circle cx="570" cy="54" r="7" stroke="rgba(59, 130, 246, 0.25)" strokeWidth="1" />

            <circle cx="740" cy="50" r="4" fill="#ffffff" stroke="#2563eb" strokeWidth="2.5" />
          </svg>
        </div>

        {/* Minimal Railway Corridor Tags */}
        <div className="search-train-network-tags">
          <span className="search-network-tag">
            <span className="search-network-dot" />
            Western Sector
          </span>
          <span className="search-network-tag purple">
            <span className="search-network-dot" />
            Central Rail Corridor
          </span>
          <span className="search-network-tag">
            <span className="search-network-dot" />
            Eastern Express
          </span>
        </div>
      </div>
    </div>
  );
}

export default SearchTrain;