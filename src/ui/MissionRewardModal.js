// ---------------- MissionRewardModal ----------------
// Displays a summary of mission stats for each stage.

export class MissionRewardModal {
    constructor(missionManager, mission, gameManager) {
        this.missionManager = missionManager;
        this.mission = mission;
        this.modal = null;
        this.gameManager = gameManager;
    }

    // ---------------- Open Modal ----------------
    // Creates modal element and display content
    open() {
        this.modal = document.createElement("div");
        this.modal.classList.add("modal-overlay", "fade-in");

        this.modal.innerHTML = `
            <div class="modal-content reward-modal">
                <h2>Mission Complete: ${this.mission.name}</h2>
                <div class="reward-body"></div>
                <button class="next-mission-btn">Next Mission</button>
            </div>
        `;

        document.body.appendChild(this.modal);

        // Fill in mission stats
        this.renderContent();

        this.modal.querySelector(".next-mission-btn").addEventListener("click", () => this.onNext());
    }

    // ---------------- Render Content ----------------
    // Generates HTML for each stage and other stats
    renderContent() {
        const body = this.modal.querySelector(".reward-body");
        const summary = this.mission.summary ?? {};
        const stages = this.mission.stages.map(s => s.name);

        const lines = [];

        // ---------------- Identify Stage ----------------
        if (stages.includes("Identify") && summary.identify) {
            const identify = summary.identify;

            lines.push(`<h3>Identify Stage</h3>`);
            lines.push(`<ul>`);

            if (identify.accuracy != null)
                lines.push(`<li>Identify Accuracy: ${(identify.accuracy * 100).toFixed(1)}%</li>`);

            if (identify.efficiency != null)
                lines.push(`<li>Identify Efficiency: ${identify.efficiency.toFixed(1)}</li>`);

            lines.push(`</ul><hr>`);
        }

        // ---------------- Repair Stage ----------------
        if (stages.includes("Repair") && summary.repair) {
            const repair = summary.repair;

            lines.push(`<h3>Repair Stage</h3>`);
            lines.push(`<ul>`);

            if (repair.totalFieldsUpdated != null)
                lines.push(`<li>Total fields updated: ${repair.totalFieldsUpdated}</li>`);

            if (repair.totalFieldsRepaired != null)
                lines.push(`<li>Fields successfully repaired: ${repair.totalFieldsRepaired}</li>`);

            if (repair.minimumRepairsRequired != null)
                lines.push(`<li>Minimum repairs required: ${repair.minimumRepairsRequired}</li>`);

            if (repair.spawnedFaults != null)
                lines.push(`<li>Spawned faults: ${repair.spawnedFaults}</li>`);

            if (repair.accuracy != null)
                lines.push(`<li>Repair Accuracy: ${(repair.accuracy * 100).toFixed(1)}%</li>`);

            if (repair.efficiency != null)
                lines.push(`<li>Repair Efficiency: ${repair.efficiency.toFixed(1)}</li>`);

            lines.push(`</ul><hr>`);
        }

        // ---------------- Logging Stage ----------------
        if (stages.includes("Logging") && summary.logging) {
            const logging = summary.logging;

            lines.push(`<h3>Logging Stage</h3>`);
            lines.push(`<ul>`);

        
            if (logging.correctUpdates != null)
                lines.push(`<li>Correct Log Updates: ${logging.correctUpdates}</li>`);

            if (logging.correctUpdates != null || logging.invalidLogAttempts != null)
                lines.push(`<li>Total Log Updates: ${logging.correctUpdates + logging.invalidLogAttempts}</li>`);

            if (logging.accuracy != null)
                lines.push(`<li>Logging Accuracy: ${(logging.accuracy * 100).toFixed(1)}%</li>`);

            lines.push(`</ul><hr>`);
        }

        // ---------------- Other Stats ----------------
        if (summary.totalQueries != null) {
            lines.push(`<h3>Other Stats</h3>`);
            lines.push(`<ul>`);
            lines.push(`<li>Total Queries Made: ${summary.totalQueries}</li>`);
            lines.push(`</ul>`);
        }

        // Combine and display in modal
        body.innerHTML = lines.join("");
    }

    // ---------------- Next Mission ----------------
    // Closes modal and triggers next mission load
    onNext() {
        this.close();
        this.gameManager.campaign.loadNextMission();
    }

    // ---------------- Close Modal ----------------
    close() {
        if (this.modal) {
            this.modal.remove();
            this.modal = null;
        }
    }
}