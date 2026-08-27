import { Search, Train, ChevronRight } from "lucide-react";

function SearchTrain({
  trains,
  searchQuery,
  setSearchQuery,
  selectTrain,
}) {
  const filteredTrains = trains.filter((train) =>
    `${train.number} ${train.name}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  return (
    <div className="page-animation page-container search-train-page">
      {/* PAGE HEADING */}
      <div className="page-heading">
        <span>TRAIN SEARCH</span>

        <h1>Find Your Train</h1>

        <p>
          Search by train number or train name to access
          live journey and prediction data.
        </p>
      </div>

      {/* SEARCH BOX */}
      <div className="search-page-box">

        <Search size={23} />

        <input
          value={searchQuery}
          onChange={(e) =>
            setSearchQuery(e.target.value)
          }
          placeholder="Enter train number or train name..."
        />

        <button className="primary-btn">
          Search Train
        </button>

      </div>

      {/* SEARCH RESULTS */}
      <div className="search-results">

        {filteredTrains.map((train) => (

          <div
            className="search-result-card"
            key={train.number}
          >

            <div className="result-train-icon">
              <Train size={30} />
            </div>

            <div className="result-info">

              <h3>
                {train.number} - {train.name}
              </h3>

              <p>{train.route}</p>

            </div>

            <div className="result-delay">

              <span>Current Status</span>

              <strong
                className={
                  train.status === "On Time"
                    ? "green-text"
                    : "orange-text"
                }
              >
                {train.delay}
              </strong>

            </div>

            <button
              className="view-btn"
              onClick={() => selectTrain(train)}
            >
              Track Train
              <ChevronRight size={17} />
            </button>

          </div>

        ))}

      </div>

    </div>
  );
}

export default SearchTrain;