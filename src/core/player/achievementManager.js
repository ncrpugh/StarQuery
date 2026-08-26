// ---------------- Achievement Manager ----------------
// Handles tracking, unlocking, and displaying player achievements
// Persists achievement in localStorage

export class AchievementManager {
    constructor(display) {
        this.display = display;

        // ---------------- Achievement Definitions ----------------
        // Each achievement has a name, description, and unlocked status
        this.achievements = {
            firstQuery: {
                name: "First Query",
                description: "Run your first SQL command",
                unlocked: false
            },
            firstFault: {
                name: "First Diagnosis",
                description: "Identify your first system fault",
                unlocked: false
            },
            firstMission: {
                name: "Mission Complete",
                description: "Complete your first mission",
                unlocked: false
            }
        };
        this.loadFromStorage();
    }

    // ---------------- Load Achievements ----------------
    // Reads localStorage and updates unlocked status
    loadFromStorage() {
        const saved = localStorage.getItem('achievements');
        if (!saved) return;

        try {
            const parsed = JSON.parse(saved);
            for (const key in this.achievements) {
                if (parsed[key]) {
                    this.achievements[key].unlocked = true;
                }
            }
        } catch (err) {
            console.warn("Failed to load achievements from localStorage:", err);
        }
    }

    // ---------------- Unlock Achievement ----------------
    // Unlocks an achievement and shows a popup message
    unlock(key) {
        const achievement = this.achievements[key];

        if (!achievement || achievement.unlocked) return;

        achievement.unlocked = true;

        this.display.printMessage(`🏆 Achievement Unlocked: ${achievement.name}`);

        this.showPopup(achievement);

        this.saveToStorage();
    }

    // ---------------- Save Achievements ----------------
    // Saves current unlocked state to localStorage
    saveToStorage() {
        const saveObj = {};
        for (const key in this.achievements) {
            saveObj[key] = this.achievements[key].unlocked;
        }

        localStorage.setItem('achievements', JSON.stringify(saveObj));
    }

    // ---------------- Popup Display ----------------
    // Temporarily show popup in the UI
    showPopup(achievement) {
        const container = document.getElementById("achievement-container");
        if (!container) return;

        const popup = document.createElement("div");
        popup.className = "achievement-popup";

        popup.innerHTML = `
            <div class="achievement-title">🏆 Achievement Unlocked</div>
            <div>${achievement.name}</div>
        `;

        container.appendChild(popup);

        // Dynamically adjust position to avoid overlapping toolbar or tutorial
        const updatePosition = () => {
            const toolbar = document.querySelector(".ui-toolbar");
            const tutorialBox = document.getElementById("tutorial-box");

            let topOffset = toolbar ? toolbar.getBoundingClientRect().bottom + 10 : 10;

            
            if (tutorialBox && !tutorialBox.classList.contains("hidden")) {
                topOffset = Math.max(topOffset, tutorialBox.getBoundingClientRect().bottom + 10);
            }

            container.style.top = `${topOffset}px`;
            container.style.right = "10px";
        };

       
        updatePosition();

       
        const interval = setInterval(updatePosition, 50);

       
        setTimeout(() => {
            popup.remove();
            clearInterval(interval); 
        }, 3500);
    }

    getAll() {
        return this.achievements;
    }
}