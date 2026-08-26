import { EfficiencyTracker } from "./manager/query/efficiencyTracker.js";

// ---------------- Identify Controller ----------------
// Handles the Identify stage, marking faulty rows, calculating efficiency,
// and updating mission summary/stats

export class IdentifyController {
    constructor(missionManager) {
        this.missionManager = missionManager;
        this.efficiencyTracker = new EfficiencyTracker();
        this.currentEfficiency = 100;
    }

    // ---------------- Identify From Last SELECT ----------------
    // Marks rows as issue_detected based on the last SELECT query result
    // Updates summary, efficiency, UI, and achievements
    async identifyFromLastSelect() {

        if (this.missionManager.getCurrentStage().name !== "Identify") {
            this.missionManager.display.printError("Not in Identify stage.");
            return;
        }

        // Get the last SELECT executed
        const selectHandler = this.missionManager.selectHandler;
        const lastSelect = selectHandler.lastSelect;

        if (!lastSelect) {
            this.missionManager.display.printError("You must run a SELECT query before identifying faults.");
            return;
        }

        const { moduleName, rows, whereFields } = lastSelect;
        const rulebook = this.missionManager.rulebook;

        // ---------------- Stats Tracking ----------------
        // Track number of newly identified faults and non-faulty rows included
        let newlyIdentifiedFaults = 0;
        let nonFaultyRowsIncluded = 0; 
        
        const identifiedRowIds = [];

        const summary = this.missionManager.currentMission.summary = this.missionManager.currentMission.summary || {};
        summary.identify = summary.identify || {};
        summary.identify.rowsAttempted = summary.identify.rowsAttempted || 0;
        summary.identify.totalNewlyIdentified = summary.identify.totalNewlyIdentified || 0;

        // ---------------- Process Each Row ----------------
        for (const row of rows) {
            // Check if row actually contains a faulty field
            const isRowActuallyFaulty = Object.keys(row).some(field => rulebook.isFieldFaulty(field, row[field]));

            // ---------------- Mark Newly Identified Fault ----------------
            if (!row.issue_detected && isRowActuallyFaulty) {

                const primaryKeyField = Object.keys(row)[0];
                const primaryKeyValue = row[primaryKeyField];

                // Persist issue_detected in DB
                const sql = `UPDATE ${moduleName} SET issue_detected = 1 WHERE ${primaryKeyField} = ${primaryKeyValue};`;
                const { success, error } = await this.missionManager.engine.executor.execute(sql);

                if (!success) {
                    this.missionManager.display.printError(`Failed to mark row ${primaryKeyValue}: ${error}`);
                    continue;
                }

                // Update flags and track stats
                row.issue_detected = 1;
                newlyIdentifiedFaults++;
                summary.identify.totalNewlyIdentified += 1;
                identifiedRowIds.push(row.id ?? primaryKeyValue);

                // Count non-faulty rows
            } else if (!isRowActuallyFaulty) {
                
                nonFaultyRowsIncluded++;
            }
        }

        // ---------------- Update Summary ----------------
        summary.identify.rowsAttempted += identifiedRowIds.length + nonFaultyRowsIncluded;

        summary.identify.accuracy = summary.identify.rowsAttempted > 0
            ? summary.identify.totalNewlyIdentified / summary.identify.rowsAttempted
            : 0;
        

        // ---------------- Calculate Efficiency ----------------
        const penalty = this.efficiencyTracker.calculatePenalty({
            returnedRows: rows.length,
            whereFields,
            newlyIdentifiedFaults
        });

        
        this.currentEfficiency = Math.max(0, this.currentEfficiency - penalty);

        
        this.missionManager.currentMission.identifyEfficiency = {
            score: this.currentEfficiency
        };

        summary.identify.efficiency = this.currentEfficiency;

        // ---------------- Refresh UI ----------------
        await this.missionManager.engine.refreshAllModules();

        this.missionManager.display.printResult(`Identify efficiency: ${this.currentEfficiency.toFixed(1)}%`);


        // ---------------- Compute Total Faulty Rows ----------------
        let totalFaultyRows = 0;
        for (const module of this.missionManager.currentMission.modules) {
            for (const row of module.rows) {
                if (Object.keys(row).some(field => rulebook.isFieldFaulty(field, row[field]))) {
                    totalFaultyRows++;
                }
            }
        }

        
        this.missionManager.currentMission.summary.identify.totalFaultyRows = totalFaultyRows;


        // ---------------- Display Feedback ----------------
        const messages = [];
        if (identifiedRowIds.length > 0) {
            messages.push(`Rows correctly identified as faulty: Row IDs:[${identifiedRowIds.join(", ")}]`);
        }
        if (nonFaultyRowsIncluded > 0) {
            messages.push(`Rows included in identify check but not faulty: ${nonFaultyRowsIncluded}`);
        }
        if (messages.length > 0) {
            this.missionManager.display.printMessage(messages.join("\n"));
        }

        // Achievements
        if (newlyIdentifiedFaults > 0) {
            this.missionManager.achievements?.unlock("firstFault");
        }

        
        this.missionManager.renderMission();
        this.missionManager.tryAdvanceStage();
        this.missionManager.updateStageProgress();

    }

    resetStageTotals() {
        this.currentEfficiency = 100;
    }
}
