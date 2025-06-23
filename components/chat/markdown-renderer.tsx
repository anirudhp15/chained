"use client";

import React, { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Copy, Check, Download } from "lucide-react";
import { CopyButton } from "../ui/CopyButton";
import { useCopyTracking } from "../../lib/copy-tracking-context";
import { createCopyMetadata } from "../../utils/copy-detection";

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

  const copyToClipboard = async (code: string, id: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(id);
      setTimeout(() => setCopiedCode(null), 2000);

      // Track the copy with context
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

  return (
    <div
      className={`prose prose-invert max-w-none markdown-content ${isStreaming ? "streaming-content" : ""} ${className} font-inter`}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          // Headings
          h1: ({ children }) => (
            <h1 className="text-2xl font-bold font-inter text-white mb-4 mt-6 first:mt-0 tracking-tight">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-bold font-inter text-white mb-3 mt-5 first:mt-0 tracking-tight">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg font-semibold font-inter text-white mb-2 mt-4 first:mt-0 tracking-tight">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-base font-semibold font-inter text-white mb-2 mt-3 first:mt-0 tracking-tight">
              {children}
            </h4>
          ),

          // Paragraphs
          p: ({ children }) => (
            <p className="text-gray-100 font-inter mb-3 leading-relaxed last:mb-0 tracking-normal">
              {children}
            </p>
          ),

          // Lists
          ul: ({ children }) => (
            <ul className="list-disc list-inside text-gray-100 font-inter mb-3 space-y-1.5">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal text-gray-100 font-inter mb-3 space-y-1.5 ml-6">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="text-gray-100 font-inter leading-relaxed -ml-1 tracking-normal">
              {children}
            </li>
          ),

          // Links
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 font-inter hover:text-blue-300 underline transition-colors"
            >
              {children}
            </a>
          ),

          // Emphasis
          strong: ({ children }) => (
            <strong className="font-semibold font-inter text-white">
              {children}
            </strong>
          ),
          em: ({ children }) => (
            <em className="italic font-inter text-gray-200">{children}</em>
          ),

          // Code blocks
          pre: ({ children }) => {
            const child = children as React.ReactElement;
            const code = child?.props?.children || "";
            const language =
              child?.props?.className?.replace("language-", "") || "text";
            const codeId = `code-${Math.random().toString(36).substr(2, 9)}`;

            return (
              <div className="relative group mb-4">
                <div className="flex items-center justify-between bg-gray-800 px-4 py-2 rounded-t-lg border-b border-gray-600">
                  <span className="text-xs text-gray-400 font-medium font-inter">
                    {language === "text" ? "Code" : language.toUpperCase()}
                  </span>
                  <div className="flex items-center gap-4 opacity-0 group-hover:opacity-100">
                    <button
                      onClick={() => downloadCode(code, language)}
                      className="flex items-center gap-1 text-xs text-gray-400 font-inter hover:text-gray-200 transition-colors"
                      title="Download code"
                    >
                      <Download size={12} />
                    </button>
                    <button
                      onClick={() => copyToClipboard(code, codeId)}
                      className="flex items-center gap-1 text-xs text-gray-400 font-inter hover:text-gray-200 transition-colors"
                      title="Copy code"
                    >
                      {copiedCode === codeId ? (
                        <>
                          <Check size={12} />
                        </>
                      ) : (
                        <>
                          <Copy size={12} />
                        </>
                      )}
                    </button>
                  </div>
                </div>
                <SyntaxHighlighter
                  style={oneDark}
                  language={language}
                  customStyle={{
                    margin: 0,
                    borderRadius: 0,
                    background: "#111827",
                    fontSize: "0.875rem",
                    lineHeight: "1.5",
                    overflowX: "auto",
                    maxWidth: "100%",
                    padding: "1rem",
                    fontFamily:
                      'JetBrains Mono, Menlo, Monaco, Consolas, "Courier New", monospace',
                    fontWeight: 400,
                    whiteSpace: "pre",
                    wordBreak: "normal",
                  }}
                  codeTagProps={{
                    style: {
                      fontFamily:
                        'JetBrains Mono, Menlo, Monaco, Consolas, "Courier New", monospace',
                      fontWeight: 400,
                      whiteSpace: "pre",
                      wordBreak: "normal",
                      fontSize: "0.875rem",
                      lineHeight: "1.5",
                    },
                  }}
                  wrapLongLines={true}
                >
                  {code}
                </SyntaxHighlighter>
              </div>
            );
          },

          // Blockquotes
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-gray-500 pl-4 py-2 my-4 bg-gray-800/30 rounded-r">
              <div className="text-gray-300 italic font-inter tracking-normal">
                {children}
              </div>
            </blockquote>
          ),

          // Tables
          table: ({ children }) => (
            <div className="overflow-x-auto mb-4">
              <table className="min-w-full border border-gray-600 rounded-lg overflow-hidden font-inter">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-gray-700 font-inter">{children}</thead>
          ),
          tbody: ({ children }) => (
            <tbody className="bg-gray-800/50 font-inter">{children}</tbody>
          ),
          tr: ({ children }) => (
            <tr className="border-b border-gray-600 last:border-b-0 font-inter">
              {children}
            </tr>
          ),
          th: ({ children }) => (
            <th className="px-4 py-2 text-left text-white font-semibold text-sm font-inter tracking-tight">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-4 py-2 text-gray-100 text-sm font-inter">
              {children}
            </td>
          ),

          // Inline code
          code: ({ children, className }) => {
            // If it's a code block (has className), let the pre component handle it
            if (className) {
              return <code className={className}>{children}</code>;
            }

            // Inline code styling with proper wrapping
            return (
              <code
                className="bg-gray-700/50 text-gray-200 px-1.5 py-0.5 rounded text-sm font-jet break-all"
                style={{
                  fontFamily:
                    'JetBrains Mono, Menlo, Monaco, Consolas, "Courier New", monospace',
                  fontWeight: 400,
                  whiteSpace: "pre",
                  wordBreak: "normal",
                }}
              >
                {children}
              </code>
            );
          },

          // Horizontal rule
          hr: () => <hr className="border-gray-600 my-6" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
