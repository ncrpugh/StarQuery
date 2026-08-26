// ---------------- Progress Bar ----------------
// Progress bar component for displaying progression through the mission

export class ProgressBar {
    constructor(containerId, label = "", initialProgress = 0) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.warn(`ProgressBar container ${containerId} not found`);
            return;
        }

        this.label = label;
        this.progress = initialProgress;

        this.render();
    }

    // ---------------- Render ----------------
    // Generates HTML for the progress bar
    render() {
        this.container.innerHTML = `
            <div class="progress-bar-label">${this.label}</div>
            <div class="progress-bar-outer">
                <div class="progress-bar-inner" style="width: ${Math.round(this.progress*100)}%"></div>
            </div>
        `;
    }

    // ---------------- Update ----------------
    // Updates the progress value and adjusts the bar proportionally
    update(progress) {
        this.progress = Math.max(0, Math.min(1, progress));
        const inner = this.container.querySelector(".progress-bar-inner");
        if (inner) inner.style.width = `${Math.round(this.progress*100)}%`;
    }

    // ---------------- Reset ----------------
    reset() {
        this.update(0);
    }
}
