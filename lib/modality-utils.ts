// Model capability definitions
export interface ModelCapabilities {
  text: boolean;
  vision: boolean;
  audio: boolean;
  image: boolean;
  code: boolean;
  fast: boolean;
  reasoning: boolean;
  web: boolean;
}

// Model providers and their capabilities
export const MODEL_CAPABILITIES: Record<string, ModelCapabilities> = {
  // OpenAI Models - Reasoning Models (High Priority)
  o1: {
    text: true,
    vision: false,
    audio: false,
    image: false,
    code: true,
    fast: false,
    reasoning: true,
    web: false,
  },
  "o1-mini": {
    text: true,
    vision: false,
    audio: false,
    image: false,
    code: true,
    fast: true,
    reasoning: true,
    web: false,
  },
  "o1-pro": {
    text: true,
    vision: false,
    audio: false,
    image: false,
    code: true,
    fast: false,
    reasoning: true,
    web: false,
  },

  // OpenAI Flagship Models
  "gpt-4o": {
    text: true,
    vision: true,
    audio: true,
    image: false,
    code: true,
    fast: false,
    reasoning: true,
    web: false,
  },
  "gpt-4o-mini": {
    text: true,
    vision: true,
    audio: false,
    image: false,
    code: true,
    fast: true,
    reasoning: false,
    web: false,
  },

  // OpenAI Latest Models
  "gpt-4.5-preview": {
    text: true,
    vision: true,
    audio: false,
    image: false,
    code: true,
    fast: false,
    reasoning: true,
    web: false,
  },
  "gpt-4.1": {
    text: true,
    vision: true,
    audio: false,
    image: false,
    code: true,
    fast: false,
    reasoning: true,
    web: false,
  },

  // OpenAI Specialized Models
  "o3-mini-2025-01-31": {
    text: true,
    vision: false,
    audio: false,
    image: false,
    code: true,
    fast: false,
    reasoning: true,
    web: false,
  },
  "o4-mini-2025-04-16": {
    text: true,
    vision: false,
    audio: false,
    image: false,
    code: true,
    fast: true,
    reasoning: true,
    web: false,
  },

  // Anthropic Claude 4 Series
  "claude-opus-4-20250514": {
    text: true,
    vision: true,
    audio: false,
    image: false,
    code: true,
    fast: false,
    reasoning: true,
    web: false,
  },
  "claude-sonnet-4-20250514": {
    text: true,
    vision: true,
    audio: false,
    image: false,
    code: true,
    fast: false,
    reasoning: true,
    web: false,
  },

  // Anthropic Claude 3.7 Series
  "claude-3-7-sonnet-20250219": {
    text: true,
    vision: true,
    audio: false,
    image: false,
    code: true,
    fast: false,
    reasoning: true,
    web: false,
  },

  // Anthropic Claude 3.5 Series (Proven)
  "claude-3-5-sonnet-20241022": {
    text: true,
    vision: true,
    audio: false,
    image: false,
    code: true,
    fast: false,
    reasoning: true,
    web: false,
  },
  "claude-3-5-haiku-20241022": {
    text: true,
    vision: true,
    audio: false,
    image: false,
    code: true,
    fast: true,
    reasoning: false,
    web: false,
  },

  // xAI Grok 3 Series
  "grok-3": {
    text: true,
    vision: false,
    audio: false,
    image: false,
    code: true,
    fast: false,
    reasoning: true,
    web: true,
  },
  "grok-3-mini": {
    text: true,
    vision: false,
    audio: false,
    image: false,
    code: true,
    fast: false,
    reasoning: true,
    web: false,
  },
  "grok-3-fast": {
    text: true,
    vision: false,
    audio: false,
    image: false,
    code: true,
    fast: true,
    reasoning: false,
    web: false,
  },
  "grok-3-mini-fast": {
    text: true,
    vision: false,
    audio: false,
    image: false,
    code: true,
    fast: true,
    reasoning: false,
    web: false,
  },

  // xAI Grok 2 Series
  "grok-2-vision-1212": {
    text: true,
    vision: true,
    audio: false,
    image: true,
    code: false,
    fast: false,
    reasoning: false,
    web: false,
  },
  "grok-2-1212": {
    text: true,
    vision: false,
    audio: false,
    image: false,
    code: true,
    fast: false,
    reasoning: true,
    web: false,
  },
};

// Utility functions
export function getModelCapabilities(model: string): ModelCapabilities {
  return (
    MODEL_CAPABILITIES[model] || {
      text: true,
      vision: false,
      audio: false,
      image: false,
      code: false,
      fast: false,
      reasoning: false,
      web: false,
    }
  );
}

export function supportsModality(
  model: string,
  modality: keyof ModelCapabilities
): boolean {
  const capabilities = getModelCapabilities(model);
  return capabilities[modality];
}

export function supportsImageUpload(model: string): boolean {
  return supportsModality(model, "vision");
}

export function supportsAudioInput(model: string): boolean {
  return supportsModality(model, "audio");
}

export function supportsWebSearch(model: string): boolean {
  return supportsModality(model, "web");
}

// File validation utilities
export function validateImageFile(file: File): {
  valid: boolean;
  error?: string;
} {
  const maxSize = 10 * 1024 * 1024; // 10MB
  const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: "Only JPEG, PNG, GIF, and WebP images are allowed",
    };
  }

  if (file.size > maxSize) {
    return { valid: false, error: "Image must be smaller than 10MB" };
  }

  return { valid: true };
}

export function validateAudioFile(file: File): {
  valid: boolean;
  error?: string;
} {
  const maxSize = 25 * 1024 * 1024; // 25MB (OpenAI Whisper limit)
  const allowedTypes = [
    "audio/mp3",
    "audio/mpeg",
    "audio/wav",
    "audio/m4a",
    "audio/mp4",
    "audio/webm",
    "audio/ogg",
  ];

  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: "Audio format not supported" };
  }

  if (file.size > maxSize) {
    return { valid: false, error: "Audio file must be smaller than 25MB" };
  }

  return { valid: true };
}

// Image compression utility
export async function compressImage(
  file: File,
  maxWidth: number = 1024,
  quality: number = 0.8
): Promise<File> {
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      // Calculate new dimensions
      let { width, height } = img;
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      // Draw and compress
      ctx?.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          } else {
            resolve(file);
          }
        },
        file.type,
        quality
      );
    };

    img.src = URL.createObjectURL(file);
  });
}
