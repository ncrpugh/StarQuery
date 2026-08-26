// ---------------- Mission Configuration ----------------
// Defines default parameters for procedural mission generation

export const MissionConfig = {
    rowsPerModule: { minOffset: 1, maxOffset: 1 },
    faultDensity: { min: 0.1, max: 0.4 },           // proportion of rows with faults
    severityRanges: {
        front: [1.1, 3.9],
        mid: [1.1, 4.9],
        rear: [1.1, 2.9],
        sensors: [1.1, 1.9]
    }
};
