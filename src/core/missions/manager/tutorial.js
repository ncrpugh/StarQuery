// ---------------- Tutorial ----------------
// Handles tutorial messages, message progression and typing effect
// Used for guiding the player through early stages

export class Tutorial {
    constructor() {

        // State setup
        this.messages = [];
        this.step = 0;

        
        
        
        this.tutorialBox = document.getElementById("tutorial-box");
        this.tutorialText = document.getElementById("tutorial-text");
        this.tutorialNextBtn = document.getElementById("tutorial-next");
        this.tutorialBackBtn = document.getElementById("tutorial-back");

        // Setup typing effect
        this.typingInterval = null;
        this.fullMessage = "";
        this.typingIndex = 0;
        this.tagBuffer = "";
        this.insideTag = false;

        
        // Bind next button 
        if (this.tutorialNextBtn) {
            this.tutorialNextBtn.addEventListener("click", () => this.next());
        }
        if (this.tutorialBackBtn) {
            this.tutorialBackBtn.addEventListener("click", () => this.previous());
        }
    }

    
    // ---------------- Tutorial message management ----------------
    setMessages(messages) {
        this.stop();          
        this.messages = messages;
        this.step = 0;
    }

    start() {
        if (this.messages.length > 0) this.runStep();
    }

    // Show current message, hiding if last message
    runStep() {
        if (this.step < 0) this.step = 0;
        if (this.step >= this.messages.length) {
            this.hide();
            return;
        }
        
        const stepObj = this.messages[this.step];
        const text = typeof stepObj === "string" ? stepObj : stepObj.message;

        this.show(text, true);
    }

    // ---------------------------
    // Display a message with typing effect
    // ---------------------------
    show(message, manual = true, autoHideMs = null) {
        if (!this.tutorialBox) return;
        this.tutorialBox.classList.remove("hidden");
        this.tutorialText.innerHTML = "";

        // Setup typing effect
        this.fullMessage = message;
        this.typingIndex = 0;
        this.tagBuffer = "";
        this.insideTag = false;

        if (this.typingInterval) clearInterval(this.typingInterval);

        // Run typing effect
        this.typingInterval = setInterval(() => {
            if (this.typingIndex >= this.fullMessage.length) {
                clearInterval(this.typingInterval);
                this.typingInterval = null;
                if (autoHideMs) setTimeout(() => this.hide(), autoHideMs);
                return;
            }

            const char = this.fullMessage[this.typingIndex];

            
            // Handle HTML tags inside typing
            if (char === "<") this.insideTag = true;

            if (this.insideTag) {
                this.tagBuffer += char;
                if (char === ">") {
                    this.tutorialText.innerHTML += this.tagBuffer;
                    this.tagBuffer = "";
                    this.insideTag = false;
                }
            } else {
                this.tutorialText.innerHTML += char;
            }

            this.typingIndex++;
        }, 25);

    }

    
   
    
    hide() {
        if (!this.tutorialBox) return;
        this.tutorialBox.classList.add("hidden");
    }

    
    // Move to next message
    next() {
        // If typing is still running, complete message instantly
        if (this.typingInterval) {
            clearInterval(this.typingInterval);
            this.typingInterval = null;
            this.tutorialText.innerHTML = this.fullMessage;
            return; 
        }

        
        this.step++;
        if (this.step >= this.messages.length) {
            this.hide();
            return;
        }

       
        // Reveal buttons
        if (this.tutorialBackBtn) {
            if (this.step > 0) {
                this.tutorialBackBtn.classList.add("visible");
            } else {
                this.tutorialBackBtn.classList.remove("visible");
            }
        }
            
        if (this.tutorialNextBtn)
            this.tutorialNextBtn.style.display = "inline-block";

        // Show the new message
        const stepObj = this.messages[this.step];
        const text = typeof stepObj === "string" ? stepObj : stepObj.message;
        this.show(text);
    }

    // Move to previous message
    previous() {
        // Clear typing interval
        if (this.typingInterval) {
            clearInterval(this.typingInterval);
            this.typingInterval = null;
        }

      
        this.step--;
        if (this.step < 0) this.step = 0;

        
        if (this.tutorialBackBtn) {
            if (this.step > 0) {
                this.tutorialBackBtn.classList.add("visible");
            } else {
                this.tutorialBackBtn.classList.remove("visible");
            }
        }
        if (this.tutorialNextBtn)
            this.tutorialNextBtn.style.display = "inline-block";

        // Show the previous message
        const stepObj = this.messages[this.step];
        const text = typeof stepObj === "string" ? stepObj : stepObj.message;
        this.show(text);
    }

    
    stop() {
        if (this.typingInterval) {
            clearInterval(this.typingInterval);
            this.typingInterval = null;
        }

        this.step = 0;
        this.fullMessage = "";
        this.typingIndex = 0;
        this.tagBuffer = "";
        this.insideTag = false;

        if (this.tutorialBox) this.tutorialBox.classList.add("hidden");
        if (this.tutorialText) this.tutorialText.innerHTML = "";
    }

    
    // auto-advance messages when predefined events happen
    checkTrigger(eventType, data = null) {
        
        const stepObj = this.messages[this.step];
        const text = typeof stepObj === "string" ? stepObj : stepObj.message;
    
        if (!stepObj) return;

        if (stepObj.trigger === eventType) {
            this.next();
        }
    }
}