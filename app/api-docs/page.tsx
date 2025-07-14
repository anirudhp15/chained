"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Search,
  Book,
  Code,
  Key,
  Zap,
  Terminal,
  FileText,
  Settings,
  Globe,
  Copy,
  Check,
  ChevronRight,
  ExternalLink,
  Menu,
  X,
} from "lucide-react";

export default function ApiDocsPage() {
  const [mounted, setMounted] = useState(false);
  const [isDev, setIsDev] = useState(false);
  const [activeSection, setActiveSection] = useState("get-started");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Check if we're in development environment
    setIsDev(
      process.env.NODE_ENV === "development" ||
        window.location.hostname === "localhost" ||
        window.location.hostname.includes("vercel") ||
        window.location.hostname.includes("localhost")
    );
  }, []);

  // Redirect if not in development
  useEffect(() => {
    if (mounted && !isDev) {
      window.location.href = "/";
    }
  }, [mounted, isDev]);

  if (!mounted || !isDev) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lavender-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const sidebarItems = [
    {
      title: "First steps",
      items: [
        { id: "get-started", title: "Get started", icon: Book },
        { id: "quickstart", title: "Quickstart", icon: Zap },
        { id: "authentication", title: "Authentication", icon: Key },
      ],
    },
    {
      title: "API Reference",
      items: [
        { id: "chains", title: "Chains", icon: Code },
        { id: "agents", title: "Agents", icon: Terminal },
        { id: "models", title: "Models", icon: Settings },
        { id: "streaming", title: "Streaming", icon: Globe },
      ],
    },
    {
      title: "Use cases",
      items: [
        { id: "chat-completion", title: "Chat completion", icon: FileText },
        { id: "text-analysis", title: "Text analysis", icon: FileText },
        { id: "code-generation", title: "Code generation", icon: Code },
      ],
    },
  ];

  const renderContent = () => {
    switch (activeSection) {
      case "get-started":
        return (
          <div className="space-y-8">
            <div>
              <h1 className="text-4xl font-bold text-white mb-4">
                Get started with ChainedChat
              </h1>
              <p className="text-lg text-gray-400 leading-relaxed">
                Let's learn how to use the ChainedChat API to build with
                multiple AI agents working together.
              </p>
            </div>

            <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-6">
              <p className="text-gray-300 mb-4">
                In this example, we'll explore how to use ChainedChat through
                the Console and API, starting with a simple question and then
                customizing our agent chains.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-white mb-4">
                Prerequisites
              </h2>
              <p className="text-gray-400 mb-4">You will need:</p>
              <ul className="space-y-2 text-gray-300">
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-lavender-400 rounded-full mr-3"></div>
                  A ChainedChat{" "}
                  <Link
                    href="/pricing"
                    className="text-lavender-400 hover:underline mx-1"
                  >
                    Console account
                  </Link>
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-lavender-400 rounded-full mr-3"></div>
                  An{" "}
                  <span className="text-lavender-400 font-mono">API key</span>
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-lavender-400 rounded-full mr-3"></div>
                  Python 3.7+ or TypeScript 4.5+
                </li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-white mb-4">
                Start with the Console
              </h2>
              <p className="text-gray-400 mb-4">
                Any API call you make—regardless of the specific task—sends a
                well-configured prompt to the ChainedChat API. As you're
                learning to make the most of multiple agents, we recommend that
                you start the development process in the Console, a web-based
                interface to ChainedChat.
              </p>

              <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 my-6">
                <p className="text-gray-300 mb-2">
                  Log into the{" "}
                  <Link
                    href="/chat"
                    className="text-lavender-400 hover:underline"
                  >
                    ChainedChat Console
                  </Link>{" "}
                  and click "Write a chain from scratch".
                </p>
                <p className="text-gray-300">
                  In the middle section, under User, let's ask Claude a
                  question.
                </p>
              </div>

              <div className="bg-gray-950 border border-gray-700 rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
                  <span className="text-gray-300 text-sm">
                    Try in Console →
                  </span>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        '{"message": "Hello, world!"}',
                        "console-example"
                      )
                    }
                    className="flex items-center space-x-1 text-gray-400 hover:text-white transition-colors"
                  >
                    {copiedCode === "console-example" ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <div className="p-4">
                  <pre className="text-gray-300 text-sm">
                    <code>{`User: What's the capital of France?

Agent 1 (Claude): Paris is the capital of France.

Agent 2 (GPT-4): To add context, Paris has been the capital since 987 CE and is home to over 2 million people.`}</code>
                  </pre>
                </div>
              </div>
            </div>
          </div>
        );

      case "quickstart":
        return (
          <div className="space-y-8">
            <div>
              <h1 className="text-4xl font-bold text-white mb-4">Quickstart</h1>
              <p className="text-lg text-gray-400 leading-relaxed">
                Get up and running with the ChainedChat API in minutes.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-white mb-4">
                Install the SDK
              </h2>

              <div className="bg-gray-950 border border-gray-700 rounded-lg overflow-hidden mb-6">
                <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
                  <span className="text-gray-300 text-sm">Python</span>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        "pip install chainedchat",
                        "install-python"
                      )
                    }
                    className="flex items-center space-x-1 text-gray-400 hover:text-white transition-colors"
                  >
                    {copiedCode === "install-python" ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <div className="p-4">
                  <pre className="text-gray-300 text-sm">
                    <code>pip install chainedchat</code>
                  </pre>
                </div>
              </div>

              <div className="bg-gray-950 border border-gray-700 rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
                  <span className="text-gray-300 text-sm">TypeScript</span>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        "npm install @chainedchat/sdk",
                        "install-ts"
                      )
                    }
                    className="flex items-center space-x-1 text-gray-400 hover:text-white transition-colors"
                  >
                    {copiedCode === "install-ts" ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <div className="p-4">
                  <pre className="text-gray-300 text-sm">
                    <code>npm install @chainedchat/sdk</code>
                  </pre>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-white mb-4">
                Set your API key
              </h2>

              <div className="bg-gray-950 border border-gray-700 rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
                  <span className="text-gray-300 text-sm">
                    Environment Variable
                  </span>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        'export CHAINEDCHAT_API_KEY="your-api-key-here"',
                        "api-key"
                      )
                    }
                    className="flex items-center space-x-1 text-gray-400 hover:text-white transition-colors"
                  >
                    {copiedCode === "api-key" ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <div className="p-4">
                  <pre className="text-gray-300 text-sm">
                    <code>export CHAINEDCHAT_API_KEY="your-api-key-here"</code>
                  </pre>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-white mb-4">
                Call the API
              </h2>

              <div className="bg-gray-950 border border-gray-700 rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
                  <span className="text-gray-300 text-sm">Python Example</span>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        `import chainedchat

client = chainedchat.ChainedChat()

response = client.chains.create(
  agents=[
    {
      "model": "claude-3-sonnet",
      "prompt": "Analyze this text for sentiment",
      "input": "I love this product!"
    },
    {
      "model": "gpt-4",
      "prompt": "Summarize the sentiment analysis",
      "depends_on": [0]
    }
  ]
)

print(response.result)`,
                        "python-example"
                      )
                    }
                    className="flex items-center space-x-1 text-gray-400 hover:text-white transition-colors"
                  >
                    {copiedCode === "python-example" ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <div className="p-4">
                  <pre className="text-gray-300 text-sm">
                    <code>{`import chainedchat

client = chainedchat.ChainedChat()

response = client.chains.create(
  agents=[
    {
      "model": "claude-3-sonnet",
      "prompt": "Analyze this text for sentiment",
      "input": "I love this product!"
    },
    {
      "model": "gpt-4", 
      "prompt": "Summarize the sentiment analysis",
      "depends_on": [0]
    }
  ]
)

print(response.result)`}</code>
                  </pre>
                </div>
              </div>
            </div>
          </div>
        );

      case "authentication":
        return (
          <div className="space-y-8">
            <div>
              <h1 className="text-4xl font-bold text-white mb-4">
                Authentication
              </h1>
              <p className="text-lg text-gray-400 leading-relaxed">
                Learn how to authenticate your requests to the ChainedChat API.
              </p>
            </div>

            <div className="bg-yellow-900/20 border border-yellow-600/50 rounded-lg p-6">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-black text-sm font-bold">!</span>
                </div>
                <div>
                  <h3 className="text-yellow-400 font-semibold mb-2">
                    Security Note
                  </h3>
                  <p className="text-yellow-200 text-sm">
                    Keep your API keys secure and never commit them to version
                    control. Use environment variables or secure key management
                    services.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-white mb-4">
                API Key Setup
              </h2>
              <p className="text-gray-400 mb-4">
                All API requests must be authenticated using your API key.
                Include it in the Authorization header:
              </p>

              <div className="bg-gray-950 border border-gray-700 rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
                  <span className="text-gray-300 text-sm">cURL</span>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        `curl -X POST https://api.chainedchat.com/v1/chains \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "agents": [
      {
        "model": "claude-3-sonnet",
        "prompt": "Hello, world!"
      }
    ]
  }'`,
                        "auth-curl"
                      )
                    }
                    className="flex items-center space-x-1 text-gray-400 hover:text-white transition-colors"
                  >
                    {copiedCode === "auth-curl" ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <div className="p-4">
                  <pre className="text-gray-300 text-sm">
                    <code>{`curl -X POST https://api.chainedchat.com/v1/chains \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "agents": [
      {
        "model": "claude-3-sonnet",
        "prompt": "Hello, world!"
      }
    ]
  }'`}</code>
                  </pre>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="space-y-8">
            <div>
              <h1 className="text-4xl font-bold text-white mb-4">
                Coming Soon
              </h1>
              <p className="text-lg text-gray-400 leading-relaxed">
                This section is currently under development. Check back soon for
                detailed documentation.
              </p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex">
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-gray-800 rounded-lg border border-gray-600 text-white"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile Overlay */}
      {isMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`w-80 bg-gray-950 border-r border-gray-700 flex flex-col fixed lg:relative inset-y-0 left-0 z-50 transform ${
          isMenuOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 transition-transform duration-300 ease-in-out`}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <Link
              href="/"
              className="flex items-center space-x-2 text-lavender-400 hover:text-white transition-colors duration-300"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-semibold">ChainedChat</span>
            </Link>

            <button
              onClick={() => setIsMenuOpen(false)}
              className="lg:hidden p-1 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="text-xs text-gray-500 bg-gray-900 px-3 py-1 rounded-full inline-block mb-4">
            DEV ONLY
          </div>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:border-lavender-500"
            />
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto p-6">
          <nav className="space-y-8">
            {sidebarItems.map((section) => (
              <div key={section.title}>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                  {section.title}
                </h3>
                <ul className="space-y-1">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <li key={item.id}>
                        <button
                          onClick={() => {
                            setActiveSection(item.id);
                            setIsMenuOpen(false);
                          }}
                          className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                            activeSection === item.id
                              ? "bg-lavender-600/20 text-lavender-400 border border-lavender-600/30"
                              : "text-gray-300 hover:text-white hover:bg-gray-800"
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          <span>{item.title}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-700">
          <div className="text-xs text-gray-500">
            <p className="mb-2">API Reference v1.0</p>
            <div className="flex items-center space-x-4">
              <Link
                href="#"
                className="hover:text-lavender-400 transition-colors"
              >
                Support
              </Link>
              <Link
                href="#"
                className="hover:text-lavender-400 transition-colors"
              >
                Status
              </Link>
              <Link
                href="/pricing"
                className="hover:text-lavender-400 transition-colors"
              >
                Pricing
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:ml-0">
        {/* Top Navigation */}
        <div className="border-b border-gray-700 bg-gray-950/50 backdrop-blur">
          <div className="max-w-4xl mx-auto px-4 lg:px-8 py-4 pt-16 lg:pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-sm text-gray-400">
                <span>Documentation</span>
                <ChevronRight className="w-4 h-4" />
                <span className="text-white capitalize">
                  {activeSection.replace("-", " ")}
                </span>
              </div>

              <div className="flex items-center space-x-4">
                <Link
                  href="https://github.com/chainedchat/api"
                  className="flex items-center space-x-1 text-gray-400 hover:text-white transition-colors text-sm"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>GitHub</span>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-4 lg:px-8 py-6 lg:py-12">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
}
