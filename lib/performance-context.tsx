"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

interface PerformanceContextType {
  showDetailedPerformance: boolean;
  togglePerformance: () => void;
}

const PerformanceContext = createContext<PerformanceContextType | undefined>(
  undefined
);

export function PerformanceProvider({ children }: { children: ReactNode }) {
  const [showDetailedPerformance, setShowDetailedPerformance] = useState(false);

  const togglePerformance = () => {
    setShowDetailedPerformance((prev) => !prev);
  };

  return (
    <PerformanceContext.Provider
      value={{ showDetailedPerformance, togglePerformance }}
    >
      {children}
    </PerformanceContext.Provider>
  );
}

export function usePerformance() {
  const context = useContext(PerformanceContext);
  if (context === undefined) {
    throw new Error("usePerformance must be used within a PerformanceProvider");
  }
  return context;
}
