import type { CopyReference } from "./copy-tracking-context";

// Storage keys
const STORAGE_KEYS = {
  REFERENCES: "chain-chat-copy-references",
  VERSION: "chain-chat-copy-storage-version",
} as const;

// Current storage version for migration handling
const CURRENT_VERSION = 1;

// Storage limits
const MAX_REFERENCES = 500; // Prevent unlimited growth
const MAX_STORAGE_SIZE = 5 * 1024 * 1024; // 5MB rough limit

// Storage data structure
interface StorageData {
  version: number;
  references: CopyReference[];
  lastUpdated: number;
}

// Migration functions
type MigrationFunction = (data: any) => StorageData;

const migrations: Record<number, MigrationFunction> = {
  // Version 0 to 1: Initial structure
  1: (data: any): StorageData => {
    // If data is already in correct format, return as-is
    if (data && typeof data === "object" && Array.isArray(data.references)) {
      return {
        version: 1,
        references: data.references || [],
        lastUpdated: data.lastUpdated || Date.now(),
      };
    }

    // If data is just an array (legacy), wrap it
    if (Array.isArray(data)) {
      return {
        version: 1,
        references: data,
        lastUpdated: Date.now(),
      };
    }

    // Default empty state
    return {
      version: 1,
      references: [],
      lastUpdated: Date.now(),
    };
  },
};

// Check if localStorage is available
function isLocalStorageAvailable(): boolean {
  try {
    if (typeof window === "undefined") return false;
    const test = "__localStorage_test__";
    window.localStorage.setItem(test, test);
    window.localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

// Estimate storage size
function estimateStorageSize(data: any): number {
  try {
    return new Blob([JSON.stringify(data)]).size;
  } catch {
    // Fallback rough estimation
    return JSON.stringify(data).length * 2; // UTF-16 rough estimation
  }
}

// Check storage quota
function isStorageQuotaExceeded(newData: StorageData): boolean {
  const estimatedSize = estimateStorageSize(newData);
  return estimatedSize > MAX_STORAGE_SIZE;
}

// Trim references to fit storage limits
function trimReferencesToLimit(references: CopyReference[]): CopyReference[] {
  if (references.length <= MAX_REFERENCES) {
    return references;
  }

  // Keep most recent references
  return references
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, MAX_REFERENCES);
}

// Get current storage version
function getStorageVersion(): number {
  try {
    if (!isLocalStorageAvailable()) return CURRENT_VERSION;
    const version = window.localStorage.getItem(STORAGE_KEYS.VERSION);
    return version ? parseInt(version, 10) : 0;
  } catch (error) {
    console.warn("Failed to get storage version:", error);
    return 0;
  }
}

// Set storage version
function setStorageVersion(version: number): void {
  try {
    if (!isLocalStorageAvailable()) return;
    window.localStorage.setItem(STORAGE_KEYS.VERSION, version.toString());
  } catch (error) {
    console.warn("Failed to set storage version:", error);
  }
}

// Migrate data to current version
function migrateData(rawData: any, fromVersion: number): StorageData {
  let data = rawData;

  // Apply migrations sequentially
  for (let version = fromVersion + 1; version <= CURRENT_VERSION; version++) {
    const migration = migrations[version];
    if (migration) {
      try {
        data = migration(data);
      } catch (error) {
        console.error(`Migration to version ${version} failed:`, error);
        // Return safe default on migration failure
        return {
          version: CURRENT_VERSION,
          references: [],
          lastUpdated: Date.now(),
        };
      }
    }
  }

  return data;
}

// Validate reference data
function validateReference(ref: any): ref is CopyReference {
  return (
    ref &&
    typeof ref === "object" &&
    typeof ref.id === "string" &&
    typeof ref.sourceType === "string" &&
    typeof ref.content === "string" &&
    typeof ref.truncatedPreview === "string" &&
    typeof ref.timestamp === "number" &&
    [
      "user-prompt",
      "agent-response",
      "code-block",
      "supervisor-response",
    ].includes(ref.sourceType)
  );
}

// Validate and clean references array
function validateReferences(references: any[]): CopyReference[] {
  if (!Array.isArray(references)) {
    return [];
  }

  return references.filter(validateReference);
}

// Load copy references from localStorage
export function loadCopyReferences(): CopyReference[] {
  try {
    if (!isLocalStorageAvailable()) {
      return [];
    }

    const rawData = window.localStorage.getItem(STORAGE_KEYS.REFERENCES);
    if (!rawData) {
      return [];
    }

    const parsedData = JSON.parse(rawData);
    const currentVersion = getStorageVersion();

    // Handle migration if needed
    let data: StorageData;
    if (currentVersion < CURRENT_VERSION) {
      data = migrateData(parsedData, currentVersion);
      setStorageVersion(CURRENT_VERSION);

      // Save migrated data immediately
      saveCopyReferences(data.references);
    } else {
      data = parsedData;
    }

    // Validate and return references
    const validatedReferences = validateReferences(data.references || []);

    // Sort by timestamp (most recent first)
    return validatedReferences.sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    console.error("Failed to load copy references:", error);
    return [];
  }
}

// Save copy references to localStorage
export function saveCopyReferences(references: CopyReference[]): void {
  try {
    if (!isLocalStorageAvailable()) {
      console.warn("localStorage not available, cannot save copy references");
      return;
    }

    // Validate and trim references
    const validatedReferences = validateReferences(references);
    const trimmedReferences = trimReferencesToLimit(validatedReferences);

    const data: StorageData = {
      version: CURRENT_VERSION,
      references: trimmedReferences,
      lastUpdated: Date.now(),
    };

    // Check storage quota
    if (isStorageQuotaExceeded(data)) {
      console.warn("Storage quota would be exceeded, reducing references");
      // Aggressively trim if quota exceeded
      data.references = trimmedReferences.slice(
        0,
        Math.floor(MAX_REFERENCES / 2)
      );
    }

    const serializedData = JSON.stringify(data);
    window.localStorage.setItem(STORAGE_KEYS.REFERENCES, serializedData);
    setStorageVersion(CURRENT_VERSION);
  } catch (error) {
    if (error instanceof Error && error.name === "QuotaExceededError") {
      console.warn(
        "Storage quota exceeded, attempting to clear old references"
      );
      try {
        // Emergency cleanup: keep only most recent 100 references
        const emergencyReferences = references
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, 100);

        const emergencyData: StorageData = {
          version: CURRENT_VERSION,
          references: emergencyReferences,
          lastUpdated: Date.now(),
        };

        window.localStorage.setItem(
          STORAGE_KEYS.REFERENCES,
          JSON.stringify(emergencyData)
        );
      } catch (emergencyError) {
        console.error("Emergency cleanup failed:", emergencyError);
        // Last resort: clear all stored references
        clearStoredReferences();
      }
    } else {
      console.error("Failed to save copy references:", error);
    }
  }
}

