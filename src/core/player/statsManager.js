// ---------------- Stats Manager ----------------
// Tracks player statistics - missions completed, queries run, and repairs done

export class StatsManager {

  // Initialise stats from player profile
  constructor(profileStats, gameManager) {
    this.gameManager = gameManager;

    this.stats = {
      missionsCompleted: profileStats.missionsCompleted ?? 0,
      totalQueries: profileStats.totalQueries ?? 0,
      totalRepairs: profileStats.totalRepairs ?? 0
    };
  }

  // ---------------- Increment stats and save ----------------

  recordQuery() {
    this.stats.totalQueries += 1;
    this.save();
  }

  recordRepair() {
    this.stats.totalRepairs += 1;
    this.save();
  }

  recordMission() {
    this.stats.missionsCompleted += 1;
    this.save();
  }

   // ---------------- Save ----------------

  save() {
    if (this.gameManager?.saveProfile) {
      this.gameManager.saveProfile();
    }
  }
}