// Beta access management utilities

export interface BetaAccessData {
  email: string;
  grantedAt: number;
  source: "access_code" | "waitlist_invite";
}

export const setBetaAccess = (data: BetaAccessData) => {
  // Store in localStorage for client-side persistence
  localStorage.setItem("chained_beta_access", JSON.stringify(data));

  // Set cookie for server-side middleware checking
  document.cookie = `chained_beta_access=${JSON.stringify(data)}; path=/; max-age=${30 * 24 * 60 * 60}; secure; samesite=strict`;
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
