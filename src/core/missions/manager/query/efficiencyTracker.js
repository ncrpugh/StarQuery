// ---------------- Efficiency Tracker ----------------
// Calculates penalties during the Identify stage for inefficient queries 
// based on incorrectly identified rows and number of fields used

export class EfficiencyTracker {
    constructor() {
        this.EXTRA_ROW_PENALTY = 5;
        this.EXTRA_FIELD_PENALTY = 5;
    }

    // ---------------- Calculate Penalty ----------------
    // Applies penalties for:
    // - returning more rows than necessary
    // - using more WHERE fields than required to identify faults
    
    calculatePenalty({ returnedRows, whereFields, newlyIdentifiedFaults }) {
        const extraRows = Math.max(0, returnedRows - newlyIdentifiedFaults);
        const extraFields = Math.max(0, whereFields - newlyIdentifiedFaults);

        return (
            extraRows * this.EXTRA_ROW_PENALTY +
            extraFields * this.EXTRA_FIELD_PENALTY
        );
    }
}
