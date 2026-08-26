import { QueryExecutor } from "./query/queryExecutor.js";
import { Rulebook } from "../../rules/rulebook.js";
import { IdentifyController } from "../IdentifyController.js";
import { SelectHandler } from "./query/selectHandler.js";
import { QueryEngine } from "./query/queryEngine.js";
import { CompositeFaultSpawner } from "./compositeFaultSpawner.js";
import { MissionRewardModal } from "../../../ui/MissionRewardModal.js";
import { getStageProgress } from "../progress/stageProgress.js";
import { ProgressBar } from "../../../ui/progressBar.js";
import { RepairReconciler } from "./query/repairReconciler.js";

// ---------------- Mission Manager ----------------
// Handles mission and component initialisation, progression and mission data

export class MissionManager {   
    constructor(display) {
        this.display = display;             // UI renderer
        this.currentMission = null;         // Active mission state
        this.stageIndex = 0;                // First stage
        this.rulebook = new Rulebook();     // Rulebook controls commands, fault logic, etc

        // ---------------- Core Subsystems ----------------
        // Internal systems used to manage queries, faults and gameplay logic
        this.executor = new QueryExecutor();                               
        this.selectHandler = new SelectHandler(this);                       
        this.engine = new QueryEngine(this, display, this.selectHandler);   
        this.identifyController = new IdentifyController(this);             
        this.faultSpawner = new CompositeFaultSpawner(this);               
        this._systemUpdates = {};                               // Handles updates not made by the player
        this.repairReconciler = new RepairReconciler(this);
    }

    // ---------------- Mission Initialisation ----------------
    // Loads mission data and prepares runtime state

    async loadMission(mission) {
        
        // Copy mission to avoid mutating original data
        
        this.currentMission = {
            ...JSON.parse(JSON.stringify(mission)),
            rules: mission.rules?.slice() || []  // ensure rules array is copied
        };

       

        this.stageIndex = 0;
        

        // Load rows for each module from database
        for (const module of this.currentMission.modules) {
            const rows = await this.fetchModuleRows(module.name);

            // Attach runtime flags used during gameplay
            module.rows = rows.map(r => ({
                ...r,
                issue_detected: r.issue_detected ?? 0
            }));
        }

        // Initialise Logs module if starting in Logging stage
        if (this.getCurrentStage().name === "Logging") {
            this.initialiseLogsModule();
        }

        // Render UI and setup specific stage elements 
        this.renderMission();
        this.stageSetup();

        this.initProgressBars();

        // Reset repair efficiency tracking
        if (this.repairReconciler?.RepairEfficiencyTracker) {
            this.repairReconciler.RepairEfficiencyTracker.reset();
        }
    }

    // ---------------- Render Mission ----------------
    // Updates UI with mission data and visible fields
    renderMission() {
        this.display.renderMissionInfo(this.currentMission);

        const hiddenFields = this.currentMission.hiddenFields || [];
       
        // Hide fields not meant to be visible
        this.display.renderSystemModules(
            this.currentMission.modules.map(m => ({
                ...m,
                fields: m.fields.filter(f => !hiddenFields.includes(f))
            }))
        );

        this.display.updateMissionStage(this.getCurrentStage());
    }

    // ---------------- Stage Setup ----------------
    // Enables/disables actions depending on current stage

    stageSetup() {
        const stage = this.getCurrentStage().name;

        if (stage === "Identify") {
            this.identifyController.resetStageTotals();
        }
        
        // Enable Identify UI button only in Identify stage
        if (this.display.setIdentifyButtonEnabled) {
            this.display.setIdentifyButtonEnabled(stage === "Identify");
        }

        if (stage === "Repair") {
            if (this.repairReconciler?.RepairEfficiencyTracker) {
                this.repairReconciler.RepairEfficiencyTracker.reset();
            }
        }

        if (stage.name === "Logging") {
            this.initialiseLogsModule();
        }
    }

    // ---------------- Stage Management ----------------
    getCurrentStage() {
        return this.currentMission.stages[this.stageIndex];
    }

    getModule(name) {
        return this.currentMission.modules.find(m => m.name === name);
    }

    // Check if stage completion conditions are met
    tryAdvanceStage() {
        const stageName = this.getCurrentStage().name;
        if (stageName === "Identify" && this.allFaultyRowsIdentified()) this.advanceStage();
        if (stageName === "Repair" && this.allFaultyRowsRepaired()) this.advanceStage();
        if (stageName === "Logging" && this.allLogsCompleted()) this.advanceStage();
    }

    // Mvoe to the next stage or end the mission
    advanceStage() {
        if (this.stageIndex < this.currentMission.stages.length - 1) {
            this.stageIndex++;
            const stage = this.getCurrentStage();
            this.display.printSuccess("Stage complete, proceeding to next stage");
            this.display.updateMissionStage(stage);

            this.updateStageProgress();         
            this.stageSetup();
        } else {
            this.finishMission();
        }
    }

