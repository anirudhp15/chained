"use client";

import { useState, useEffect, useRef } from "react";
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
  Hash,
} from "lucide-react";

interface TocItem {
  id: string;
  title: string;
  level: number;
}

export default function ApiDocsPage() {
  const [mounted, setMounted] = useState(false);
  const [isDev, setIsDev] = useState(false);
  const [activeSection, setActiveSection] = useState("get-started");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeTocItem, setActiveTocItem] = useState<string>("");
  const [tocItems, setTocItems] = useState<TocItem[]>([]);
  const contentRef = useRef<HTMLDivElement>(null);
  const mainContentRef = useRef<HTMLDivElement>(null);

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

  // Generate table of contents from headings
  useEffect(() => {
    if (contentRef.current) {
      const headings = contentRef.current.querySelectorAll("h1, h2, h3");
      const items: TocItem[] = [];

      headings.forEach((heading) => {
        const id =
          heading.textContent
            ?.toLowerCase()
            .replace(/\s+/g, "-")
            .replace(/[^\w-]/g, "") || "";
        heading.id = id;

        items.push({
          id,
          title: heading.textContent || "",
          level: parseInt(heading.tagName[1]),
        });
      });

      setTocItems(items);
    }
  }, [activeSection]);

  // Scroll spy implementation
  useEffect(() => {
    const mainContent = mainContentRef.current;
    if (!mainContent || !contentRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveTocItem(entry.target.id);
          }
        });
      },
      {
        root: mainContent,
        rootMargin: "-100px 0px -60% 0px",
        threshold: 0,
      }
    );

    const headings = contentRef.current.querySelectorAll("h1, h2, h3");
    headings.forEach((heading) => observer.observe(heading));

    return () => observer.disconnect();
  }, [activeSection]);

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

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    const mainContent = mainContentRef.current;
    if (element && mainContent) {
      const elementTop = element.offsetTop;
      mainContent.scrollTo({
        top: elementTop - 100,
        behavior: "smooth",
      });
    }
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
          <div className="space-y-12">
            <div>
              <h1 className="text-4xl font-bold text-white mb-6">
                Get started with ChainedChat
              </h1>
              <p className="text-xl text-gray-400 leading-relaxed">
                Let's learn how to use the ChainedChat API to build with
                multiple AI agents working together.
              </p>
            </div>

            <div className="bg-gradient-to-r from-lavender-500/10 to-purple-500/10 border border-lavender-500/20 rounded-xl p-8">
              <p className="text-gray-300 text-lg leading-relaxed">
                In this example, we'll explore how to use ChainedChat through
                the Console and API, starting with a simple question and then
                customizing our agent chains.
              </p>
            </div>

            <div>
              <h2 className="text-3xl font-bold text-white mb-6">
                Prerequisites
              </h2>
              <p className="text-gray-400 mb-6 text-lg">You will need:</p>
              <ul className="space-y-4 text-gray-300">
                <li className="flex items-center text-lg">
                  <div className="w-3 h-3 bg-lavender-400 rounded-full mr-4 flex-shrink-0"></div>
                  A ChainedChat{" "}
                  <Link
                    href="/pricing"
                    className="text-lavender-400 hover:text-lavender-300 transition-colors mx-1 underline underline-offset-2"
                  >
                    Console account
                  </Link>
                </li>
                <li className="flex items-center text-lg">
                  <div className="w-3 h-3 bg-lavender-400 rounded-full mr-4 flex-shrink-0"></div>
                  An{" "}
                  <span className="text-lavender-400 font-mono bg-gray-800 px-2 py-1 rounded">
                    API key
                  </span>
                </li>
                <li className="flex items-center text-lg">
                  <div className="w-3 h-3 bg-lavender-400 rounded-full mr-4 flex-shrink-0"></div>
                  Python 3.7+ or TypeScript 4.5+
                </li>
              </ul>
            </div>

            <div>
              <h2 className="text-3xl font-bold text-white mb-6">
                Start with the Console
              </h2>
              <p className="text-gray-400 mb-6 text-lg leading-relaxed">
                Any API call you make—regardless of the specific task—sends a
                well-configured prompt to the ChainedChat API. As you're
                learning to make the most of multiple agents, we recommend that
                you start the development process in the Console, a web-based
                interface to ChainedChat.
              </p>

              <div className="bg-gray-900/50 border border-gray-700 rounded-xl p-6 my-8">
                <p className="text-gray-300 mb-3 text-lg">
                  Log into the{" "}
                  <Link
                    href="/chat"
                    className="text-lavender-400 hover:text-lavender-300 transition-colors underline underline-offset-2"
                  >
                    ChainedChat Console
                  </Link>{" "}
                  and click "Write a chain from scratch".
                </p>
                <p className="text-gray-300 text-lg">
                  In the middle section, under User, let's ask Claude a
                  question.
                </p>
              </div>

              <div className="bg-gray-950 border border-gray-700 rounded-xl overflow-hidden shadow-2xl">
                <div className="flex items-center justify-between px-6 py-4 bg-gray-800 border-b border-gray-700">
                  <span className="text-gray-300 text-sm font-medium">
                    Try in Console →
                  </span>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        '{"message": "Hello, world!"}',
                        "console-example"
                      )
                    }
                    className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors px-3 py-1 rounded-md hover:bg-gray-700"
                  >
                    {copiedCode === "console-example" ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                    <span className="text-xs">Copy</span>
                  </button>
                </div>
                <div className="p-6">
                  <pre className="text-gray-300 text-sm leading-relaxed">
                    <code>{`User: What's the capital of France?

Agent 1 (Claude): Paris is the capital of France.

Agent 2 (GPT-4): To add context, Paris has been the capital since 987 CE and is home to over 2 million people.`}</code>
                  </pre>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-2xl font-bold text-white mb-4">Next Steps</h3>
              <p className="text-gray-400 text-lg leading-relaxed">
                Now that you've tried the Console, you can explore more advanced
                features or jump straight into using the API.
              </p>
            </div>
          </div>
        );

      case "quickstart":
        return (
          <div className="space-y-12">
            <div>
              <h1 className="text-4xl font-bold text-white mb-6">Quickstart</h1>
              <p className="text-xl text-gray-400 leading-relaxed">
                Get up and running with the ChainedChat API in minutes.
              </p>
            </div>

            <div>
              <h2 className="text-3xl font-bold text-white mb-6">
                Install the SDK
              </h2>

              <div className="space-y-6">
                <div className="bg-gray-950 border border-gray-700 rounded-xl overflow-hidden shadow-2xl">
                  <div className="flex items-center justify-between px-6 py-4 bg-gray-800 border-b border-gray-700">
                    <span className="text-gray-300 text-sm font-medium">
                      Python
                    </span>
                    <button
                      onClick={() =>
                        copyToClipboard(
                          "pip install chainedchat",
                          "install-python"
                        )
                      }
                      className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors px-3 py-1 rounded-md hover:bg-gray-700"
                    >
                      {copiedCode === "install-python" ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                      <span className="text-xs">Copy</span>
                    </button>
                  </div>
                  <div className="p-6">
                    <pre className="text-gray-300 text-sm">
                      <code>pip install chainedchat</code>
                    </pre>
                  </div>
                </div>

                <div className="bg-gray-950 border border-gray-700 rounded-xl overflow-hidden shadow-2xl">
                  <div className="flex items-center justify-between px-6 py-4 bg-gray-800 border-b border-gray-700">
                    <span className="text-gray-300 text-sm font-medium">
                      TypeScript
                    </span>
                    <button
                      onClick={() =>
                        copyToClipboard(
                          "npm install @chainedchat/sdk",
                          "install-ts"
                        )
                      }
                      className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors px-3 py-1 rounded-md hover:bg-gray-700"
                    >
                      {copiedCode === "install-ts" ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                      <span className="text-xs">Copy</span>
                    </button>
                  </div>
                  <div className="p-6">
                    <pre className="text-gray-300 text-sm">
                      <code>npm install @chainedchat/sdk</code>
                    </pre>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-3xl font-bold text-white mb-6">
                Set your API key
              </h2>

              <div className="bg-gray-950 border border-gray-700 rounded-xl overflow-hidden shadow-2xl">
                <div className="flex items-center justify-between px-6 py-4 bg-gray-800 border-b border-gray-700">
                  <span className="text-gray-300 text-sm font-medium">
                    Environment Variable
                  </span>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        'export CHAINEDCHAT_API_KEY="your-api-key-here"',
                        "api-key"
                      )
                    }
                    className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors px-3 py-1 rounded-md hover:bg-gray-700"
                  >
                    {copiedCode === "api-key" ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                    <span className="text-xs">Copy</span>
                  </button>
                </div>
                <div className="p-6">
                  <pre className="text-gray-300 text-sm">
                    <code>export CHAINEDCHAT_API_KEY="your-api-key-here"</code>
                  </pre>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-3xl font-bold text-white mb-6">
                Call the API
              </h2>

              <div className="bg-gray-950 border border-gray-700 rounded-xl overflow-hidden shadow-2xl">
                <div className="flex items-center justify-between px-6 py-4 bg-gray-800 border-b border-gray-700">
                  <span className="text-gray-300 text-sm font-medium">
                    Python Example
                  </span>
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
                    className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors px-3 py-1 rounded-md hover:bg-gray-700"
                  >
                    {copiedCode === "python-example" ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                    <span className="text-xs">Copy</span>
                  </button>
                </div>
                <div className="p-6">
                  <pre className="text-gray-300 text-sm leading-relaxed">
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

            <div>
              <h3 className="text-2xl font-bold text-white mb-4">
                Response Format
              </h3>
              <p className="text-gray-400 text-lg leading-relaxed">
                The API will return a structured response with the results from
                each agent in your chain.
              </p>
            </div>
          </div>
        );

      case "authentication":
        return (
          <div className="space-y-12">
            <div>
              <h1 className="text-4xl font-bold text-white mb-6">
                Authentication
              </h1>
              <p className="text-xl text-gray-400 leading-relaxed">
                Learn how to authenticate your requests to the ChainedChat API.
              </p>
            </div>

            <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-xl p-8">
              <div className="flex items-start space-x-4">
                <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-black text-sm font-bold">!</span>
                </div>
                <div>
                  <h3 className="text-yellow-400 font-semibold mb-3 text-lg">
                    Security Note
                  </h3>
                  <p className="text-yellow-200 leading-relaxed">
                    Keep your API keys secure and never commit them to version
                    control. Use environment variables or secure key management
                    services.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-3xl font-bold text-white mb-6">
                API Key Setup
              </h2>
              <p className="text-gray-400 mb-6 text-lg leading-relaxed">
                All API requests must be authenticated using your API key.
                Include it in the Authorization header:
              </p>

              <div className="bg-gray-950 border border-gray-700 rounded-xl overflow-hidden shadow-2xl">
                <div className="flex items-center justify-between px-6 py-4 bg-gray-800 border-b border-gray-700">
                  <span className="text-gray-300 text-sm font-medium">
                    cURL
                  </span>
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
                    className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors px-3 py-1 rounded-md hover:bg-gray-700"
                  >
                    {copiedCode === "auth-curl" ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                    <span className="text-xs">Copy</span>
                  </button>
                </div>
                <div className="p-6">
                  <pre className="text-gray-300 text-sm leading-relaxed">
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

            <div>
              <h3 className="text-2xl font-bold text-white mb-4">
                Rate Limiting
              </h3>
              <p className="text-gray-400 text-lg leading-relaxed">
                API requests are subject to rate limiting. Check the response
                headers for rate limit information.
              </p>
            </div>
          </div>
        );

      default:
        return (
          <div className="space-y-12">
            <div>
              <h1 className="text-4xl font-bold text-white mb-6">
                Coming Soon
              </h1>
              <p className="text-xl text-gray-400 leading-relaxed">
                This section is currently under development. Check back soon for
                detailed documentation.
              </p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="h-screen bg-black text-white flex overflow-hidden">
      {/* Mobile Overlay */}
      {isMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      {/* Sidebar - Full Height */}
      <aside
        className={`w-80 bg-gray-950/90 backdrop-blur-xl border-r border-gray-700 flex flex-col fixed lg:relative inset-y-0 left-0 z-50 h-screen transform ${
          isMenuOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 transition-transform duration-300 ease-in-out`}
      >
        {/* Sidebar Header with ChainedChat Logo */}
        <div className="flex-shrink-0 p-6 border-b border-gray-700 bg-gray-950/90">
          <div className="flex items-center justify-between mb-6">
            <Link href="/" className="flex items-center">
              <h1 className="text-lg font-semibold text-lavender-400 flex items-center hover:text-white transition-colors duration-200 group">
                <span className="mr-2 text-lavender-400">
                  <ArrowLeft
                    size={20}
                    className="group-hover:-translate-x-0.5 transition-transform duration-200 ease-out"
                  />
                </span>
                Ch<span className="text-lavender-400">ai</span>ned
                <span className="text-white">Chat</span>
              </h1>
            </Link>

            <button
              onClick={() => setIsMenuOpen(false)}
              className="lg:hidden p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center justify-between mb-4">
            <div className="text-xs text-gray-400 bg-gray-800/50 px-3 py-1.5 rounded-full border border-gray-700/50 font-medium">
              DEV ONLY
            </div>
          </div>

          {/* Mobile Search */}
          <div className="md:hidden relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search docs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg pl-10 pr-4 py-3 text-sm text-white placeholder-gray-400 focus:outline-none focus:border-lavender-500 focus:bg-gray-800 transition-all"
            />
          </div>
        </div>

        {/* Navigation - Scrollable */}
        <div className="flex-1 overflow-y-auto bg-gray-950/90 scroll-smooth">
          <div className="p-6">
            <nav className="space-y-8">
              {sidebarItems.map((section) => (
                <div key={section.title}>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
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
                            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm transition-all duration-200 group ${
                              activeSection === item.id
                                ? "bg-lavender-500/15 text-lavender-300 border border-lavender-500/30"
                                : "text-gray-300 hover:text-white hover:bg-gray-800/70"
                            }`}
                          >
                            <Icon
                              className={`w-4 h-4 flex-shrink-0 ${
                                activeSection === item.id
                                  ? "text-lavender-400"
                                  : "text-gray-400 group-hover:text-gray-300"
                              }`}
                            />
                            <span className="font-medium">{item.title}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </nav>
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="flex-shrink-0 p-6 border-t border-gray-700 bg-gray-950/90">
          <div className="text-xs text-gray-400">
            <p className="mb-3 font-medium text-gray-300">API Reference v1.0</p>
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
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header - Simplified without ChainedChat logo */}
        <header className="flex-shrink-0 h-16 bg-gray-950/95 backdrop-blur-xl border-b border-gray-700/50 z-40">
          <div className="h-full px-4 lg:px-6 flex items-center justify-between">
            {/* Left: Mobile Menu (only on mobile) */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="lg:hidden p-2 text-gray-400 hover:text-white transition-colors rounded-md hover:bg-gray-800"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Center: Breadcrumbs */}
            <div className="flex items-center space-x-2 text-sm text-gray-400">
              <span>Documentation</span>
              <ChevronRight className="w-4 h-4" />
              <span className="text-white capitalize">
                {activeSection.replace("-", " ")}
              </span>
            </div>

            {/* Right: Search and Links */}
            <div className="flex items-center space-x-4">
              <div className="hidden md:block relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search docs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-64 bg-gray-800/50 border border-gray-600/50 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:border-lavender-500 focus:bg-gray-800 transition-all"
                />
              </div>

              <Link
                href="https://github.com/chainedchat/api"
                className="hidden lg:flex items-center space-x-2 text-gray-400 hover:text-white transition-colors text-sm px-3 py-2 rounded-md hover:bg-gray-800"
              >
                <ExternalLink className="w-4 h-4" />
                <span>GitHub</span>
              </Link>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Main Content - Scrollable */}
          <main
            ref={mainContentRef}
            className="flex-1 overflow-y-auto scroll-smooth"
          >
            <div className="max-w-4xl mx-auto px-6 lg:px-12 py-8 lg:py-16">
              <div ref={contentRef} className="prose prose-invert max-w-none">
                {renderContent()}
              </div>
            </div>
          </main>

          {/* Table of Contents - Scrollable (Desktop Only) */}
          <aside className="hidden xl:flex w-64 border-l border-gray-700 bg-gray-950/90 backdrop-blur-xl flex-col">
            <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
              <div className="sticky top-0">
                <h4 className="text-sm font-semibold text-white mb-6 flex items-center">
                  <Hash className="w-4 h-4 mr-2 text-lavender-400" />
                  On This Page
                </h4>
                <nav className="space-y-1">
                  {tocItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => scrollToSection(item.id)}
                      className={`block w-full text-left text-sm py-2.5 px-3 rounded-lg transition-all duration-200 group ${
                        activeTocItem === item.id
                          ? "text-lavender-300 bg-lavender-500/15 border-l-2 border-lavender-400"
                          : "text-gray-400 hover:text-white hover:bg-gray-800/50"
                      } ${item.level === 3 ? "ml-4 text-xs py-2" : ""}`}
                    >
                      <div className="flex items-center space-x-2">
                        {item.level === 2 && (
                          <Hash
                            className={`w-3 h-3 opacity-50 flex-shrink-0 ${
                              activeTocItem === item.id
                                ? "text-lavender-400"
                                : "text-gray-500 group-hover:text-gray-400"
                            }`}
                          />
                        )}
                        <span className="truncate font-medium">
                          {item.title}
                        </span>
                      </div>
                    </button>
                  ))}
                </nav>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
