// ---------------- Loading Screen ----------------
// Handles showing and hiding the loading screen

export class LoadingScreen {
    constructor(duration = 1500) {
        this.duration = duration; 
        this.screen = document.getElementById("loading-screen");
    }

    // ---------------- Show Loading Screen ----------------
    // Display loading screen, wait for duration, then hide
    async show() {
        if (!this.screen) return;

        this.screen.classList.remove("hidden");

        // Ensure DOM updates before delay
        await new Promise(requestAnimationFrame);

        // Wait for loading duration
        await new Promise(resolve => setTimeout(resolve, this.duration));
        
        this.screen.classList.add("hidden");
 
    }

    // ---------------- Hide Loading Screen ----------------
     hide() {
        if (!this.screen) return;
        this.screen.classList.add("hidden");
    }
}