// ---------------- Module Set ----------------
// Defines all ship modules, and their fields

export class ModuleSet {
    constructor() {
        this.items = {
            Airlock: { unlocked: true, fields: ["pressure","temperature","status"], ship_section:"front" },
            Reactor: { unlocked: true, fields: ["voltage","current","temperature","status"], ship_section:"mid" },
            Engine: { unlocked: true, fields: ["fuel_level","temperature","thrust","status"], ship_section:"rear" },
            Spectral_Scanner: { unlocked: true, fields: ["signal_strength","range","status"], ship_section:"sensors" },
            Logs: { unlocked: false, fields: ["ship_section", "repairs"], hiddenFields:[""], ship_section:"logging" }
        };
    }
}
