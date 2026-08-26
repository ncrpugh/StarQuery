// ---------------- Main Menu ----------------
// Handles main menu UI and button clicks

export class MainMenu {
    constructor({ onStart, onStartTutorial, onStartWithRule }) {
        
        // Callbacks for different game modes
        this.onStart = onStart;                     
        this.onStartTutorial = onStartTutorial;   
        this.onStartWithRule = onStartWithRule;     

        this.root = document.getElementById("main-menu");
        this.startBtn = document.getElementById("start-btn");
        this.tutorialBtn = document.getElementById("tutorial-btn");
        this.ruleOrderBtn = document.getElementById("start-rule1-btn");
        this.ruleCascadeBtn = document.getElementById("start-rule2-btn");

        this.bind();
    }

    // ---------------- Bind Buttons ----------------
    bind() {
        if (this.startBtn) {
            this.startBtn.onclick = () => this.onStart();
        }

        if (this.tutorialBtn) {
            this.tutorialBtn.onclick = () => this.onStartTutorial();
        }

        if (this.ruleOrderBtn) {
            this.ruleOrderBtn.onclick = () => this.onStartWithRule("CRITICAL_REPAIR_ORDER");
        }

        if (this.ruleCascadeBtn) {
            this.ruleCascadeBtn.onclick = () => this.onStartWithRule("CASCADING_FAULTS");
        }
    }

    // ---------------- Visibility ----------------
    show() {
        this.root.classList.remove("hidden");
    }

    hide() {
        this.root.classList.add("hidden");
    }
}