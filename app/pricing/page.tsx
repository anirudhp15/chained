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
} from "lucide-react";
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

      {/* Mobile Sticky Beams */}
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
          beamNumber={20}
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
              Start for free.
              <br />
              <span className="text-lavender-400">Get used to winning.</span>
            </h1>
            <p className="text-xl font-semibold text-gray-400 max-w-2xl mx-auto">
              Whether you're using ChainedChat for research, writing, creative
              work, or just curious, it's always free to start.
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
              transition={{ duration: 0.6, delay: 0.1 }}
              className="bg-gradient-to-br from-lavender-500/10 to-purple-500/5 border border-lavender-500/30 rounded-2xl p-8 hover:border-lavender-500/50 transition-all duration-300 backdrop-blur-sm"
            >
              <div className="text-left">
                <h3 className="text-2xl font-bold mb-2">Free</h3>
                <div className="mb-6">
                  <span className="text-4xl font-bold">$0</span>
                  <span className="text-gray-400">/mo</span>
                </div>
                <p className="text-gray-400 mb-8">
                  Get a taste for how ChainedChat works with a few responses on
                  us.
                </p>

                <button
                  onClick={() => handleSubscribe("Free")}
                  className="w-full bg-gradient-to-r from-lavender-600/80 to-purple-600/80 hover:from-lavender-500 hover:to-purple-500 text-white py-3 rounded-lg font-medium transition-all duration-200 mb-8 shadow-lg hover:shadow-lavender-500/25"
                >
                  Download for Mac
                </button>

                <ul className="space-y-4 text-sm">
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-green-500 mr-3 flex-shrink-0" />
                    Limited AI responses per day
                  </li>
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-green-500 mr-3 flex-shrink-0" />
                    Unlimited real-time notetaking
                  </li>
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-green-500 mr-3 flex-shrink-0" />
                    Personalize with custom system prompt
                  </li>
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-green-500 mr-3 flex-shrink-0" />
                    Generate post-call follow up emails
                  </li>
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-green-500 mr-3 flex-shrink-0" />
                    AI chat with your meeting summaries
                  </li>
                </ul>
              </div>
            </motion.div>

            {/* Pro Plan */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
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
                  {selectedPlan === "annually" && (
                    <span className="text-green-400 text-sm ml-2">
                      Save 20%
                    </span>
                  )}
                </div>
                <p className="text-gray-400 mb-8">
                  Unlimited access to ChainedChat. Use the latest models, get
                  full response output, and play with your own custom prompts.
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
                    Unlimited AI responses
                  </li>
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-green-500 mr-3 flex-shrink-0" />
                    Unlimited access to latest models
                  </li>
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-green-500 mr-3 flex-shrink-0" />
                    Priority support
                  </li>
                  <li className="flex items-center">
                    <span className="w-4 h-4 text-lavender-400 mr-3 flex-shrink-0 text-lg">
                      +
                    </span>
                    Plus everything in free
                  </li>
                </ul>
              </div>
            </motion.div>

            {/* API Plan */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="bg-gradient-to-br from-black via-gray-950 to-slate-900 border border-slate-800/50 rounded-2xl p-8 hover:border-slate-700 transition-all duration-300 relative overflow-hidden shadow-2xl"
            >
              {/* Subtle glow effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-cyan-500/5 pointer-events-none"></div>
              <div className="relative z-10">
                <div className="text-left">
                  <h3 className="text-2xl font-bold mb-2 flex items-center text-slate-100">
                    API
                    <Code className="w-5 h-5 text-slate-300 ml-2" />
                  </h3>
                  <div className="mb-6">
                    <span className="text-4xl font-bold text-slate-200">
                      Custom
                    </span>
                  </div>
                  <p className="text-slate-400 mb-8">
                    Specifically made for developers who need full customization
                    and integration capabilities.
                  </p>

                  <Link
                    href="/api-docs"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-gradient-to-r from-slate-800 via-gray-900 to-slate-800 hover:from-slate-700 hover:to-slate-700 border border-slate-700/50 hover:border-slate-600 text-white py-3 rounded-lg font-medium transition-all duration-200 mb-8 inline-block text-center shadow-lg hover:shadow-xl"
                  >
                    View Documentation
                  </Link>

                  <ul className="space-y-4 text-sm text-slate-300">
                    <li className="flex items-center">
                      <Check className="w-4 h-4 text-slate-400 mr-3 flex-shrink-0" />
                      Admin dashboard with detailed usage analytics
                    </li>
                    <li className="flex items-center">
                      <Check className="w-4 h-4 text-slate-400 mr-3 flex-shrink-0" />
                      Team-wide knowledge and system prompts
                    </li>
                    <li className="flex items-center">
                      <Check className="w-4 h-4 text-slate-400 mr-3 flex-shrink-0" />
                      Post-call AI suggestions and coaching insights
                    </li>
                    <li className="flex items-center">
                      <Check className="w-4 h-4 text-slate-400 mr-3 flex-shrink-0" />
                      Centralized team billing
                    </li>
                    <li className="flex items-center">
                      <Check className="w-4 h-4 text-slate-400 mr-3 flex-shrink-0" />
                      Data privacy and advanced security
                    </li>
                  </ul>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Bottom CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-16 text-center"
          >
            <p className="text-gray-400 mb-6">
              Questions about pricing? Reach out to our team.
            </p>
            <Link
              href="mailto:support@chainedchat.com"
              className="text-lavender-400 hover:text-lavender-300 font-medium transition-colors duration-200"
            >
              Contact Support
            </Link>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
