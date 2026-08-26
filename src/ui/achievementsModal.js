// ---------------- Achievements Modal ----------------
// Handles displaying, listing, and resetting achievements

export class AchievementsModal {
    constructor(gameManager) {
        this.gameManager = gameManager;
        this.achievementManager = gameManager.achievements;

        // Create the modal container
        this.modal = document.createElement("div");
        this.modal.id = "achievements-modal";
        this.modal.className = "modal hidden";

        this.modal.innerHTML = `
            <div class="modal-content achievements-content">
                <h2>Achievements</h2>
                <ul id="achievement-list" class="achievement-list"></ul>
                <div class="achievements-actions">
                    <button id="reset-achievements-btn">Reset Achievements</button>
                    <button id="close-achievements-btn">Close</button>
                </div>
            </div>
        `;

        document.body.appendChild(this.modal);

        // ---------------- Bind modal buttons ----------------
        this.modal.querySelector("#close-achievements-btn").onclick = () => this.close();
        this.modal.querySelector("#reset-achievements-btn").onclick = () => this.resetAchievements();

        // Close modal by clicking outside content
        this.modal.onclick = (e) => {
            if (e.target === this.modal) this.close();
        };

        // Close modal with Escape key
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && !this.modal.classList.contains("hidden")) {
                this.close();
            }
        });

        // ---------------- Bind UI buttons ----------------
        const toolbarBtn = document.getElementById("achievements-toolbar-btn");
        if (toolbarBtn) toolbarBtn.onclick = () => this.open();

        const menuBtn = document.getElementById("achievements-btn");
        if (menuBtn) menuBtn.onclick = () => this.open();
    }

    // ---------------- Open / Close ----------------
    open() {
        this.populateList();
        this.modal.classList.remove("hidden");
    }

    close() {
        this.modal.classList.add("hidden");
    }

    // ---------------- Populate Achievement List ----------------
    populateList() {
        const list = this.modal.querySelector("#achievement-list");
        list.innerHTML = ""; 

        const achievements = this.achievementManager.getAll();

        Object.entries(achievements).forEach(([key, ach]) => {
            const li = document.createElement("li");
            li.className = ach.unlocked ? "achievement unlocked" : "achievement locked";

            li.innerHTML = `
                <div class="achievement-name">${ach.name}</div>
                <div class="achievement-desc">${ach.description}</div>
            `;

            list.appendChild(li);
        });
    }

    // ---------------- Reset Achievements ----------------
    resetAchievements() {
        if (!confirm("Are you sure you want to reset all achievements?")) return;

        
        const allAchievements = this.achievementManager.getAll();
        Object.values(allAchievements).forEach(a => a.unlocked = false);

        
        localStorage.removeItem("achievements");

        
        this.populateList();

        this.gameManager.missionManager.display.printMessage("All achievements have been reset.");
    }
}