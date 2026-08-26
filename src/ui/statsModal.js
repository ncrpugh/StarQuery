// ---------------- Stats Modal ----------------
// Modal for displaying player statistics

export class StatsModal {

    constructor(gameManager) {
        this.gameManager = gameManager;
        this.modal = document.getElementById("stats-modal");

        document.getElementById("close-stats-btn").onclick = () => {
            this.close();
        };

        this.modal.onclick = (e) => {
            if (e.target === this.modal) {
                this.close();
            }
        };

        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape") this.close();
        });
    }

    // ---------------- Open Modal ----------------
    // Populates stats modal and displays

    open() {
        const stats = this.gameManager.statsManager.stats || {};

        
        const missions = stats.missionsCompleted || 0;
        const queries = stats.totalQueries || 0;
        const repairs = stats.totalRepairs || 0;

        document.getElementById("stats-missions").textContent = missions;
        document.getElementById("stats-queries").textContent = queries;
        document.getElementById("stats-repairs").textContent = repairs;

        this.modal.classList.remove("hidden");
    }

    // ---------------- Close Modal ----------------
    close() {
        this.modal.classList.add("hidden");
    }
}