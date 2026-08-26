// ---------------- Mission Builder ----------------
// Responsible for constructing modules and assembling full mission objects

import { inferType } from "../manager/query/utils.js";

export class MissionBuilder {
    constructor(rulebook, rowPopulator) {
        this.rulebook = rulebook;
        this.populator = rowPopulator;
    }

    // ---------------- Build Module ----------------
    // Creates rows for a module, injects faults based on difficulty

    buildModule(moduleName, rowCount, difficultyParams) {
        const rows = [];

        // Generate clean rows
        for (let i = 0; i < rowCount; i++) {
            rows.push(this.populator.createCleanRow(moduleName, i + 1));
        }

        // Copy of rows to avoid assigning multiple faults to same row
        const availableRows = [...rows];

        // Number of faults is based on difficulty
        const numFaults = Math.max(1, Math.round(rowCount * difficultyParams.faultDensity));
        for (let f = 0; f < numFaults; f++) {
            if (!availableRows.length) break;


            // Inject a fault into a random row
            const rowIndex = this.populator.random.randomInt(0, availableRows.length - 1);
            const row = availableRows[rowIndex];

            const result = this.populator.injectFault(row, moduleName, difficultyParams);
            if (!result) continue;

            // Remove row so it isn't selected again
            availableRows.splice(rowIndex, 1);
        }

        // Define schema for module
        const moduleFields = [
            ...this.rulebook.modules.items[moduleName].fields,
            "id", "issue_detected", "repaired", "ship_section", "severity", "severity_modifier"
        ];

        const typeMap = {};
        moduleFields.forEach(f => {
            typeMap[f] = inferType(f);
        });

        return {
            name: moduleName,
            fields: moduleFields,
            typeMap,
            rows,
        };
    }


    // ---------------- Build Mission ----------------
    // Assembles full mission object

    buildMission(playerShip, modules, missionNumber, rule = "", hiddenFields = ["issue_detected", "repaired"]) {
        return {
            name: `System Diagnostics and Repair - Difficulty ${playerShip.difficulty}`,
            description: `Procedurally generated diagnostics mission - ${missionNumber} / 10`,
            modules: modules.map(m => ({
                name: m.name,
                fields: m.fields,
                rows: m.rows,
                typeMap: m.typeMap
            })),
            rules: [rule],  
            stages: [
                { name: "Identify", description: "Find faulty readings",  },
                { name: "Repair", description: "Repair faulty readings" },
                { name: "Logging", description: "Log repairs",  }
            ],
            hiddenFields
        };
    }
}