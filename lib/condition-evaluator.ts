/**
 * Evaluates simple conditions against text content
 * Supports: contains(), starts_with(), ends_with(), length comparisons
 */
export function evaluateCondition(condition: string, content: string): boolean {
  if (!condition || !content) {
    return false;
  }

  try {
    // Normalize the condition string
    const normalizedCondition = condition.trim().toLowerCase();
    const normalizedContent = content.toLowerCase();

    // Handle contains() function
    const containsMatch = normalizedCondition.match(
      /contains\(['"](.+?)['"]\)/
    );
    if (containsMatch) {
      const searchTerm = containsMatch[1];
      return normalizedContent.includes(searchTerm);
    }

    // Handle starts_with() function
    const startsWithMatch = normalizedCondition.match(
      /starts_with\(['"](.+?)['"]\)/
    );
    if (startsWithMatch) {
      const searchTerm = startsWithMatch[1];
      return normalizedContent.startsWith(searchTerm);
    }

    // Handle ends_with() function
    const endsWithMatch = normalizedCondition.match(
      /ends_with\(['"](.+?)['"]\)/
    );
    if (endsWithMatch) {
      const searchTerm = endsWithMatch[1];
      return normalizedContent.endsWith(searchTerm);
    }

    // Handle length comparisons
    const lengthMatch = normalizedCondition.match(/length\s*([><=]+)\s*(\d+)/);
    if (lengthMatch) {
      const operator = lengthMatch[1];
      const threshold = parseInt(lengthMatch[2]);
      const contentLength = content.length;

      switch (operator) {
        case ">":
          return contentLength > threshold;
        case "<":
          return contentLength < threshold;
        case ">=":
          return contentLength >= threshold;
        case "<=":
          return contentLength <= threshold;
        case "==":
        case "=":
          return contentLength === threshold;
        default:
          return false;
      }
    }

    // If no pattern matches, return false
    return false;
  } catch (error) {
    console.error("Error evaluating condition:", error);
    return false;
  }
}

/**
 * Validates if a condition string has valid syntax
 */
export function validateCondition(condition: string): {
  isValid: boolean;
  error?: string;
} {
  if (!condition.trim()) {
    return { isValid: false, error: "Condition cannot be empty" };
  }

  const normalizedCondition = condition.trim().toLowerCase();

  // Check for supported patterns
  const supportedPatterns = [
    /contains\(['"].+?['"]\)/,
    /starts_with\(['"].+?['"]\)/,
    /ends_with\(['"].+?['"]\)/,
    /length\s*[><=]+\s*\d+/,
  ];

  const isValid = supportedPatterns.some((pattern) =>
    pattern.test(normalizedCondition)
  );

  if (!isValid) {
    return {
      isValid: false,
      error:
        "Unsupported condition format. Use: contains('text'), starts_with('text'), ends_with('text'), or length > 100",
    };
  }

  return { isValid: true };
}
