// ---------------- Player Profile ----------------
// Handles loading and saving player profile

export class PlayerProfile {

  // ---------------- Load Profile ----------------
  // Loads profile from localStorage, or creates a default
  static load() {
    const data = localStorage.getItem("sqlspace_profile");
    return data ? JSON.parse(data) : this.createDefault();
  }

  // ---------------- Save Profile ----------------
  static save(profile) {
    localStorage.setItem("sqlspace_profile", JSON.stringify(profile));
  }

  // ---------------- Default Profile ----------------
  static createDefault() {
    return {
        stats: {
        missionsCompleted: 0,
        totalQueries: 0,
        totalRepairs: 0
        },
        achievements: [],
        settings: {},
        campaignProgress: 0
    };
  }

}