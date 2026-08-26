// ---------------- Rulebook Modal ----------------
// Controls the display of the rulebook overlay in the UI

export class RulebookModal {
    constructor() {
        this.modal = document.getElementById("rulebook-modal");
        this.book = document.getElementById("rulebook-book");
        this.openBtn = document.getElementById("rulebook-btn");
        this.closeBtn = document.getElementById("rulebook-close");

        this.bind();
    }

    // ---------------- Binding ----------------
    // Connect buttons, ESC key, and outside click
    bind() {
        this.openBtn?.addEventListener("click", () => this.show());
        this.closeBtn?.addEventListener("click", () => this.hide());

        // Close on ESC
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape") this.hide();
        });

        // Close when clicking outside book
        this.modal?.addEventListener("click", (e) => {
            if (!this.book.contains(e.target)) {
                this.hide();
            }
        });
    }

    // ---------------- Display ----------------
    // Show modal and reset contents layout
    show() {
        this.modal?.classList.remove("hidden");
        
        const sectionPages = document.getElementById("section-pages");
        const contents = document.getElementById("rulebook-contents");

        if (sectionPages && contents) {
            sectionPages.innerHTML = "";
            sectionPages.classList.add("centered");
            contents.classList.remove("hidden");
        }
    }

    // Hide
    hide() {
        this.modal?.classList.add("hidden");
    }
}