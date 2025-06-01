import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";

export interface ValidationResult {
  success: boolean;
  error?: string;
  data?: any;
}

export class ApiValidator {
  // Validate request size
  static validateRequestSize(
    request: NextRequest,
    maxSizeBytes: number = 10 * 1024 * 1024
  ): ValidationResult {
    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > maxSizeBytes) {
      return {
        success: false,
        error: `Request too large. Maximum size: ${maxSizeBytes / 1024 / 1024}MB`,
      };
    }
    return { success: true };
  }

  // Validate authentication
  static async validateAuth(): Promise<ValidationResult & { userId?: string }> {
    try {
      const authData = await auth();
      const { userId } = authData;

      if (!userId) {
        return {
          success: false,
          error: "Authentication required",
        };
      }

      return {
        success: true,
        userId,
      };
    } catch (error) {
      return {
        success: false,
        error: "Authentication failed",
      };
    }
  }

  // Validate required fields
  static validateRequiredFields(
    data: any,
    requiredFields: string[]
  ): ValidationResult {
    const missingFields = requiredFields.filter((field) => !data[field]);

    if (missingFields.length > 0) {
      return {
        success: false,
        error: `Missing required fields: ${missingFields.join(", ")}`,
      };
    }

    return { success: true, data };
  }

  // Validate prompt input
  static validatePrompt(prompt: string): ValidationResult {
    if (!prompt || typeof prompt !== "string") {
      return {
        success: false,
        error: "Prompt is required and must be a string",
      };
    }

    if (prompt.length > 50000) {
      return {
        success: false,
        error: "Prompt too long. Maximum 50,000 characters",
      };
    }

    if (prompt.trim().length === 0) {
      return { success: false, error: "Prompt cannot be empty" };
    }

    return { success: true, data: prompt.trim() };
  }

  // Validate agent configuration
  static validateAgents(agents: any[]): ValidationResult {
    if (!Array.isArray(agents) || agents.length === 0) {
      return { success: false, error: "At least one agent is required" };
    }

    if (agents.length > 5) {
      return { success: false, error: "Maximum 5 agents allowed" };
    }

    for (let index = 0; index < agents.length; index++) {
      const agent = agents[index];
      if (!agent.model || !agent.prompt) {
        return {
          success: false,
          error: `Agent ${index + 1} missing required model or prompt`,
        };
      }

      const promptValidation = this.validatePrompt(agent.prompt);
      if (!promptValidation.success) {
        return {
          success: false,
          error: `Agent ${index + 1}: ${promptValidation.error}`,
        };
      }
    }

    return { success: true, data: agents };
  }

  // Validate file upload
  static validateFileUpload(
    file: File,
    allowedTypes: string[],
    maxSizeBytes: number
  ): ValidationResult {
    if (!allowedTypes.includes(file.type)) {
      return {
        success: false,
        error: `Invalid file type. Allowed: ${allowedTypes.join(", ")}`,
      };
    }

    if (file.size > maxSizeBytes) {
      return {
        success: false,
        error: `File too large. Maximum size: ${maxSizeBytes / 1024 / 1024}MB`,
      };
    }

    return { success: true };
  }

  // Validate model selection
  static validateModel(model: string): ValidationResult {
    const allowedModels = [
      "gpt-4o",
      "gpt-4o-mini",
      "gpt-4-turbo",
      "gpt-3.5-turbo",
      "claude-3-5-sonnet-20241022",
      "claude-3-5-haiku-20241022",
      "claude-3-opus-20240229",
      "grok-beta",
      "grok-2-1212",
      "o1-preview",
      "o1-mini",
    ];

    if (!model || typeof model !== "string") {
      return {
        success: false,
        error: "Model is required and must be a string",
      };
    }

    if (!allowedModels.includes(model)) {
      return {
        success: false,
        error: `Invalid model. Allowed models: ${allowedModels.join(", ")}`,
      };
    }

    return { success: true, data: model };
  }

  // Validate session ID
  static validateSessionId(sessionId: string): ValidationResult {
    if (!sessionId || typeof sessionId !== "string") {
      return {
        success: false,
        error: "Session ID is required and must be a string",
      };
    }

    // Basic format validation for Convex IDs
    if (!/^[a-zA-Z0-9_-]+$/.test(sessionId)) {
      return { success: false, error: "Invalid session ID format" };
    }

    return { success: true, data: sessionId };
  }
}

// Common validation patterns
export const VALIDATION_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  ALPHANUMERIC: /^[a-zA-Z0-9]+$/,
  NO_SCRIPT_TAGS: /^(?!.*<script).*$/i,
  SAFE_HTML: /^[^<>]*$/,
};

// Sanitize user input
export function sanitizeInput(input: string): string {
  if (typeof input !== "string") return "";

  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "") // Remove script tags
    .replace(/javascript:/gi, "") // Remove javascript: protocols
    .replace(/on\w+\s*=/gi, "") // Remove event handlers
    .replace(/data:/gi, "") // Remove data: protocols
    .trim();
}

// Validate and sanitize JSON input
export function validateAndSanitizeJson(input: any): ValidationResult {
  try {
    if (typeof input === "string") {
      // If it's a string, try to parse it
      const parsed = JSON.parse(input);
      return { success: true, data: parsed };
    }

    // If it's already an object, validate it's safe
    const sanitized = JSON.parse(JSON.stringify(input));
    return { success: true, data: sanitized };
  } catch (error) {
    return { success: false, error: "Invalid JSON format" };
  }
}

// Rate limit key generators
export function generateRateLimitKey(
  request: NextRequest,
  userId?: string
): string {
  const ip =
    request.ip ||
    request.headers.get("x-forwarded-for")?.split(",")[0] ||
    request.headers.get("x-real-ip") ||
    "anonymous";

  return userId ? `user:${userId}` : `ip:${ip}`;
}

// Content type validation
export function validateContentType(
  request: NextRequest,
  allowedTypes: string[]
): ValidationResult {
  const contentType = request.headers.get("content-type");

  if (!contentType) {
    return { success: false, error: "Content-Type header is required" };
  }

  const isAllowed = allowedTypes.some((type) => contentType.includes(type));

  if (!isAllowed) {
    return {
      success: false,
      error: `Invalid content type. Allowed: ${allowedTypes.join(", ")}`,
    };
  }

  return { success: true };
}
