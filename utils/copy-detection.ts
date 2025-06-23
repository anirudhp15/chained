import type { CopyMetadata } from "../lib/copy-tracking-context";

// Generate unique copy ID
export function generateCopyId(): string {
  return `copy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Agent container selectors and attributes
const AGENT_SELECTORS = {
  CONTAINER: "[data-agent-index]",
  CONTENT: ".agent-content",
  RESPONSE: "[data-response-content]",
  PROMPT: "[data-prompt-content]",
  CODE_BLOCK: "pre code",
  MARKDOWN: ".markdown-content",
} as const;

// Source type detection based on DOM context
export interface SourceContext {
  agentIndex?: number;
  agentName?: string;
  agentModel?: string;
  sourceType: CopyMetadata["sourceType"];
  elementType?: string;
  sessionId?: string;
}

// Find the closest agent container from an element
export function findAgentContainer(element: Element): Element | null {
  let current = element;

  // Traverse up the DOM tree looking for agent container
  while (current && current !== document.body) {
    if (current.hasAttribute("data-agent-index")) {
      return current;
    }

    // Also check for specific container classes
    if (
      current.classList.contains("agent-container") ||
      current.classList.contains("agent-column")
    ) {
      return current;
    }

    if (current.parentElement) {
      current = current.parentElement;
    } else {
      break;
    }
  }

  return null;
}

// Extract agent metadata from container element
export function extractAgentMetadata(container: Element): {
  agentIndex?: number;
  agentName?: string;
  agentModel?: string;
} {
  const metadata: {
    agentIndex?: number;
    agentName?: string;
    agentModel?: string;
  } = {};

  // Extract agent index
  const indexAttr = container.getAttribute("data-agent-index");
  if (indexAttr) {
    const parsed = parseInt(indexAttr, 10);
    if (!isNaN(parsed)) {
      metadata.agentIndex = parsed;
    }
  }

  // Extract agent name
  const nameAttr = container.getAttribute("data-agent-name");
  if (nameAttr) {
    metadata.agentName = nameAttr;
  }

  // Extract agent model
  const modelAttr = container.getAttribute("data-agent-model");
  if (modelAttr) {
    metadata.agentModel = modelAttr;
  }

  // Fallback: try to find name and model in the DOM
  if (!metadata.agentName || !metadata.agentModel) {
    const headerElement = container.querySelector(
      ".agent-header, .agent-title"
    );
    if (headerElement) {
      // Try to extract from text content
      const textContent = headerElement.textContent?.trim();
      if (textContent && !metadata.agentName) {
        // Look for patterns like "Node 1", "Agent Name", etc.
        const nameMatch = textContent.match(
          /(?:Node\s+)?(.+?)(?:\s+\([^)]+\))?$/
        );
        if (nameMatch) {
          metadata.agentName = nameMatch[1].trim();
        }
      }
    }

    // Look for model info in specific elements
    const modelElement = container.querySelector(
      "[data-model], .model-name, .agent-model"
    );
    if (modelElement && !metadata.agentModel) {
      metadata.agentModel =
        modelElement.getAttribute("data-model") ||
        modelElement.textContent?.trim();
    }
  }

  return metadata;
}

// Determine source type based on element context
export function determineSourceType(
  element: Element
): CopyMetadata["sourceType"] {
  // Check for specific data attributes first
  if (element.hasAttribute("data-source-type")) {
    const sourceType = element.getAttribute("data-source-type");
    if (
      sourceType &&
      [
        "user-prompt",
        "agent-response",
        "code-block",
        "supervisor-response",
      ].includes(sourceType)
    ) {
      return sourceType as CopyMetadata["sourceType"];
    }
  }

  // Check element classes and structure
  if (element.closest("pre code") || element.classList.contains("code-block")) {
    return "code-block";
  }

  if (
    element.closest("[data-prompt-content]") ||
    element.classList.contains("user-prompt") ||
    element.closest(".user-message")
  ) {
    return "user-prompt";
  }

  if (
    element.closest("[data-supervisor-content]") ||
    element.classList.contains("supervisor-response")
  ) {
    return "supervisor-response";
  }

  // Default to agent response for content in agent containers
  return "agent-response";
}

// Get current session ID (you may need to adapt this based on your routing)
export function getCurrentSessionId(): string | undefined {
  // Try to get from URL
  if (typeof window !== "undefined") {
    const urlMatch = window.location.pathname.match(/\/chat\/([^\/]+)/);
    if (urlMatch) {
      return urlMatch[1];
    }
  }

  // Try to get from a global context or data attribute
  const sessionElement = document.querySelector("[data-session-id]");
  if (sessionElement) {
    return sessionElement.getAttribute("data-session-id") || undefined;
  }

  return undefined;
}

// Detect copy source context from selection
export function detectCopySourceContext(
  selection: Selection
): SourceContext | null {
  if (!selection.rangeCount) return null;

  const range = selection.getRangeAt(0);
  const startElement =
    range.startContainer.nodeType === Node.ELEMENT_NODE
      ? (range.startContainer as Element)
      : range.startContainer.parentElement;

  if (!startElement) return null;

  // Find agent container
  const agentContainer = findAgentContainer(startElement);

  // Determine source type
  const sourceType = determineSourceType(startElement);

  // Extract agent metadata
  const agentMetadata = agentContainer
    ? extractAgentMetadata(agentContainer)
    : {};

  // Get session ID
  const sessionId = getCurrentSessionId();

  return {
    ...agentMetadata,
    sourceType,
    elementType: startElement.tagName?.toLowerCase(),
    sessionId,
  };
}

// Create copy metadata from source context and content
export function createCopyMetadata(
  content: string,
  sourceContext: SourceContext
): CopyMetadata {
  return {
    id: generateCopyId(),
    content: content.trim(),
    sourceType: sourceContext.sourceType,
    agentIndex: sourceContext.agentIndex,
    agentName: sourceContext.agentName,
    agentModel: sourceContext.agentModel,
    timestamp: Date.now(),
    sessionId: sourceContext.sessionId,
  };
}

// Check if element is copyable (not in input fields, etc.)
export function isElementCopyable(element: Element): boolean {
  const nonCopyableTags = ["INPUT", "TEXTAREA", "SELECT"];
  const nonCopyableRoles = ["textbox", "combobox"];

  // Check tag name
  if (nonCopyableTags.includes(element.tagName)) {
    return false;
  }

  // Check role attribute
  const role = element.getAttribute("role");
  if (role && nonCopyableRoles.includes(role)) {
    return false;
  }

  // Check contenteditable
  if (element.getAttribute("contenteditable") === "true") {
    return false;
  }

  // Check if inside an input container
  if (element.closest('input, textarea, select, [contenteditable="true"]')) {
    return false;
  }

  return true;
}

// Sanitize copied content (remove extra whitespace, etc.)
export function sanitizeCopiedContent(content: string): string {
  return content
    .trim()
    .replace(/\s+/g, " ") // Normalize whitespace
    .replace(/\n\s*\n\s*\n/g, "\n\n"); // Normalize line breaks
}

// Get selected text with context
export function getSelectionWithContext(): {
  content: string;
  context: SourceContext | null;
} | null {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed) {
    return null;
  }

  const content = selection.toString().trim();
  if (!content) {
    return null;
  }

  const context = detectCopySourceContext(selection);

  return {
    content: sanitizeCopiedContent(content),
    context,
  };
}

// Enhanced copy event handler
export function handleCopyEvent(
  event: ClipboardEvent,
  onCopyDetected?: (metadata: CopyMetadata) => void
): void {
  const selectionData = getSelectionWithContext();

  if (selectionData && selectionData.context) {
    const metadata = createCopyMetadata(
      selectionData.content,
      selectionData.context
    );

    // Call the callback if provided
    if (onCopyDetected) {
      onCopyDetected(metadata);
    }

    // Log for debugging
    console.log("Copy detected:", {
      content:
        metadata.content.slice(0, 100) +
        (metadata.content.length > 100 ? "..." : ""),
      sourceType: metadata.sourceType,
      agentIndex: metadata.agentIndex,
      agentName: metadata.agentName,
    });
  }
}

// Setup global copy detection
export function setupGlobalCopyDetection(
  onCopyDetected: (metadata: CopyMetadata) => void
): () => void {
  const handleCopy = (event: ClipboardEvent) => {
    handleCopyEvent(event, onCopyDetected);
  };

  document.addEventListener("copy", handleCopy);

  // Return cleanup function
  return () => {
    document.removeEventListener("copy", handleCopy);
  };
}
