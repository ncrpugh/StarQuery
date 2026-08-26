import { runQuery } from "../../../api/sql.js";
import { handleCascadingFaults } from "../../rules/cascadingFaultsRule.js";
import { RepairEfficiencyTracker } from "./repairEfficiencyTracker.js";

// ---------------- Repair Reconciler ----------------
// Responsible for reconciling repairs after player or system queries.
// Applies penalties for incorrect updates, spawning new faults, and calculates repair efficiency.
export class RepairReconciler {
    constructor(missionManager) {
        this.missionManager = missionManager;
        this.RepairEfficiencyTracker = new RepairEfficiencyTracker();
    }

    // ---------------- Reconcile Repairs ----------------
    // Processes each module in the mission, compares before/after state,
    // auto-marks player-created faults, updates repaired fields, 
    // handles cascading faults, and calculates penalties and efficiency,
    // storing mission stats in an object
    async reconcile(mission, beforeState = {}) {
        const rulebook = this.missionManager.rulebook;
        const safeBeforeState = beforeState || {};
        const isRepairStage = this.missionManager.getCurrentStage().name === "Repair";

        

        // ---------------- Initialise mission repair summary ----------------
        mission.summary = mission.summary || {};
        mission.summary.repair = mission.summary.repair || {};
        mission.summary.repair.totalFieldsUpdated = mission.summary.repair.totalFieldsUpdated || 0;
        mission.summary.repair.totalFieldsRepaired = mission.summary.repair.totalFieldsRepaired || 0;
        mission.summary.repair.spawnedFaults = mission.summary.repair.spawnedFaults || 0;
        mission.summary.repair.extraFaults = mission.summary.repair.extraFaults || 0;
        mission.summary.repair.minimumRepairsRequired = mission.summary.repair.minimumRepairsRequired || 0;

        // ---------------- Baseline snapshot ----------------
        // Store initial state of all module rows to track changes and calculate minimum repairs
        if (!mission.summary.repair.baselineRows) {
            mission.summary.repair.baselineRows = {};
            for (const module of mission.modules) {
                // deep copy to avoid mutation
                mission.summary.repair.baselineRows[module.name] = module.rows.map(r => ({ ...r }));
            }
        }

        let totalNonFaultyFieldUpdates = 0;
        const penalisedFields = [];
        let spawnedFaultPenalty = 0;

        // ---------------- Minimum Repairs Required ----------------
        // Calculate total fields that need repair at mission start
        mission.summary.repair.minimumRepairsRequired = 0;
        for (const module of mission.modules) {
            const baselineRows = mission.summary.repair.baselineRows[module.name] || [];
            const moduleFields = this.missionManager.rulebook.modules.items[module.name].fields;

            

            for (const row of baselineRows) {
                for (const field of moduleFields) {
                    if (rulebook.isFieldFaulty(field, row[field])) {
                        mission.summary.repair.minimumRepairsRequired += 1;
                    }
                }
            }
        }

        // ---------------- Process Modules ----------------
        // Iterate over each module and reconcile the current state
        for (const module of mission.modules) {
            

            const beforeRows = safeBeforeState[module.name] || [];
            
            await new Promise(resolve => setTimeout(resolve, 0));

            // Fetch latest state from DB storing as After State
            const afterResult = await runQuery(`SELECT * FROM ${module.name};`);

            if (!afterResult.success || !afterResult.rows) {
                console.warn("No rows returned from DB for module", module.name);
                continue;
            }

            // Create a copy of DB rows and preserve runtime flags
            const existingRows = module.rows || [];
            
            const afterRows = afterResult.rows.map(r => {
                const copy = { ...r };

                if ('issue_detected' in copy) copy.issue_detected = !!copy.issue_detected;
                if ('repaired' in copy) copy.repaired = !!copy.repaired;

                // Preserve runtime flags like _logSolved
                const previous = existingRows.find(x => x.id === copy.id);
                if (previous?._logSolved) {
                    copy._logSolved = true;
                }

                return copy;
            });

            const repairedRows = [];

            if (isRepairStage) {
                // ---------------- Reconcile Each Row ----------------
                for (const row of afterRows) {

                    // Check if the row was previously identified as faulty or is a new player-created fault
                    const wasIdentifiedFaulty = row.issue_detected === true && row.repaired === false || row._newFault === true;

                    // Check if row is still faulty after current query, 
                    // checking specific new fault field if player spawned fault
                    const stillFaulty = row._newFault
                        ? rulebook.isFieldFaulty(row._newFaultField, row[row._newFaultField])
                        : Object.keys(row).some(f => rulebook.isFieldFaulty(f, row[f]));

                    const beforeRow = beforeRows.find(r => r.id === row.id);

                    const moduleFields = this.missionManager.rulebook.modules.items[module.name].fields;
                    const ignoredFields = mission.ignoredFields || [];
                    const playerEditableFields = moduleFields.filter(f => !ignoredFields.includes(f));

                    // ---------------- Auto-mark player-created faults ----------------
                    // If player introduced a new fault, mark it in DB and stats
                    const newlyFaultyFields = playerEditableFields.filter(f =>
                        !rulebook.isFieldFaulty(f, beforeRow[f]) && rulebook.isFieldFaulty(f, row[f])
                    );

                    if (newlyFaultyFields.length > 0) {
                        const primaryKeyField = Object.keys(row)[0]; 
                        const primaryKeyValue = row[primaryKeyField];

                        try {
                            await runQuery(`UPDATE ${module.name} SET issue_detected = 1, repaired = 0 WHERE ${primaryKeyField} = ${primaryKeyValue};`);
                        } catch (err) {
                            console.warn(`Failed to auto-mark row ${primaryKeyValue} as faulty:`, err);
                        }

                        mission.summary.repair.extraFaults += 1;
                        row.issue_detected = 1;
                        row.repaired = 0;
                    }

                    // ---------------- Track Field Updates ----------------
                    for (const field of playerEditableFields) {
                        const wasFaulty = rulebook.isFieldFaulty(field, beforeRow[field]);
                        const isChanged = row[field] !== beforeRow[field];
                        const isStillFaulty = rulebook.isFieldFaulty(field, row[field]);

                        const isSystemUpdate = this.missionManager._systemUpdates?.[module.name]?.has(row.id) ?? false;
                        if (isSystemUpdate) continue;

                        if (isChanged) {
                            mission.summary.repair.totalFieldsUpdated += 1;
                        }

                        // Track non-faulty fields updates, penalising them
                        if ((isChanged && !wasFaulty) || (wasFaulty && isChanged && isStillFaulty)) {
                            totalNonFaultyFieldUpdates++;
                            penalisedFields.push(`${module.name}.${field} (row ${row.id})`);
                        }

                        if (wasFaulty && !isStillFaulty) {
                            mission.summary.repair.totalFieldsRepaired += 1;
                        }
                    }

                    // ---------------- Transition: faulty -> repaired ----------------
                    if (wasIdentifiedFaulty && !stillFaulty) {
                        row.repaired = true;
                        
                        this.missionManager.gameManager.statsManager.recordRepair();

                        await runQuery(`UPDATE ${module.name} SET repaired = 1 WHERE id = ${row.id};`);

                        row._newFault = false;
                        row._newFaultField = null;
                        repairedRows.push(row);

                        // Check for violations of critical repair order rule
                        const violationSpawned = await this.missionManager.handleCriticalRepairOrderViolation(row);
                        if (violationSpawned) spawnedFaultPenalty += 1;
                    }
                }

                // ---------------- Handle Cascading Faults ----------------
                // If any rows were repaired and CASCADING_FAULTS rule is active
                if (repairedRows.length > 0 && this.missionManager.hasRule("CASCADING_FAULTS")) {
                    const spawned = await handleCascadingFaults(this.missionManager, module.name, beforeRows, afterRows);
                    if (spawned) spawnedFaultPenalty += 1;
                }
            }

            // Update module with reconciled rows
            module.rows = afterRows;
    
        }

        // ---------------- Apply Penalties and Update Efficiency ----------------
        if (isRepairStage) {
            mission.summary.repair.spawnedFaults += spawnedFaultPenalty;

            this.RepairEfficiencyTracker.penaliseNonFaultyUpdate(totalNonFaultyFieldUpdates);
            if (spawnedFaultPenalty > 0) {
                this.RepairEfficiencyTracker.penaliseNewFaultSpawn(spawnedFaultPenalty);
            }

            const efficiency = this.RepairEfficiencyTracker.getEfficiency();

            mission.summary.repair.accuracy = mission.summary.repair.totalFieldsUpdated > 0
                ? mission.summary.repair.totalFieldsRepaired / mission.summary.repair.totalFieldsUpdated
                : 0;

            mission.summary.repair.efficiency = efficiency;

            // Store repair efficiency for UI display
            this.missionManager.currentMission.repairEfficiency = {
                score: efficiency,
                penalisedFields
            };

            // ---------------- Display Results ----------------
            let message = `Repair efficiency: ${efficiency.toFixed(1)}%`;

            if (totalNonFaultyFieldUpdates > 0 && spawnedFaultPenalty > 0) {
                message += `\nPenalty: ${totalNonFaultyFieldUpdates} non-faulty field updates.`;
                message += `\nPenalty: a new fault was spawned due to incorrect repair order.`;
                message += `\nFields updated but not faulty → ${penalisedFields.join(", ")}`;
            } else if (totalNonFaultyFieldUpdates > 0) {
                message += `\nFields updated but not faulty: ${penalisedFields.length} → ${penalisedFields.join(", ")}`;
            } else if (spawnedFaultPenalty > 0) {
                message += `\nPenalty: a new fault was spawned due to a rule violation.`;
            }

            // Clear any system updates (updates due to execution of system made queries) from this stage
            this.missionManager._systemUpdates = {};
            this.missionManager.display.printResult(message);

            // Update mission progress bar
            this.missionManager.updateStageProgress();
        }
    }
}