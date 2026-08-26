// ---------------- Campaign Controller ----------------
// Handles campaign flow, mission loading and player ship state 

export class CampaignController {

    // ---------------- Constructor ----------------
    // Initialise campagin state and dependencies

    constructor({ loadMissionCallback, briefing, gameManager }) {

        
        this.loadMissionCallback = loadMissionCallback;
        this.briefing = briefing;

        this.gameManager = gameManager;

        this.mode = null;
        this.currentMission = 0;
        this.totalMissions = 10;

        this.generator = null;
        this.playerShip = null;
        this.scriptedMissions = [];
    }

    // ---------------- Start procedural campagin ----------------
    // Setup for procedurally generated missions

    async startProceduralCampaign(generator, playerShip, total = 10, selectedRule = "") {
        this.mode = "procedural";
        this.generator = generator;
        this.playerShip = playerShip;
        this.totalMissions = total;
        this.currentMission = 0;
        this.selectedRule = selectedRule;

        await this.loadNextMission();
    }

    // ---------------- Start scripted campagin ----------------
    // Setup for predefined tutorial or story missions

    async startScriptedCampaign(missions) {
        this.mode = "scripted";
        this.scriptedMissions = missions;
        this.currentMission = 0;

        await this.loadNextMission();
    }

    // ---------------- Load next mission ----------------
    // Advance campaign, handle end conditions, show loading screen, and call mission loader

    async loadNextMission() {

        this.currentMission++;

        //End of campaign / tutorial
        if (this.mode === "procedural" && this.currentMission > this.totalMissions) {
            this.gameManager.showVictoryScreen(false); 
            return;
        }

        if (this.mode === "scripted" && this.currentMission > this.scriptedMissions.length) {
            this.gameManager.showVictoryScreen(true);
            return;
        }

        // Show loading UI
        this.gameManager.loadingScreen.show();
        document.getElementById("game-ui").classList.add("hidden");

        setTimeout(async () => {
            let mission;

            // Select mission based on mode
            if (this.mode === "procedural") {
                this.playerShip.difficulty = this.currentMission;
                mission = this.generator.generateMissionForPlayer(this.playerShip, this.currentMission, this.selectedRule);
            } else {
                mission = this.scriptedMissions[this.currentMission - 1];
            }

            // Hide loading UI
            this.gameManager.loadingScreen.hide();
            document.getElementById("game-ui").classList.remove("hidden");

            // Load mission via callback
            await this.loadMissionCallback(mission);

            //Show briefing for mission
            this.briefing.show(mission);

        }, 1500);
    }

}