import { Display } from "./core/display/display.js";
import { MissionManager } from "./core/missions/manager/missionManager.js";
import { Tutorial } from "./core/missions/manager/tutorial.js";

// ---------------- App Initialiser ----------------
// Initialises app by creating display and control components

export function initialiseApp() {
    
    const display = new Display();

    const missionManager = new MissionManager(display);

    const tutorial = new Tutorial();

    return { display, missionManager, tutorial };
}