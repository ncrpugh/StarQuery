// ---------------- Query Engine ----------------
// Handles execution of all SQL queries within a mission.
// Separates SELECT queries and mutation queries (UPDATE, INSERT, DELETE),
// applies field restrictions, updates mission state, reconciles repairs, and tracks logging accuracy.

import { QueryExecutor } from "./queryExecutor.js";
import { SelectHandler } from "./selectHandler.js";


export class QueryEngine {
    constructor(missionManager, display, selectHandler) {
        this.missionManager = missionManager;
        this.display = display;

        this.executor = new QueryExecutor();
        this.selectHandler = selectHandler
    }


    // ---------------- Execute Query ----------------
    // Executes a SQL query, validates allowed fields (for UPDATE),
    // updates mission state, reconciles repairs, renders results, and tracks progress.
    async execute(query, allowedFields = null) {
        this.display.printCommand(query);

        const upperQuery = query.trim().toUpperCase();
        const stage = this.missionManager.getCurrentStage().name;

        // ---------------- Global Command Restrictions ----------------
        const restrictCmd = ["DROP", "DELETE", "INSERT", "ALTER"];
        if (restrictCmd.some(cmd => upperQuery.includes(cmd))) {
            this.display.printError("This command is not allowed.");
            return;
        }

        // Prevent multiple statements
        if (upperQuery.length > 0) {
            if (upperQuery.split(";").filter(query => query.trim().length > 0).length > 1) {
                this.display.printError("Multiple SQL statements are not allowed.");
                return;
            }
        }

        // ---------------- Stage Restrictions ----------------
        if (stage === "Identify") {
            if (!upperQuery.startsWith("SELECT")) {
                this.display.printError("Only SELECT queries are allowed during the Identify stage.");
                return;
            }

            if (upperQuery.includes("JOIN")) {
                this.display.printError("JOIN queries are not supported during the Identify stage.");
                return;
            }
        }

        if (stage === "Repair") {
            if (!upperQuery.startsWith("UPDATE") && !upperQuery.startsWith("SELECT")) {
                this.display.printError("Only SELECT and UPDATE queries are allowed during the Repair stage.");
                return;
            }
        }

        if (stage === "Logging") {
            if (!upperQuery.startsWith("SELECT") && !upperQuery.startsWith("UPDATE")) {
                this.display.printError("Only SELECT and UPDATE queries are allowed during the Logging stage.");
                return;
            }
        }

        // ---------------- Capture Before State ----------------
        // Stores module rows before mutation queries for reconciliation and logging.
        let beforeState = {}
        for (const module of this.missionManager.currentMission.modules) {
            const res = await this.executor.execute(`SELECT * FROM ${module.name};`);
            beforeState[module.name] = res.success && res.result?.rows ? res.result.rows : [];
        }
        

        // ---------------- Validate Allowed Fields ----------------
        // Checks that UPDATE queries only modify permitted fields, 
        // so that players can't desync fields used for giving the players extra info like 'issue_detected' .
        if (allowedFields) {
            
            const updateMatch = query.trim().match(/^UPDATE\s+(\w+)\s+SET\s+(.+?)(\s+WHERE\s+|;|$)/i);
            if (updateMatch) {
                const setClause = updateMatch[2]; 

                
                const updatedFields = setClause
                    .split(",")
                    .map(f => f.split("=")[0].trim().toUpperCase())
                    .filter(f => f.length > 0);

                
                const invalidFields = updatedFields.filter(f => !allowedFields.some(field => field.toUpperCase() === f.toUpperCase()));
                if (invalidFields.length > 0) {
                    this.display.printError(
                        `You cannot update field(s) [${invalidFields.join(", ")}]. Allowed fields: ${allowedFields.join(", ")}`
                    );
                    return; 
                }
            }
        }

        // Execute query
        const { success, result, error } = await this.executor.execute(query);

        if (!success) {
            this.display.printError(error);
            return;
        }
        
        const isSelect = query.trim().toUpperCase().startsWith("SELECT");

        // ---------------- Handle SELECT Queries ----------------
        // Processes results, and renders query table.
        if (isSelect) {
            
            const { module, rows } = this.selectHandler.processSelect(query, result.rows);
            this.display.renderQueryResults({
                module,
                results: rows,
                mission: this.missionManager.currentMission,
                stageIndex: this.missionManager.stageIndex
            });

        // ---------------- Handle Mutation Queries ----------------
        // Updates data, reconciles repairs, logs changes, and refreshes module UI.
        } else {
            
            this.display.printResult("Command executed successfully.");
            this.display.printData(JSON.stringify(result.info));

        
            await this.missionManager.repairReconciler.reconcile(this.missionManager.currentMission, beforeState);

            // ---------------- Logging Stage Handling ----------------
            // Tracks correct and incorrect repair log updates for Logging stage.
            if (this.missionManager.getCurrentStage().name === "Logging") {
                
                const logsModule = this.missionManager.getModule("Logs");

                if (logsModule && /^UPDATE\s+LOGS/i.test(query)) {

                    const summary = this.missionManager.currentMission.summary || {};
                    summary.logging = summary.logging || {
                        totalQueries: 0,
                        invalidLogAttempts: 0,
                        correctUpdates: 0
                    };

                    summary.logging.totalQueries += 1;

                    const beforeLogs = beforeState["Logs"] || [];
                    const afterLogs = logsModule.rows;

                    // Build expected repair totals per ship section for calculating player stats
                    const expectedRepairsBySection = {};

                    for (const m of this.missionManager.currentMission.modules) {
                        if (m.name === "Logs") continue;

                        for (const r of m.rows) {
                            if (r.repaired && r.ship_section) {
                                expectedRepairsBySection[r.ship_section] =
                                    (expectedRepairsBySection[r.ship_section] || 0) +
                                    ((r.severity || 1) * (r.severity_modifier || 1));
                            }
                        }
                    }

                    // Check each log update against expected repairs to record stats
                    for (const afterRow of afterLogs) {

                        const beforeRow = beforeLogs.find(r => r.id === afterRow.id);
                        if (!beforeRow) continue;

                        const changed = beforeRow.repairs !== afterRow.repairs;

                        // Ignore updates that changed nothing
                        if (!changed) continue;

                        const expected = expectedRepairsBySection[afterRow.ship_section] || 0;
                        const correct = Math.abs(afterRow.repairs - expected) < 0.01;

                        // If correct and not previously solved
                        if (correct && !afterRow._logSolved) {
                            afterRow._logSolved = true;
                            summary.logging.correctUpdates += 1;
                        }
                        else {
                            summary.logging.invalidLogAttempts += 1;
                        }
                    }

                    // Update progress bar
                    this.missionManager.updateStageProgress();

                    const total = summary.logging.correctUpdates + summary.logging.invalidLogAttempts;

                    summary.logging.accuracy = total > 0
                        ? summary.logging.correctUpdates / total
                        : 0;

                    this.missionManager.currentMission.summary = summary;
                }
            }

            // Refresh modules
            this.display.renderSystemModules(this.missionManager.currentMission.modules);

            // Try to advance the stage
            this.missionManager.tryAdvanceStage();
        }

        // Achievement unlock
        if (query.trim().length > 0){
            this.missionManager.achievements?.unlock("firstQuery");
        }
    }

    // ---------------- Refresh All Modules ----------------
    // Reconciles any pending repairs and refreshes the UI for all modules
    async refreshAllModules() {
        await this.missionManager.repairReconciler.reconcile(this.missionManager.currentMission);
        this.display.renderSystemModules(this.missionManager.currentMission.modules);
    }

    // ---------------- Reset With Mission ----------------
    // Reassigns a new mission manager and initialises a new SelectHandler
    resetWithMission(missionManager) {
        this.missionManager = missionManager;
        this.selectHandler = new SelectHandler(missionManager);
    }
}