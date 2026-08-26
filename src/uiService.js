// ---------------- UI Service ----------------
// Handles player interactions with the mission console

export class uiService {
    constructor({ missionManager, display, loadMissionCallback }) {
        this.missionManager = missionManager;
        this.display = display;
        this.loadMissionCallback = loadMissionCallback;
    }

    // ---------------- Initialise UI ----------------
    // Sets up command input and Identify button
    init() {
 
        this.setupCommandInput();
        this.setupIdentifyButton(); 
    }

    // ---------------- Command Input ----------------
    // Handles resizing input, getting queries and executing them
    setupCommandInput() {
        const input = document.getElementById("commandInput");
        const runBtn = document.getElementById("runBtn");

       
        const resizeInput = () => {
            input.style.height = "auto";

            const style = window.getComputedStyle(input);
            const paddingTop = parseFloat(style.paddingTop);
            const paddingBottom = parseFloat(style.paddingBottom);
            
            input.style.height = (input.scrollHeight - paddingTop - paddingBottom) + "px";
        };

        // Execute query when player presses Run or Enter
        const runCommand = async () => {
            const query = input.value.trim();
            const engine = this.missionManager.engine;
            if (!query || !engine) return;

            // Track total queries for stats
            const summary = this.missionManager.currentMission.summary = this.missionManager.currentMission.summary || {};
            summary.totalQueries = (summary.totalQueries || 0) + 1;
            this.missionManager.gameManager.statsManager.recordQuery();

            let allowedFields = null;

            // Restrict updates to valid fields
            if (query.toUpperCase().startsWith("UPDATE")) {
                const cleaned = query.trim().replace(/\s+/g, " ");
                let parts = cleaned.split(" ");
                let tableName = parts[1];
                if (tableName) {
                    
                    tableName = tableName.replace(/['"`]/g, "");
                
                    const modules = this.missionManager.rulebook.modules.items;

                    const moduleName = Object.keys(modules).find(key => key.toLowerCase() === tableName.toLowerCase());

                    const moduleDetails = modules[moduleName];

                    if (moduleDetails) {
                        // Only include faultable fields by checking if it has min/max values
                            allowedFields = moduleDetails.fields.filter(f => {
                            const r = this.missionManager.rulebook.faultRanges.items[f];
                            return r && r.min !== null && r.max !== null;
                        });

                        if (moduleName === "Logs") {
                            allowedFields = ["repairs"];
                        }
                    }
                } else {
                    this.display.printError("No table name specified for UPDATE command");
                }
            }

            await engine.execute(query, allowedFields);

           
            input.value = "";
            resizeInput();
        };

  
        input.addEventListener("input", resizeInput);  

        runBtn.addEventListener("click", runCommand);

        // Execute query on Enter key (without Shift)
        input.addEventListener("keydown", e => {
            if (e.key === "Enter" && !e.shiftKey) { 
                e.preventDefault(); 
                runCommand();
            }
        });

       
        resizeInput();
    }

    // ---------------- Identify Faults ----------------
    // Handles Identify Faults button, triggering fault detection
    setupIdentifyButton() {
        const identifyBtn = document.getElementById("identifyBtn");
        if (!identifyBtn) return;

        identifyBtn.addEventListener("click", async () => {
            if (!this.missionManager) return;

            this.missionManager.identifyFaults(); 
            this.missionManager.renderMission();
        });
    }
}