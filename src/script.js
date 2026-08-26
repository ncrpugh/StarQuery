import { GameManager } from "./core/gameManager.js";

// ---------------- Script Entry ----------------
// Creates and starts the Game Manager on DOM load
document.addEventListener("DOMContentLoaded", async () => {
    const game = new GameManager();
    await game.start();
});