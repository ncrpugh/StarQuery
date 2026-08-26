// ---------------- Repair Efficiency Tracker ----------------
// Tracks efficiency of repairs during missions by applying penalties
// for incorrectly updated rows and for spawning new faults

export class RepairEfficiencyTracker {
    constructor() {
        this.NON_FAULTY_UPDATE_PENALTY = 5; 
        this.NEW_FAULT_SPAWN_PENALTY = 10;   
        this.nonFaultyUpdates = 0;
        this.newFaultSpawns = 0;
    }

   
    penaliseNonFaultyUpdate(count = 1) {
        this.nonFaultyUpdates += count;
    }

   
    penaliseNewFaultSpawn(count = 1) {
        this.newFaultSpawns += count;
    }

    // ---------------- Calculate Penalty and Efficiency ----------------
    // Applies penalties for:
    // - updating non-faulty rows
    // - spawning new faults
    // Returns efficiency (100 - penalty)
    getEfficiency() {
        const base = 100;
        const totalPenalty = 
            this.nonFaultyUpdates * this.NON_FAULTY_UPDATE_PENALTY +
            this.newFaultSpawns * this.NEW_FAULT_SPAWN_PENALTY;

        return Math.max(0, base - totalPenalty);
    }

    // ---------------- Get Penalty Breakdown ----------------
    // Returns an object, tracking penalties by type and total
    getPenaltyBreakdown() {
        return {
            nonFaultyUpdates: this.nonFaultyUpdates,
            newFaultSpawns: this.newFaultSpawns,
            totalPenalty: this.nonFaultyUpdates * this.NON_FAULTY_UPDATE_PENALTY +
                          this.newFaultSpawns * this.NEW_FAULT_SPAWN_PENALTY
        };
    }

    reset() {
        this.nonFaultyUpdates = 0;
        this.newFaultSpawns = 0;
    }
}