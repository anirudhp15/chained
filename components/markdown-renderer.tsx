"use client";

import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { MathJax } from "better-react-mathjax";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Copy, Check } from "lucide-react";

interface MarkdownRendererProps {
  content: string;
  className?: string;
  isStreaming?: boolean;
}

export function MarkdownRenderer({
  content,
  className = "",
  isStreaming = false,
}: MarkdownRendererProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const copyToClipboard = async (code: string, id: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(id);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (err) {
      console.error("Failed to copy code:", err);
    }
  };

  // Preprocess content to convert square bracket math to proper LaTeX delimiters
  const preprocessMath = (text: string): string => {
    console.log(
      "MarkdownRenderer: Processing content:",
      text.substring(0, 200) + "..."
    );

    // Convert [ math expression ] to $$ math expression $$ for display math
    let processed = text.replace(
      /\[\s*([^[\]]*(?:\\[a-zA-Z]+[^[\]]*)*[^[\]]*)\s*\]/g,
      (match, mathContent) => {
        if (
          mathContent.includes("\\") ||
          /[=+\-*/^_{}()μσλπθαβγδεζηικλμνξοπρστυφχψω∫∑∏∂∇∞±≤≥≠≈∈∉⊂⊃∪∩]/.test(
            mathContent
          )
        ) {
          console.log(
            "✅ Converting square bracket display math:",
            match,
            "->",
            `$$${mathContent}$$`
          );
          return `$$${mathContent}$$`;
        }
        console.log("❌ Skipping non-math square brackets:", match);
        return match;
      }
    );

    // Convert ( math expression ) to $ math expression $ for inline math
    processed = processed.replace(
      /\(\s*([^()]*?(?:\\(?:\\)*\\.[^()]*?)*[^()]*?)\s*\)/g,
      (match, mathContent) => {
        if (
          mathContent.includes("\\") &&
          /[=+\-*/^_{}μσλπθαβγδεζηικλμνξοπρστυφχψω∫∑∏∂∇∞±≤≥≠≈∈∉⊂⊃∪∩]/.test(
            mathContent
          )
        ) {
          if (mathContent.startsWith("$") && mathContent.endsWith("$")) {
            return match;
          }
          console.log(
            "✅ Converting parentheses inline math:",
            match,
            "->",
            `$${mathContent}$`
          );
          return `$${mathContent}$`;
        }
        return match;
      }
    );

    if (processed !== text) {
      console.log(
        "📝 Content was modified by preprocessing to use $ and $$ delimiters"
      );
    } else {
      console.log(
        "📝 No modifications made by preprocessing or content already used $ delimiters"
      );
    }

    return processed;
  };

  const processedContent = preprocessMath(content);

  return (
    <div
      className={`prose prose-invert max-w-none markdown-content ${isStreaming ? "streaming-content" : ""} ${className}`}
    >
      <MathJax>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            // Headings
            h1: ({ children }) => (
              <h1 className="text-2xl font-bold text-white mb-4 mt-6 first:mt-0">
                {children}
              </h1>
            ),
            h2: ({ children }) => (
              <h2 className="text-xl font-bold text-white mb-3 mt-5 first:mt-0">
                {children}
              </h2>
            ),
            h3: ({ children }) => (
              <h3 className="text-lg font-semibold text-white mb-2 mt-4 first:mt-0">
                {children}
              </h3>
            ),
            h4: ({ children }) => (
              <h4 className="text-base font-semibold text-white mb-2 mt-3 first:mt-0">
                {children}
              </h4>
            ),

            // Paragraphs
            p: ({ children }) => (
              <p className="text-gray-100 mb-3 leading-relaxed last:mb-0">
                {children}
              </p>
            ),

            // Lists
            ul: ({ children }) => (
              <ul className="list-disc list-inside text-gray-100 mb-3 space-y-1">
                {children}
              </ul>
            ),
            ol: ({ children }) => (
              <ol className="list-decimal text-gray-100 mb-3 space-y-1 ml-6">
                {children}
              </ol>
            ),
            li: ({ children }) => (
              <li className="text-gray-100 leading-relaxed -ml-1">
                {children}
              </li>
            ),

            // Links
            a: ({ href, children }) => (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 underline transition-colors"
              >
                {children}
              </a>
            ),

            // Emphasis
            strong: ({ children }) => (
              <strong className="font-semibold text-white">{children}</strong>
            ),
            em: ({ children }) => (
              <em className="italic text-gray-200">{children}</em>
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
                    <span className="text-xs text-gray-400 font-medium">
                      {language === "text" ? "Code" : language.toUpperCase()}
                    </span>
                    <button
                      onClick={() => copyToClipboard(code, codeId)}
                      className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-200 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      {copiedCode === codeId ? (
                        <>
                          <Check size={12} />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy size={12} />
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                  <SyntaxHighlighter
                    style={oneDark}
                    language={language}
                    customStyle={{
                      margin: 0,
                      borderRadius: "0 0 0.5rem 0.5rem",
                      background: "#1f2937",
                      fontSize: "0.875rem",
                      lineHeight: "1.5",
                      overflowX: "auto",
                      maxWidth: "100%",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-all",
                    }}
                    codeTagProps={{
                      style: {
                        fontFamily:
                          'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-all",
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
                <div className="text-gray-300 italic">{children}</div>
              </blockquote>
            ),

            // Tables
            table: ({ children }) => (
              <div className="overflow-x-auto mb-4">
                <table className="min-w-full border border-gray-600 rounded-lg overflow-hidden">
                  {children}
                </table>
              </div>
            ),
            thead: ({ children }) => (
              <thead className="bg-gray-700">{children}</thead>
            ),
            tbody: ({ children }) => (
              <tbody className="bg-gray-800/50">{children}</tbody>
            ),
            tr: ({ children }) => (
              <tr className="border-b border-gray-600 last:border-b-0">
                {children}
              </tr>
            ),
            th: ({ children }) => (
              <th className="px-4 py-2 text-left text-white font-semibold text-sm">
                {children}
              </th>
            ),
            td: ({ children }) => (
              <td className="px-4 py-2 text-gray-100 text-sm">{children}</td>
            ),

            // Inline code
            code: ({ children, className }) => {
              // If it's a code block (has className), let the pre component handle it
              if (className) {
                return <code className={className}>{children}</code>;
              }

              // Inline code styling with proper wrapping
              return (
                <code className="bg-gray-700/50 text-gray-200 px-1.5 py-0.5 rounded text-sm font-mono break-all">
                  {children}
                </code>
              );
            },

            // Horizontal rule
            hr: () => <hr className="border-gray-600 my-6" />,
          }}
        >
          {processedContent}
        </ReactMarkdown>
      </MathJax>
    </div>
  );
}
