// ---------------- Accessibility Manager ----------------
// Handles applying user accessibility preferences such as font size and high contrast mode.

export class AccessibilityManager {

  applySettings(settings) {
    const size = settings.fontSize || 16;
    document.documentElement.style.fontSize = size + "px";

    if (settings.highContrast) {
        document.body.classList.add("high-contrast");
    } else {
        document.body.classList.remove("high-contrast");
    }
  }
}