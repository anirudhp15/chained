import { SiOpenai, SiClaude } from "react-icons/si";

interface ModelAvatarProps {
  model?: string;
  isUser?: boolean;
  className?: string;
  size?: "xs" | "sm" | "default";
}

export function ModelAvatar({
  model,
  isUser,
  className = "",
  size = "default",
}: ModelAvatarProps) {
  const getSizeClasses = () => {
    switch (size) {
      case "xs":
        return "w-5 h-5";
      case "sm":
        return "w-6 h-6";
      default:
        return "w-8 h-8";
    }
  };

  const getProviderIconClasses = () => {
    switch (size) {
      case "xs":
        return "w-3 h-3";
      case "sm":
        return "w-3.5 h-3.5";
      default:
        return "w-5 h-5";
    }
  };

  if (isUser) {
    return null;
  }

  // Extract provider from model name
  const provider = model?.toLowerCase().includes("claude")
    ? "anthropic"
    : "openai";

  if (provider === "anthropic") {
    return (
      <div
        className={`${getSizeClasses()} rounded-full bg-[#000000] flex items-center justify-center flex-shrink-0 ${className}`}
      >
        <SiClaude className={`${getProviderIconClasses()} text-[#da7756]`} />
      </div>
    );
  }

  // OpenAI/ChatGPT logo
  return (
    <div
      className={`${getSizeClasses()} rounded-full bg-[#000000] flex items-center justify-center flex-shrink-0 ${className}`}
    >
      <SiOpenai className={`${getProviderIconClasses()} text-white`} />
    </div>
  );
}
