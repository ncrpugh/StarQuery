// ---------------- Command Set ----------------
// Defines available SQL commands, and descriptions

export class CommandSet {
    constructor() {
        this.items = {
            SELECT: { unlocked: true, description: "View module data" },
            UPDATE: { unlocked: false, description: "Repair faulty readings" },
            INSERT: { unlocked: false, description: "Add new records" },
            DELETE: { unlocked: false, description: "Remove records" },
            JOIN: { unlocked: false, description: "Combine module data" }
        };
    }
}
