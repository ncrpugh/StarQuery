import { CASCADING_DEPENDENCIES } from "./cascadingDependencies.js";

// ---------------- Cascading Faults Rule ----------------
// Handles cascading faults caused by repairing in the wrong order

// Trigger cascading faults when repairs break dependency rules
export async function handleCascadingFaults(missionManager, moduleName, beforeRows, afterRows) {
    if (!missionManager.hasRule("CASCADING_FAULTS")) return false;
    if (missionManager.getCurrentStage().name !== "Repair") return false;

    
    

    const rulebook = missionManager.rulebook;
    const fieldDeps = CASCADING_DEPENDENCIES.fields[moduleName];
    if (!fieldDeps) return false;

    for (const beforeRow of beforeRows) {
        const afterRow = afterRows.find(r => r.id === beforeRow.id);
        if (!afterRow) continue;


        // ---------------- Fixed Fields ----------------
        // Find fields that were repaired in this update
        const fixedFields = Object.keys(afterRow).filter(field =>
            rulebook.isFieldFaulty(field, beforeRow[field]) &&
           !rulebook.isFieldFaulty(field, afterRow[field])
        );

        

        if (!fixedFields.length) continue;

        // ---------------- Lowest Field ----------------
        // Get the most dependent field that was repaired
        const lowestField = getLowestFieldInChain(fixedFields, fieldDeps);
       
        if (!lowestField) continue;

        // ---------------- Field Dependency Check ----------------
        // Check if a required field is still faulty, spawning a fault if true
        const violatedField = checkFieldDependencies(rulebook, afterRows, fieldDeps, lowestField);

        if (violatedField) {
            missionManager.display.printError(`Cascading Fault: ${moduleName}.${lowestField} repaired before ${violatedField}.`);

            await missionManager.faultSpawner.spawnCascadingFault(moduleName, violatedField);

            return true;
        }

        // ---------------- Module Dependency Check ----------------
        const violatedModule = checkModuleDependencies(missionManager, moduleName);

        if (violatedModule) {
            missionManager.display.printError(`Cascading Fault: ${moduleName} repaired before ${violatedModule}.`);
            await missionManager.faultSpawner.spawnCascadingFault(violatedModule, null);
            return true;
        }
    }
    return false;
}



// ---------------- Helpers ----------------


// Get most dependent field from a set
function getLowestFieldInChain(fields, deps) {
    let lowest = null;
    let maxDepth = -1;

    for (const field of fields) {
        const depth = getFieldDepth(field, deps);
        if (depth > maxDepth) {
            maxDepth = depth;
            lowest = field;
        }
    }

    return lowest;
}

// Calculate how deep a field is in dependency chain
function getFieldDepth(field, deps, visited = new Set()) {
    if (visited.has(field)) return 0;
    visited.add(field);

    const parents = deps[field] || [];
    if (!parents.length) return 0;

    return 1 + Math.max(...parents.map(p => getFieldDepth(p, deps, visited)));
}

// Check if any dependent field is still faulty
function checkFieldDependencies(rulebook, rows, deps, field) {
    const dependencies = deps[field] || [];

    for (const depField of dependencies) {
        const stillFaulty = rows.some(row => rulebook.isFieldFaulty(depField, row[depField]));

        if (stillFaulty) return depField;
    }

    return null;
}

// Check if dependent modules still have faults
function checkModuleDependencies(missionManager, moduleName) {
    const moduleDeps = CASCADING_DEPENDENCIES.modules[moduleName];
    if (!moduleDeps || !moduleDeps.length) return null;

    for (const depModuleName of moduleDeps) {
        const depModule = missionManager.getModule(depModuleName);
        if (!depModule) continue;

        const stillFaulty = depModule.rows.some(r => missionManager.rulebook.isRowFaulty(r));

        if (stillFaulty) return depModuleName;
    }

    return null;
}
