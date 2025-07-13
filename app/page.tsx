"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
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
  Linkedin,
  Instagram,
  Unlink,
} from "lucide-react";
import { AccessGate } from "@/components/auth/access-gate";
import { hasBetaAccess } from "@/lib/beta-access";
import {
  useAnalytics,
  useScrollTracking,
  useSectionTracking,
} from "@/lib/analytics";
import CardSwap, { Card } from "@/components/Components/CardSwap/CardSwap";
import RotatingText from "@/components/TextAnimations/RotatingText/RotatingText";
import ShinyText from "@/components/TextAnimations/ShinyText/ShinyText";
import Beams from "@/components/Backgrounds/Beams/Beams";
import StarBorder from "@/components/Animations/StarBorder/StarBorder";
import { FaTiktok, FaXTwitter, FaYoutube, FaThreads } from "react-icons/fa6";

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
    videoPlaceholder: "images/sequential_chains.jpg",
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
    videoPlaceholder: "images/conditional_logic.jpg",
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
    videoPlaceholder: "images/parallel_processing.jpg",
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
    videoPlaceholder: "images/model_diversity.jpg",
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
    videoPlaceholder: "images/custom_agents.jpg",
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
    videoPlaceholder: "images/template_library.jpg",
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
  const [showAccessGate, setShowAccessGate] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const router = useRouter();
  const { scrollY } = useScroll();
  const { isSignedIn, isLoaded } = useAuth();

  // Analytics hooks
  const { trackLandingPageEvent, trackPerformance, identifyUser } =
    useAnalytics();
  const { trackScrollMilestones } = useScrollTracking();

  // Transform values for scroll-based animations
  const containerMaxWidth = useTransform(scrollY, [0, 20], ["100%", "70%"]);
  const containerPadding = useTransform(scrollY, [0, 20], ["0px", "1rem"]);
  const containerMargin = useTransform(scrollY, [0, 20], ["0px", "1rem"]);
  const containerRadius = useTransform(scrollY, [0, 20], ["0px", "9999px"]);
  const navBackgroundOpacity = useTransform(scrollY, [0, 20], [0.8, 0.85]);
  const navBlur = useTransform(scrollY, [0, 20], [12, 20]);

  useEffect(() => {
    setMounted(true);

    // Check if user already has beta access using utility function
    setHasAccess(hasBetaAccess());

    // Initialize analytics tracking
    if (typeof window !== "undefined") {
      // Track page load performance
      trackPerformance();

      // Track hero section view
      trackLandingPageEvent.heroViewed();

      // Set up scroll tracking
      const cleanupScroll = trackScrollMilestones();

      // Track user journey step
      trackLandingPageEvent.userJourney("landing_page_loaded", {
        has_beta_access: hasBetaAccess(),
        user_agent: navigator.userAgent,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
      });

      return cleanupScroll;
    }
  }, [trackLandingPageEvent, trackPerformance, trackScrollMilestones]);

  // Auto-redirect authenticated users to chat
  useEffect(() => {
    if (isLoaded && isSignedIn && mounted) {
      console.log("Authenticated user detected, redirecting to /chat");
      setIsRedirecting(true);

      // Track the redirect for analytics
      trackLandingPageEvent.userJourney("authenticated_user_redirect", {
        from: "landing_page",
        to: "/chat",
        has_beta_access: hasBetaAccess(),
      });

      // Small delay to ensure smooth transition
      setTimeout(() => {
        router.push("/chat");
      }, 100);
    }
  }, [isLoaded, isSignedIn, mounted, router, trackLandingPageEvent]);

  const handleFeatureInfo = (featureId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedFeature(featureId);
  };

  const handleCloseFeatureInfo = () => {
    setSelectedFeature(null);
  };

  const handleAccessRequest = () => {
    // If user is signed in, they should have been auto-redirected already
    // This is a fallback for edge cases
    if (isSignedIn) {
      trackLandingPageEvent.heroCtaClicked("Continue Building", "navigation");
      router.push("/chat");
      return;
    }

    if (hasAccess) {
      trackLandingPageEvent.heroCtaClicked("Continue Building", "navigation");
      router.push("/chat");
    } else {
      trackLandingPageEvent.heroCtaClicked("Get Access", "navigation");
      trackLandingPageEvent.accessGateOpened("navigation_button");
      setShowAccessGate(true);
    }
  };

  const handleAccessGranted = () => {
    setHasAccess(true);
    setShowAccessGate(false);
    trackLandingPageEvent.userJourney("beta_access_granted");
    router.push("/chat");
  };

  const featureDetail = selectedFeature
    ? FEATURE_DETAILS.find((f) => f.id === selectedFeature)
    : null;

  // Show loading state while checking authentication or redirecting
  if (!mounted || !isLoaded || isRedirecting) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lavender-500 mx-auto mb-4"></div>
          <p className="text-gray-400">
            {isRedirecting ? "Redirecting to chat..." : "Loading..."}
          </p>
        </div>
      </div>
    );
  }

  // If user is signed in, they should be redirected (this is a fallback)
  if (isSignedIn) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lavender-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Redirecting to chat...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Safe Area CSS for PWA support */}
      <style jsx global>{`
        :root {
          --safe-area-inset-top: env(safe-area-inset-top, 0px);
          --safe-area-inset-bottom: env(safe-area-inset-bottom, 0px);
          --safe-area-inset-left: env(safe-area-inset-left, 0px);
          --safe-area-inset-right: env(safe-area-inset-right, 0px);
        }

        /* Ensure minimum safe area for devices without safe area support */
        @supports not (padding: max(0px)) {
          .safe-area-top {
            padding-top: 1rem;
          }
        }

        /* Prevent elastic/bounce scrolling and overscroll */
        html,
        body {
          overscroll-behavior: none;
          overscroll-behavior-y: none;
          -webkit-overflow-scrolling: auto;
          scroll-behavior: smooth;
        }

        /* Additional prevention for iOS Safari */
        body {
          position: relative;
          overflow-x: hidden;
        }

        /* Prevent pull-to-refresh on mobile */
        @media (max-width: 768px) {
          body {
            overscroll-behavior-y: contain;
            -webkit-overscroll-behavior-y: contain;
          }
        }
      `}</style>

      <div
        className="min-h-screen bg-black relative overflow-hidden"
        style={{ overscrollBehavior: "none" }}
      >
        {/* Beams Background */}
        <motion.div
          className="absolute top-0 left-0 w-full h-screen z-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{
            duration: 3,
            delay: 0.5,
            ease: "easeInOut",
          }}
        >
          <Beams
            beamWidth={2}
            beamHeight={20}
            beamNumber={20}
            lightColor="#c4b5fd"
            speed={5}
            noiseIntensity={2}
            scale={0.15}
            rotation={20}
          />
        </motion.div>

        {/* Navigation */}
        <header className="fixed lg:absolute top-0 left-0 right-0 z-50 w-full pt-[env(safe-area-inset-top)] supports-[padding:max(0px)]:pt-[max(env(safe-area-inset-top),1rem)] safe-area-top lg:pt-4">
          <motion.div className="transition-all duration-300 ease-out p-2 ">
            <div className="flex  items-center justify-between px-4 lg:max-w-7xl lg:mx-auto">
              <Link href="/" className="flex items-center space-x-2 group">
                <div className="relative group/logo hidden md:block">
                  <Link2 className="h-6 w-6 text-lavender-400 group-hover/logo:hidden transition-all duration-200 group-hover:-rotate-45 block" />
                  <Unlink className="h-6 w-6 text-lavender-400/80 group-hover/logo:text-lavender-400 transition-all duration-200 group-hover/logo:block hidden" />
                </div>
                <span className="text-xl font-semibold text-lavender-400 group-hover:text-white transition-colors duration-300">
                  Ch<span className="text-lavender-400">ai</span>nedChat
                </span>
              </Link>

              {/* Desktop Navigation */}
              <div className="hidden md:flex items-center text-sm space-x-8">
                <Link
                  href="#features"
                  className="text-gray-400 hover:text-lavender-400 transition-all duration-300 relative group"
                >
                  Features
                  <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-lavender-400 group-hover:w-full transition-all duration-300"></div>
                </Link>
                <Link
                  href="#demo"
                  className="text-gray-400 hover:text-lavender-400 transition-all duration-300 relative group"
                >
                  Demo
                  <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-lavender-400 group-hover:w-full transition-all duration-300"></div>
                </Link>
                <Link
                  href="#workflow"
                  className="text-gray-400 hover:text-lavender-400 transition-all duration-300 relative group"
                >
                  Workflow
                  <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-lavender-400 group-hover:w-full transition-all duration-300"></div>
                </Link>
              </div>

              <div className="flex items-center space-x-4">
                <motion.div
                  style={{
                    borderRadius: containerRadius,
                  }}
                  className="hidden md:block transition-all duration-300 ease-out"
                >
                  <button
                    onClick={handleAccessRequest}
                    className="inline-flex items-center bg-lavender-600/20 border border-lavender-600/50 hover:bg-lavender-600/30 text-lavender-400 px-2 py-1 text-sm font-medium transition-all duration-300 shadow-lg hover:shadow-lavender-500/25 group rounded-xl"
                  >
                    {isSignedIn || hasAccess
                      ? "Continue Building"
                      : "Get Access"}
                  </button>
                </motion.div>

                {/* Beta Access Bypass for users who already have validated codes */}
                {!hasAccess && !isSignedIn && (
                  <Link
                    href="/beta-access"
                    className="hidden md:inline-flex items-center text-gray-400 hover:text-lavender-400 px-2 py-1 text-sm font-medium transition-all duration-300 group"
                  >
                    Already Validated?
                  </Link>
                )}

                {/* Mobile Menu Button */}
                <div className="md:hidden relative">
                  <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className={`p-2 rounded-lg transition-colors duration-300 ${
                      isMenuOpen
                        ? "fixed top-[calc(1rem+env(safe-area-inset-top))] right-4 z-[110] hover:bg-black/10"
                        : "relative hover:bg-gray-800/50"
                    }`}
                  >
                    {isMenuOpen ? (
                      <Unlink className="h-5 w-5 text-white" />
                    ) : (
                      <Link2 className="h-5 w-5 -rotate-45 text-lavender-400" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </header>

        {/* Full Screen Mobile Menu Overlay */}
        {isMenuOpen && (
          <motion.div
            className="fixed inset-0 bg-lavender-400 z-[100] flex flex-col items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Close Button */}
            <button
              onClick={() => setIsMenuOpen(false)}
              className="fixed top-[calc(1rem+env(safe-area-inset-top))] right-4 z-[110] p-2 rounded-lg hover:bg-black/10 transition-colors duration-300"
            >
              <Unlink className="h-5 w-5 text-black" />
            </button>

            <div className="flex flex-col items-center space-y-12">
              <Link
                href="#features"
                className="text-black text-4xl font-bold hover:text-gray-800 transition-colors duration-200"
                onClick={() => setIsMenuOpen(false)}
              >
                Features
              </Link>
              <Link
                href="#demo"
                className="text-black text-4xl font-bold hover:text-gray-800 transition-colors duration-200"
                onClick={() => setIsMenuOpen(false)}
              >
                Demo
              </Link>
              <Link
                href="#workflow"
                className="text-black text-4xl font-bold hover:text-gray-800 transition-colors duration-200"
                onClick={() => setIsMenuOpen(false)}
              >
                Workflow
              </Link>
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  handleAccessRequest();
                }}
                className="text-black text-4xl font-bold hover:text-gray-800 transition-colors duration-200"
              >
                {hasAccess ? "Continue Building" : "Get Access"}
              </button>
              {!hasAccess && (
                <Link
                  href="/beta-access"
                  className="text-black text-2xl font-medium hover:text-gray-800 transition-colors duration-200"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Already Validated? Bypass Here
                </Link>
              )}
            </div>
          </motion.div>
        )}

        {/* Hero Section */}
        <main className="relative z-10 px-4 sm:px-6 pt-[calc(6rem+env(safe-area-inset-top))] pb-24 sm:pt-[calc(8rem+env(safe-area-inset-top))] sm:pb-32">
          <div className="max-w-8xl mx-auto">
            <div className="text-center max-w-7xl mx-auto">
              <div className="flex flex-col items-center justify-center">
                {/* Hero Badge */}
                <div className="inline-flex text-xs items-center lg:px-4 lg:py-2 px-2 py-1 rounded-full bg-gray-900/50 border border-gray-700/50  text-gray-300 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                  <Sparkles className="h-4 w-4 text-lavender-400 mr-2" />
                  <ShinyText text="Beta Live Now" speed={3} />
                  <div className="ml-2 w-2 h-2 bg-lavender-400 rounded-full animate-pulse"></div>
                </div>

                {/* Hero Title */}
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-8 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
                  <div className="flex flex-wrap justify-center items-center gap-2 lg:gap-4 lg:mb-2 text-2xl sm:text-4xl lg:text-5xl">
                    <span>Prompt</span>

                    <RotatingText
                      texts={["Claude", "ChatGPT", "Gemini", "Grok"]}
                      rotationInterval={1500}
                      className="bg-lavender-600/20 hover:bg-lavender-600/30 text-lavender-400 border border-lavender-600/50 hover:border-lavender-600/10 px-2 rounded-lg"
                      mainClassName="inline-block"
                      staggerFrom="last"
                      staggerDuration={0.025}
                      splitLevelClassName="overflow-hidden"
                    />
                  </div>
                  <span className="text-lavender-400 text-3xl sm:text-5xl lg:text-6xl">
                    in one workspace
                  </span>
                </h1>

                {/* Hero Subtitle */}
                <div className="text-lg sm:text-xl mb-8 max-w-4xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-700 delay-400">
                  <ShinyText
                    speed={3}
                    text="The best LLMs, working together."
                  />
                </div>

                {/* CTA Buttons */}
                <div className="flex flex-row gap-4 justify-center mb-16 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-600">
                  <button
                    onClick={handleAccessRequest}
                    className="group inline-flex items-center justify-center bg-lavender-600/20 hover:bg-lavender-600/30 text-lavender-400 border border-lavender-600/50 hover:border-lavender-600/10 lg:px-8 lg:py-4 px-4 py-2 rounded-xl text-xs sm:text-sm lg:text-lg font-medium transition-all duration-300 shadow-2xl hover:shadow-lavender-500/25 relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                    <Zap className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform duration-300" />
                    {hasAccess ? "Start Building" : "Access Beta"}
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" />
                  </button>

                  <button className="group lg:inline-flex hidden  items-center justify-center bg-gray-900/50 hover:bg-gray-800/50 text-white lg:px-8 lg:py-4 px-4 py-2 rounded-xl font-medium transition-all duration-300 border border-gray-700/50 hover:border-lavender-500/50 text-xs sm:text-sm lg:text-lg">
                    <Play className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform duration-300" />
                    Watch Demo
                  </button>
                </div>

                {/* Helper text for users who already have access but system doesn't detect it */}
                {!hasAccess && (
                  <div className="text-center text-sm text-gray-400 mb-8 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-800">
                    Already validated your access code?{" "}
                    <Link
                      href="/beta-access"
                      className="text-lavender-400 hover:text-lavender-300 transition-colors duration-200 underline"
                    >
                      Bypass here
                    </Link>
                  </div>
                )}
              </div>

              {/* Chain Interface Preview */}
              <div className="relative max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700 delay-800">
                <div className="relative group lg:p-8">
                  {/* Enhanced lavender glow effect - all sides */}
                  <div className="absolute inset-0 bg-gradient-to-r from-lavender-500/20 via-purple-500/20 to-lavender-500/20 rounded-2xl blur-xl opacity-60 group-hover:opacity-80 transition-opacity duration-500"></div>
                  <div className="absolute inset-0 bg-gradient-to-t from-lavender-500/15 via-transparent to-lavender-500/15 rounded-2xl blur-2xl opacity-40 group-hover:opacity-60 transition-opacity duration-500"></div>
                  <div className="absolute inset-0 bg-gradient-to-b from-lavender-500/15 via-transparent to-lavender-500/15 rounded-2xl blur-2xl opacity-40 group-hover:opacity-60 transition-opacity duration-500"></div>

                  <video
                    src="/videos/chained_demo_v3.mp4"
                    autoPlay
                    muted
                    loop
                    playsInline
                    disablePictureInPicture
                    controlsList="nodownload nofullscreen noremoteplayback"
                    onContextMenu={(e) => e.preventDefault()}
                    className="w-full h-auto rounded-xl border-4 border-lavender-400/20 z-10 opacity-90 hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Features Section */}
        <section
          id="features"
          className="relative z-10 px-4 sm:px-6 py-32 sm:py-40"
        >
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
                Powerful Features
              </h2>
              <div className="text-lg sm:text-xl max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
                <ShinyText
                  text="Everything you need to easily build sophisticated AI workflows."
                  speed={3}
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
              {FEATURE_DETAILS.map((feature, index) => (
                <div
                  key={feature.id}
                  className={`group relative bg-gray-900/30 backdrop-blur-2xl border border-gray-700/50 rounded-2xl p-6 lg:p-8 hover:border-lavender-500/50 transition-all duration-500 hover:bg-gray-900/50 cursor-pointer overflow-hidden animate-in fade-in slide-in-from-bottom-8 ${feature.delay}`}
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
                    className="absolute top-4 right-4 p-2 bg-gray-800/70 hover:bg-gray-700/70 border border-gray-600/50 hover:border-lavender-400/50 rounded-lg text-gray-400 hover:text-lavender-400 transition-all duration-200 z-10 opacity-0 group-hover:opacity-100 hover:scale-110"
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

                    <h3 className="text-xl font-semibold text-white mb-4 group-hover:text-lavender-400 transition-colors duration-300">
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
                        {featureDetail.detailedDescription}
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
                  {/* Image Placeholder */}
                  <img
                    src={featureDetail.videoPlaceholder}
                    alt={featureDetail.title}
                    className="w-full h-auto rounded-2xl border-2 opacity-80 border-gray-700/75"
                    style={{ maxWidth: "100%", height: "auto" }}
                  />

                  {/* Use Cases */}
                  <div
                    className="animate-in fade-in slide-in-from-top-2 duration-400 ease-out"
                    style={{
                      animationDelay: "0.3s",
                      animationFillMode: "both",
                    }}
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
                    style={{
                      animationDelay: "0.5s",
                      animationFillMode: "both",
                    }}
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
                    style={{
                      animationDelay: "0.7s",
                      animationFillMode: "both",
                    }}
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
        {/* <section
          id="demo"
          className="relative z-10 px-4 sm:px-6 py-20 sm:py-32"
        >
          <div className="max-w-7xl mx-auto">
            <div className="border border-gray-700/50 rounded-3xl bg-gray-900/30 backdrop-blur-2xl p-12 lg:p-16 relative overflow-hidden">
              <div className="grid lg:grid-cols-2 gap-0 lg:gap-16 items-center ">
                <div className="text-left animate-in fade-in slide-in-from-left-8 duration-700">
                  <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">
                    See It In Action
                  </h2>
                  <div className="text-lg sm:text-xl lg:max-w-none max-w-3xl mx-auto lg:mx-0">
                    <ShinyText text="Just look at it go!" speed={3} />
                  </div>
                </div>

                <div className="relative h-[200px] md:h-[400px] flex items-center justify-start lg:justify-end animate-in fade-in slide-in-from-right-8 duration-700 delay-300">
                  <div className="w-full">
                    <CardSwap
                      width={500}
                      height={300}
                      cardDistance={45}
                      verticalDistance={45}
                      delay={5000}
                      pauseOnHover={true}
                      skewAmount={6}
                      easing="elastic"
                    >
                      <Card className="bg-gray-950/90">
                        <div className="px-4 py-2 h-full flex flex-col">
                          <p className="text-gray-400 text-xs mb-3">
                            Simple, familiar interface to build complex
                            workflows
                          </p>
                          <div className="flex-1 rounded-lg overflow-hidden bg-gray-200">
                            <video
                              src="/videos/chained_demo_v2.mp4"
                              autoPlay
                              muted
                              loop
                              playsInline
                              disablePictureInPicture
                              controlsList="nodownload nofullscreen noremoteplayback"
                              onContextMenu={(e) => e.preventDefault()}
                              className="w-full h-full object-cover pointer-events-none"
                            />
                          </div>
                        </div>
                      </Card>

                      <Card className="bg-gray-950/90">
                        <div className="px-4 py-2 h-full flex flex-col">
                          <p className="text-gray-400 text-xs mb-3">
                            See your chains execute in real-time with live
                            updates
                          </p>
                          <div className="flex-1 rounded-lg overflow-hidden bg-gray-200">
                            <video
                              src="/videos/chained_demo_v3.mp4"
                              autoPlay
                              muted
                              loop
                              playsInline
                              disablePictureInPicture
                              controlsList="nodownload nofullscreen noremoteplayback"
                              onContextMenu={(e) => e.preventDefault()}
                              className="w-full h-full object-cover pointer-events-none"
                            />
                          </div>
                        </div>
                      </Card>

                      <Card className="bg-gray-950/90">
                        <div className="px-4 py-2 h-full flex flex-col">
                          <p className="text-gray-400 text-xs mb-3">
                            Automatic optimization for better performance
                          </p>
                          <div className="flex-1 rounded-lg overflow-hidden bg-gray-200">
                            <video
                              src="/videos/chained_demo.mp4"
                              autoPlay
                              muted
                              loop
                              playsInline
                              disablePictureInPicture
                              controlsList="nodownload nofullscreen noremoteplayback"
                              onContextMenu={(e) => e.preventDefault()}
                              className="w-full h-full object-cover pointer-events-none"
                            />
                          </div>
                        </div>
                      </Card>
                    </CardSwap>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section> */}

        {/* Final CTA Section */}
        {/* <section className="relative z-10 px-4 sm:px-6 py-20 sm:py-32">
          <div className="max-w-4xl mx-auto text-center">
            <div className="bg-gradient-to-br from-gray-900/50 to-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-3xl p-8 sm:p-12 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-lavender-500/10 to-purple-500/10"></div>

              <div className="relative">
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
                  Ready to Build Your First Chain?
                </h2>
                <div className="text-xl mb-8">
                  <ShinyText
                    text="Start creating powerful AI workflows in minutes. No setup required."
                    speed={3}
                  />
                </div>
                <button
                  onClick={handleAccessRequest}
                  className="group inline-flex items-center bg-gradient-to-r from-lavender-600 to-purple-600 hover:from-lavender-500 hover:to-purple-500 text-white px-8 py-4 rounded-xl text-lg font-medium transition-all duration-300 shadow-2xl hover:shadow-lavender-500/25 relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                  <Sparkles className="mr-2 h-5 w-5" />
                  {hasAccess ? "Get Started" : "Get Beta Access"}
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" />
                </button>
              </div>
            </div>
          </div>
        </section> */}

        {/* Footer */}
        <footer className="relative z-10 p-8 xl:p-16 xl:pb-8 bg-gradient-to-b from-gray-950/80 to-transparent max-w-7xl mx-auto rounded-t-3xl  border border-x-0 lg:border-x border-gray-800/50 border-b-0">
          <div className="max-w-7xl mx-auto">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="lg:col-span-2">
                <Link
                  href="/"
                  className="flex items-center space-x-2 group mb-4"
                >
                  <div className="relative group/logo">
                    <Link2 className="h-6 w-6 text-lavender-400 group-hover/logo:hidden transition-all duration-200 group-hover:-rotate-45 block" />
                    <Unlink className="h-6 w-6 text-lavender-400/80 group-hover/logo:text-lavender-400 transition-all duration-200 group-hover/logo:block hidden" />
                  </div>
                  <span className="text-xl font-semibold text-lavender-400 group-hover:text-white transition-colors duration-300">
                    Ch<span className="text-lavender-400">ai</span>nedChat
                  </span>
                </Link>
              </div>

              <div className="lg:text-right">
                <h3 className="text-white font-semibold mb-4">Product</h3>
                <ul className="space-y-4 text-gray-400 text-xs lg:text-sm">
                  <li>
                    <Link
                      href="#features"
                      className="hover:text-lavender-400 transition-colors duration-300"
                    >
                      Features
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="#demo"
                      className="hover:text-lavender-400 transition-colors duration-300"
                    >
                      Demo
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="#workflow"
                      className="hover:text-lavender-400 transition-colors duration-300"
                    >
                      Workflow
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/chat"
                      className="hover:text-lavender-400 transition-colors duration-300"
                    >
                      Get Started
                    </Link>
                  </li>
                </ul>
              </div>

              <div className="lg:text-right hidden lg:block">
                <h3 className="text-white font-semibold mb-4">Company</h3>
                <ul className="space-y-4 text-gray-400 text-xs lg:text-sm">
                  <li>
                    <Link
                      href="#about"
                      className="hover:text-lavender-400 transition-colors duration-300"
                    >
                      About
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="#contact"
                      className="hover:text-lavender-400 transition-colors duration-300"
                    >
                      Contact
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="#privacy"
                      className="hover:text-lavender-400 transition-colors duration-300"
                    >
                      Privacy
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="#terms"
                      className="hover:text-lavender-400 transition-colors duration-300"
                    >
                      Terms
                    </Link>
                  </li>
                </ul>
              </div>
            </div>

            <div className="border-t border-gray-800/50 mt-12 pt-8 flex flex-col sm:flex-row justify-between items-center">
              <p className="text-gray-400 text-sm">
                © 2025 ChainedChat. All rights reserved.
              </p>
              <div className="flex space-x-4 mt-4 sm:mt-0">
                <Link href="https://www.linkedin.com/company/chained-chat">
                  <Linkedin className="h-6 w-6 text-lavender-400" />
                </Link>
                <Link href="https://www.x.com/chainedchat">
                  <FaXTwitter className="h-6 w-6 text-lavender-400" />
                </Link>
                <Link href="https://www.instagram.com/chainedchat">
                  <Instagram className="h-6 w-6 text-lavender-400" />
                </Link>
                <Link href="https://www.youtube.com/@chainedchat">
                  <FaYoutube className="h-6 w-6 text-lavender-400" />
                </Link>
                <Link href="https://www.tiktok.com/@chainedchat">
                  <FaTiktok className="h-6 w-6 text-lavender-400" />
                </Link>
                <Link href="https://www.threads.net/@chainedchat">
                  <FaThreads className="h-6 w-6 text-lavender-400" />
                </Link>
              </div>
            </div>
          </div>
        </footer>

        {/* Bottom Beams Background */}
        <motion.div
          className="absolute bottom-0 left-0 w-full h-screen z-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{
            duration: 3,
            delay: 1,
            ease: "easeInOut",
          }}
        >
          <Beams
            beamWidth={2}
            beamHeight={20}
            beamNumber={20}
            lightColor="#c4b5fd"
            speed={5}
            noiseIntensity={2}
            scale={0.15}
            rotation={-20}
          />
        </motion.div>

        {/* Access Gate Modal */}
        {showAccessGate && (
          <div className="fixed inset-0 z-[9999]">
            <AccessGate onAccessGranted={handleAccessGranted} />
            <button
              onClick={() => setShowAccessGate(false)}
              className="absolute top-4 right-4 p-2 bg-gray-900/50 hover:bg-gray-800/50 border border-gray-700/50 hover:border-gray-600/50 rounded-lg text-gray-300 hover:text-white transition-all duration-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </>
  );
}
