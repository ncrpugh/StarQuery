import { runQuery } from "../../api/sql.js";
import { CASCADING_DEPENDENCIES } from "./cascadingDependencies.js";


// ---------------- Cascading Fault Spawner ----------------
// Handles cascading faults based on dependency rules between modules and fields

export class CascadingFaultSpawner {
    constructor(missionManager) {
        this.missionManager = missionManager;
    }

    // Spawn a cascading fault following dependency order
    async spawnCascadingFault(moduleName, targetField) {
        const mm = this.missionManager;
        const mission = mm.currentMission;
        const module = mm.getModule(moduleName);

        if (!module) return;

        // Step 1: try target field in same module
        if (await this.trySpawn(module, targetField)) return;

        // Step 2: Try other fields in same module
        const otherFields = module.fields.filter(f => f !== targetField && mm.rulebook.faultRanges.items[f]);
        for (const field of otherFields) {
            if (await this.trySpawn(module, field)) return;
        }

        // Step 3: Try dependent module
        const dependentModuleName = CASCADING_DEPENDENCIES.modules[moduleName];
        if (dependentModuleName) {
            const depModule = mm.getModule(dependentModuleName);
            if (depModule) {
                for (const field of depModule.fields) {
                    if (mm.rulebook.faultRanges.items[field] && await this.trySpawn(depModule, field)) return;
                }
            }
        }

        // Step 4: Force a fault anywhere if nothing else worked
        if (dependentModuleName) {
            const depModule = mm.getModule(dependentModuleName);
            if (depModule) {
                
                const eligibleRows = depModule.rows.filter(r => !r._newFault);
                if (eligibleRows.length === 0) {
                    return; 
                }
                const row = eligibleRows[Math.floor(Math.random() * eligibleRows.length)];

               
                const eligibleFields = depModule.fields.filter(f => mm.rulebook.faultRanges.items[f] && !mm.rulebook.isFieldFaulty(f, row[f]));
                if (eligibleFields.length === 0) return;

                const field = eligibleFields[Math.floor(Math.random() * eligibleFields.length)];
                console.warn("No valid field found to spawn fault in module:", depModule.name, "row id:", row?.id);

                await this.markRowFieldFaulty(depModule, row, field);
                return;
            }
        }

        // If nothing worked, print message
        mm.display.printMessage(`No available fields to spawn cascading fault for ${moduleName}.${targetField}`);
    }

    // Try spawning a fault in a specific field
    async trySpawn(module, field) {
        const mm = this.missionManager;

          if (!field) {
            console.warn("trySpawn called with invalid field!", { module: module.name, field });
            return false;
        }

        const eligibleRows = module.rows.filter(r =>
            !r._newFault &&
            !mm.rulebook.isFieldFaulty(field, r[field])
        );

        if (eligibleRows.length === 0) return false;

        const row = eligibleRows[Math.floor(Math.random() * eligibleRows.length)];
        
        await this.markRowFieldFaulty(module, row, field);
        return true;
    }

    // Apply fault to row, update DB and UI
    async markRowFieldFaulty(module, row, field) {

        const mm = this.missionManager;

        const maxValue = mm.rulebook.faultRanges.items[field].max ?? 100;
        const overflow = 5 + Math.floor(Math.random() * 11);

        // Inject fault into row
        row[field] = maxValue + overflow;
        row.issue_detected = 1;
        row.repaired = 0;
        row._newFault = true;
        row._newFaultField = field;
        
        // Track system updates
        if (!mm._systemUpdates[module.name]) {
            mm._systemUpdates[module.name] = new Set();
        }
        mm._systemUpdates[module.name].add(row.id);

        // Persist to database
        await runQuery(`
            UPDATE ${module.name}
            SET ${field} = ${row[field]},
                issue_detected = 1,
                repaired = 0
            WHERE id = ${row.id};
        `);

        mm.display.renderSystemModules(mm.currentMission.modules);
        mm.display.printMessage(
            `Cascading Fault spawned: ${module.name}.${field} (row ${row.id}) now ${row[field]}`
        );
    }
}

