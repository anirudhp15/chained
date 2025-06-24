// Beta access management utilities

export interface BetaAccessData {
  email: string;
  grantedAt: number;
  source: "access_code" | "waitlist_invite";
}

export const setBetaAccess = (data: BetaAccessData) => {
  try {
    // Store in localStorage for client-side persistence
    localStorage.setItem("chained_beta_access", JSON.stringify(data));

    // Set simple cookie for server-side middleware checking (just a flag)
    const cookieValue = `email=${encodeURIComponent(data.email)}&granted=${data.grantedAt}&source=${data.source}`;
    const maxAge = 30 * 24 * 60 * 60; // 30 days
    const cookieOptions =
      process.env.NODE_ENV === "production"
        ? `path=/; max-age=${maxAge}; secure; samesite=strict; domain=.chained.chat`
        : `path=/; max-age=${maxAge}; samesite=strict`;

    document.cookie = `chained_beta_access=${cookieValue}; ${cookieOptions}`;

    console.log("Beta access stored successfully:", data);
  } catch (error) {
    console.error("Failed to set beta access:", error);
    throw new Error("Failed to store beta access. Please try again.");
  }
};

export const getBetaAccess = (): BetaAccessData | null => {
  try {
    const stored = localStorage.getItem("chained_beta_access");
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error("Error parsing beta access data:", error);
    clearBetaAccess();
    return null;
  }
};

export const hasBetaAccess = (): boolean => {
  return getBetaAccess() !== null;
};

export const clearBetaAccess = () => {
  localStorage.removeItem("chained_beta_access");
  document.cookie =
    "chained_beta_access=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
};
