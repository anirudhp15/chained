"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  Check,
  ArrowLeft,
  Sparkles,
  Crown,
  Code,
  Link2,
  Unlink,
  Linkedin,
  Instagram,
  X,
} from "lucide-react";
import { FaTiktok, FaXTwitter, FaYoutube, FaThreads } from "react-icons/fa6";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { hasBetaAccess } from "@/lib/beta-access";
import Beams from "@/components/Backgrounds/Beams/Beams";

export default function PricingPage() {
  const [mounted, setMounted] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "annually">(
    "monthly"
  );
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [isDev, setIsDev] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);

  const router = useRouter();
  const { scrollY } = useScroll();
  const { isSignedIn, isLoaded } = useAuth();

  // Transform values for scroll-based animations
  const containerRadius = useTransform(scrollY, [0, 20], ["0px", "9999px"]);

  useEffect(() => {
    setMounted(true);
    // Check if we're in development environment
    setIsDev(
      process.env.NODE_ENV === "development" ||
        window.location.hostname === "localhost" ||
        window.location.hostname.includes("vercel") ||
        window.location.hostname.includes("localhost")
    );

    // Check if user already has beta access
    setHasAccess(hasBetaAccess());
  }, []);

  // Redirect if not in development
  useEffect(() => {
    if (mounted && !isDev) {
      window.location.href = "/";
    }
  }, [mounted, isDev]);

  // Auto-redirect authenticated users to chat
  useEffect(() => {
    if (isLoaded && isSignedIn && mounted) {
      console.log("Authenticated user detected, redirecting to /chat");
      setTimeout(() => {
        router.push("/chat");
      }, 100);
    }
  }, [isLoaded, isSignedIn, mounted, router]);

  const handleAccessRequest = () => {
    if (isSignedIn) {
      router.push("/chat");
      return;
    }

    if (hasAccess) {
      router.push("/chat");
    } else {
      // Navigate to beta access page
      router.push("/beta-access");
    }
  };

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

  const handleSubscribe = (planName: string) => {
    setShowSuccessMessage(true);
    setTimeout(() => setShowSuccessMessage(false), 3000);
  };

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Beams Background - Desktop: Static top, Mobile: Fixed sticky */}
      {/* Desktop Top Beams */}
      <motion.div
        className="hidden lg:block absolute top-0 left-0 w-full h-screen z-5"
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

      {/* Mobile Single Fixed Beam */}
      <motion.div
        className="lg:hidden fixed inset-0 z-5"
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
          beamNumber={1}
          lightColor="#c4b5fd"
          speed={5}
          noiseIntensity={2}
          scale={0.15}
          rotation={20}
        />
      </motion.div>

      {/* Success Message */}
      {showSuccessMessage && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg"
        >
          <div className="flex items-center space-x-2">
            <Check className="w-5 h-5" />
            <span>Success! This is where payment integration will go.</span>
          </div>
        </motion.div>
      )}

      {/* Navigation */}
      <header className="fixed lg:absolute top-0 left-0 right-0 z-50 w-full pt-[env(safe-area-inset-top)] supports-[padding:max(0px)]:pt-[max(env(safe-area-inset-top),1rem)] safe-area-top lg:pt-4">
        <motion.div className="transition-all duration-300 ease-out p-2 ">
          <div className="flex items-center justify-between px-4 lg:max-w-7xl lg:mx-auto">
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
            <div className="hidden md:flex items-center text-sm space-x-8 font-semibold">
              <Link
                href="/#features"
                className="text-gray-400 hover:text-lavender-400 transition-all duration-300 relative group"
              >
                Features
                <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-lavender-400 group-hover:w-full transition-all duration-300"></div>
              </Link>
              <Link
                href="/#demo"
                className="text-gray-400 hover:text-lavender-400 transition-all duration-300 relative group"
              >
                Demo
                <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-lavender-400 group-hover:w-full transition-all duration-300"></div>
              </Link>
              <Link
                href="/#workflow"
                className="text-gray-400 hover:text-lavender-400 transition-all duration-300 relative group"
              >
                Workflow
                <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-lavender-400 group-hover:w-full transition-all duration-300"></div>
              </Link>
              <Link
                href="/pricing"
                className="text-lavender-400 hover:text-white transition-all duration-300 relative group"
              >
                Pricing
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-lavender-400 transition-all duration-300"></div>
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
                  {isSignedIn || hasAccess ? "Continue Building" : "Get Access"}
                </button>
              </motion.div>

              {/* <div className="text-xs text-gray-500 bg-gray-900 px-3 py-1 rounded-full">
                DEV ONLY
              </div> */}

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
              href="/#features"
              className="text-black text-4xl font-bold hover:text-gray-800 transition-colors duration-200"
              onClick={() => setIsMenuOpen(false)}
            >
              Features
            </Link>
            <Link
              href="/#demo"
              className="text-black text-4xl font-bold hover:text-gray-800 transition-colors duration-200"
              onClick={() => setIsMenuOpen(false)}
            >
              Demo
            </Link>
            <Link
              href="/#workflow"
              className="text-black text-4xl font-bold hover:text-gray-800 transition-colors duration-200"
              onClick={() => setIsMenuOpen(false)}
            >
              Workflow
            </Link>
            <Link
              href="/pricing"
              className="text-black text-4xl font-bold hover:text-gray-800 transition-colors duration-200"
              onClick={() => setIsMenuOpen(false)}
            >
              Pricing
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

      {/* Main Content */}
      <main className="relative z-10 px-4 pt-[calc(6rem+env(safe-area-inset-top))] pb-16 sm:pt-[calc(8rem+env(safe-area-inset-top))]">
        <div className="max-w-7xl mx-auto text-center">
          {/* Hero Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-16 font-bold"
          >
            <h1 className="text-5xl lg:text-6xl font-bold mb-6">
              Build with AI agents that
              <br />
              <span className="text-lavender-400">actually work together.</span>
            </h1>
            <p className="text-xl font-semibold text-gray-400 max-w-3xl mx-auto">
              Deploy multi-agent workflows in production. Research faster, code
              smarter, create better. Start free, scale when ready.
            </p>
          </motion.div>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center mb-12">
            <div className="bg-gray-900 p-1 rounded-lg border border-gray-700">
              <button
                onClick={() => setSelectedPlan("monthly")}
                className={`px-6 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                  selectedPlan === "monthly"
                    ? "bg-gray-700 text-white"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setSelectedPlan("annually")}
                className={`px-6 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                  selectedPlan === "annually"
                    ? "bg-gray-700 text-white"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Annually
              </button>
            </div>
          </div>

          {/* Pricing Cards */}
          <div className="grid lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Free Plan */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="bg-gradient-to-br from-lavender-500/10 to-purple-500/5 border border-lavender-500/30 rounded-2xl p-8 hover:border-lavender-500/50 transition-all duration-300 backdrop-blur-sm"
            >
              <div className="text-left">
                <h3 className="text-2xl font-bold mb-2">Free</h3>
                <div className="mb-6">
                  <span className="text-4xl font-bold">$0</span>
                  <span className="text-gray-400">/mo</span>
                </div>
                <p className="text-gray-400 mb-8">
                  Perfect for testing agent workflows and light experimentation.
                </p>

                <button
                  onClick={() => handleSubscribe("Free")}
                  className="w-full bg-gradient-to-r from-lavender-600/80 to-purple-600/80 hover:from-lavender-500 hover:to-purple-500 text-white py-3 rounded-lg font-medium transition-all duration-200 mb-8 shadow-lg hover:shadow-lavender-500/25"
                >
                  Start Building Free
                </button>

                <ul className="space-y-4 text-sm">
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-green-500 mr-3 flex-shrink-0" />
                    50 agent interactions per month
                  </li>
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-green-500 mr-3 flex-shrink-0" />
                    Basic chain templates (research, coding, writing)
                  </li>
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-green-500 mr-3 flex-shrink-0" />
                    Community support
                  </li>
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-green-500 mr-3 flex-shrink-0" />
                    Single-user workspace
                  </li>
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-green-500 mr-3 flex-shrink-0" />
                    Standard models (GPT-4, Claude Sonnet)
                  </li>
                </ul>
              </div>
            </motion.div>

            {/* Pro Plan */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="bg-gradient-to-br from-lavender-500/10 to-purple-500/5 border border-lavender-500/30 rounded-2xl p-8 hover:border-lavender-500/50 transition-all duration-300 backdrop-blur-sm"
            >
              <div className="text-left">
                <h3 className="text-2xl font-bold mb-2 flex items-center">
                  Pro
                  <Crown className="w-5 h-5 text-lavender-400 ml-2" />
                </h3>
                <div className="mb-6">
                  <span className="text-4xl font-bold">
                    ${selectedPlan === "monthly" ? "30" : "120"}
                  </span>
                  <span className="text-gray-400">
                    {selectedPlan === "monthly" ? "/mo" : "/year"}
                  </span>
                </div>
                <p className="text-gray-400 mb-8">
                  Full platform access for individuals and small teams building
                  with agent chains daily.
                </p>

                <button
                  onClick={() => handleSubscribe("Pro")}
                  className="w-full bg-gradient-to-r from-lavender-600/80 to-purple-600/80 hover:from-lavender-500 hover:to-purple-500 text-white py-3 rounded-lg font-medium transition-all duration-200 mb-8 shadow-lg hover:shadow-lavender-500/25"
                >
                  Subscribe
                </button>

                <ul className="space-y-4 text-sm">
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-green-500 mr-3 flex-shrink-0" />
                    Unlimited agent interactions
                  </li>
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-green-500 mr-3 flex-shrink-0" />
                    Advanced chain orchestration (conditional, parallel)
                  </li>
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-green-500 mr-3 flex-shrink-0" />
                    Priority model access (GPT-4 Turbo, Claude Opus)
                  </li>
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-green-500 mr-3 flex-shrink-0" />
                    Custom agent templates
                  </li>
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-green-500 mr-3 flex-shrink-0" />
                    Email support
                  </li>
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-green-500 mr-3 flex-shrink-0" />
                    Team collaboration (up to 5 users)
                  </li>
                </ul>
              </div>
            </motion.div>

            {/* API Plan */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="bg-gradient-to-br from-black via-gray-950 to-slate-900 border border-slate-800/50 rounded-2xl p-8 hover:border-slate-700 transition-all duration-300 relative overflow-hidden shadow-2xl"
            >
              {/* Subtle glow effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-cyan-500/5 pointer-events-none"></div>
              <div className="relative z-10">
                <div className="text-left">
                  <h3 className="text-2xl font-bold mb-2 flex items-center text-slate-100">
                    Enterprise
                    <Code className="w-5 h-5 text-slate-300 ml-2" />
                  </h3>
                  <div className="mb-6">
                    <span className="text-4xl font-bold text-slate-200">
                      Contact Sales
                    </span>
                  </div>
                  <p className="text-slate-400 mb-8">
                    White-glove onboarding, custom integrations, and
                    enterprise-grade security for teams scaling agent workflows.
                  </p>

                  <button
                    onClick={() => handleSubscribe("Enterprise")}
                    className="w-full bg-gradient-to-r from-slate-800 via-gray-900 to-slate-800 hover:from-slate-700 hover:to-slate-700 border border-slate-700/50 hover:border-slate-600 text-white py-3 rounded-lg font-medium transition-all duration-200 mb-8 shadow-lg hover:shadow-xl"
                  >
                    Schedule Demo
                  </button>

                  <ul className="space-y-4 text-sm text-slate-300">
                    <li className="flex items-center">
                      <Check className="w-4 h-4 text-slate-400 mr-3 flex-shrink-0" />
                      Everything in Pro
                    </li>
                    <li className="flex items-center">
                      <Check className="w-4 h-4 text-slate-400 mr-3 flex-shrink-0" />
                      REST API access with SDKs
                    </li>
                    <li className="flex items-center">
                      <Check className="w-4 h-4 text-slate-400 mr-3 flex-shrink-0" />
                      Custom model integrations
                    </li>
                    <li className="flex items-center">
                      <Check className="w-4 h-4 text-slate-400 mr-3 flex-shrink-0" />
                      SSO and advanced security
                    </li>
                    <li className="flex items-center">
                      <Check className="w-4 h-4 text-slate-400 mr-3 flex-shrink-0" />
                      Dedicated account manager
                    </li>
                    <li className="flex items-center">
                      <Check className="w-4 h-4 text-slate-400 mr-3 flex-shrink-0" />
                      Custom deployment options
                    </li>
                  </ul>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Feature Comparison Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="mt-20 mb-16"
          >
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-white mb-3">
                Compare all features
              </h2>
              <p className="text-gray-400 text-lg">
                Detailed breakdown of what's included in each plan
              </p>
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block bg-gray-900/30 backdrop-blur-2xl border border-gray-700/50 rounded-2xl overflow-hidden max-w-6xl mx-auto">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-800/60 border-b border-gray-700/50">
                      <th className="text-left p-5 text-white font-bold text-lg"></th>
                      <th className="text-center p-5 text-white font-bold text-lg">
                        Free
                      </th>
                      <th className="text-center p-5 text-white font-bold text-lg">
                        Pro
                      </th>
                      <th className="text-center p-5 text-white font-bold text-lg">
                        Enterprise
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Core Features Section */}
                    <tr className="border-b border-gray-700/30">
                      <td colSpan={4} className="p-5 bg-gray-800/40">
                        <h3 className="text-base font-bold text-lavender-300 uppercase tracking-wide">
                          Core Features
                        </h3>
                      </td>
                    </tr>
                    <tr className="border-b border-gray-700/20 hover:bg-gray-800/20 transition-colors">
                      <td className="p-5 text-left">
                        <span className="text-white font-semibold text-base">
                          Agent interactions per month
                        </span>
                      </td>
                      <td className="p-5 text-center">
                        <span className="text-lavender-400 font-bold text-lg">
                          50
                        </span>
                      </td>
                      <td className="p-5 text-center">
                        <div className="flex items-center justify-center">
                          <Check className="w-4 h-4 text-green-500 mr-2" />
                          <span className="text-white font-semibold">
                            Unlimited
                          </span>
                        </div>
                      </td>
                      <td className="p-5 text-center">
                        <span className="text-cyan-400 font-bold text-lg">
                          Pay per use
                        </span>
                      </td>
                    </tr>
                    <tr className="border-b border-gray-700/20 hover:bg-gray-800/20 transition-colors">
                      <td className="p-5 text-left">
                        <span className="text-white font-semibold text-base">
                          Chain templates
                        </span>
                      </td>
                      <td className="p-5 text-center">
                        <div className="flex items-center justify-center">
                          <Check className="w-4 h-4 text-green-500 mr-2" />
                          <span className="text-white font-medium">
                            Basic (3)
                          </span>
                        </div>
                      </td>
                      <td className="p-5 text-center">
                        <div className="flex items-center justify-center">
                          <Check className="w-4 h-4 text-green-500 mr-2" />
                          <span className="text-white font-medium">
                            Advanced (10+)
                          </span>
                        </div>
                      </td>
                      <td className="p-5 text-center">
                        <div className="flex items-center justify-center">
                          <Check className="w-4 h-4 text-green-500 mr-2" />
                          <span className="text-white font-medium">
                            Programmatic
                          </span>
                        </div>
                      </td>
                    </tr>
                    <tr className="border-b border-gray-700/20 hover:bg-gray-800/20 transition-colors">
                      <td className="p-5 text-left">
                        <span className="text-white font-semibold text-base">
                          Workspace users
                        </span>
                      </td>
                      <td className="p-5 text-center">
                        <span className="text-lavender-400 font-bold text-lg">
                          1 user
                        </span>
                      </td>
                      <td className="p-5 text-center">
                        <span className="text-lavender-400 font-bold text-lg">
                          Up to 5
                        </span>
                      </td>
                      <td className="p-5 text-center">
                        <div className="flex items-center justify-center">
                          <Check className="w-4 h-4 text-green-500 mr-2" />
                          <span className="text-white font-semibold">
                            Team billing
                          </span>
                        </div>
                      </td>
                    </tr>
                    <tr className="border-b border-gray-700/20 hover:bg-gray-800/20 transition-colors">
                      <td className="p-5 text-left">
                        <span className="text-white font-semibold text-base">
                          Available models
                        </span>
                      </td>
                      <td className="p-5 text-center">
                        <span className="text-gray-400 font-medium">
                          GPT-4, Claude Sonnet
                        </span>
                      </td>
                      <td className="p-5 text-center">
                        <div className="flex items-center justify-center">
                          <Check className="w-4 h-4 text-green-500 mr-2" />
                          <span className="text-white font-medium">
                            All latest models
                          </span>
                        </div>
                      </td>
                      <td className="p-5 text-center">
                        <div className="flex items-center justify-center">
                          <Check className="w-4 h-4 text-green-500 mr-2" />
                          <span className="text-white font-medium">
                            All models + custom
                          </span>
                        </div>
                      </td>
                    </tr>

                    {/* Advanced Features Section */}
                    <tr className="border-b border-gray-700/30">
                      <td colSpan={4} className="p-5 bg-gray-800/40">
                        <h3 className="text-base font-bold text-lavender-300 uppercase tracking-wide">
                          Advanced Features
                        </h3>
                      </td>
                    </tr>
                    <tr className="border-b border-gray-700/20 hover:bg-gray-800/20 transition-colors">
                      <td className="p-5 text-left">
                        <span className="text-white font-semibold text-base">
                          Conditional logic chains
                        </span>
                      </td>
                      <td className="p-5 text-center">
                        <X className="w-5 h-5 text-red-500 mx-auto" />
                      </td>
                      <td className="p-5 text-center">
                        <Check className="w-5 h-5 text-green-500 mx-auto" />
                      </td>
                      <td className="p-5 text-center">
                        <Check className="w-5 h-5 text-green-500 mx-auto" />
                      </td>
                    </tr>
                    <tr className="border-b border-gray-700/20 hover:bg-gray-800/20 transition-colors">
                      <td className="p-5 text-left">
                        <span className="text-white font-semibold text-base">
                          Parallel execution
                        </span>
                      </td>
                      <td className="p-5 text-center">
                        <X className="w-5 h-5 text-red-500 mx-auto" />
                      </td>
                      <td className="p-5 text-center">
                        <Check className="w-5 h-5 text-green-500 mx-auto" />
                      </td>
                      <td className="p-5 text-center">
                        <Check className="w-5 h-5 text-green-500 mx-auto" />
                      </td>
                    </tr>
                    <tr className="border-b border-gray-700/20 hover:bg-gray-800/20 transition-colors">
                      <td className="p-5 text-left">
                        <span className="text-white font-semibold text-base">
                          Custom agent templates
                        </span>
                      </td>
                      <td className="p-5 text-center">
                        <X className="w-5 h-5 text-red-500 mx-auto" />
                      </td>
                      <td className="p-5 text-center">
                        <Check className="w-5 h-5 text-green-500 mx-auto" />
                      </td>
                      <td className="p-5 text-center">
                        <div className="flex items-center justify-center">
                          <Check className="w-5 h-5 text-green-500 mr-2" />
                          <span className="text-white font-medium">
                            Via config
                          </span>
                        </div>
                      </td>
                    </tr>

                    {/* API-Specific Features Section */}
                    <tr className="border-b border-gray-700/30">
                      <td colSpan={4} className="p-5 bg-gray-800/40">
                        <h3 className="text-base font-bold text-lavender-300 uppercase tracking-wide">
                          API-Specific Features
                        </h3>
                      </td>
                    </tr>
                    <tr className="border-b border-gray-700/20 hover:bg-gray-800/20 transition-colors">
                      <td className="p-5 text-left">
                        <span className="text-white font-semibold text-base">
                          REST API access
                        </span>
                      </td>
                      <td className="p-5 text-center">
                        <X className="w-5 h-5 text-red-500 mx-auto" />
                      </td>
                      <td className="p-5 text-center">
                        <X className="w-5 h-5 text-red-500 mx-auto" />
                      </td>
                      <td className="p-5 text-center">
                        <div className="flex items-center justify-center">
                          <Check className="w-5 h-5 text-green-500 mr-2" />
                          <span className="text-white font-medium">
                            Full access
                          </span>
                        </div>
                      </td>
                    </tr>
                    <tr className="border-b border-gray-700/20 hover:bg-gray-800/20 transition-colors">
                      <td className="p-5 text-left">
                        <span className="text-white font-semibold text-base">
                          Python SDK
                        </span>
                      </td>
                      <td className="p-5 text-center">
                        <X className="w-5 h-5 text-red-500 mx-auto" />
                      </td>
                      <td className="p-5 text-center">
                        <X className="w-5 h-5 text-red-500 mx-auto" />
                      </td>
                      <td className="p-5 text-center">
                        <Check className="w-5 h-5 text-green-500 mx-auto" />
                      </td>
                    </tr>
                    <tr className="border-b border-gray-700/20 hover:bg-gray-800/20 transition-colors">
                      <td className="p-5 text-left">
                        <span className="text-white font-semibold text-base">
                          TypeScript SDK
                        </span>
                      </td>
                      <td className="p-5 text-center">
                        <X className="w-5 h-5 text-red-500 mx-auto" />
                      </td>
                      <td className="p-5 text-center">
                        <X className="w-5 h-5 text-red-500 mx-auto" />
                      </td>
                      <td className="p-5 text-center">
                        <Check className="w-5 h-5 text-green-500 mx-auto" />
                      </td>
                    </tr>
                    <tr className="border-b border-gray-700/20 hover:bg-gray-800/20 transition-colors">
                      <td className="p-5 text-left">
                        <span className="text-white font-semibold text-base">
                          Webhook support
                        </span>
                      </td>
                      <td className="p-5 text-center">
                        <X className="w-5 h-5 text-red-500 mx-auto" />
                      </td>
                      <td className="p-5 text-center">
                        <X className="w-5 h-5 text-red-500 mx-auto" />
                      </td>
                      <td className="p-5 text-center">
                        <Check className="w-5 h-5 text-green-500 mx-auto" />
                      </td>
                    </tr>
                    <tr className="border-b border-gray-700/20 hover:bg-gray-800/20 transition-colors">
                      <td className="p-5 text-left">
                        <span className="text-white font-semibold text-base">
                          Rate limiting control
                        </span>
                      </td>
                      <td className="p-5 text-center">
                        <X className="w-5 h-5 text-red-500 mx-auto" />
                      </td>
                      <td className="p-5 text-center">
                        <X className="w-5 h-5 text-red-500 mx-auto" />
                      </td>
                      <td className="p-5 text-center">
                        <div className="flex items-center justify-center">
                          <Check className="w-5 h-5 text-green-500 mr-2" />
                          <span className="text-white font-medium">
                            Custom limits
                          </span>
                        </div>
                      </td>
                    </tr>
                    <tr className="border-b border-gray-700/20 hover:bg-gray-800/20 transition-colors">
                      <td className="p-5 text-left">
                        <span className="text-white font-semibold text-base">
                          Usage analytics API
                        </span>
                      </td>
                      <td className="p-5 text-center">
                        <X className="w-5 h-5 text-red-500 mx-auto" />
                      </td>
                      <td className="p-5 text-center">
                        <X className="w-5 h-5 text-red-500 mx-auto" />
                      </td>
                      <td className="p-5 text-center">
                        <Check className="w-5 h-5 text-green-500 mx-auto" />
                      </td>
                    </tr>

                    {/* Support & Integration Section */}
                    <tr className="border-b border-gray-700/30">
                      <td colSpan={4} className="p-5 bg-gray-800/40">
                        <h3 className="text-base font-bold text-lavender-300 uppercase tracking-wide">
                          Support & Integration
                        </h3>
                      </td>
                    </tr>
                    <tr className="border-b border-gray-700/20 hover:bg-gray-800/20 transition-colors">
                      <td className="p-5 text-left">
                        <span className="text-white font-semibold text-base">
                          Support level
                        </span>
                      </td>
                      <td className="p-5 text-center">
                        <span className="text-gray-400 font-medium">
                          Community
                        </span>
                      </td>
                      <td className="p-5 text-center">
                        <span className="text-lavender-400 font-bold">
                          Email
                        </span>
                      </td>
                      <td className="p-5 text-center">
                        <div className="flex items-center justify-center">
                          <Check className="w-5 h-5 text-green-500 mr-2" />
                          <span className="text-white font-medium">
                            Priority + Slack
                          </span>
                        </div>
                      </td>
                    </tr>
                    <tr className="border-b border-gray-700/20 hover:bg-gray-800/20 transition-colors">
                      <td className="p-5 text-left">
                        <span className="text-white font-semibold text-base">
                          Custom integrations
                        </span>
                      </td>
                      <td className="p-5 text-center">
                        <X className="w-5 h-5 text-red-500 mx-auto" />
                      </td>
                      <td className="p-5 text-center">
                        <X className="w-5 h-5 text-red-500 mx-auto" />
                      </td>
                      <td className="p-5 text-center">
                        <Check className="w-5 h-5 text-green-500 mx-auto" />
                      </td>
                    </tr>
                    <tr className="border-b border-gray-700/20 hover:bg-gray-800/20 transition-colors">
                      <td className="p-5 text-left">
                        <span className="text-white font-semibold text-base">
                          White-label options
                        </span>
                      </td>
                      <td className="p-5 text-center">
                        <X className="w-5 h-5 text-red-500 mx-auto" />
                      </td>
                      <td className="p-5 text-center">
                        <X className="w-5 h-5 text-red-500 mx-auto" />
                      </td>
                      <td className="p-5 text-center">
                        <Check className="w-5 h-5 text-green-500 mx-auto" />
                      </td>
                    </tr>
                    <tr className="hover:bg-gray-800/20 transition-colors">
                      <td className="p-5 text-left">
                        <span className="text-white font-semibold text-base">
                          SLA guarantee
                        </span>
                      </td>
                      <td className="p-5 text-center">
                        <X className="w-5 h-5 text-red-500 mx-auto" />
                      </td>
                      <td className="p-5 text-center">
                        <X className="w-5 h-5 text-red-500 mx-auto" />
                      </td>
                      <td className="p-5 text-center">
                        <div className="flex items-center justify-center">
                          <Check className="w-5 h-5 text-green-500 mr-2" />
                          <span className="text-white font-medium">99.9%</span>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Card Layout */}
            <div className="md:hidden space-y-6">
              {/* Free Plan Card */}
              <div className="bg-gradient-to-br from-lavender-500/10 to-purple-500/5 border border-lavender-500/30 rounded-2xl p-6">
                <h3 className="text-xl font-bold text-white mb-6 text-center">
                  Free Plan
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Agent interactions</span>
                    <span className="text-lavender-400 font-semibold">
                      50/month
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Chain templates</span>
                    <div className="flex items-center">
                      <Check className="w-4 h-4 text-green-500 mr-1" />
                      <span className="text-white text-sm">Basic (3)</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Workspace users</span>
                    <span className="text-lavender-400">1 user</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Support</span>
                    <span className="text-gray-400">Community</span>
                  </div>
                </div>
              </div>

              {/* Pro Plan Card */}
              <div className="bg-gradient-to-br from-lavender-500/10 to-purple-500/5 border border-lavender-500/30 rounded-2xl p-6">
                <h3 className="text-xl font-bold text-white mb-6 text-center">
                  Pro Plan
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Agent interactions</span>
                    <div className="flex items-center">
                      <Check className="w-4 h-4 text-green-500 mr-1" />
                      <span className="text-white">Unlimited</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Chain templates</span>
                    <div className="flex items-center">
                      <Check className="w-4 h-4 text-green-500 mr-1" />
                      <span className="text-white text-sm">Advanced (10+)</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Workspace users</span>
                    <span className="text-lavender-400">Up to 5</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Support</span>
                    <span className="text-lavender-400">Email</span>
                  </div>
                </div>
              </div>

              {/* Enterprise Plan Card */}
              <div className="bg-gradient-to-br from-black via-gray-950 to-slate-900 border border-slate-800/50 rounded-2xl p-6">
                <h3 className="text-xl font-bold text-slate-100 mb-6 text-center">
                  Enterprise Plan
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300">Agent interactions</span>
                    <span className="text-cyan-400">Pay per use</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300">API Access</span>
                    <div className="flex items-center">
                      <Check className="w-4 h-4 text-green-500 mr-1" />
                      <span className="text-slate-100 text-sm">
                        Full REST API
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300">Team billing</span>
                    <Check className="w-4 h-4 text-green-500" />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300">Support</span>
                    <div className="flex items-center">
                      <Check className="w-4 h-4 text-green-500 mr-1" />
                      <span className="text-slate-100 text-sm">
                        Priority + Slack
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 p-8 xl:p-16 xl:pb-8 bg-gradient-to-b mt-16 from-gray-950/80 to-transparent max-w-7xl mx-auto rounded-t-3xl  border border-x-0 lg:border-x border-gray-800/50 border-b-0">
        <div className="max-w-7xl mx-auto">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-2">
              <Link href="/" className="flex items-center space-x-2 group mb-4">
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
              <h3 className="text-white font-bold mb-4">Product</h3>
              <ul className="space-y-4 font-semibold text-gray-400 text-xs lg:text-sm">
                <li>
                  <Link
                    href="/#features"
                    className="hover:text-lavender-400 transition-colors duration-300"
                  >
                    Features
                  </Link>
                </li>
                <li>
                  <Link
                    href="/#demo"
                    className="hover:text-lavender-400 transition-colors duration-300"
                  >
                    Demo
                  </Link>
                </li>
                <li>
                  <Link
                    href="/#workflow"
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
              <h3 className="text-white font-bold mb-4">Company</h3>
              <ul className="space-y-4 font-semibold text-gray-400 text-xs lg:text-sm">
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

      {/* Desktop Bottom Beams Background */}
      <motion.div
        className="hidden lg:block absolute bottom-0 left-0 w-full h-screen z-5"
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
          beamNumber={15}
          lightColor="#c4b5fd"
          speed={4}
          noiseIntensity={2}
          scale={0.12}
          rotation={-15}
        />
      </motion.div>
    </div>
  );
}
