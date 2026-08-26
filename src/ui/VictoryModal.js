// ---------------- Victory Modal ----------------
// Modal displayed when the player completes a mission

export class VictoryModal {
    constructor(gameManager, isTutorial = false) {
        this.gameManager = gameManager;
        this.isTutorial = isTutorial;
        this.modal = null;
    }

    // ---------------- Open Modal ----------------
    // Creates and shows the victory modal
    open() {
        this.modal = document.createElement("div");
        this.modal.classList.add("modal-overlay", "fade-in");

        const title = this.isTutorial ? "Tutorial Complete!" : "Campaign Complete!";
        const text = this.isTutorial
            ? "Well done! You have completed the tutorial."
            : "Congratulations! You have completed all missions.";

        this.modal.innerHTML = `
            <div class="modal-content reward-modal victory">
                <h2>${title}</h2>
                <p>${text}</p>
                <button class="victory-main-menu-btn">Return to Main Menu</button>
            </div>
        `;

        document.body.appendChild(this.modal);

        // Button to return to main menu
        const btn = this.modal.querySelector(".victory-main-menu-btn");
        if (btn) btn.onclick = () => this.closeAndReturnToMenu();
    }

    // ---------------- Close Modal ----------------
    // Removes the modal and returns the player to main menu
    closeAndReturnToMenu() {
        if (this.modal) {
            this.modal.remove();
            this.modal = null;
        }
        this.gameManager.mainMenu.show();
    }
}