// Clear all stored references
export function clearStoredReferences(): void {
  try {
    if (!isLocalStorageAvailable()) {
      return;
    }

    window.localStorage.removeItem(STORAGE_KEYS.REFERENCES);
    window.localStorage.removeItem(STORAGE_KEYS.VERSION);
  } catch (error) {
    console.error("Failed to clear stored references:", error);
  }
}

// Get storage statistics
export function getStorageStats(): {
  totalReferences: number;
  estimatedSize: number;
  lastUpdated: number | null;
  version: number;
} {
  try {
    if (!isLocalStorageAvailable()) {
      return {
        totalReferences: 0,
        estimatedSize: 0,
        lastUpdated: null,
        version: CURRENT_VERSION,
      };
    }

    const rawData = window.localStorage.getItem(STORAGE_KEYS.REFERENCES);
    if (!rawData) {
      return {
        totalReferences: 0,
        estimatedSize: 0,
        lastUpdated: null,
        version: getStorageVersion(),
      };
    }

    const data = JSON.parse(rawData) as StorageData;
    return {
      totalReferences: data.references?.length || 0,
      estimatedSize: estimateStorageSize(data),
      lastUpdated: data.lastUpdated || null,
      version: data.version || getStorageVersion(),
    };
  } catch (error) {
    console.error("Failed to get storage stats:", error);
    return {
      totalReferences: 0,
      estimatedSize: 0,
      lastUpdated: null,
      version: CURRENT_VERSION,
    };
  }
}

// Clean up old references (utility function)
export function cleanupOldReferences(
  maxAge: number = 30 * 24 * 60 * 60 * 1000
): void {
  try {
    const references = loadCopyReferences();
    const now = Date.now();

    const filteredReferences = references.filter(
      (ref) => now - ref.timestamp < maxAge
    );

    if (filteredReferences.length !== references.length) {
      saveCopyReferences(filteredReferences);
      console.log(
        `Cleaned up ${references.length - filteredReferences.length} old references`
      );
    }
  } catch (error) {
    console.error("Failed to cleanup old references:", error);
  }
}

// Export storage constants for external use
export const STORAGE_CONSTANTS = {
  MAX_REFERENCES,
  MAX_STORAGE_SIZE,
  CURRENT_VERSION,
} as const;
