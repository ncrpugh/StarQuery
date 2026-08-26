// ---------------- Mission Briefing ----------------
// Displays mission briefing text before mission start

export class MissionBriefing {
    constructor() {

        this.container = document.getElementById("mission-briefing");
        this.textEl = document.getElementById("mission-briefing-text");
        this.beginBtn = document.getElementById("mission-begin-btn");
       

        this.beginBtn.onclick = () => this.hide();

        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape") this.hide();
        });
        
    }

    // ---------------- Display ----------------
    // Show briefing text
    show(mission) {
        if (!mission) return;

        const briefing = mission.briefing ?? this.generateFallbackBriefing();

        this.textEl.textContent = briefing.text;

        this.container.classList.remove("hidden");
    }

    // Hide
    hide() {
        this.container.classList.add("hidden");
    }

    // ---------------- Fallback ----------------
    // Generate default briefing if none provided
    generateFallbackBriefing() {
        return {
            text: `"Commander, your task is to identify and repair system faults to restore ship functionality.";`
        };
    }
}