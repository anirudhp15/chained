// Direct fix for copy-reference feature
// Load this in the browser console to fix the copy-reference feature

(function () {
  console.log("🔧 Applying copy-reference feature fix...");

  // 1. Fix copy detection
  const setupCopyDetection = () => {
    console.log("Setting up global copy detection");

    // Track copied content
    const trackedCopies = new Map();

    // Handle copy events
    const handleCopy = (event) => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) return;

      const content = selection.toString().trim();
      if (!content) return;

      console.log(
        "Copy detected:",
        content.slice(0, 50) + (content.length > 50 ? "..." : "")
      );

      // Find source context
      const range = selection.getRangeAt(0);
      const startElement =
        range.startContainer.nodeType === Node.ELEMENT_NODE
          ? range.startContainer
          : range.startContainer.parentElement;

      if (!startElement) return;

      // Find agent container
      let agentContainer = startElement;
      while (agentContainer && agentContainer !== document.body) {
        if (agentContainer.hasAttribute("data-agent-index")) {
          break;
        }
        agentContainer = agentContainer.parentElement;
      }

      if (!agentContainer || agentContainer === document.body) {
        console.log("No agent container found");
        return;
      }

      // Extract agent metadata
      const agentIndex = agentContainer.getAttribute("data-agent-index");
      const agentName = agentContainer.getAttribute("data-agent-name");
      const agentModel = agentContainer.getAttribute("data-agent-model");

      // Determine source type
      let sourceType = "agent-response"; // Default
      if (
        startElement.closest("pre code") ||
        startElement.classList.contains("code-block")
      ) {
        sourceType = "code-block";
      } else if (
        startElement.closest("[data-prompt-content]") ||
        startElement.classList.contains("user-prompt")
      ) {
        sourceType = "user-prompt";
      }

      // Create metadata
      const metadata = {
        id: `copy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        content,
        sourceType,
        agentIndex: agentIndex ? parseInt(agentIndex, 10) : undefined,
        agentName,
        agentModel,
        timestamp: Date.now(),
      };

      // Track copy
      trackedCopies.set(content, metadata);
      console.log("Tracked copy:", metadata);

      // Add visual highlight
      addHighlight(content, metadata.id);

      // Auto-cleanup after 30 seconds
      setTimeout(() => {
        trackedCopies.delete(content);
      }, 30000);
    };

    // Add highlight effect
    const addHighlight = (content, id) => {
      // Find elements containing this content
      const textNodes = [];
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null,
        false
      );

      while (walker.nextNode()) {
        const node = walker.currentNode;
        if (node.textContent.includes(content)) {
          textNodes.push(node);
        }
      }

      // Highlight each instance
      textNodes.forEach((node) => {
        const parent = node.parentElement;
        if (parent) {
          parent.classList.add("copy-highlight");
          parent.classList.add("copy-highlight-active");

          // Set up fade-out
          setTimeout(() => {
            parent.classList.remove("copy-highlight-active");
            parent.classList.add("copy-highlight-fading");
          }, 3000);

          // Set up removal
          setTimeout(() => {
            parent.classList.remove("copy-highlight");
            parent.classList.remove("copy-highlight-fading");
          }, 4000);
        }
      });
    };

    // 2. Fix paste interception
    const setupPasteInterception = () => {
      console.log("Setting up paste interception");

      const supervisorTextarea = document.querySelector(".supervisor-textarea");
      if (!supervisorTextarea) {
        console.warn("Could not find supervisor textarea");
        return;
      }

      supervisorTextarea.addEventListener("paste", (e) => {
        const pastedText = e.clipboardData.getData("text");
        if (!pastedText.trim()) return;

        console.log(
          "Paste detected:",
          pastedText.slice(0, 50) + (pastedText.length > 50 ? "..." : "")
        );

        // Check for tracked copies
        let matchedMetadata = null;

        // Exact match first
        if (trackedCopies.has(pastedText)) {
          matchedMetadata = trackedCopies.get(pastedText);
        } else {
          // Fuzzy match
          const trimmedPaste = pastedText.trim();
          for (const [trackedContent, metadata] of trackedCopies.entries()) {
            const trimmedTracked = trackedContent.trim();

            if (
              trimmedTracked.includes(trimmedPaste) ||
              trimmedPaste.includes(trimmedTracked)
            ) {
              const similarity = Math.max(
                trimmedPaste.length / trimmedTracked.length,
                trimmedTracked.length / trimmedPaste.length
              );

              if (similarity > 0.8) {
                matchedMetadata = metadata;
                break;
              }
            }
          }
        }

        if (matchedMetadata) {
          console.log("Matched with tracked copy:", matchedMetadata);
          e.preventDefault(); // Prevent default paste

          // Create reference chip
          createReferenceChip(matchedMetadata);
        }
      });
    };

    // Create reference chip
    const createReferenceChip = (metadata) => {
      console.log("Creating reference chip for:", metadata);

      // Find reference stack container
      const performanceButton = document.querySelector(
        '.supervisor-interface button svg[data-lucide="Bar-Chart-3"]'
      );
      if (!performanceButton) {
        console.warn(
          "Could not find performance button to place reference next to"
        );
        return;
      }

      const buttonContainer = performanceButton.closest("div");
      if (!buttonContainer) {
        console.warn("Could not find button container");
        return;
      }

      // Check if reference stack already exists
      let referenceStack = buttonContainer.querySelector(".reference-stack");
      if (!referenceStack) {
        // Create reference stack
        referenceStack = document.createElement("div");
        referenceStack.className =
          "reference-stack relative inline-flex items-center gap-2 ml-2";
        buttonContainer.appendChild(referenceStack);
      }

      // Create reference chip
      const chip = document.createElement("div");
      chip.className = `
        relative inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs
        bg-green-500/10 border border-green-500/30 text-green-400
        transition-all duration-200 group cursor-pointer
      `;
      chip.dataset.referenceId = metadata.id;

      // Icon based on source type
      const iconSvg = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "svg"
      );
      iconSvg.setAttribute("width", "12");
      iconSvg.setAttribute("height", "12");
      iconSvg.setAttribute("viewBox", "0 0 24 24");
      iconSvg.setAttribute("fill", "none");
      iconSvg.setAttribute("stroke", "currentColor");
      iconSvg.setAttribute("stroke-width", "2");
      iconSvg.setAttribute("stroke-linecap", "round");
      iconSvg.setAttribute("stroke-linejoin", "round");

      // Path based on source type
      let iconPath = "";
      switch (metadata.sourceType) {
        case "code-block":
          iconPath = "M16 18l6-6-6-6M8 6l-6 6 6 6";
          break;
        case "user-prompt":
          iconPath =
            "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z";
          break;
        default:
          iconPath =
            "M12 12h.01M12 5h.01M12 19h.01M19 12a7 7 0 1 1-14 0 7 7 0 0 1 14 0z";
          break;
      }

      const path = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path"
      );
      path.setAttribute("d", iconPath);
      iconSvg.appendChild(path);
      chip.appendChild(iconSvg);

      // Source label and preview
      const textContainer = document.createElement("div");
      textContainer.className = "flex items-center gap-1.5 max-w-[180px]";

      const sourceLabel = document.createElement("span");
      sourceLabel.className = "font-medium text-green-400";
      sourceLabel.textContent =
        metadata.agentName || `Node ${(metadata.agentIndex || 0) + 1}`;
      textContainer.appendChild(sourceLabel);

      const separator = document.createElement("span");
      separator.className = "text-gray-500";
      separator.textContent = "•";
      textContainer.appendChild(separator);

      const preview = document.createElement("span");
      preview.className = "text-gray-400 truncate";
      preview.textContent =
        metadata.content.slice(0, 50) +
        (metadata.content.length > 50 ? "..." : "");
      textContainer.appendChild(preview);

      chip.appendChild(textContainer);

      // Remove button
      const removeButton = document.createElement("button");
      removeButton.className =
        "p-0.5 rounded-full transition-all duration-200 text-green-400 hover:bg-red-500/20 hover:text-red-400 opacity-0 group-hover:opacity-100";
      removeButton.title = "Remove reference";
      removeButton.innerHTML =
        '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
      removeButton.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        chip.remove();

        // If no more chips, remove the stack
        if (referenceStack.children.length === 0) {
          referenceStack.remove();
        }
      };

      chip.appendChild(removeButton);
      referenceStack.appendChild(chip);
    };

    // Set up event listeners
    document.addEventListener("copy", handleCopy);
    setupPasteInterception();

    console.log("Copy detection and paste interception set up successfully");
  };

  // Run setup
  setupCopyDetection();

  console.log("🎉 Copy-reference feature fix applied successfully!");
  console.log(
    "Try copying text from an agent column and pasting it into the supervisor input."
  );
})();
