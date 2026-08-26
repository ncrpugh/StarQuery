import { runQuery } from "../../api/sql.js";

export class FaultSpawner {
    constructor(missionManager) {
        this.missionManager = missionManager;
    }

    // ---------------- Spawn Escalated Fault ----------------
    // Tries to spawn a new fault, in a preferred ship section if provided

    async spawnEscalatedFault(preferredSection = null) {
        
        // Collect rows that are eligible to receive a new fault
        const candidateRows = [];
        const modules = this.missionManager.currentMission.modules.filter(m => m.name !== "Logs");

        // ---------------- Check 1: Preferred Section ----------------
        // Try to find clean rows in the preferred section

        if (preferredSection) {
            for (const m of modules) {
                for (const r of m.rows) {

                    // Conditions:
                    // - Row does NOT already have a newly spawned fault
                    // - Row is not currently faulty
                    // - Row belongs to the preferred ship section
                    if (!r._newFault && !this.missionManager.rulebook.isRowFaulty?.(r) && r.ship_section === preferredSection) {
                        candidateRows.push({ module: m, row: r });
                    }


                }
            }
        }

        // ---------------- PASS 2: Fallback ----------------
        // If no rows found in preferred section, allow any valid row

        if (candidateRows.length === 0) {
            for (const m of modules) {
                for (const r of m.rows) {
                    if (!r._newFault && !this.missionManager.rulebook.isRowFaulty?.(r)) {
                        candidateRows.push({ module: m, row: r });
                    }
                }
            }
        }

        // If still no valid rows, exit safely
        if (candidateRows.length === 0) {
            this.missionManager.display.printMessage("No rows available to spawn new fault.");
            return;
        }

        // Choose random eligible row
        const { module, row } = candidateRows[Math.floor(Math.random() * candidateRows.length)];

        // Find fields that: 
        // - Have defined fault ranges
        // - Are not already faulty
        const eligibleFields = Object.keys(row).filter(f =>
            this.missionManager.rulebook.faultRanges.items?.[f] &&
            !this.missionManager.rulebook.isFieldFaulty(f, row[f])
        );

        // If no fields can be faulted, exit
        if (eligibleFields.length === 0) {
            this.missionManager.display.printMessage(`No suitable field found to escalate in ${module.name} row ${row.id}.`);
            return;
        }

        // Pick a random field to fault
        const faultField = eligibleFields[Math.floor(Math.random() * eligibleFields.length)];

        // ---------------- Inject Fault ---------------
        // Inject fault by pushing value beyond max range
        const maxValue = this.missionManager.rulebook.faultRanges.items[faultField].max;
        const overflow = 5 + Math.floor(Math.random() * 11);

        // Update row in memory and mark as newly spawned fault
        row[faultField] = maxValue + overflow;
        row.issue_detected = 1;
        row.repaired = 0;
        row._newFault = true;
        row._newFaultField = faultField;

        // Track updated rows so UI can display to players
        if (!this.missionManager._systemUpdates[module.name]) {
            this.missionManager._systemUpdates[module.name] = new Set();
        }
        this.missionManager._systemUpdates[module.name].add(row.id);

        // Persist fault to the database
        await runQuery(`
            UPDATE ${module.name}
            SET ${faultField} = ${row[faultField]},
                issue_detected = 1,
                repaired = 0
            WHERE id = ${row.id};
        `);

        // ---------------- Update UI --------------
        this.missionManager.display.renderSystemModules(this.missionManager.currentMission.modules);

        // Notify the player of spawned fault
        this.missionManager.display.printMessage(
            `New escalated fault spawned in section ${row.ship_section} → ${module.name}.${faultField} (now ${row[faultField]}), impact: ${(row.severity || 1) * (row.severity_modifier || 1)}`
        );
    }
}
