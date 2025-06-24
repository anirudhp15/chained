"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Lock,
  Unlock,
  Mail,
  CheckCircle,
  XCircle,
  Loader2,
  ArrowRight,
  Users,
  Star,
  Sparkles,
  Key,
  Shield,
} from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { setBetaAccess } from "@/lib/beta-access";
import { useAnalytics } from "@/lib/analytics";

interface AccessGateProps {
  onAccessGranted: () => void;
}

interface FormState {
  accessCode: string;
  email: string;
  name: string;
  message: string;
  showWaitlist: boolean;
  isValidating: boolean;
  isSubmitting: boolean;
  error: string | null;
  success: string | null;
}

export function AccessGate({ onAccessGranted }: AccessGateProps) {
  const validateAccessCode = useMutation(api.mutations.validateAccessCode);
  const joinWaitlist = useMutation(api.mutations.joinWaitlist);
  const { trackLandingPageEvent, identifyUser } = useAnalytics();

  const [form, setForm] = useState<FormState>({
    accessCode: "",
    email: "",
    name: "",
    message: "",
    showWaitlist: false,
    isValidating: false,
    isSubmitting: false,
    error: null,
    success: null,
  });

  const updateForm = (updates: Partial<FormState>) => {
    setForm((prev) => ({ ...prev, ...updates }));
  };

  const getClientMetadata = () => ({
    source: "landing_page",
    referrer: document.referrer,
    userAgent: navigator.userAgent,
  });

  const handleAccessCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.accessCode.trim() || !form.email.trim()) return;

    updateForm({ isValidating: true, error: null });
    trackLandingPageEvent.accessCodeAttempted(false); // Track attempt

    try {
      console.log(
        "Validating access code:",
        form.accessCode.trim().toUpperCase()
      );

      const result = await validateAccessCode({
        code: form.accessCode.trim().toUpperCase(), // Ensure uppercase
        email: form.email.trim(),
        metadata: getClientMetadata(),
      });

      console.log("Validation result:", result);

      if (result.valid) {
        // Store access using utility function
        setBetaAccess({
          email: form.email,
          grantedAt: Date.now(),
          source: "access_code",
        });

        // Track successful validation and identify user
        trackLandingPageEvent.accessCodeValidated(form.email, form.accessCode);
        identifyUser(form.email, {
          beta_access_source: "access_code",
          access_code_used: form.accessCode,
        });

        updateForm({ success: "Access granted! Redirecting..." });
        setTimeout(() => {
          onAccessGranted();
        }, 1500);
      } else {
        trackLandingPageEvent.accessCodeAttempted(false, result.reason);
        updateForm({ error: result.reason || "Invalid access code" });
      }
    } catch (error) {
      console.error("Access code validation error:", error);
      trackLandingPageEvent.accessCodeAttempted(false, "validation_error");

      // Better error message based on error type
      let errorMessage = "Something went wrong. Please try again.";
      if (error instanceof Error) {
        if (error.message.includes("UNAUTHENTICATED")) {
          errorMessage =
            "Database connection issue. Please refresh and try again.";
        } else if (error.message.includes("NetworkError")) {
          errorMessage =
            "Network error. Please check your connection and try again.";
        }
      }

      updateForm({ error: errorMessage });
    } finally {
      updateForm({ isValidating: false });
    }
  };

  const handleWaitlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email.trim()) return;

    updateForm({ isSubmitting: true, error: null });

    try {
      const result = await joinWaitlist({
        email: form.email.trim(),
        name: form.name.trim() || undefined,
        message: form.message.trim() || undefined,
        metadata: getClientMetadata(),
      });

      if (result.success) {
        // Track successful waitlist join
        trackLandingPageEvent.waitlistJoined(
          form.email,
          form.name || "Anonymous",
          result.position || 0
        );

        updateForm({
          success: `Great! You're on the waitlist. We'll notify you when you're in.`,
        });
      } else {
        trackLandingPageEvent.waitlistError(result.reason || "Unknown error");
        updateForm({ error: result.reason });
      }
    } catch (error) {
      console.error("Waitlist join error:", error);
      trackLandingPageEvent.waitlistError("submission_error");
      updateForm({ error: "Something went wrong. Please try again." });
    } finally {
      updateForm({ isSubmitting: false });
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-lavender-500/10 via-transparent to-purple-500/10" />
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-lavender-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative w-full max-w-md"
      >
        {/* Beta Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="mb-8 text-center"
        >
          <div className="inline-flex items-center px-4 py-2 bg-gray-900/50 border border-gray-700/30 rounded-full text-sm text-gray-400">
            <Sparkles className="w-4 h-4 mr-2 text-lavender-400" />
            <span>Closed Beta • Limited Access</span>
          </div>
        </motion.div>
        <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-700/50 rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="p-8 text-center border-b border-gray-800/50">
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-lavender-500 to-purple-500 rounded-2xl mb-4"
            >
              {form.showWaitlist ? (
                <Users className="w-8 h-8 text-white" />
              ) : (
                <Key className="w-8 h-8 text-white" />
              )}
            </motion.div>

            <h1 className="text-2xl font-bold text-white mb-2">
              {form.showWaitlist ? "Join the Waitlist" : "Enter Access Code"}
            </h1>

            <p className="text-gray-400 text-sm">
              {form.showWaitlist
                ? "Be notified as soon as your spot is ready."
                : "Chained is currently in closed beta. Enter your access code to get started."}
            </p>
          </div>

          {/* Content */}
          <div className="p-8">
            <AnimatePresence mode="wait">
              {!form.showWaitlist ? (
                <motion.div
                  key="access-code"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                >
                  <form onSubmit={handleAccessCodeSubmit} className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Access Code
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={form.accessCode}
                          onChange={(e) =>
                            updateForm({ accessCode: e.target.value })
                          }
                          placeholder="Enter your access code"
                          className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-lavender-500 focus:border-transparent transition-all duration-200"
                          disabled={form.isValidating}
                        />
                        <Shield className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) => updateForm({ email: e.target.value })}
                        placeholder="your@email.com"
                        className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-lavender-500 focus:border-transparent transition-all duration-200"
                        disabled={form.isValidating}
                      />
                    </div>

                    <motion.button
                      type="submit"
                      disabled={
                        !form.accessCode.trim() ||
                        !form.email.trim() ||
                        form.isValidating
                      }
                      className="w-full flex items-center justify-center px-6 py-3 bg-gradient-to-r from-lavender-600 to-purple-600 hover:from-lavender-700 hover:to-purple-700 disabled:from-gray-700 disabled:to-gray-700 text-white font-medium rounded-lg transition-all duration-200 disabled:cursor-not-allowed group"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {form.isValidating ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Validating...
                        </>
                      ) : (
                        <>
                          <Unlock className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform duration-200" />
                          Validate Access
                          <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform duration-200" />
                        </>
                      )}
                    </motion.button>
                  </form>
                </motion.div>
              ) : (
                <motion.div
                  key="waitlist"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <form onSubmit={handleWaitlistSubmit} className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) => updateForm({ email: e.target.value })}
                        placeholder="your@email.com"
                        className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-lavender-500 focus:border-transparent transition-all duration-200"
                        disabled={form.isSubmitting}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Name (Optional)
                      </label>
                      <input
                        type="text"
                        value={form.name}
                        onChange={(e) => updateForm({ name: e.target.value })}
                        placeholder="Your name"
                        className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-lavender-500 focus:border-transparent transition-all duration-200"
                        disabled={form.isSubmitting}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        What tasks would you like to chain together? (Optional)
                      </label>
                      <textarea
                        value={form.message}
                        onChange={(e) =>
                          updateForm({ message: e.target.value })
                        }
                        placeholder="Tell us about your use case..."
                        rows={3}
                        className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-lavender-500 focus:border-transparent transition-all duration-200 resize-none"
                        disabled={form.isSubmitting}
                      />
                    </div>

                    <motion.button
                      type="submit"
                      disabled={!form.email.trim() || form.isSubmitting}
                      className="w-full flex items-center justify-center px-6 py-3 bg-gradient-to-r from-lavender-600 to-purple-600 hover:from-lavender-700 hover:to-purple-700 disabled:from-gray-700 disabled:to-gray-700 text-white font-medium rounded-lg transition-all duration-200 disabled:cursor-not-allowed group"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {form.isSubmitting ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Joining...
                        </>
                      ) : (
                        <>
                          <Star className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform duration-200" />
                          Join Waitlist
                          <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform duration-200" />
                        </>
                      )}
                    </motion.button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Status Messages */}
            <AnimatePresence>
              {form.error && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center"
                >
                  <XCircle className="w-5 h-5 text-red-400 mr-3 flex-shrink-0" />
                  <p className="text-red-400 text-sm">{form.error}</p>
                </motion.div>
              )}

              {form.success && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mt-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center"
                >
                  <CheckCircle className="w-5 h-5 text-green-400 mr-3 flex-shrink-0" />
                  <p className="text-green-400 text-sm">{form.success}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Toggle */}
            <div className="mt-8 pt-6 border-t border-gray-800/50 text-center">
              <button
                onClick={() => {
                  const newMode = !form.showWaitlist ? "waitlist" : "code";
                  trackLandingPageEvent.accessGateModeChanged(newMode);
                  updateForm({
                    showWaitlist: !form.showWaitlist,
                    error: null,
                    success: null,
                  });
                }}
                className="text-sm text-gray-400 hover:text-lavender-400 transition-colors duration-200"
              >
                {form.showWaitlist ? (
                  <>
                    Have an access code?{" "}
                    <span className="text-lavender-400 font-medium">
                      Enter it here
                    </span>
                  </>
                ) : (
                  <>
                    Don't have an access code?{" "}
                    <span className="text-lavender-400 font-medium">
                      Join the waitlist
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
