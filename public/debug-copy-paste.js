// Debug script for copy-paste reference feature
// Add this to your browser console to debug the copy-paste reference feature

window.debugCopyPaste = {
  // Track copy events
  trackedCopies: new Map(),

  // Initialize debugging
  init: function () {
    console.log("🔍 Copy-Paste Debug Tool initialized");
    this.setupListeners();
    this.checkComponents();
  },

  // Setup event listeners
  setupListeners: function () {
    // Monitor copy events
    document.addEventListener("copy", (e) => {
      console.log("📋 Copy event detected");
      const selection = window.getSelection();
      if (selection && selection.toString().trim()) {
        const content = selection.toString().trim();
        console.log(
          "Content copied:",
          content.slice(0, 100) + (content.length > 100 ? "..." : "")
        );

        // Store in tracked copies
        const id = `debug-${Date.now()}`;
        this.trackedCopies.set(content, {
          id,
          content,
          timestamp: Date.now(),
        });

        // Auto cleanup after 30 seconds
        setTimeout(() => {
          if (this.trackedCopies.has(content)) {
            this.trackedCopies.delete(content);
          }
        }, 30000);
      }
    });

    // Monitor paste events in supervisor textarea
    const supervisorTextarea = document.querySelector(".supervisor-textarea");
    if (supervisorTextarea) {
      supervisorTextarea.addEventListener("paste", (e) => {
        const pastedText = e.clipboardData.getData("text");
        console.log("📋 Paste event in supervisor textarea");
        console.log(
          "Pasted content:",
          pastedText.slice(0, 100) + (pastedText.length > 100 ? "..." : "")
        );

        // Check if this matches any tracked copies
        for (const [trackedContent, metadata] of this.trackedCopies.entries()) {
          if (this.isSimilarContent(pastedText, trackedContent)) {
            console.log("✅ Matched with tracked copy:", metadata);
            break;
          }
        }
      });
    } else {
      console.warn("⚠️ Could not find supervisor textarea");
    }
  },

  // Check if components are properly set up
  checkComponents: function () {
    // Check if CopyTrackingProvider is set up
    if (window.__NEXT_DATA__) {
      console.log("Next.js app detected");
    }

    // Check for agent containers
    const agentContainers = document.querySelectorAll("[data-agent-index]");
    console.log(`Found ${agentContainers.length} agent containers`);

    agentContainers.forEach((container, i) => {
      console.log(`Agent ${i}:`, {
        index: container.getAttribute("data-agent-index"),
        name: container.getAttribute("data-agent-name"),
        model: container.getAttribute("data-agent-model"),
      });
    });

    // Check for supervisor interface
    const supervisorInterface = document.querySelector(".supervisor-interface");
    if (supervisorInterface) {
      console.log("Found supervisor interface");
    } else {
      console.warn("⚠️ Could not find supervisor interface");
    }

    // Check for reference stack
    const referenceStack = document.querySelector(".reference-stack");
    if (referenceStack) {
      console.log("Found reference stack");
    } else {
      console.warn("⚠️ Could not find reference stack");
    }
  },

  // Utility to check content similarity
  isSimilarContent: function (text1, text2) {
    const trimmed1 = text1.trim();
    const trimmed2 = text2.trim();

    // Exact match
    if (trimmed1 === trimmed2) return true;

    // Substring match
    if (trimmed1.includes(trimmed2) || trimmed2.includes(trimmed1)) {
      const similarity = Math.max(
        trimmed1.length / trimmed2.length,
        trimmed2.length / trimmed1.length
      );

      if (similarity > 0.8) {
        return true;
      }
    }

    return false;
  },

  // Test copy detection
  testCopy: function (text) {
    console.log(
      "🧪 Testing copy detection with text:",
      text.slice(0, 50) + (text.length > 50 ? "..." : "")
    );

    // Create a fake copy event
    const event = new ClipboardEvent("copy");
    Object.defineProperty(event, "clipboardData", {
      value: {
        getData: () => text,
        setData: () => {},
      },
    });

    // Dispatch the event
    document.dispatchEvent(event);
  },

  // Test paste interception
  testPaste: function (text) {
    console.log(
      "🧪 Testing paste interception with text:",
      text.slice(0, 50) + (text.length > 50 ? "..." : "")
    );

    const supervisorTextarea = document.querySelector(".supervisor-textarea");
    if (supervisorTextarea) {
      // Create a fake paste event
      const event = new ClipboardEvent("paste");
      Object.defineProperty(event, "clipboardData", {
        value: {
          getData: () => text,
          setData: () => {},
        },
      });

      // Dispatch the event
      supervisorTextarea.dispatchEvent(event);
    } else {
      console.warn("⚠️ Could not find supervisor textarea for paste test");
    }
  },
};

// Initialize the debug tool
window.debugCopyPaste.init();

// Instructions for use
console.log(`
🛠️ Copy-Paste Debug Tool Instructions:
1. Copy text from any agent column
2. Check console for copy event detection
3. Paste into supervisor textarea
4. Check console for paste interception

Manual tests:
- window.debugCopyPaste.testCopy("test content")
- window.debugCopyPaste.testPaste("test content")
`);
