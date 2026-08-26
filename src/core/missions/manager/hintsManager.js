// ---------------- Hint Manager ----------------
// Generating hints based off of game state

export class HintsManager {
    constructor(missionManager) {
        this.missionManager = missionManager;
        this.lastHint = null;

        const hintBtn = document.getElementById("hint-btn");
        if (hintBtn) hintBtn.addEventListener("click", () => this.showHint());
    }

    // ---------------- Show Hint ----------------
    // Displays a hint based on current stage, or repeats previous hint if still valid

    showHint() {
        const stage = this.missionManager.getCurrentStage().name;

        // If last hint is still valid, repeat it
        if (
            this.lastHint &&
            !this.wasHintResolved(this.lastHint) &&
            this.isHintStillValid(this.lastHint)
        ) {
            this.missionManager.display.printMessage(this.lastHint.text);
            return;
        }

        let hint = null;

        // Generate hint
        if (stage === "Identify") hint = this.getIdentifyHint();
        else if (stage === "Repair") hint = this.getRepairHint();
        else if (stage === "Logging") hint = this.getLoggingHint();

        // Store and display new hint
        if (hint) {
            this.lastHint = hint;
            this.missionManager.display.printMessage(hint.text);
        } else {
            this.missionManager.display.printMessage("No hints available — everything appears correct.");
        }
    }

    // ---------------- Validate Hint ----------------
    // Checks if a repair hint is still valid based on current highest priority fault
    isHintStillValid(hint) {
        if (hint.stage !== "Repair") return true;

        // Only applies when critical repair order rule is active
        if (!this.missionManager.hasRule("CRITICAL_REPAIR_ORDER")) return true;

        const modules = this.missionManager.currentMission.modules;

        let maxImpact = -1;
        let bestRowId = null;
        let bestModuleName = null;

        // Find highest impact unresolved fault
        for (const m of modules) {
            for (const r of m.rows) {
                if (!r.repaired && this.missionManager.rulebook.isRowFaulty(r)) {
                    const impact = (r.severity || 1) * (r.severity_modifier || 1);
                    if (impact > maxImpact) {
                        maxImpact = impact;
                        bestRowId = r.id;
                        bestModuleName = m.name;
                    }
                }
            }
        }

        
        return hint.rowId === bestRowId && hint.moduleName === bestModuleName;
    }

    // ---------------- Check Hint Resolved ----------------
    // Checks if the issue the hint refers to has been fixed

    wasHintResolved(hint) {
        const { stage, moduleName, rowId } = hint;

        if (stage === "Identify") {
            const module = this.missionManager.getModule(moduleName);

            if (!module || !module.rows) return true;
            
            // All faults in hinted module must be identified to resolve hint
            return module.rows.every(r => !Object.keys(r).some(f => this.missionManager.rulebook.isFieldFaulty(f, r[f]) && !r.issue_detected));

        } else if (stage === "Repair") {
            const module = this.missionManager.getModule(moduleName);
            if (!module || !module.rows) return true;

            // If no specific row (i.e., when critical repair order rule is inactive), check that every
            // row in hinted module has been repaired
            if (!rowId) {
                return module.rows.every(r =>
                    !this.missionManager.rulebook.isRowFaulty(r) || r.repaired
                );
            }

            // Otherwise check that specific hinted row has been repaired
            const row = module.rows.find(r => r.id === rowId);
            if (!row) return true;

            return !this.missionManager.rulebook.isRowFaulty(row) || row.repaired;

            // Check hinted log row has been updated correctly (solved)
        } else if (stage === "Logging") {
            const logs = this.missionManager.getModule("Logs");
            if (!logs || !logs.rows) return true;
            const logRow = logs.rows.find(r => r.id === rowId);
            return logRow?._logSolved ?? true;
        }
        return true;
    }

    // ---------------- Identify Hint ----------------
    // Suggests a module where faults still need identifying
    getIdentifyHint() {
        const modules = this.missionManager.currentMission.modules;
     

        // Find modules with unidentified faulty fields
        let candidateModules = modules.filter(m =>
            m.rows.some(r => Object.keys(r).some(f => this.missionManager.rulebook.isFieldFaulty(f, r[f]) && !r.issue_detected))
        );
       

       
        

        if (!candidateModules.length) return null;

        const module = candidateModules[0];

        return { stage: "Identify", moduleName: module.name, text: `Hint: Check module ${module.name} for rows that still need identifying.` };
    }

    // ---------------- Repair Hint ----------------
    // Suggests which module (and optionally row) should be repaired next
    getRepairHint() {
        const modules = this.missionManager.currentMission.modules;

        // Find modules with faulty rows that haven't been repaired
        let candidateModules = modules.filter(m =>
            m.rows.some(r => this.missionManager.rulebook.isRowFaulty(r) && !r.repaired)
        );

        // If cascading faults enabled, only allow safe modules
        if (this.missionManager.hasRule("CASCADING_FAULTS")) {
            candidateModules = candidateModules.filter(m => this.moduleHasNoUnresolvedDependencies(m));
        }

        if (!candidateModules.length) return null;

        // If critical repair order enabled, pick highest impact fault
        let module, row;
        if (this.missionManager.hasRule("CRITICAL_REPAIR_ORDER")) {
            let maxImpact = -1;
            for (const m of candidateModules) {
                for (const r of m.rows) {
                    if (!r.repaired && this.missionManager.rulebook.isRowFaulty(r)) {
                        const impact = (r.severity || 1) * (r.severity_modifier || 1);
                        if (impact > maxImpact) {
                            maxImpact = impact;
                            module = m;
                            row = r;
                        }
                    }
                }
            }
        } else {
            // Otherwise just take candidate module
            module = candidateModules[0];
        }

        return { stage: "Repair", moduleName: module.name, rowId: row?.id, text: `Hint: Repair a row in module ${module.name}${row ? `, row ID ${row.id}` : ""}.` };
    }

    // ---------------- Logging Hint ----------------
    // Suggests next log entry that still needs completing
    getLoggingHint() {
        const logs = this.missionManager.getModule("Logs");
        if (!logs) return null;

        // Find first unresolved log row
        const logRow = logs.rows.find(r => !r._logSolved);
        if (!logRow) return null;

        return { stage: "Logging", rowId: logRow.id, text: `Hint: Update the log for ship section ${logRow.ship_section}.` };
    }

    // ---------------- Dependency Check ----------------
    // Check module has no unresolved dependencies before providing it as a hint 
    // Used when Cascading_fault rule is active
    
    moduleHasNoUnresolvedDependencies(module) {
        const deps = this.missionManager.rulebook.dependencies.modules[module.name] || [];
        return deps.every(depName => {
            const depModule = this.missionManager.getModule(depName);
            return depModule.rows.every(r => !this.missionManager.rulebook.isRowFaulty(r) || r.repaired);
        });
    }

    reset() {
        this.lastHint = null;
    }
}

