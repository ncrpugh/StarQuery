import { CommandSet } from "./rulebook/commands.js";
import { ModuleSet } from "./rulebook/modules.js";
import { FaultRanges } from "./rulebook/faultRanges.js";

// ---------------- Rulebook ----------------
// Centralised ship rules, modules, commands, and fault definitions

export class Rulebook {
    constructor() {
       
        this.commands = new CommandSet();
        this.modules = new ModuleSet();
        this.faultRanges = new FaultRanges();

        // ---------------- Dependencies ----------------
        // Module and field dependencies for cascading fault logic
        this.dependencies = {
            modules: {
                Reactor: [],                  
                Engine: ["Reactor"],
                Airlock: ["Reactor"],
                Spectral_Scanner: ["Reactor"]
            },
            fields: {
                Engine: {
                    temperature: [],
                    fuel_level: ["temperature"],
                    thrust: ["fuel_level"]
                },
                Reactor: {
                    voltage: [],
                    current: [],
                    temperature: ["voltage","current"]
                },
                Airlock: {
                    temperature: [],
                    pressure: ["temperature"]
                },
                Spectral_Scanner: {
                    range: [],
                    signal_strength: ["range"]
                }
            }
        };
    }

    // ---------------- Fault Validation ----------------
    isFieldFaulty(field, value) {
        return this.faultRanges.isFaulty(field, value);
    }

    isRowFaulty(row) {
        return Object.keys(row).some(f => this.isFieldFaulty(f, row[f]));
    }
}
