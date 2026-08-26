// ---------------- Difficulty Utilities ----------------
// Functions to normalise difficulty, scale values and 
// generate difficulty related parameters for procedural missions

// ---------------- Normalise difficulty to a 0–1 range ----------------
export function normaliseDifficulty(difficulty, maxDifficulty = 10) {
    const raw = difficulty / maxDifficulty;

    
    return Math.min(1, Math.max(0, raw));
}

// ---------------- Linear interpolation ----------------
export function lerp(min, max, t) {
    return min + (max - min) * t;
}


// ---------------- Build difficulty parameters ----------------
// Generates difficulty configuration for a player ship

export function buildDifficultyParams(playerShip) {
    const maxDifficulty = playerShip.maxDifficulty ?? 10;
    const d = normaliseDifficulty(playerShip.difficulty, maxDifficulty);

    return {
        d,                                              // normalised difficulty
        faultDensity: lerp(0.1, 0.5, d),                // proportion of rows with faults
        maxFaultsPerModule: Math.round(lerp(1, 3, d)),  // max faults per module
        ambiguity: lerp(0.1, 2, 1-d)                    // subtlety of fault signals
    };
}