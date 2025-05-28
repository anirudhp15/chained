"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  ArrowRight,
  Zap,
  Users,
  Brain,
  Play,
  Star,
  GitBranch,
  Layers,
  Link2,
  Menu,
  X,
  ChevronRight,
  Sparkles,
  Code,
  Database,
  Workflow,
  Eye,
  GitCommit,
  GitMerge,
  GitFork,
  GitPullRequest,
  Network,
  Settings,
  Cpu,
  Shuffle,
  Timer,
  CheckCircle,
} from "lucide-react";

// Feature data structure matching welcome screen pattern
interface FeatureDetail {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  gradient: string;
  delay: string;
  videoPlaceholder: string;
  detailedDescription: string;
  useCases: Array<{
    icon: React.ComponentType<any>;
    title: string;
    description: string;
  }>;
  benefits: Array<{
    icon: React.ComponentType<any>;
    title: string;
    description: string;
  }>;
}

const FEATURE_DETAILS: FeatureDetail[] = [
  {
    id: "sequential-chains",
    title: "Sequential Chains",
    description:
      "Connect models in sequence, passing outputs from one to the next for comprehensive processing.",
    icon: GitCommit,
    gradient: "from-lavender-500 to-purple-500",
    delay: "delay-200",
    videoPlaceholder: "Sequential Chain Demo",
    detailedDescription:
      "Build powerful workflows by connecting AI models in sequence, where each model processes and refines the output from the previous one. Perfect for complex tasks requiring multiple stages of analysis, refinement, and formatting.",
    useCases: [
      {
        icon: Code,
        title: "Code Generation",
        description: "Design → Implement → Test → Document in sequence",
      },
      {
        icon: Brain,
        title: "Research Analysis",
        description: "Gather data → Analyze → Summarize → Format report",
      },
      {
        icon: Settings,
        title: "Content Creation",
        description: "Brainstorm → Write → Edit → Optimize for SEO",
      },
    ],
    benefits: [
      {
        icon: CheckCircle,
        title: "Higher Quality",
        description:
          "Each model specializes in one task, improving overall output quality",
      },
      {
        icon: Timer,
        title: "Efficient Processing",
        description:
          "Automated workflow reduces manual intervention between steps",
      },
      {
        icon: Network,
        title: "Scalable Complexity",
        description: "Add or remove nodes easily to adjust workflow complexity",
      },
    ],
  },
  {
    id: "conditional-logic",
    title: "Conditional Logic",
    description:
      "Create dynamic workflows that branch based on previous model outputs and conditions.",
    icon: GitBranch,
    gradient: "from-blue-500 to-cyan-500",
    delay: "delay-400",
    videoPlaceholder: "Conditional Branching Demo",
    detailedDescription:
      "Create intelligent workflows that adapt based on previous outputs. Set conditions that determine which path your data takes, enabling smart decision-making and personalized processing flows.",
    useCases: [
      {
        icon: Brain,
        title: "Smart Routing",
        description:
          "Route content to different specialists based on topic detection",
      },
      {
        icon: Settings,
        title: "Quality Control",
        description:
          "Branch to review/approval only when confidence is below threshold",
      },
      {
        icon: Cpu,
        title: "Resource Optimization",
        description:
          "Use faster models for simple tasks, complex models for hard ones",
      },
    ],
    benefits: [
      {
        icon: Zap,
        title: "Intelligent Automation",
        description:
          "Workflows make smart decisions without human intervention",
      },
      {
        icon: Timer,
        title: "Cost Efficiency",
        description: "Only use expensive models when actually needed",
      },
      {
        icon: Network,
        title: "Adaptive Processing",
        description:
          "Different inputs get optimal processing paths automatically",
      },
    ],
  },
  {
    id: "parallel-processing",
    title: "Parallel Processing",
    description:
      "Run multiple models simultaneously and combine their outputs for enhanced results.",
    icon: GitFork,
    gradient: "from-purple-500 to-pink-500",
    delay: "delay-600",
    videoPlaceholder: "Parallel Processing Demo",
    detailedDescription:
      "Execute multiple AI models simultaneously to process the same input from different angles, then intelligently combine their outputs for comprehensive results that leverage the strengths of each model.",
    useCases: [
      {
        icon: Brain,
        title: "Multi-Perspective Analysis",
        description:
          "Analyze content from technical, creative, and business angles simultaneously",
      },
      {
        icon: Code,
        title: "Cross-Validation",
        description:
          "Generate solutions with multiple models and compare for accuracy",
      },
      {
        icon: Shuffle,
        title: "Ensemble Results",
        description:
          "Combine outputs from specialized models for superior performance",
      },
    ],
    benefits: [
      {
        icon: Timer,
        title: "Faster Processing",
        description:
          "Multiple models work simultaneously instead of sequentially",
      },
      {
        icon: CheckCircle,
        title: "Higher Accuracy",
        description: "Combine strengths of different models for better results",
      },
      {
        icon: Network,
        title: "Redundancy",
        description: "If one model fails, others continue processing",
      },
    ],
  },
  {
    id: "model-diversity",
    title: "Model Diversity",
    description:
      "Access GPT-4, Claude, Gemini, and more foundation models in a single workflow.",
    icon: GitMerge,
    gradient: "from-green-500 to-teal-500",
    delay: "delay-800",
    videoPlaceholder: "Model Integration Demo",
    detailedDescription:
      "Integrate the best AI models from different providers in one workflow. Each model brings unique strengths - combine them strategically to create workflows that outperform any single model.",
    useCases: [
      {
        icon: Code,
        title: "Best-in-Class Selection",
        description:
          "Use GPT-4 for reasoning, Claude for writing, Gemini for analysis",
      },
      {
        icon: Brain,
        title: "Specialized Tasks",
        description:
          "Route specific task types to the models that excel at them",
      },
      {
        icon: Database,
        title: "Cross-Validation",
        description:
          "Compare outputs across models to ensure accuracy and completeness",
      },
    ],
    benefits: [
      {
        icon: Zap,
        title: "Peak Performance",
        description:
          "Get the best possible results by using optimal models for each task",
      },
      {
        icon: Network,
        title: "Vendor Independence",
        description: "Avoid lock-in by distributing workload across providers",
      },
      {
        icon: Settings,
        title: "Flexible Fallbacks",
        description: "Switch models if one is unavailable or underperforming",
      },
    ],
  },
  {
    id: "custom-agents",
    title: "Custom Agents",
    description:
      "Create specialized agents with specific roles and expertise for different tasks.",
    icon: GitPullRequest,
    gradient: "from-orange-500 to-red-500",
    delay: "delay-1000",
    videoPlaceholder: "Custom Agents Demo",
    detailedDescription:
      "Design custom AI agents with specific personalities, expertise areas, and behavioral patterns. Each agent can be fine-tuned for particular domains, ensuring consistent, specialized performance across your workflows.",
    useCases: [
      {
        icon: Code,
        title: "Role-Based Specialists",
        description:
          "Create agents for specific roles: analyst, writer, reviewer, optimizer",
      },
      {
        icon: Brain,
        title: "Domain Expertise",
        description:
          "Build agents specialized in finance, healthcare, legal, or technical domains",
      },
      {
        icon: Users,
        title: "Team Simulation",
        description:
          "Simulate entire teams with different perspectives and skill sets",
      },
    ],
    benefits: [
      {
        icon: CheckCircle,
        title: "Consistent Quality",
        description:
          "Agents maintain consistent behavior and expertise across sessions",
      },
      {
        icon: Settings,
        title: "Customizable Behavior",
        description: "Fine-tune agent personalities and response styles",
      },
      {
        icon: Network,
        title: "Collaborative Intelligence",
        description:
          "Agents can work together, building on each other's strengths",
      },
    ],
  },
  {
    id: "template-library",
    title: "Template Library",
    description:
      "Start with pre-built templates for common use cases and customize to your needs.",
    icon: Database,
    gradient: "from-indigo-500 to-purple-500",
    delay: "delay-1200",
    videoPlaceholder: "Template Library Demo",
    detailedDescription:
      "Jump-start your AI workflows with our curated library of proven templates. Each template is designed for specific use cases and can be easily customized to match your unique requirements and processes.",
    useCases: [
      {
        icon: Code,
        title: "Quick Start",
        description: "Deploy proven workflows for common tasks in minutes",
      },
      {
        icon: Brain,
        title: "Best Practices",
        description: "Learn from optimized workflows created by AI experts",
      },
      {
        icon: Settings,
        title: "Easy Customization",
        description: "Modify templates to match your specific requirements",
      },
    ],
    benefits: [
      {
        icon: Timer,
        title: "Faster Deployment",
        description: "Skip the trial-and-error phase with proven templates",
      },
      {
        icon: CheckCircle,
        title: "Proven Results",
        description: "Start with workflows that have been tested and optimized",
      },
      {
        icon: Network,
        title: "Community Knowledge",
        description: "Benefit from collective experience and best practices",
      },
    ],
  },
];

