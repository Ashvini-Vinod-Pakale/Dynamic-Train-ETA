import { calculateJourneyProgress } from "../services/trainMapper.js";

function runJourneyProgressTests() {
  console.log("=== RUNNING JOURNEY PROGRESS & CONTINUOUS POINTER TESTS ===");

  const fullRoute = [
    { name: "Station A", distanceKm: 0, isHalt: true, latitude: 18.94, longitude: 72.83 },
    { name: "Station X", distanceKm: 10, isHalt: false, latitude: 19.01, longitude: 72.84 },
    { name: "Station Y", distanceKm: 25, isHalt: false, latitude: 19.05, longitude: 72.88 },
    { name: "Station Z", distanceKm: 40, isHalt: false, latitude: 19.18, longitude: 72.97 },
    { name: "Station B", distanceKm: 50, isHalt: true, latitude: 19.24, longitude: 73.13 },
  ];

  const journeyHalts = [
    { name: "Station A", distanceKm: 0, isHalt: true },
    { name: "Station B", distanceKm: 50, isHalt: true },
  ];

  // TEST 1: Train at station A -> pointer at A (0.0)
  {
    console.log("\n--- TEST 1: Train at Station A ---");
    const res = calculateJourneyProgress({
      liveTrainData: { currentLocation: "Station A", currentSpeed: 0, trainStatus: "at_station" },
      fullRouteStations: fullRoute,
      journeyStations: journeyHalts,
      showFullJourney: false,
    });
    console.log("Test 1 Result:", res);
    if (res.timelineFractionalIndex !== 0) {
      throw new Error(`TEST 1 Failed: Expected 0, got ${res.timelineFractionalIndex}`);
    }
    console.log("✓ TEST 1 PASSED: Train at station A sits at index 0.0.");
  }

  // TEST 2: Train 25% between A and B (e.g. at 12.5 km)
  {
    console.log("\n--- TEST 2: Train 25% between A and B ---");
    const res = calculateJourneyProgress({
      liveTrainData: { currentLocation: "Station X", distanceCovered: 12.5, currentSpeed: 45 },
      fullRouteStations: fullRoute,
      journeyStations: journeyHalts,
      showFullJourney: false, // Main journey view
    });
    console.log("Test 2 Main Journey Fraction:", res.timelineFractionalIndex);
    if (Math.abs(res.timelineFractionalIndex - 0.25) > 0.001) {
      throw new Error(`TEST 2 Failed: Expected 0.25, got ${res.timelineFractionalIndex}`);
    }
    console.log("✓ TEST 2 PASSED: Train at 12.5 km is 25% along Main Journey (A -> B).");
  }

  // TEST 3: Train 70% between A and B (35 km)
  {
    console.log("\n--- TEST 3: Train 70% between A and B ---");
    const res = calculateJourneyProgress({
      liveTrainData: { currentLocation: "Station Y", distanceCovered: 35, currentSpeed: 60 },
      fullRouteStations: fullRoute,
      journeyStations: journeyHalts,
      showFullJourney: false,
    });
    console.log("Test 3 Main Journey Fraction:", res.timelineFractionalIndex);
    if (Math.abs(res.timelineFractionalIndex - 0.70) > 0.001) {
      throw new Error(`TEST 3 Failed: Expected 0.70, got ${res.timelineFractionalIndex}`);
    }
    console.log("✓ TEST 3 PASSED: Train at 35 km is 70% along Main Journey segment.");
  }

  // TEST 4: Train at B -> pointer exactly at B
  {
    console.log("\n--- TEST 4: Train at Station B ---");
    const res = calculateJourneyProgress({
      liveTrainData: { currentLocation: "Station B", currentSpeed: 0, trainStatus: "at_station" },
      fullRouteStations: fullRoute,
      journeyStations: journeyHalts,
      showFullJourney: false,
    });
    console.log("Test 4 Main Journey Fraction:", res.timelineFractionalIndex);
    if (res.timelineFractionalIndex !== 1.0) {
      throw new Error(`TEST 4 Failed: Expected 1.0, got ${res.timelineFractionalIndex}`);
    }
    console.log("✓ TEST 4 PASSED: Train at B aligns exactly with B (1.0).");
  }

  // TEST 5: Main Journey with pass-through stations -> pointer correctly placed between commercial halts
  {
    console.log("\n--- TEST 5: Main Journey with pass-through stations ---");
    // Train at Station Z (40 km). Halts are A (0 km) and B (50 km). Fraction should be 40/50 = 0.80
    const res = calculateJourneyProgress({
      liveTrainData: { currentLocation: "Station Z", distanceCovered: 40, currentSpeed: 50 },
      fullRouteStations: fullRoute,
      journeyStations: journeyHalts,
      showFullJourney: false,
    });
    console.log("Test 5 Main Journey Fraction at Station Z (40km):", res.timelineFractionalIndex);
    if (Math.abs(res.timelineFractionalIndex - 0.80) > 0.001) {
      throw new Error(`TEST 5 Failed: Expected 0.80, got ${res.timelineFractionalIndex}`);
    }
    console.log("✓ TEST 5 PASSED: Main Journey pointer placed at 0.80 without inserting pass-through stations.");
  }

  // TEST 6: Full Journey -> pointer correctly placed between physical route stations
  {
    console.log("\n--- TEST 6: Full Journey physical route positioning ---");
    // In full route: Y is index 2 (25 km), Z is index 3 (40 km).
    // Train at 35.5 km (which is 10.5 km into the 15 km segment Y->Z: 10.5/15 = 0.70).
    // Expected fullRouteFractionalIndex = 2 + 0.70 = 2.70
    const res = calculateJourneyProgress({
      liveTrainData: { currentLocation: "Station Y", distanceCovered: 35.5, currentSpeed: 55 },
      fullRouteStations: fullRoute,
      journeyStations: journeyHalts,
      showFullJourney: true,
    });
    console.log("Test 6 Full Journey Fraction:", res.timelineFractionalIndex);
    if (Math.abs(res.timelineFractionalIndex - 2.70) > 0.001) {
      throw new Error(`TEST 6 Failed: Expected 2.70, got ${res.timelineFractionalIndex}`);
    }
    console.log("✓ TEST 6 PASSED: Full Journey places pointer at 70% between physical stations Y (idx 2) and Z (idx 3).");
  }

  // TEST 7: Switching Main/Full Journey -> real train position remains unchanged
  {
    console.log("\n--- TEST 7: Switching Main / Full Journey consistency ---");
    const telemetry = { currentLocation: "Station Y", distanceCovered: 25, currentSpeed: 60 };
    const fullView = calculateJourneyProgress({
      liveTrainData: telemetry,
      fullRouteStations: fullRoute,
      journeyStations: journeyHalts,
      showFullJourney: true,
    });
    const mainView = calculateJourneyProgress({
      liveTrainData: telemetry,
      fullRouteStations: fullRoute,
      journeyStations: journeyHalts,
      showFullJourney: false,
    });

    console.log("Full view km covered:", fullView.currentKmCovered, "index:", fullView.timelineFractionalIndex);
    console.log("Main view km covered:", mainView.currentKmCovered, "index:", mainView.timelineFractionalIndex);

    if (fullView.currentKmCovered !== 25 || mainView.currentKmCovered !== 25) {
      throw new Error("TEST 7 Failed: Underlying km covered differs between views!");
    }
    // At 25 km, in Full Route Station Y is index 2.0. In Main Journey (0 to 50 km), 25 km is 0.50 (50%).
    if (fullView.timelineFractionalIndex !== 2.0) {
      throw new Error(`TEST 7 Failed: Expected 2.0 in full view, got ${fullView.timelineFractionalIndex}`);
    }
    if (mainView.timelineFractionalIndex !== 0.50) {
      throw new Error(`TEST 7 Failed: Expected 0.50 in main view, got ${mainView.timelineFractionalIndex}`);
    }
    console.log("✓ TEST 7 PASSED: Underlying train distance is identical (25 km); view maps correctly without resets.");
  }

  // TEST 8: Completed train -> pointer stays at destination
  {
    console.log("\n--- TEST 8: Completed train semantics ---");
    const resMain = calculateJourneyProgress({
      liveTrainData: { currentLocation: "Station B", trainStatus: "completed" },
      fullRouteStations: fullRoute,
      journeyStations: journeyHalts,
      showFullJourney: false,
      isCompletedJourney: true,
    });
    const resFull = calculateJourneyProgress({
      liveTrainData: { currentLocation: "Station B", trainStatus: "completed" },
      fullRouteStations: fullRoute,
      journeyStations: journeyHalts,
      showFullJourney: true,
      isCompletedJourney: true,
    });
    if (resMain.timelineFractionalIndex !== 1.0) {
      throw new Error(`TEST 8 Failed: Expected 1.0 on main, got ${resMain.timelineFractionalIndex}`);
    }
    if (resFull.timelineFractionalIndex !== 4.0) {
      throw new Error(`TEST 8 Failed: Expected 4.0 on full, got ${resFull.timelineFractionalIndex}`);
    }
    console.log("✓ TEST 8 PASSED: Completed train locks pointer at destination in both views.");
  }

  // TEST 9: Not-started train -> pointer stays at origin
  {
    console.log("\n--- TEST 9: Not-started train semantics ---");
    const res = calculateJourneyProgress({
      liveTrainData: { currentLocation: "Station A", trainStatus: "not_started" },
      fullRouteStations: fullRoute,
      journeyStations: journeyHalts,
      showFullJourney: false,
      isNotStarted: true,
    });
    if (res.timelineFractionalIndex !== 0.0) {
      throw new Error(`TEST 9 Failed: Expected 0.0, got ${res.timelineFractionalIndex}`);
    }
    console.log("✓ TEST 9 PASSED: Not-started train locks pointer at origin.");
  }

  // TEST 10: Missing progress data -> preserve safe existing behavior without fabricated movement
  {
    console.log("\n--- TEST 10: Missing progress data fallback ---");
    const res = calculateJourneyProgress({
      liveTrainData: { currentLocation: "Station Y" }, // No GPS, no distanceCovered, no routeDistance
      fullRouteStations: fullRoute,
      journeyStations: journeyHalts,
      showFullJourney: true,
    });
    console.log("Fallback Full Journey result:", res.timelineFractionalIndex);
    // Station Y is index 2
    if (res.timelineFractionalIndex !== 2.0) {
      throw new Error(`TEST 10 Failed: Expected 2.0, got ${res.timelineFractionalIndex}`);
    }
    console.log("✓ TEST 10 PASSED: Missing telemetry falls back cleanly to checkpoint without fake movement.");
  }

  console.log("\n=== ALL 10 JOURNEY PROGRESS TESTS PASSED SUCCESSFULLY ===");
}

runJourneyProgressTests();
