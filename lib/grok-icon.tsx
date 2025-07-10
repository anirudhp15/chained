"use client";

import { Grok } from "@lobehub/icons";
import React from "react";

// GrokIcon component for xAI using @lobehub/icons
export const GrokIcon: React.ComponentType<{
  size?: number;
  className?: string;
}> = ({ size = 16, className = "" }) => {
  return React.createElement(Grok, { size, className });
};
