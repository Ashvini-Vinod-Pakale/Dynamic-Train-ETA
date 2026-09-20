import {
  formatTimeDisplay,
  calculatePredictedETA,
  calculateFinalArrivalDelay,
  formatDelayText,
  mapBackendTrainToUI,
} from "../services/trainMapper.js";

function runEtaConsistencyTests() {
  console.log("=== RUNNING ETA + TIME CONSISTENCY TESTS ===");

  // TEST 1: Running Delayed Train (Train 11009 & Train 11007 audit cases)
  {
    console.log("\n--- TEST 1: Running delayed trains (Audit cases: 11009 & 11007) ---");
    // Train 11009: Scheduled = 09:50 PM, Delay = 27 min -> 10:17 PM
    const eta11009 = calculatePredictedETA("09:50 PM", 27);
    console.log("Train 11009 Predicted ETA (09:50 PM + 27 min):", eta11009);
    if (eta11009 !== "10:17 PM") {
      throw new Error(`TEST 1 Failed: Expected "10:17 PM", got "${eta11009}"`);
    }

    // Train 11007: Scheduled = 11:05 AM, Delay = 11 min -> 11:16 AM (Must NOT be 03:03 AM)
    const eta11007 = calculatePredictedETA("11:05 AM", 11);
    console.log("Train 11007 Predicted ETA (11:05 AM + 11 min):", eta11007);
    if (eta11007 !== "11:16 AM") {
      throw new Error(`TEST 1 Failed: Expected "11:16 AM", got "${eta11007}"`);
    }
    console.log("✓ TEST 1 PASSED: Running delayed trains have mathematically consistent ETAs.");
  }

  // TEST 2: Not Started Train (On Time, 0 delay)
  {
    console.log("\n--- TEST 2: Not started train (Scheduled 06:00 AM, 0 delay) ---");
    const etaNotStarted = calculatePredictedETA("06:00 AM", 0);
    console.log("Not started Predicted ETA:", etaNotStarted);
    if (etaNotStarted !== "06:00 AM") {
      throw new Error(`TEST 2 Failed: Expected "06:00 AM", got "${etaNotStarted}"`);
    }
    console.log("✓ TEST 2 PASSED: Zero delay yields identical predicted and scheduled arrival.");
  }

  // TEST 3: Zero current delay + non-zero future delay
  {
    console.log("\n--- TEST 3: Zero current delay + 15 min future delay ---");
    const currentDelay = 0;
    const futureDelay = 15;
    const totalDelay = currentDelay + futureDelay;
    const etaFutureOnly = calculatePredictedETA("02:30 PM", totalDelay);
    console.log("Predicted ETA (02:30 PM + 15 min):", etaFutureOnly);
    if (etaFutureOnly !== "02:45 PM") {
      throw new Error(`TEST 3 Failed: Expected "02:45 PM", got "${etaFutureOnly}"`);
    }
    console.log("✓ TEST 3 PASSED: Expected/total delay properly accounts for future delay.");
  }

  // TEST 4: Completed Train Semantics
  {
    console.log("\n--- TEST 4: Completed train semantics ---");
    const backendData = {
      trainNumber: "11012",
      currentLocation: "CSMT",
      trainStatus: "completed",
      currentDelay: 18,
      futureDelay: 0,
      totalDelay: 18,
      expectedDelay: 18,
      actualArrival: "02:43 PM",
      route: [
        { stationName: "Pune", scheduledArrival: "10:00 AM", actualArrival: "10:00 AM" },
        { stationName: "CSMT", scheduledArrival: "02:25 PM", actualArrival: "02:43 PM" },
      ],
    };

    const uiTrain = mapBackendTrainToUI(backendData);
    console.log("Completed train scheduledArrival:", uiTrain.scheduledArrival);
    console.log("Completed train actualArrival:", uiTrain.actualArrival);
    console.log("Completed train totalDelay:", uiTrain.totalDelay);

    if (uiTrain.scheduledArrival !== "02:25 PM") {
      throw new Error(`TEST 4 Failed: Expected scheduledArrival "02:25 PM", got "${uiTrain.scheduledArrival}"`);
    }
    if (uiTrain.actualArrival !== "02:43 PM") {
      throw new Error(`TEST 4 Failed: Expected actualArrival "02:43 PM", got "${uiTrain.actualArrival}"`);
    }
    if (uiTrain.totalDelay !== 18) {
      throw new Error(`TEST 4 Failed: Expected totalDelay 18, got ${uiTrain.totalDelay}`);
    }
    console.log("✓ TEST 4 PASSED: Completed train preserves delays and actual arrival correctly.");
  }

  // TEST 5: Time Formatting Standardization (HH:MM AM/PM)
  {
    console.log("\n--- TEST 5: Time formatting standardization ---");
    const cases = [
      { input: "03:03 am", expected: "03:03 AM" },
      { input: "3:03 PM", expected: "03:03 PM" },
      { input: "02:24 am", expected: "02:24 AM" },
      { input: "04:13 pm", expected: "04:13 PM" },
      { input: "17:10", expected: "05:10 PM" },
      { input: "9:05", expected: "09:05 AM" },
      { input: "0:30", expected: "12:30 AM" },
      { input: "12:00", expected: "12:00 PM" },
      { input: "2026-09-17T21:50:00+05:30", expected: "09:50 PM" },
      { input: "2026-09-17T09:05:00", expected: "09:05 AM" },
      { input: "Arrived", expected: "Arrived" },
      { input: "--", expected: "Not available" },
      { input: "N/A", expected: "Not available" },
      { input: null, expected: "Not available" },
      { input: undefined, expected: "Not available" },
    ];

    for (const { input, expected } of cases) {
      const actual = formatTimeDisplay(input);
      if (actual !== expected) {
        throw new Error(`TEST 5 Failed: For input "${input}", expected "${expected}", got "${actual}"`);
      }
    }
    console.log("✓ TEST 5 PASSED: All time inputs standardize to uppercase HH:MM AM/PM.");
  }

  // TEST 6: Early Predicted ETA (Signed Arithmetic)
  {
    console.log("\n--- TEST 6: Early predicted ETA arithmetic ---");
    const etaEarly1 = calculatePredictedETA("10:00 AM", -10);
    console.log("10:00 AM with -10 min delay:", etaEarly1);
    if (etaEarly1 !== "09:50 AM") {
      throw new Error(`TEST 6 Failed: Expected "09:50 AM", got "${etaEarly1}"`);
    }

    const etaEarly2 = calculatePredictedETA("09:50 PM", -15);
    console.log("09:50 PM with -15 min delay:", etaEarly2);
    if (etaEarly2 !== "09:35 PM") {
      throw new Error(`TEST 6 Failed: Expected "09:35 PM", got "${etaEarly2}"`);
    }
    console.log("✓ TEST 6 PASSED: Early predicted arrivals correctly compute negative offsets.");
  }

  // TEST 7: Midnight Boundary Crossing
  {
    console.log("\n--- TEST 7: Midnight boundary crossing ---");
    const etaMidnight = calculatePredictedETA("11:45 PM", 30);
    console.log("11:45 PM + 30 min:", etaMidnight);
    if (etaMidnight !== "12:15 AM") {
      throw new Error(`TEST 7 Failed: Expected "12:15 AM", got "${etaMidnight}"`);
    }
    console.log("✓ TEST 7 PASSED: Midnight wrap-around handled correctly.");
  }

  // TEST 8: Signed Final Arrival Delay (Early / On Time / Delayed)
  {
    console.log("\n--- TEST 8: Signed finalArrivalDelay resolution ---");
    // Early arrival: scheduled 10:00 AM, actual 09:50 AM -> -10 min
    const diffEarly = calculateFinalArrivalDelay("10:00 AM", "09:50 AM");
    if (diffEarly !== -10) {
      throw new Error(`TEST 8 Failed: Expected -10, got ${diffEarly}`);
    }

    // On-time arrival: scheduled 10:00 AM, actual 10:00 AM -> 0 min
    const diffOnTime = calculateFinalArrivalDelay("10:00 AM", "10:00 AM");
    if (diffOnTime !== 0) {
      throw new Error(`TEST 8 Failed: Expected 0, got ${diffOnTime}`);
    }

    // Delayed arrival: scheduled 10:00 AM, actual 10:15 AM -> +15 min
    const diffDelayed = calculateFinalArrivalDelay("10:00 AM", "10:15 AM");
    if (diffDelayed !== 15) {
      throw new Error(`TEST 8 Failed: Expected 15, got ${diffDelayed}`);
    }

    // Early time comparison: scheduled 10:00 AM, actual 09:45 AM -> -15 min
    const diffEarly2 = calculateFinalArrivalDelay("10:00 AM", "09:45 AM");
    if (diffEarly2 !== -15) {
      throw new Error(`TEST 8 Failed: Expected -15, got ${diffEarly2}`);
    }

    // Midnight crossing: scheduled 11:50 PM, actual 12:20 AM -> +30 min
    const diffMidnight = calculateFinalArrivalDelay("11:50 PM", "12:20 AM");
    if (diffMidnight !== 30) {
      throw new Error(`TEST 8 Failed: Expected 30, got ${diffMidnight}`);
    }
    console.log("✓ TEST 8 PASSED: Signed finalArrivalDelay handles early, on time, delayed, and midnight crossing.");
  }

  // TEST 9: 3-State formatDelayText Helper
  {
    console.log("\n--- TEST 9: formatDelayText helper ---");
    if (formatDelayText(-8) !== "Early by 8 min") {
      throw new Error(`TEST 9 Failed: Expected "Early by 8 min", got "${formatDelayText(-8)}"`);
    }
    if (formatDelayText(0) !== "On Time") {
      throw new Error(`TEST 9 Failed: Expected "On Time", got "${formatDelayText(0)}"`);
    }
    if (formatDelayText(8) !== "+8 min") {
      throw new Error(`TEST 9 Failed: Expected "+8 min", got "${formatDelayText(8)}"`);
    }
    console.log("✓ TEST 9 PASSED: formatDelayText accurately formats Early, On Time, and Delayed.");
  }

  // TEST 10: UI Mapper with Early Train
  {
    console.log("\n--- TEST 10: UI Mapper with early train ---");
    const earlyTrainData = {
      trainNumber: "88991",
      trainName: "Test Express",
      currentLocation: "Station A",
      currentDelay: -7,
      futureDelay: 0,
      currentSpeed: 65,
    };
    const mapped = mapBackendTrainToUI(earlyTrainData);
    if (mapped.status !== "Early") {
      throw new Error(`TEST 10 Failed: Expected status "Early", got "${mapped.status}"`);
    }
    if (mapped.delay !== "Early by 7 min") {
      throw new Error(`TEST 10 Failed: Expected delay "Early by 7 min", got "${mapped.delay}"`);
    }
    console.log("✓ TEST 10 PASSED: mapBackendTrainToUI resolves Early status and delay text correctly.");
  }

  console.log("\n=== ALL ETA + TIME CONSISTENCY TESTS PASSED SUCCESSFULLY ===");
}

runEtaConsistencyTests();
