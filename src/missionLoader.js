import { loadMission as loadMissionAdapter } from "./core/api/sql.js";

// ---------------- Load Mission ----------------
// Loads a mission into both the database and runtime, also handles tutorial start
export async function loadMission({ missionManager, display, tutorial }, missionModule) {
    try {
       
        tutorial.stop();
        display.clear();

        const mission = missionModule.default || missionModule;

        // ---------------- Database Load ----------------
        // Load mission data into the database (static data only)
        await loadMissionAdapter(mission);

        // ---------------- Runtime Load ----------------
        // Let Mission Manager handle mission state and rendering
        await missionManager.loadMission(mission);

        // ---------------- Tutorial Start ----------------
        // Start mission-specific tutorial if it exists
        if (mission.tutorial && mission.tutorial.length > 0) {
            tutorial.setMessages(mission.tutorial);
            tutorial.start();
            missionManager.tutorial = tutorial;
        }


    } catch (err) {
        console.error("Failed to load mission:", err);
    }

   
    window.loadMission = () => loadMission({ missionManager, display, tutorial }, missionModule);
}