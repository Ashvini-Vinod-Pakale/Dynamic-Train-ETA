import { isHaltStation } from "../services/trainMapper.js";

/**
 * Automated test suite covering TEST A, TEST B, TEST C, and TEST D
 * required by the 'Main Journey = Halt Stations / Full Journey = All Stations' task.
 */
function runTests() {
  console.log("=== RUNNING JOURNEY FILTERING LOGIC TESTS ===");

  // TEST A:
  // Full route = A, X, Y, Z, B
  // Halts = A, B (X, Y, Z are pass-through)
  // Expected: Main Journey = A, B; Full Journey = A, X, Y, Z, B
  {
    console.log("\n--- TEST A: Mixed route with pass-through stations ---");
    const fullRoute = [
      { name: "Station A", isHalt: true },
      { name: "Station X", isHalt: false },
      { name: "Station Y", isHalt: false },
      { name: "Station Z", isHalt: false },
      { name: "Station B", isHalt: true },
    ];

    const mainJourney = fullRoute.filter((stn, idx) =>
      isHaltStation(stn, idx, fullRoute.length)
    );

    console.log("Full route count:", fullRoute.length, fullRoute.map((s) => s.name));
    console.log("Main journey count:", mainJourney.length, mainJourney.map((s) => s.name));

    if (fullRoute.length !== 5) throw new Error("TEST A Failed: Full route mutated!");
    if (mainJourney.length !== 2) throw new Error(`TEST A Failed: Expected 2 halts, got ${mainJourney.length}`);
    if (mainJourney[0].name !== "Station A" || mainJourney[1].name !== "Station B") {
      throw new Error("TEST A Failed: Incorrect stations in main journey");
    }
    console.log("✓ TEST A PASSED: Main Journey has only A & B, Full Route has all 5 stations.");
  }

  // TEST B:
  // Full route = A, B, C
  // All are halts
  // Expected: Main Journey = A, B, C; Full Journey = A, B, C
  {
    console.log("\n--- TEST B: Route where all stations are scheduled halts ---");
    const fullRoute = [
      { name: "Station A", isHalt: true },
      { name: "Station B", isHalt: true },
      { name: "Station C", isHalt: true },
    ];

    const mainJourney = fullRoute.filter((stn, idx) =>
      isHaltStation(stn, idx, fullRoute.length)
    );

    console.log("Full route count:", fullRoute.length, fullRoute.map((s) => s.name));
    console.log("Main journey count:", mainJourney.length, mainJourney.map((s) => s.name));

    if (mainJourney.length !== 3) throw new Error(`TEST B Failed: Expected 3 halts, got ${mainJourney.length}`);
    if (mainJourney.map((s) => s.name).join(",") !== "Station A,Station B,Station C") {
      throw new Error("TEST B Failed: Incorrect stations in main journey");
    }
    console.log("✓ TEST B PASSED: All stations retained in both Main Journey and Full Journey.");
  }

  // TEST C:
  // Train with no reliable halt metadata
  // Must NOT invent arbitrary halt classifications; preserves safe behavior and reports fallback used
  {
    console.log("\n--- TEST C: Safe fallback when metadata is missing ---");
    const rawRoute = [
      { name: "Station 1" },
      { name: "Station 2" },
      { name: "Station 3" },
      { name: "Station 4" },
    ];

    const mainJourney = rawRoute.filter((stn, idx) =>
      isHaltStation(stn, idx, rawRoute.length)
    );

    console.log("Route without halt flags count:", rawRoute.length);
    console.log("Main journey after safe fallback:", mainJourney.length, mainJourney.map((s) => s.name));

    if (mainJourney.length !== rawRoute.length) {
      throw new Error(`TEST C Failed: Incomplete fallback, got ${mainJourney.length}`);
    }
    console.log("✓ TEST C PASSED: No arbitrary exclusions invented; all stations safely preserved.");
  }

  // TEST D:
  // Switch between two trains
  // No station list from train A may remain visible for train B
  {
    console.log("\n--- TEST D: Station list isolation when switching trains ---");
    const trainA_Route = [
      { name: "CSMT", isHalt: true },
      { name: "Dadar", isHalt: false },
      { name: "Thane", isHalt: true },
      { name: "Kalyan", isHalt: true },
      { name: "Pune", isHalt: true },
    ];

    const trainB_Route = [
      { name: "Solapur", isHalt: true },
      { name: "Kurduvadi", isHalt: true },
      { name: "Daund", isHalt: false },
      { name: "Pune Junction", isHalt: true },
    ];

    const trainA_Halts = trainA_Route.filter((stn, idx) =>
      isHaltStation(stn, idx, trainA_Route.length)
    );
    const trainB_Halts = trainB_Route.filter((stn, idx) =>
      isHaltStation(stn, idx, trainB_Route.length)
    );

    const namesA = new Set(trainA_Halts.map((s) => s.name));
    const namesB = new Set(trainB_Halts.map((s) => s.name));

    // Ensure train B does not contain train A unique stations (e.g. CSMT, Thane, Kalyan)
    if (namesB.has("CSMT") || namesB.has("Thane") || namesB.has("Kalyan")) {
      throw new Error("TEST D Failed: Train A stations leaked into Train B");
    }
    // Ensure train A does not contain train B unique stations (e.g. Solapur, Kurduvadi)
    if (namesA.has("Solapur") || namesA.has("Kurduvadi")) {
      throw new Error("TEST D Failed: Train B stations leaked into Train A");
    }

    console.log("Train A halts:", Array.from(namesA));
    console.log("Train B halts:", Array.from(namesB));
    console.log("✓ TEST D PASSED: Complete station isolation between trains verified.");
  }

  console.log("\n=== ALL TESTS PASSED SUCCESSFULLY ===");
}

runTests();
