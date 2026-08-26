import { jest } from '@jest/globals';
import fetch from "node-fetch";
import initSqlJs from 'sql.js';
import { initialiseDB, loadMission } from '../api/sql.js';
import { QueryEngine } from '../missions/manager/query/queryEngine.js';
import { SelectHandler } from '../missions/manager/query/selectHandler.js';
import { RepairReconciler } from "../missions/manager/query/repairReconciler.js";
import { RepairEfficiencyTracker } from '../missions/manager/query/repairEfficiencyTracker.js';


global.fetch = fetch;

// ---------------- Mock Classes ----------------
// Simple mocks to emulate display and mission manager behaviour

class MockDisplay {
    printCommand() {}
    printError(msg) { this.lastError = msg; } 
    printResult(msg) { this.lastResult = msg; } 
    printData() {}
    renderQueryResults() {}
    renderSystemModules() {}
}

class MockMissionManager {
    constructor(mission) {

        // Clone mission to avoid test contamination
        this.currentMission = JSON.parse(JSON.stringify(mission));
        this.currentMission.summary = this.currentMission.summary || {};
        this.currentMission.summary.repair = this.currentMission.summary.repair || {};
        this.stageIndex = 0;

        // ---------------- Rulebook Stub ----------------
        // Minimal implementation for tests
        this.rulebook = {
            modules: {
                items: {
                    Airlock: { fields: ["pressure", "temperature", "status"] },
                    TestModule: { fields: ["value"] }
                }
            },
            isFieldFaulty: (field, value) => value < 0  
        };

        this.repairReconciler = new RepairReconciler(this);

        this.gameManager = {
            statsManager: { recordRepair: jest.fn() } 
        };

        this.display = new MockDisplay();
        this._systemUpdates = {};
    }

    // ---------------- Stage/Module Helpers ----------------
    getCurrentStage() { 
        return { name: "Repair" }; 
    }
    getModule(name) { 
        return this.currentMission.modules.find(m => m.name === name); 
    }
    hasRule() { 
        return false; 
    } 
    handleCriticalRepairOrderViolation() { 
        return false; 
    }
    updateStageProgress() {}
    tryAdvanceStage() {}
}

// ---------------- Test Data ----------------
const testMission = {
    ignoredFields: ["issue_detected", "repaired"],
    modules: [
        {
            name: "Airlock",
            fields: ["pressure", "temperature", "status", "issue_detected", "repaired"],
            rows: [
                { id: 1, pressure: 30, temperature: 60, status: "online", issue_detected: 0, repaired: 0 },
                { id: 2, pressure: -10, temperature: 55, status: "online", issue_detected: 1, repaired: 0 }
            ]
        }
    ]
};

// ---------------- Test Setup ----------------
beforeAll(async () => {
    globalThis.window = { initSqlJs };
    await initialiseDB();       
    await loadMission(testMission); 
}, 20000);  