    // ---------------- Stage Completion Checks ----------------   
    // Check if all faulty rows have been identified
    allFaultyRowsIdentified() {
        const rulebook = this.rulebook;
        return this.currentMission.modules.every(m =>
            m.rows.every(r => !Object.keys(r).some(f => rulebook.isFieldFaulty(f, r[f])) || r.issue_detected)
        );
    }

    // Check if all faults have been repaired
    allFaultyRowsRepaired() {
        const rulebook = this.rulebook;
        return this.currentMission.modules.every(m =>
            m.rows.every(r => !Object.keys(r).some(f => rulebook.isFieldFaulty(f, r[f])))
        );
    }

    // Check that Logs match expected repair impact
    allLogsCompleted() {
        const logs = this.getModule("Logs");
        if (!logs) return false;

        const sections = new Set(
            this.currentMission.modules.flatMap(m => m.rows.map(r => r.ship_section).filter(Boolean))
        );

        // Sum impact of all repaired faults in that section
        for (const section of sections) {
            let expectedImpact = 0;
            for (const m of this.currentMission.modules) {
                for (const r of m.rows) {
                    if (r.ship_section === section && r.repaired) {
                        expectedImpact += (r.severity || 1) * (r.severity_modifier || 1);
                    }
                }
            }

            
            const logEntry = logs.rows.find(r => r.ship_section === section);
            if (!logEntry || Math.abs(logEntry.repairs - expectedImpact) > 0.01) return false;
        }

        return true;
    }

    // ---------------- Fault Handling ----------------
    // Enforces repairing highest impact fault first
    async handleCriticalRepairOrderViolation(repairedRow) {
        if (!this.hasRule("CRITICAL_REPAIR_ORDER") || this.getCurrentStage().name !== "Repair") return;

        const repairedImpact = (repairedRow.severity || 1) * (repairedRow.severity_modifier || 1);
        let highestRemainingImpact = 0;
        let highestImpactSection = null;

        // Find highest impact remaining fault
        for (const m of this.currentMission.modules) {
            for (const r of m.rows) {
                if (!r.repaired && this.rulebook.isRowFaulty?.(r)) {
                    const impact = (r.severity || 1) * (r.severity_modifier || 1);
                    if (impact > highestRemainingImpact) {
                        highestRemainingImpact = impact;
                        highestImpactSection = r.ship_section;
                    }
                }
            }
        }

        // If wrong repair order, spawn new fault
        if (highestRemainingImpact > repairedImpact) {
            this.display.printError("Critical repair order violated.");
            await this.faultSpawner.spawnEscalatedFault(highestImpactSection);

            return true;
        }
        return false;
    }

    // ---------------- Logs Initialisation ----------------
    // Creates Logs module dynamically for logging stage
    initialiseLogsModule() {
        if (this.getCurrentStage().name !== "Logging") return;

        const sections = new Set(this.currentMission.modules.flatMap(m => m.rows.map(r => r.ship_section).filter(Boolean)));
        const logRows = Array.from(sections).map(section => ({ ship_section: section, repairs: 0, _logSolved: false }));

        if (!this.getModule("Logs")) {
            this.currentMission.modules.push({ name: "Logs", fields: ["ship_section", "repairs"], rows: logRows });
        }
    }

    // ---------------- Helpers ----------------
    identifyFaults() { 
        if (this.getCurrentStage().name !== "Identify") {
            this.display.printError("Not in Identify stage.");
            return;
        }
        this.identifyController.identifyFromLastSelect();
    }

    async fetchModuleRows(moduleName) {
        const { success, result } = await this.executor.execute(`SELECT * FROM ${moduleName};`);
        return success && result.rows ? result.rows : [];
    }

    hasRule(ruleId) {
        return this.currentMission?.rules?.includes(ruleId);
    }

    // ---------------- Mission Completion ----------------
    finishMission() {
        
        this.display.showMissionComplete(this.currentMission.name);
        this.showMissionReward();
        this.gameManager.statsManager.recordMission();
        this.gameManager.saveProfile();

        this.achievements?.unlock("firstMission");
        
    }


    showMissionReward() {
        const mission = this.currentMission;
        const modal = new MissionRewardModal(this, mission, this.gameManager);
        modal.open();
    }

    // ---------------- Progress Tracking ----------------
    updateStageProgress() {
        if (!this.currentMission) return;
        const stage = this.getCurrentStage().name;
        const progress = getStageProgress(this.currentMission, stage);
        for (const stage in progress) {
            this.progressBars[stage]?.update(progress[stage]);
        }
    }

    // Create progress bars for each stage
    initProgressBars() {
        if (!this.currentMission) return;
        
        const progressContainer = document.getElementById("progress-bars-container");
        if (!progressContainer) {
            console.warn("Progress bars container missing");
            return;
        }

       
        progressContainer.innerHTML = "";

        this.progressBars = {};

        
        for (const stage of this.currentMission.stages) {
            const id = `progress-${stage.name.toLowerCase()}`;

            const div = document.createElement("div");
            div.id = id;
            progressContainer.appendChild(div);

            const bar = new ProgressBar(id, stage.name, 0);
            div.progressBarInstance = bar;

            this.progressBars[stage.name] = bar;
        }

        
        this.updateStageProgress();
    }
}
