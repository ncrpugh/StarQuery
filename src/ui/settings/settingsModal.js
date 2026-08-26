// ---------------- Settings Modal ----------------
// Handles the display, input, and saving of user accessibility settings

export class SettingsModal {
    constructor(gameManager) {
        this.gameManager = gameManager;
        this.modal = document.getElementById("settings-modal");

        // Inputs
        this.fontSizeInput = document.getElementById("font-size-input");
        this.contrastToggle = document.getElementById("contrast-toggle");

        this.bindEvents();

        // Close modal if clicking outside of panel
        this.modal.onclick = (e) => {
            if (e.target === this.modal) {
                this.close();
            }
        };
    }

    // ---------------- Bind Events ----------------
    bindEvents() {
        document.getElementById("save-settings-btn").onclick = () => {
            this.saveSettings();
        };

        document.getElementById("close-settings-btn").onclick = () => {
            this.close();
        };
        
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape") this.close();
        });
    }

    // ---------------- Open Modal ----------------
    // Display modal with current settings
    open() {
        const settings = this.gameManager.profile.settings || {};

        this.fontSizeInput.value = settings.fontSize || 16;
        this.contrastToggle.checked = settings.highContrast || false;

        this.modal.classList.remove("hidden");
    }

    // ---------------- Close Modal ----------------
    close() {
        this.modal.classList.add("hidden");
    }

    // ---------------- Save Settings ----------------
    // Apply new settings to game and persist in profile
    saveSettings() {
        const settings = {
            fontSize: parseInt(this.fontSizeInput.value),
            highContrast: this.contrastToggle.checked
        };

        this.gameManager.profile.settings = settings;

        this.gameManager.accessibility.applySettings(settings);
        this.gameManager.saveProfile();

        this.close();
    }
}