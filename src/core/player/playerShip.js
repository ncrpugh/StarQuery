// ---------------- Player Ship ----------------
// Tracks player’s unlocked modules, mission difficulty, and base rows per module

export class PlayerShip {

    constructor() {
        this.unlockedModules = ["Airlock", "Reactor", "Engine", "Spectral_Scanner"];
        this.difficulty = 1;
        this.rowsPerModule = 5;
    }

    // ---------------- Difficulty ----------------
    // Set mission difficulty (1–10)
    setDifficulty(d) {
        this.difficulty = Math.min(10, Math.max(1, Math.round(d)));
    }

    // ---------------- Rows Per Module ----------------
    // Set base number of rows per module (min 1)
    setRowsPerModule(n) {
        this.rowsPerModule = Math.max(1, Math.round(n));
    }
}