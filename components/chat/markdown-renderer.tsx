"use client";

import React, { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { duotoneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Copy, Check, Download } from "lucide-react";
import { CopyButton } from "../ui/CopyButton";
import { useCopyTracking } from "../../lib/copy-tracking-context";
import { createCopyMetadata } from "../../utils/copy-detection";
import { MODEL_PROVIDERS, getProviderKey } from "../../lib/constants";
import "katex/dist/katex.min.css";

interface MarkdownRendererProps {
  content: string;
  className?: string;
  isStreaming?: boolean;
  // Copy tracking context
  agentIndex?: number;
  agentName?: string;
  agentModel?: string;
  sessionId?: string;
}

export function MarkdownRenderer({
  content,
  className = "",
  isStreaming = false,
  agentIndex,
  agentName,
  agentModel,
  sessionId,
}: MarkdownRendererProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const { trackCopy } = useCopyTracking();

  // Extremely minimal preprocessing - preserve all content, only fix obvious streaming issues
  const processedContent = content
    // Only fix clear streaming artifacts, don't remove any content
    .replace(/\$\$([^$]+?)\s+\$(?!\$)/g, "$$$$1$$") // Fix $$content $ (space before single $)
    .replace(/\$(?!\$)([^$\n]+?)\s+\$(?!\$)/g, "$$$1$$") // Fix $content $ (spaces around single $)

    // Convert LaTeX bracket notations but preserve content if conversion fails
    .replace(/\\\[([\s\S]*?)\\\]/g, (match, content) => {
      return content.trim() ? `$$${content}$$` : match;
    })
    .replace(/\\\(([\s\S]*?)\\\)/g, (match, content) => {
      return content.trim() ? `$${content}$` : match;
    });

  // Debug logging for troubleshooting
  useEffect(() => {
    if (content.includes("$")) {
      console.log("🔍 MARKDOWN RENDERER DEBUG:");
      console.log("Original content sample:", content.substring(0, 300));
      console.log(
        "Processed content sample:",
        processedContent.substring(0, 300)
      );
      console.log("Contains $$:", processedContent.includes("$$"));
      console.log("Contains $:", processedContent.includes("$"));
    }
  }, [content, processedContent]);

  const copyToClipboard = async (code: string, id: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(id);
      setTimeout(() => setCopiedCode(null), 2000);

      if (agentIndex !== undefined) {
        const metadata = createCopyMetadata(code, {
          sourceType: "code-block",
          agentIndex,
          agentName,
          agentModel,
          sessionId,
        });
        trackCopy(metadata);
      }
    } catch (err) {
      console.error("Failed to copy code:", err);
    }
  };

  const downloadCode = (code: string, language: string) => {
    try {
      const blob = new Blob([code], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `code-snippet.${language === "text" ? "txt" : language}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download code:", err);
    }
  };

  // Get provider info for the LLM icon
  const getProviderInfo = () => {
    if (!agentModel) return null;
    const providerKey = getProviderKey(agentModel);
    return MODEL_PROVIDERS[providerKey];
  };

  const providerInfo = getProviderInfo();

  // Shared markdown configuration
  const markdownConfig = {
    remarkPlugins: [
      remarkGfm,
      [
        remarkMath,
        {
          singleDollarTextMath: true,
          inlineMathDouble: false,
          displayMathDouble: true,
          // More permissive settings to preserve content
          inlineMath: [["$", "$"]],
          displayMath: [["$$", "$$"]],
        },
      ],
    ] as any[],
    rehypePlugins: [
      [
        rehypeKatex,
        {
          strict: false,
          trust: true,
          throwOnError: false, // Critical: Don't throw errors, handle gracefully
          errorColor: "#fbbf24", // Warning color for errors
          displayMode: false,
          output: "html",
          // Preserve original content when possible
          fleqn: false,
          leqno: false,
          macros: {
            "\\mod": "\\bmod",
          },
        },
      ],
    ] as any[],
    components: {
      // Paragraphs
      p: ({ children }: { children: React.ReactNode }) => (
        <p className="text-gray-100 mb-3 leading-relaxed last:mb-0">
          {children}
        </p>
      ),

      // Headings
      h1: ({ children }: { children: React.ReactNode }) => (
        <h1 className="text-2xl font-bold text-white mb-4 mt-6 first:mt-0">
          {children}
        </h1>
      ),
      h2: ({ children }: { children: React.ReactNode }) => (
        <h2 className="text-xl font-bold text-white mb-3 mt-5 first:mt-0">
          {children}
        </h2>
      ),
      h3: ({ children }: { children: React.ReactNode }) => (
        <h3 className="text-lg font-semibold text-white mb-2 mt-4 first:mt-0">
          {children}
        </h3>
      ),

      // Lists
      ul: ({ children }: { children: React.ReactNode }) => (
        <ul className="list-disc list-inside text-gray-100 mb-3 space-y-1.5">
          {children}
        </ul>
      ),
      ol: ({ children }: { children: React.ReactNode }) => (
        <ol className="list-decimal text-gray-100 mb-3 space-y-1.5 ml-6">
          {children}
        </ol>
      ),
      li: ({ children }: { children: React.ReactNode }) => (
        <li className="text-gray-100 leading-relaxed">{children}</li>
      ),

      // Links
      a: ({ href, children, ...props }: any) => (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:text-blue-300 underline transition-colors"
          {...props}
        >
          {children}
        </a>
      ),

      // Emphasis
      strong: ({ children }: { children: React.ReactNode }) => (
        <strong className="font-semibold text-white">{children}</strong>
      ),
      em: ({ children }: { children: React.ReactNode }) => (
        <em className="italic text-gray-200">{children}</em>
      ),

      // Code blocks
      pre: ({ children }: { children: React.ReactNode }) => {
        const child = children as React.ReactElement;
        const code = child?.props?.children || "";
        const language =
          child?.props?.className?.replace("language-", "") || "text";
        const codeId = `code-${Math.random().toString(36).substr(2, 9)}`;

        return (
          <div className="relative group mb-4">
            <div className="flex items-center justify-between bg-lavender-400/10  px-4 py-2 rounded-t-lg border-b border-gray-600">
              <span className="text-xs text-gray-300 font-medium">
                {language === "text" ? "Code" : language.toUpperCase()}
              </span>
              <div className="flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <button
                  onClick={() => downloadCode(code, language)}
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-blue-400 transition-colors"
                  title="Download code"
                >
                  <Download size={12} />
                </button>
                <button
                  onClick={() => copyToClipboard(code, codeId)}
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-green-400 transition-colors"
                  title="Copy code"
                >
                  {copiedCode === codeId ? (
                    <Check size={12} className="text-green-400" />
                  ) : (
                    <Copy size={12} />
                  )}
                </button>
              </div>
            </div>
            <div className="syntax-highlighter-container">
              <SyntaxHighlighter
                style={duotoneDark}
                language={language}
                customStyle={{
                  margin: 0,
                  borderRadius: "0 0 0.5rem 0.5rem",
                  backgroundColor: "#0a0a0a !important", // bg-neutral-950
                  fontSize: "0.875rem",
                  lineHeight: "1.5",
                  overflowX: "auto",
                  maxWidth: "100%",
                  padding: "1rem",
                  fontFamily:
                    '"JetBrains Mono", "Fira Code", "Cascadia Code", Consolas, "SF Mono", Monaco, monospace',
                }}
                wrapLongLines={true}
                showLineNumbers={false}
                PreTag="div"
                codeTagProps={{
                  style: {
                    fontFamily:
                      '"JetBrains Mono", "Fira Code", "Cascadia Code", Consolas, "SF Mono", Monaco, monospace',
                  },
                }}
              >
                {code}
              </SyntaxHighlighter>
            </div>
          </div>
        );
      },

      // Inline code
      code: ({
        children,
        className,
      }: {
        children: React.ReactNode;
        className?: string;
      }) => {
        if (className) {
          return <code className={className}>{children}</code>;
        }
        return (
          <code className="bg-gray-700/50 text-gray-200 px-1.5 py-0.5 rounded text-sm">
            {children}
          </code>
        );
      },

      // Blockquotes
      blockquote: ({ children }: { children: React.ReactNode }) => (
        <blockquote className="border-l-4 border-gray-500 pl-4 py-2 my-4 bg-gray-800/30 rounded-r">
          <div className="text-gray-300 italic">{children}</div>
        </blockquote>
      ),

      // Horizontal rule
      hr: () => <hr className="border-gray-600 my-6" />,
    },
  } as any;

  return (
    <div
      className={`prose prose-invert max-w-none markdown-content ${className}`}
    >
      {/* LLM Provider Icon at the beginning of responses */}
      {providerInfo && (
        <div className="flex items-start gap-2 mb-3 not-prose">
          <div
            className={`w-6 h-6 rounded-full ${providerInfo.bgColor} flex items-center justify-center flex-shrink-0 mt-0.5`}
          >
            {React.createElement(providerInfo.icon, {
              size: 14,
              className: providerInfo.iconColor,
            })}
          </div>
          <div className="flex-1 min-w-0">
            <ReactMarkdown {...markdownConfig}>
              {processedContent}
            </ReactMarkdown>
          </div>
        </div>
      )}

      {/* Fallback for responses without provider info */}
      {!providerInfo && (
        <ReactMarkdown {...markdownConfig}>{processedContent}</ReactMarkdown>
      )}
    </div>
  );
}
