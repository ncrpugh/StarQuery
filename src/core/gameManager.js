import { initialiseDB } from "./api/sql.js";
import { initialiseApp } from "../appInitialiser.js";
import { loadMission } from "../missionLoader.js";
import { uiService } from "../uiService.js";
import { RulebookPanel } from "../ui/rulebook/rulebookPanel.js";
import { MainMenu } from "../ui/mainMenu/mainMenu.js";
import { LoadingScreen } from "./loadingScreen.js";
import { MissionBriefing } from "../ui/missionBriefing/missionBriefing.js";
import { RulebookModal } from "../ui/rulebook/rulebookModal.js";
import { AchievementManager } from "./player/achievementManager.js";
import { CampaignController } from "./campaign/campaignController.js";
import { VictoryModal } from "../ui/VictoryModal.js";
import { PlayerProfile } from "./player/playerProfile.js";
import { AccessibilityManager } from "../ui/settings/accessibilityManager.js";
import { StatsManager } from "./player/statsManager.js";
import { SettingsModal } from "../ui/settings/settingsModal.js";
import { StatsModal } from "../ui/statsModal.js";
import { AchievementsModal } from "../ui/achievementsModal.js";
import { HintsManager } from "./missions/manager/hintsManager.js";


// ---------------- Game Manager ----------------
// Handles game lifecycle, UI binding, mission loading, 
// player profile, stats, achievements, and campaign control.

export class GameManager {
    constructor() {
        this.loadingScreen = new LoadingScreen(1500);
        this.profile = PlayerProfile.load();
        this.accessibility = new AccessibilityManager();
        this.accessibility.applySettings(this.profile.settings || {});
        this.statsManager = new StatsManager(this.profile.stats, this);

    }

    // ---------------- Start Game ----------------
    // Initialise DB, UI, mission manager, achievements, modals, and main menu
    async start() {
        await initialiseDB();

        const { display, missionManager, tutorial } = initialiseApp();

        this.missionManager = missionManager;
        this.missionManager.gameManager = this;
        this.achievements = new AchievementManager(display);
        this.missionManager.achievements = this.achievements;
        this.settingsModal = new SettingsModal(this);
        this.statsModal = new StatsModal(this);
        this.achievementsModal = new AchievementsModal(this);
        this.hintsManager = new HintsManager(this.missionManager);
        this.selectedRule = "";

        // ---------------- UI Button Bindings ----------------
        document.getElementById("settings-btn").onclick = () => {
            this.settingsModal.open();
        };

        document.getElementById("stats-btn").onclick = () => {
            this.statsModal.open();
        };

        document.getElementById("settings-toolbar-btn").onclick = () => {
            this.settingsModal.open();
        };

        // ---------------- Rulebook Panels ----------------
        new RulebookPanel(missionManager.rulebook);
        new RulebookModal();

        // ---------------- Load Mission ----------------
        this.loadMissionCallback = (missionModule) =>
            loadMission({ missionManager, display, tutorial }, missionModule);

        // ---------------- Extra UI helper ----------------
        const ui = new uiService({
            missionManager,
            display,
            loadMissionCallback: this.loadMissionCallback
        });
        ui.init();

        // ---------------- Mission Briefing ----------------
        this.briefing = new MissionBriefing();

        // ---------------- Campaign Controller ----------------
         this.campaign = new CampaignController({
            loadMissionCallback: this.loadMissionCallback,
            briefing: this.briefing,
            gameManager: this
        });

        // ---------------- Main Menu ----------------
        this.mainMenu = new MainMenu({
            onStart: () => this.startDefaultMissionReset(),
            onStartTutorial: () => this.startSelectedMission(),
            onStartWithRule: (rule) => this.startMissionWithRule(rule)
        });

        this.bindMenuButton();
        this.bindBriefingButton();

        this.mainMenu.show();
    }

    // ---------------- Mission Start Helpers ----------------
    startDefaultMissionReset() {
        this.selectedRule = "";
        this.startDefaultMission();
    }

    startMissionWithRule(rule) {
        this.selectedRule = rule;
        this.startDefaultMission();
    }

    // ---------------- Start Default Mission ----------------
    startDefaultMission() {
        this.mainMenu.hide();
        document.getElementById("game-ui").classList.add("hidden");

        this.loadingScreen.show();
        this.hintsManager.reset();

        setTimeout(async () => {

            const { MissionGenerator } = await import("./missions/generator/missionGenerator.js");
            const { PlayerShip } = await import("./player/playerShip.js");

            const generator = new MissionGenerator();
            const playerShip = new PlayerShip();

            this.campaign.startProceduralCampaign(generator, playerShip, 10, this.selectedRule);

        }, 1500);
    }

    // ---------------- Start Tutorial/Selected Missions ----------------
    async startSelectedMission() {

    this.mainMenu.hide();
    document.getElementById("game-ui").classList.add("hidden");

    this.loadingScreen.show();
    this.hintsManager.reset();

        setTimeout(async () => {

            const tutorialPaths = [
                "./src/missions/introSelectMission.json",
                "./src/missions/introUpdateMission.json",
                "./src/missions/introLoggingMission.json"
            ];

            const missions = [];

            for (const path of tutorialPaths) {
                const res = await fetch(path + `?t=${Date.now()}`);
                missions.push(await res.json());
            }

            this.loadingScreen.hide();
            document.getElementById("game-ui").classList.remove("hidden");

            this.campaign.startScriptedCampaign(missions);

        }, 1500);
    }

    // ---------------- UI Button Bindings ----------------
    bindMenuButton() {
        const btn = document.getElementById("main-menu-btn");
        if (!btn) return;

        btn.onclick = () => {
            document.getElementById("tutorial-box").classList.add("hidden");
            document.getElementById("game-ui").classList.add("hidden");
            this.mainMenu.show();
        };
    }

    bindBriefingButton() {
        const btn = document.getElementById("briefing-btn");
        if (!btn) return;

        btn.onclick = () => this.briefing.show(this.missionManager.currentMission);
    }

    // ---------------- Victory Screen ----------------
    showVictoryScreen(isTutorial = false) {
        
        document.getElementById("game-ui").classList.add("hidden");
        document.getElementById("tutorial-box").classList.add("hidden");
        
        this.loadingScreen.hide();

        const victory = new VictoryModal(this, isTutorial);
        victory.open();
    }

    // ---------------- Save Profile ----------------
    saveProfile() {
        this.profile.stats = this.statsManager.stats;
        PlayerProfile.save(this.profile);
    }
}