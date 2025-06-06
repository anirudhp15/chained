"use client";

import { Link2, Link2Off } from "lucide-react";

interface MobileSidebarToggleProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function MobileSidebarToggle({
  isOpen,
  onToggle,
}: MobileSidebarToggleProps) {
  return (
    <button
      onClick={onToggle}
      className="lg:hidden fixed top-4 left-4 z-30 p-2  text-lavender-400/75 hover:text-lavender-400 transition-all duration-200 hover:scale-110 shadow-lg"
    >
      {isOpen ? (
        <Link2Off
          size={20}
          className="transition-transform duration-200 ease-out hover:-rotate-45"
        />
      ) : (
        <Link2
          size={20}
          className="transition-transform duration-200 ease-out hover:-rotate-45"
        />
      )}
    </button>
  );
}
