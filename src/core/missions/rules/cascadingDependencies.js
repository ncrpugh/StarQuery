// ---------------- Cascading Dependencies ----------------
// Defines module and field dependencies used for cascading faults rule
// If a dependency fails, related modules/fields may also be affected

export const CASCADING_DEPENDENCIES = {

    // Modules depend on Reactor
    modules: {
        Reactor: [],
        Engine: ["Reactor"],
        Airlock: ["Reactor"],
        Spectral_Scanner: ["Reactor"]
    },
    fields: {
        // Engine.fuel_level depends on temperature, thrust depends on fuel_level
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
