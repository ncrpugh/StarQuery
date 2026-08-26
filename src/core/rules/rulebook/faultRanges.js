// ---------------- Fault Ranges ----------------
// Defines valid ranges for each module field

export class FaultRanges {
    constructor() {
        this.items = {
            pressure: { min: 25, max: 60 },
            temperature: { min: 50, max: 100 },
            voltage: { min: 180, max: 240 },
            current: { min: 0, max: 20 },
            fuel_level: { min: 10, max: 100 },
            thrust: { min: 10, max: 90 },
            signal_strength: { min: 40, max: 100 },
            range: { min: 0, max: 1000 }
        };
    }

    // Checks if value is faulty
    isFaulty(field, value) {
        const range = this.items[field];
        if (!range) return false;
        if (range.min !== null && value < range.min) return true;
        if (range.max !== null && value > range.max) return true;
        return false;
    }
}
