import { isRowFaulty } from "./utils.js";
import { extractModuleName, extractWhereFields } from "./queryParser.js";

// ---------------- Select Handler ----------------
// Handles SELECT queries targeting a single module
export class SelectHandler {
    constructor(missionManager) {
        this.missionManager = missionManager;
        
        // lastSelect stores info about the last SELECT executed used for efficiency tracking
        this.lastSelect = null;
    }

    // ---------------- Process SELECT Query ----------------
    //  Rejects multi-table queries and field aliases in the identify stage.
    processSelect(query, rows) {
        if (!query) {
            this.lastSelect = null;
            return { module: null, rows: [] };
        }

        const upperQuery = query.toUpperCase();

        // ---------------- Reject field aliases in Identify stage ----------------
        // To allow easier query handling 
        if (/ AS /i.test(upperQuery)) {
            if (this.missionManager.getCurrentStage().name === "Identify") {
                this.missionManager.display.printError(
                    "Field aliases (AS) are not allowed in Identify stage queries."
                );
                this.lastSelect = null;
                return { module: null, rows: [] };
            }
        }

        // ---------------- Disallow multi-table queries ----------------
        // To allow easier query handling 
        if (/FROM\s+.*,.+/i.test(upperQuery)) {
            this.missionManager.display.printError(
                "Multi-table queries are not allowed in this mission."
            );
            this.lastSelect = null;
            return { module: null, rows: [] };
        }

        // ---------------- Extract module name ----------------
        // To help track efficiency
        const availableModules = this.missionManager.currentMission.modules.map(m => m.name);
        const moduleName = extractModuleName(query, availableModules);
        if (!moduleName) {
            this.lastSelect = null;
            return { module: null, rows: [] };
        }

        const module = this.missionManager.getModule(moduleName);

        // ---------------- Extract WHERE fields for efficiency tracking ----------------
        const whereFields = extractWhereFields(query, module.fields);

        // ---------------- Store last select for efficiency tracking ----------------
        this.lastSelect = {
            moduleName,
            module,
            rows,
            whereFields
        };

        return { module, rows };
    }

    // ---------------- Check if Row is Faulty ----------------
    // Returns true if any field in the row is faulty according to the current rulebook
    isRowFaulty(row) {
        return isRowFaulty(row, this.missionManager.rulebook);
    }
}