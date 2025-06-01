import { GitCommitHorizontal, GitFork } from "lucide-react";
import { IoGitBranchOutline } from "react-icons/io5";

// Connection types configuration
export type EnabledConnectionType = "direct" | "conditional" | "parallel";

export const CONNECTION_TYPES = [
  {
    type: "direct" as const,
    label: "Direct",
    Icon: GitCommitHorizontal,
    description: "Pass previous agent's output directly",
    color: "text-blue-400",
  },
  {
    type: "conditional" as const,
    label: "Conditional",
    Icon: IoGitBranchOutline,
    description: "Run only if a condition is met",
    color: "text-amber-400",
    iconRotate: "rotate-90",
  },
  {
    type: "parallel" as const,
    label: "Parallel",
    Icon: GitFork,
    description: "Run simultaneously (coming soon)",
    color: "text-purple-400",
    disabled: true,
    iconRotate: "rotate-90",
  },
] satisfies Array<{
  type: EnabledConnectionType;
  label: string;
  Icon: React.ComponentType<any>;
  description: string;
  disabled?: boolean;
  color: string;
  iconRotate?: string;
}>;

export const CONDITION_PRESETS = [
  {
    label: "Contains keyword",
    condition: "contains('keyword')",
    placeholder: "contains('error')",
  },
  {
    label: "Starts with",
    condition: "starts_with('text')",
    placeholder: "starts_with('SUCCESS')",
  },
  {
    label: "Ends with",
    condition: "ends_with('text')",
    placeholder: "ends_with('.')",
  },
  {
    label: "Length greater than",
    condition: "length > 100",
    placeholder: "length > 50",
  },
  {
    label: "Length less than",
    condition: "length < 100",
    placeholder: "length < 200",
  },
  {
    label: "Not empty",
    condition: "length > 0",
    placeholder: "length > 0",
  },
];

// Default agent configuration
export const DEFAULT_AGENT_CONFIG = {
  model: "claude-sonnet-4-20250514",
  name: "",
  prompt: "",
};