describe("QueryEngine Logic Tests", () => {
    let engine;
    let missionManager;
    let display;

    beforeEach(() => {
        display = new MockDisplay();
        missionManager = new MockMissionManager(JSON.parse(JSON.stringify(testMission)));
        engine = new QueryEngine(missionManager, display, new SelectHandler(missionManager));
    });

    // ---------------- SELECT Tests ----------------
    test("SELECT command returns correct rows", async () => {
        await engine.execute("SELECT * FROM Airlock;");
        expect(display.lastError).toBeUndefined();
    });

    // ---------------- UPDATE/Repair Tests ----------------
    test("Repaired field updated by repairReconciler", async () => {
        await engine.execute("UPDATE Airlock SET pressure = 50 WHERE id = 2;");
        const row = missionManager.getModule("Airlock").rows.find(r => r.id === 2);
        expect(row.repaired).toBe(true);
    });

    // ---------------- Check that updating disallowed field doesn't work ----------------
    test("Cannot update disallowed fields", async () => {
        await engine.execute("UPDATE Airlock SET issue_detected = 1 WHERE id = 1;", ["pressure"]);
        expect(display.lastError).toMatch(/You cannot update field/);
    });

    // ---------------- Invalid SQL test ----------------
    test("Invalid SQL shows error", async () => {
        await engine.execute("UPDATE MissingTable SET x=1;");
        expect(display.lastError).toBeDefined();
    });

    // ---------------- Check flags and stats after repair ----------------
    test("correct repair updates repaired flag and stats", async () => {
        const mission = {
            ignoredFields: [],
            modules: [
                {
                    name: "TestModule",
                    fields: ["value"],
                    rows: [{ id: 1, value: -5, issue_detected: true, repaired: false }]
                }
            ]
        };

        await initialiseDB();
        await loadMission(mission);

        const manager = new MockMissionManager(mission);
        const engine = new QueryEngine(manager, new MockDisplay(), new SelectHandler(manager));

        await engine.execute("UPDATE TestModule SET value = 10 WHERE id = 1;");

        const row = manager.getModule("TestModule").rows[0];

        expect(row.repaired).toBe(true);
        expect(manager.currentMission.summary.repair.totalFieldsRepaired).toBeGreaterThan(0);
        expect(manager.gameManager.statsManager.recordRepair).toHaveBeenCalled();
    });

    // ---------------- Extra Faults / Efficiency Tests ----------------
    test("introducing a fault increases extraFaults", async () => {
        const mission = {
            ignoredFields: [],
            modules: [
                {
                    name: "TestModule",
                    fields: ["value"],
                    rows: [{ id: 1, value: 10 }]
                }
            ]
        };

        await initialiseDB();
        await loadMission(mission);

        const manager = new MockMissionManager(mission);
        const engine = new QueryEngine(manager, new MockDisplay(), new SelectHandler(manager));

        await engine.execute("UPDATE TestModule SET value = -5 WHERE id = 1;");

        expect(manager.currentMission.summary.repair.extraFaults).toBeGreaterThan(0);
    });

    test("efficiency decreases when non-faulty field updated", async () => {
        const mission = {
            ignoredFields: [],
            modules: [
                {
                    name: "TestModule",
                    fields: ["value"],
                    rows: [{ id: 1, value: 10 }]
                }
            ]
        };

        await initialiseDB();
        await loadMission(mission);

        const manager = new MockMissionManager(mission);
        const engine = new QueryEngine(manager, new MockDisplay(), new SelectHandler(manager));

        await engine.execute("UPDATE TestModule SET value = 20 WHERE id = 1;");

        expect(manager.currentMission.summary.repair.totalFieldsUpdated).toBeGreaterThan(0);
        expect(manager.currentMission.repairEfficiency.score).toBeLessThan(100);
    });

    // ---------------- RepairEfficiencyTracker Tests ----------------
    test("RepairEfficiencyTracker accumulates penalties correctly", () => {
        const tracker = new RepairEfficiencyTracker();
        tracker.penaliseNonFaultyUpdate(2);
        tracker.penaliseNewFaultSpawn(1);

        const efficiency = tracker.getEfficiency();
        const breakdown = tracker.getPenaltyBreakdown();

        expect(efficiency).toBe(100 - (2 * 5 + 1 * 10));
        expect(breakdown.nonFaultyUpdates).toBe(2);
        expect(breakdown.newFaultSpawns).toBe(1);
        expect(breakdown.totalPenalty).toBe(20);
    });

    // ---------------- Edge Cases ----------------
    test("repairing already repaired field does not double count", async () => {
        const mission = {
            ignoredFields: [],
            modules: [
                {
                    name: "TestModule",
                    fields: ["value"],
                    rows: [
                        { id: 1, value: -5, issue_detected: true, repaired: false }
                    ]
                }
            ]
        };

        await initialiseDB();
        await loadMission(mission);

        const manager = new MockMissionManager(mission);
        const engine = new QueryEngine(manager, new MockDisplay(), new SelectHandler(manager));

        await engine.execute("UPDATE TestModule SET value = 10 WHERE id = 1;");
        await engine.execute("UPDATE TestModule SET value = 20 WHERE id = 1;");

        const summary = manager.currentMission.summary.repair;

        expect(summary.totalFieldsRepaired).toBe(1);  
    });

    test("cannot repair undetected issue", async () => {
        const mission = {
            modules: [
                {
                    name: "TestModule",
                    fields: ["value"],
                    rows: [{ id: 1, value: -5, issue_detected: false, repaired: false }]
                }
            ]
        };

        await initialiseDB();
        await loadMission(mission);

        const manager = new MockMissionManager(mission);
        const engine = new QueryEngine(manager, new MockDisplay(), new SelectHandler(manager));

        await engine.execute("UPDATE TestModule SET value = 10 WHERE id = 1;");

        const row = manager.getModule("TestModule").rows[0];

        expect(row.repaired).toBe(false); 
    });

    test("cannot bypass identify stage via issue_detected", async () => {
        const manager = new MockMissionManager(testMission);
        manager.getCurrentStage = () => ({ name: "Identify" }); 

        const display = new MockDisplay();
        const engine = new QueryEngine(manager, display, new SelectHandler(manager));

        await engine.execute("UPDATE Airlock SET issue_detected = 1;");

        expect(display.lastError).toBeDefined(); 
    });
});