// ---------------- Mission Generator ----------------
// Performs mission generation by combining difficulty scaling, row population, and mission building

import { MissionBuilder } from "./missionBuilder.js";
import { RowPopulator } from "./rowPopulator.js";
import { Randomiser } from "./randomiser.js";
import { MissionConfig } from "../../config/missionConfig.js";
import { buildDifficultyParams } from "../../difficulty/difficulty.js";
import { Rulebook } from "../../rules/rulebook.js";

export class MissionGenerator {
    constructor() {
        const rulebook = new Rulebook();
        

        // Initialise components that build the mission
        this.randomiser = new Randomiser();
        this.rowPopulator = new RowPopulator(rulebook, MissionConfig, this.randomiser);
        this.builder = new MissionBuilder(rulebook, this.rowPopulator);
    }

    // ---------------- Generate Mission ----------------
    // Builds a full mission for the player based on difficulty and rules

    generateMissionForPlayer(playerShip, missionNumber, selectedRule,  options = {}, hiddenFields = ["issue_detected", "repaired"]) {
        const difficultyParams = buildDifficultyParams(playerShip);

        // Build modules with variable row counts
        const modules = playerShip.unlockedModules.map(moduleName => {
            const minRows = options.minRowsPerModule ?? Math.max(2, playerShip.rowsPerModule - MissionConfig.rowsPerModule.minOffset);
            const maxRows = options.maxRowsPerModule ?? Math.max(3, playerShip.rowsPerModule + MissionConfig.rowsPerModule.maxOffset);
            const rowCount = this.randomiser.randomInt(minRows, maxRows);
            return this.builder.buildModule(moduleName, rowCount, difficultyParams);
        });

        // Assemble final mission object
        return this.builder.buildMission(playerShip, modules, missionNumber, selectedRule, hiddenFields);
    }
}