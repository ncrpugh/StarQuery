// ---------------- Display ----------------
// Handles UI rendering for mission info, modules, query results, and mission status messages

export class Display {
    constructor() {
        
        // ---------------- HTML Elements ----------------
        this.modulesPanel = document.getElementById("system-modules");
        this.queryOutput = document.getElementById("query-output");
        this.missionInfo = document.getElementById("mission-info");
        this.consoleElement = document.getElementById("console");
    }

    // ---------------- Mission Info ----------------
    // Displays active variation rules, current stage, and current mission modules

    renderMissionInfo(mission) {
        const ruleNames = {
        CRITICAL_REPAIR_ORDER: "Critical Repair Order",
        CASCADING_FAULTS: "Cascading Faults"
    };

    const ruleKey = mission.rules?.[0];
    const prettyRule = ruleNames[ruleKey] || ruleKey;

    const ruleText = ruleKey ? `<p><strong>Rule:</strong> ${prettyRule}</p>` : "";
        this.missionInfo.innerHTML = `
            <h2>${mission.name}</h2>
            <p>${mission.description}</p>
            ${ruleText}
            <p><strong>Stage:</strong> <span id="mission-stage">${mission.stages[0].name}</span></p>
        `;
    }

    updateMissionStage(stage) {
        const element = document.getElementById("mission-stage");
        if (!element) {
            console.warn("Mission stage element not found.");
            return;
        }
        element.textContent = stage.name;
    }

    renderSystemModules(modules) {
        this.modulesPanel.innerHTML = "";
        modules.forEach(module => {
            const div = document.createElement("div");
            div.className = "module-entry";
            div.textContent = module.name;
            this.modulesPanel.appendChild(div);
        });
    }

    // ---------------- Generic Messages ----------------
    printCommand(cmd) { this.appendMessage(cmd, "command"); }
    printResult(msg) { this.appendMessage(msg, "result"); }
    printData(msg) { this.appendMessage(msg, "data"); }
    printError(msg) { this.appendMessage(msg, "error"); }
    printSuccess(msg) { this.appendMessage(msg, "success"); }
    printMessage(msg) { this.appendMessage(msg, "message"); }

    appendMessage(msg, cssClass = "") {
        const p = document.createElement("p");
        if (cssClass) {
            p.classList.add(cssClass);
        }
        p.textContent = msg;
        this.queryOutput.appendChild(p);

       
        
        if (this.consoleElement) {
            this.consoleElement.scrollTop = this.consoleElement.scrollHeight;
        }
    }


    // ---------------- Query Table Rendering ----------------
    renderQueryResults({ module, results, mission, stageIndex }) {
        if (!results || results.length === 0) {
            this.printMessage("No results.");
            return;
        }

    
        // Get fields of the table, filtering out hidden fields
        let headers = Object.keys(results[0]);
        headers = this.getVisibleFields(mission, headers, stageIndex);

        // Create table elements, assembling them
        const container = document.createElement("div");
        container.className = "table-container";

        const table = document.createElement("table");
        table.className = "data-table";

        const thead = document.createElement("thead");
        const tr = document.createElement("tr");

        headers.forEach(header => {
            const th = document.createElement("th");
            th.textContent = header;
            tr.appendChild(th);
        });

        thead.appendChild(tr);
        table.appendChild(thead);

        const tbody = document.createElement("tbody");

        results.forEach((row, i) => {
            const tr = document.createElement("tr");

            headers.forEach(header => {
                const td = document.createElement("td");
                td.textContent = row[header];
                tr.appendChild(td);
            });

            tbody.appendChild(tr);
        });

        table.appendChild(tbody);
        container.appendChild(table);
        this.queryOutput.appendChild(container);

        
        if (this.consoleElement) {
            this.consoleElement.scrollTop = this.consoleElement.scrollHeight;
        }
    }

    // ---------------- Mission End Notifications ----------------
    showMissionComplete(name) {
        const div = document.createElement("div");
        div.className = "mission-complete";
        div.innerHTML = `
            <h2>Mission Complete!</h2>
            <p>${name} finished successfully.</p>
        `;
        this.queryOutput.appendChild(div);

        if (this.consoleElement) {
            this.consoleElement.scrollTop = this.consoleElement.scrollHeight;
        }
    }

    clear() {
        if (this.modulesPanel) {
            this.modulesPanel.innerHTML = "";
        }

        if (this.queryOutput) {
            this.queryOutput.innerHTML = "";
        }

        if (this.missionInfo) {
            this.missionInfo.innerHTML = "";
        }

        const input = document.getElementById("commandInput");
        if (input) input.value = ""; 
    }

    // ---------------- Field Visibility ----------------
    // Ensure that the player is only shown fields in the database that are meant to be 'player-facing'

    getVisibleFields(mission, headers, stageIndex) {
        const hidden = mission?.hiddenFields || [];
        const stage = mission?.stages?.[stageIndex]?.name;
        const tempHidden = [...hidden];

        if (stage === "Identify") {
            const i = tempHidden.indexOf("issue_detected");
            if (i !== -1) {
                tempHidden.splice(i, 1);
            }

            if (!tempHidden.includes("repaired")) {
                tempHidden.push("repaired");
            }
        }

        if (stage === "Repair") {
            const i = tempHidden.indexOf("issue_detected");
            if (i !== -1) {
                tempHidden.splice(i, 1);
            }

            const repairedIndex = tempHidden.indexOf("repaired");
            if (repairedIndex !== -1) {
                tempHidden.splice(repairedIndex, 1);
            }
        }

        if (stage === "Logging") {
            if (!tempHidden.includes("issue_detected")) {
                tempHidden.push("issue_detected");
            }
            const repairedIndex = tempHidden.indexOf("repaired");
            if (repairedIndex !== -1) {
                tempHidden.splice(repairedIndex, 1);
            }
        }

        return headers.filter(header => !tempHidden.includes(header));
    }

    // ---------------- UI Controls ----------------
    setIdentifyButtonEnabled(enabled) {
        const btn = document.getElementById("identifyBtn");
        if (btn) {
            if (enabled) {
                btn.disabled = false;
            } else {
                btn.disabled = true;
            }
        }
    }
}