import { FaultSpawner } from "./faultSpawner.js";
import { CascadingFaultSpawner } from "../rules/cascadingFaultSpawner.js";

// ---------------- Composite Fault Spawner ----------------
// Wraps both the standard FaultSpawner and the CascadingFaultSpawner
// so that both rules can be called from a single reference.

export class CompositeFaultSpawner {
    constructor(missionManager) {
        this.mm = missionManager;

        
        this.faultSpawner = new FaultSpawner(missionManager);
        this.cascadingSpawner = new CascadingFaultSpawner(missionManager);
    }

    // ---------------- Spawn Escalated Fault ----------------
    // Spawn a critical repair order fault

    async spawnEscalatedFault(ship_section) {
        await this.faultSpawner.spawnEscalatedFault(ship_section);
    }

    // ---------------- Spawn Cascading Fault ----------------
    // Spawn a cascading fault on a module field
    async spawnCascadingFault(moduleName, targetField) {
        await this.cascadingSpawner.spawnCascadingFault(moduleName, targetField);
    }

    
    // ---------------- Spawn For Rule ----------------
    // Wrapper to call the correct spawner based on rule
    
    async spawnForRule(ruleId, ...args) {
        if (ruleId === "CASCADING_FAULTS") {
            await this.spawnCascadingFault(...args);
        } else if (ruleId === "CRITICAL_REPAIR_ORDER") {
            await this.spawnEscalatedFault(...args);
        }
    }
}