export default function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleFeatureInfo = (featureId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedFeature(featureId);
  };

  const handleCloseFeatureInfo = () => {
    setSelectedFeature(null);
  };

  const featureDetail = selectedFeature
    ? FEATURE_DETAILS.find((f) => f.id === selectedFeature)
    : null;

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-purple-600/10 to-lavender-600/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-tr from-lavender-500/5 to-purple-500/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-radial from-lavender-500/3 to-transparent rounded-full blur-2xl"></div>

        {/* Animated grid */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(147,112,219,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(147,112,219,0.03)_1px,transparent_1px)] bg-[size:50px_50px] animate-pulse"></div>
      </div>

      {/* Navigation */}
      <nav className="relative z-50 px-4 sm:px-6 py-4 bg-gray-950/80 backdrop-blur-xl border-b border-gray-800/50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2 group">
            <div className="relative">
              <Link2 className="h-6 w-6 text-lavender-400 group-hover:text-lavender-300 transition-colors duration-300" />
              <div className="absolute inset-0 bg-lavender-400/20 rounded-full blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </div>
            <span className="text-xl font-bold text-white group-hover:text-lavender-300 transition-colors duration-300">
              Chained
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link
              href="#features"
              className="text-gray-400 hover:text-lavender-300 transition-all duration-300 relative group"
            >
              Features
              <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-lavender-400 group-hover:w-full transition-all duration-300"></div>
            </Link>
            <Link
              href="#demo"
              className="text-gray-400 hover:text-lavender-300 transition-all duration-300 relative group"
            >
              Demo
              <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-lavender-400 group-hover:w-full transition-all duration-300"></div>
            </Link>
            <Link
              href="#workflow"
              className="text-gray-400 hover:text-lavender-300 transition-all duration-300 relative group"
            >
              Workflow
              <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-lavender-400 group-hover:w-full transition-all duration-300"></div>
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            <Link
              href="/chat"
              className="hidden sm:inline-flex items-center bg-gradient-to-r from-lavender-600 to-purple-600 hover:from-lavender-500 hover:to-purple-500 text-white px-6 py-2 rounded-lg font-medium transition-all duration-300 shadow-lg hover:shadow-lavender-500/25 group"
            >
              Start Building
              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-0.5 transition-transform duration-300" />
            </Link>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-800/50 transition-colors duration-300"
            >
              {isMenuOpen ? (
                <X className="h-5 w-5 text-gray-400" />
              ) : (
                <Menu className="h-5 w-5 text-gray-400" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden absolute top-full left-0 right-0 bg-gray-950/95 backdrop-blur-xl border-b border-gray-800/50 animate-in slide-in-from-top-2 duration-200">
            <div className="px-4 py-6 space-y-4">
              <Link
                href="#features"
                className="block text-gray-400 hover:text-lavender-300 transition-colors duration-300 py-2"
                onClick={() => setIsMenuOpen(false)}
              >
                Features
              </Link>
              <Link
                href="#demo"
                className="block text-gray-400 hover:text-lavender-300 transition-colors duration-300 py-2"
                onClick={() => setIsMenuOpen(false)}
              >
                Demo
              </Link>
              <Link
                href="#workflow"
                className="block text-gray-400 hover:text-lavender-300 transition-colors duration-300 py-2"
                onClick={() => setIsMenuOpen(false)}
              >
                Workflow
              </Link>
              <Link
                href="/chat"
                className="inline-flex items-center bg-gradient-to-r from-lavender-600 to-purple-600 hover:from-lavender-500 hover:to-purple-500 text-white px-6 py-2 rounded-lg font-medium transition-all duration-300 mt-4"
                onClick={() => setIsMenuOpen(false)}
              >
                Start Building
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 px-4 sm:px-6 py-16 sm:py-24">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-4xl mx-auto">
            {/* Hero Badge */}
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-gray-900/50 border border-gray-700/50 text-sm text-gray-300 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <Sparkles className="h-4 w-4 text-lavender-400 mr-2" />
              <span>Chain AI Models Together</span>
              <div className="ml-2 w-2 h-2 bg-lavender-400 rounded-full animate-pulse"></div>
            </div>

            {/* Hero Title */}
            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold text-white mb-8 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
              Build Powerful
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-lavender-400 via-purple-400 to-lavender-500 relative">
                AI Workflows
                <div className="absolute inset-0 bg-gradient-to-r from-lavender-400/20 via-purple-400/20 to-lavender-500/20 blur-2xl"></div>
              </span>
            </h1>

            {/* Hero Subtitle */}
            <p className="text-lg sm:text-xl text-gray-400 mb-12 max-w-3xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-700 delay-400">
              Chain multiple AI models together to create sophisticated
              workflows. Connect GPT-4, Claude, Gemini, and more in powerful
              sequences.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-600">
              <Link
                href="/chat"
                className="group inline-flex items-center justify-center bg-gradient-to-r from-lavender-600 to-purple-600 hover:from-lavender-500 hover:to-purple-500 text-white px-8 py-4 rounded-xl text-lg font-medium transition-all duration-300 shadow-2xl hover:shadow-lavender-500/25 relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                <Zap className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform duration-300" />
                Start Building Free
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" />
              </Link>

              <button className="group inline-flex items-center justify-center bg-gray-900/50 hover:bg-gray-800/50 text-white px-8 py-4 rounded-xl text-lg font-medium transition-all duration-300 border border-gray-700/50 hover:border-lavender-500/50">
                <Play className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform duration-300" />
                Watch Demo
              </button>
            </div>

            {/* Chain Visualization */}
            <div className="relative max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700 delay-800">
              <div className="bg-gray-900/30 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-6 sm:p-8 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-lavender-500/5 to-purple-500/5"></div>

                <div className="relative flex flex-col items-center space-y-6">
                  {/* Input Node */}
                  <div className="group">
                    <div className="bg-gray-800/50 border border-lavender-500/50 rounded-full px-6 py-3 text-lavender-300 font-medium shadow-lg shadow-lavender-500/10 group-hover:shadow-lavender-500/20 transition-all duration-300">
                      User Input
                    </div>
                  </div>

                  {/* Connecting Arrow */}
                  <div className="flex items-center">
                    <div className="w-px h-8 bg-gradient-to-b from-lavender-500 to-purple-500 animate-pulse"></div>
                  </div>

                  {/* Model Nodes */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
                    <div className="group animate-in fade-in slide-in-from-left-4 duration-700 delay-1000">
                      <div className="bg-gray-800/50 border border-gray-600/50 rounded-xl p-4 text-center hover:border-lavender-500/50 transition-all duration-300 hover:bg-gray-800/70">
                        <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-green-600 rounded-full mx-auto mb-2 flex items-center justify-center text-white font-bold text-sm">
                          G
                        </div>
                        <h4 className="text-white font-medium text-sm">
                          GPT-4
                        </h4>
                        <p className="text-gray-400 text-xs">Analysis</p>
                      </div>
                    </div>

                    <div className="group animate-in fade-in slide-in-from-bottom-4 duration-700 delay-1200">
                      <div className="bg-gray-800/50 border border-gray-600/50 rounded-xl p-4 text-center hover:border-lavender-500/50 transition-all duration-300 hover:bg-gray-800/70">
                        <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full mx-auto mb-2 flex items-center justify-center text-white font-bold text-sm">
                          C
                        </div>
                        <h4 className="text-white font-medium text-sm">
                          Claude
                        </h4>
                        <p className="text-gray-400 text-xs">Refine</p>
                      </div>
                    </div>

                    <div className="group animate-in fade-in slide-in-from-right-4 duration-700 delay-1400">
                      <div className="bg-gray-800/50 border border-gray-600/50 rounded-xl p-4 text-center hover:border-lavender-500/50 transition-all duration-300 hover:bg-gray-800/70">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full mx-auto mb-2 flex items-center justify-center text-white font-bold text-sm">
                          G
                        </div>
                        <h4 className="text-white font-medium text-sm">
                          Gemini
                        </h4>
                        <p className="text-gray-400 text-xs">Format</p>
                      </div>
                    </div>
                  </div>

                  {/* Connecting Arrow */}
                  <div className="flex items-center">
                    <div className="w-px h-8 bg-gradient-to-b from-purple-500 to-lavender-500 animate-pulse"></div>
                  </div>

                  {/* Output Node */}
                  <div className="group">
                    <div className="bg-gray-800/50 border border-lavender-500/50 rounded-full px-6 py-3 text-lavender-300 font-medium shadow-lg shadow-lavender-500/10 group-hover:shadow-lavender-500/20 transition-all duration-300">
                      Final Output
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Features Section */}
      <section
        id="features"
        className="relative z-10 px-4 sm:px-6 py-20 sm:py-32"
      >
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
              Powerful Features
            </h2>
            <p className="text-lg sm:text-xl text-gray-400 max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
              Everything you need to easily build sophisticated AI workflows
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {FEATURE_DETAILS.map((feature, index) => (
              <div
                key={feature.id}
                className={`group relative bg-gray-900/30 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-6 lg:p-8 hover:border-lavender-500/50 transition-all duration-500 hover:bg-gray-900/50 cursor-pointer overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-700 ${feature.delay}`}
              >
                {/* Enhanced Background Glow Effect */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-lavender-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div
                  className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-[0.03] transition-opacity duration-500`}
                />

                {/* Animated border glow */}
                <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  <div
                    className={`absolute inset-0 rounded-2xl bg-gradient-to-r ${feature.gradient} opacity-20 blur-sm animate-pulse`}
                  />
                </div>

                {/* Eye Button */}
                <button
                  onClick={(e) => handleFeatureInfo(feature.id, e)}
                  className="absolute top-4 right-4 p-2 bg-gray-800/70 hover:bg-gray-700/70 border border-gray-600/50 hover:border-lavender-400/50 rounded-lg text-gray-400 hover:text-lavender-300 transition-all duration-200 z-10 opacity-0 group-hover:opacity-100 hover:scale-110"
                >
                  <Eye size={16} />
                </button>

                {/* Content */}
                <div className="relative space-y-4">
                  {/* Icon Container with Enhanced Glow */}
                  <div className="relative">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center mb-6 bg-gradient-to-r ${feature.gradient} bg-opacity-20 group-hover:scale-110 transition-all duration-300 relative overflow-hidden`}
                    >
                      {/* Icon glow effect */}
                      <div
                        className={`absolute inset-0 bg-gradient-to-r ${feature.gradient} opacity-20 blur-lg group-hover:opacity-40 transition-opacity duration-300`}
                      />
                      <feature.icon
                        className={`h-6 w-6 text-white relative z-10 group-hover:scale-110 transition-transform duration-300`}
                      />
                    </div>
                  </div>

                  <h3 className="text-xl font-semibold text-white mb-4 group-hover:text-lavender-300 transition-colors duration-300">
                    {feature.title}
                  </h3>
                  <p className="text-gray-400 leading-relaxed group-hover:text-gray-300 transition-colors duration-300">
                    {feature.description}
                  </p>
                </div>

                {/* Subtle shimmer effect on hover */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Detail Modal */}
      {selectedFeature &&
        featureDetail &&
        typeof window !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-gray-900/95 border border-gray-700/50 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto backdrop-blur-xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 ease-out">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-700/50">
                <div className="flex items-center gap-3">
                  <div
                    className={`inline-flex p-3 rounded-xl bg-gradient-to-r ${featureDetail.gradient} bg-opacity-20 relative`}
                  >
                    <div
                      className={`absolute inset-0 bg-gradient-to-r ${featureDetail.gradient} opacity-20 blur-lg`}
                    />
                    <featureDetail.icon
                      size={24}
                      className="text-white relative z-10"
                    />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white">
                      {featureDetail.title}
                    </h3>
                    <p className="text-sm text-gray-400">
                      Advanced AI Workflow Feature
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleCloseFeatureInfo}
                  className="p-2 hover:bg-gray-800/50 rounded-lg text-gray-400 hover:text-white transition-all duration-200 hover:scale-110"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-8">
                {/* Video Placeholder */}
                <div
                  className="animate-in fade-in slide-in-from-top-2 duration-400 ease-out"
                  style={{ animationDelay: "0.1s", animationFillMode: "both" }}
                >
                  <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl overflow-hidden relative group">
                    <div className="aspect-video flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800 relative overflow-hidden">
                      <div
                        className={`absolute inset-0 bg-gradient-to-br ${featureDetail.gradient} opacity-5`}
                      ></div>
                      <div className="text-center z-10">
                        <div className="bg-lavender-600/20 rounded-full p-6 mb-4 mx-auto w-20 h-20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 border border-lavender-500/30">
                          <Play className="h-8 w-8 text-lavender-400 ml-1" />
                        </div>
                        <h3 className="text-xl font-semibold text-white mb-2">
                          {featureDetail.videoPlaceholder}
                        </h3>
                        <p className="text-gray-400">
                          See this feature in action
                        </p>
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-lavender-500/5 to-transparent -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div
                  className="animate-in fade-in slide-in-from-top-2 duration-400 ease-out"
                  style={{ animationDelay: "0.2s", animationFillMode: "both" }}
                >
                  <h4 className="text-lg font-semibold text-lavender-400 mb-3">
                    Overview
                  </h4>
                  <p className="text-gray-300 leading-relaxed text-lg">
                    {featureDetail.detailedDescription}
                  </p>
                </div>

                {/* Use Cases */}
                <div
                  className="animate-in fade-in slide-in-from-top-2 duration-400 ease-out"
                  style={{ animationDelay: "0.3s", animationFillMode: "both" }}
                >
                  <h4 className="text-lg font-semibold text-lavender-400 mb-4">
                    Common Use Cases
                  </h4>
                  <div className="grid md:grid-cols-3 gap-4">
                    {featureDetail.useCases.map((useCase, index) => (
                      <div
                        key={index}
                        className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4 animate-in fade-in slide-in-from-left-4 duration-400 ease-out"
                        style={{
                          animationDelay: `${0.4 + index * 0.05}s`,
                          animationFillMode: "both",
                        }}
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-8 h-8 bg-lavender-500/20 rounded-lg flex items-center justify-center">
                            <useCase.icon
                              size={16}
                              className="text-lavender-400"
                            />
                          </div>
                          <h5 className="text-white font-medium text-sm">
                            {useCase.title}
                          </h5>
                        </div>
                        <p className="text-gray-400 text-sm leading-relaxed">
                          {useCase.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Benefits */}
                <div
                  className="animate-in fade-in slide-in-from-top-2 duration-400 ease-out"
                  style={{ animationDelay: "0.5s", animationFillMode: "both" }}
                >
                  <h4 className="text-lg font-semibold text-lavender-400 mb-4">
                    Key Benefits
                  </h4>
                  <div className="grid md:grid-cols-3 gap-4">
                    {featureDetail.benefits.map((benefit, index) => (
                      <div
                        key={index}
                        className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4 animate-in fade-in slide-in-from-right-4 duration-400 ease-out"
                        style={{
                          animationDelay: `${0.6 + index * 0.05}s`,
                          animationFillMode: "both",
                        }}
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                            <benefit.icon
                              size={16}
                              className="text-green-400"
                            />
                          </div>
                          <h5 className="text-white font-medium text-sm">
                            {benefit.title}
                          </h5>
                        </div>
                        <p className="text-gray-400 text-sm leading-relaxed">
                          {benefit.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Button */}
                <div
                  className="flex justify-end pt-4 border-t border-gray-700/50 animate-in fade-in slide-in-from-bottom-2 duration-400 ease-out"
                  style={{ animationDelay: "0.7s", animationFillMode: "both" }}
                >
                  <Link
                    href="/chat"
                    onClick={handleCloseFeatureInfo}
                    className="flex items-center gap-2 text-sm px-6 py-3 bg-lavender-500 hover:bg-lavender-600 text-white rounded-lg font-bold transition-all duration-200 shadow-lg hover:shadow-lavender-500/25 hover:scale-105"
                  >
                    <Zap size={16} />
                    Try This Feature
                  </Link>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Demo Section */}
      <section id="demo" className="relative z-10 px-4 sm:px-6 py-20 sm:py-32">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="animate-in fade-in slide-in-from-left-8 duration-700">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
                See It In Action
              </h2>
              <p className="text-lg sm:text-xl text-gray-400 mb-8">
                Watch how easy it is to create powerful AI workflows with our
                intuitive interface.
              </p>

              <div className="space-y-6">
                {[
                  {
                    icon: Code,
                    title: "Visual Chain Builder",
                    description:
                      "Drag and drop interface to build complex workflows",
                  },
                  {
                    icon: Database,
                    title: "Real-time Processing",
                    description:
                      "See your chains execute in real-time with live updates",
                  },
                  {
                    icon: Sparkles,
                    title: "Smart Optimization",
                    description:
                      "Automatic optimization for better performance and cost",
                  },
                ].map((item, index) => (
                  <div key={index} className="flex items-start space-x-4">
                    <div className="bg-lavender-600/20 w-10 h-10 rounded-lg flex items-center justify-center mt-1 flex-shrink-0">
                      <item.icon className="h-5 w-5 text-lavender-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-2">
                        {item.title}
                      </h3>
                      <p className="text-gray-400">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Demo Video Placeholder */}
            <div className="relative animate-in fade-in slide-in-from-right-8 duration-700 delay-300">
              <div className="bg-gray-900/50 backdrop-blur-xl border border-gray-700/50 rounded-2xl overflow-hidden relative group">
                <div className="aspect-video flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-lavender-500/5 to-purple-500/5"></div>
                  <div className="text-center z-10">
                    <div className="bg-lavender-600/20 rounded-full p-6 mb-4 mx-auto w-20 h-20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 border border-lavender-500/30">
                      <Play className="h-8 w-8 text-lavender-400 ml-1" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">
                      Interactive Demo
                    </h3>
                    <p className="text-gray-400">See AI chains in action</p>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-lavender-500/5 to-transparent -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Workflow Section */}
      <section
        id="workflow"
        className="relative z-10 px-4 sm:px-6 py-20 sm:py-32"
      >
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
            Choose Your Models
          </h2>
          <p className="text-lg sm:text-xl text-gray-400 mb-16 max-w-3xl mx-auto">
            Mix and match from the best AI models to create your perfect
            workflow
          </p>

          <div className="bg-gray-900/30 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-6 sm:p-8 max-w-5xl mx-auto relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-lavender-500/3 to-purple-500/3"></div>

            <div className="relative">
              <div className="mb-8">
                <h3 className="text-2xl font-semibold text-white mb-4">
                  Available Models
                </h3>
                <p className="text-gray-400">
                  Select and chain together powerful AI models
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
                {[
                  {
                    name: "GPT-4",
                    provider: "OpenAI",
                    color: "from-green-400 to-green-600",
                    letter: "G",
                  },
                  {
                    name: "Claude",
                    provider: "Anthropic",
                    color: "from-orange-400 to-orange-600",
                    letter: "C",
                  },
                  {
                    name: "Gemini",
                    provider: "Google",
                    color: "from-blue-400 to-blue-600",
                    letter: "G",
                  },
                  {
                    name: "Llama",
                    provider: "Meta",
                    color: "from-purple-400 to-purple-600",
                    letter: "L",
                  },
                  {
                    name: "Mistral",
                    provider: "Mistral AI",
                    color: "from-pink-400 to-pink-600",
                    letter: "M",
                  },
                ].map((model, index) => (
                  <div
                    key={index}
                    className={`group bg-gray-800/50 border border-gray-600/50 rounded-xl p-4 text-center hover:border-lavender-500/50 transition-all duration-300 hover:bg-gray-800/70 cursor-pointer animate-in fade-in slide-in-from-bottom-4 duration-700`}
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div
                      className={`w-10 h-10 bg-gradient-to-br ${model.color} rounded-full mx-auto mb-3 flex items-center justify-center text-white font-bold text-sm group-hover:scale-110 transition-transform duration-300`}
                    >
                      {model.letter}
                    </div>
                    <h4 className="text-white font-medium text-sm mb-1">
                      {model.name}
                    </h4>
                    <p className="text-gray-400 text-xs">{model.provider}</p>
                  </div>
                ))}
              </div>

              <div className="bg-gray-800/30 rounded-xl p-6 mb-6 border border-gray-700/30">
                <div className="flex items-center space-x-2 text-sm text-gray-400 mb-3">
                  <ChevronRight className="h-4 w-4 text-lavender-400" />
                  <span>Chain Preview</span>
                </div>
                <p className="text-gray-300 text-left">
                  Connect models in sequence to process inputs step by step,
                  with each model building on the previous output.
                </p>
              </div>

              <Link
                href="/chat"
                className="inline-flex items-center bg-gradient-to-r from-lavender-600 to-purple-600 hover:from-lavender-500 hover:to-purple-500 text-white px-8 py-3 rounded-xl font-medium transition-all duration-300 shadow-lg hover:shadow-lavender-500/25 group"
              >
                <Zap className="mr-2 h-5 w-5" />
                Create Your Chain
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-0.5 transition-transform duration-300" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="relative z-10 px-4 sm:px-6 py-20 sm:py-32">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-br from-gray-900/50 to-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-3xl p-8 sm:p-12 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-lavender-500/10 to-purple-500/10"></div>

            <div className="relative">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
                Ready to Build Your First Chain?
              </h2>
              <p className="text-xl text-gray-400 mb-8">
                Start creating powerful AI workflows in minutes. No setup
                required.
              </p>
              <Link
                href="/chat"
                className="group inline-flex items-center bg-gradient-to-r from-lavender-600 to-purple-600 hover:from-lavender-500 hover:to-purple-500 text-white px-8 py-4 rounded-xl text-lg font-medium transition-all duration-300 shadow-2xl hover:shadow-lavender-500/25 relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                <Sparkles className="mr-2 h-5 w-5" />
                Get Started Free
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 px-4 sm:px-6 py-12 border-t border-gray-800/50">
        <div className="max-w-7xl mx-auto">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-2">
              <div className="flex items-center space-x-2 mb-4">
                <Link2 className="h-6 w-6 text-lavender-400" />
                <span className="text-xl font-bold text-white">Chained</span>
              </div>
              <p className="text-gray-400 mb-6 max-w-md">
                Create powerful AI workflows by chaining multiple models
                together for enhanced results.
              </p>
              <div className="flex space-x-4">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="w-10 h-10 bg-gray-800/50 hover:bg-gray-700/50 rounded-full transition-colors duration-300 cursor-pointer"
                  ></div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-white font-semibold mb-4">Product</h3>
              <ul className="space-y-3 text-gray-400">
                <li>
                  <Link
                    href="#features"
                    className="hover:text-lavender-300 transition-colors duration-300"
                  >
                    Features
                  </Link>
                </li>
                <li>
                  <Link
                    href="#demo"
                    className="hover:text-lavender-300 transition-colors duration-300"
                  >
                    Demo
                  </Link>
                </li>
                <li>
                  <Link
                    href="#workflow"
                    className="hover:text-lavender-300 transition-colors duration-300"
                  >
                    Workflow
                  </Link>
                </li>
                <li>
                  <Link
                    href="/chat"
                    className="hover:text-lavender-300 transition-colors duration-300"
                  >
                    Get Started
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-white font-semibold mb-4">Company</h3>
              <ul className="space-y-3 text-gray-400">
                <li>
                  <Link
                    href="#about"
                    className="hover:text-lavender-300 transition-colors duration-300"
                  >
                    About
                  </Link>
                </li>
                <li>
                  <Link
                    href="#contact"
                    className="hover:text-lavender-300 transition-colors duration-300"
                  >
                    Contact
                  </Link>
                </li>
                <li>
                  <Link
                    href="#privacy"
                    className="hover:text-lavender-300 transition-colors duration-300"
                  >
                    Privacy
                  </Link>
                </li>
                <li>
                  <Link
                    href="#terms"
                    className="hover:text-lavender-300 transition-colors duration-300"
                  >
                    Terms
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800/50 mt-12 pt-8 flex flex-col sm:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">
              © 2025 Chained. All rights reserved.
            </p>
            <div className="flex space-x-6 mt-4 sm:mt-0">
              <Link
                href="#privacy"
                className="text-gray-400 text-sm hover:text-lavender-300 transition-colors duration-300"
              >
                Privacy Policy
              </Link>
              <Link
                href="#terms"
                className="text-gray-400 text-sm hover:text-lavender-300 transition-colors duration-300"
              >
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
