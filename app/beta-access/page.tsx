"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Key,
  ArrowRight,
  CheckCircle,
  XCircle,
  Loader2,
  UserCheck,
  LogIn,
} from "lucide-react";
import { setBetaAccess } from "@/lib/beta-access";

export default function BetaAccessPage() {
  const [email, setEmail] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleGrantAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsProcessing(true);
    setError("");

    try {
      // Manually set beta access for users who already validated their codes
      setBetaAccess({
        email: email.trim(),
        grantedAt: Date.now(),
        source: "access_code",
      });

      setSuccess(true);

      // Redirect to sign-in after a short delay
      setTimeout(() => {
        router.push("/sign-in");
      }, 2000);
    } catch (error) {
      console.error("Error setting beta access:", error);
      setError("Failed to set beta access. Please try again.");
    } finally {
      setIsProcessing(false);
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
        <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-700/50 rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="p-8 text-center border-b border-gray-800/50">
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-lavender-500 to-purple-500 rounded-2xl mb-4"
            >
              <UserCheck className="w-8 h-8 text-white" />
            </motion.div>

            <h1 className="text-2xl font-bold text-white mb-2">
              Beta Access Bypass
            </h1>
            <p className="text-gray-400 text-sm">
              For users who already validated their access code but can't access
              the app
            </p>
          </div>

          {/* Content */}
          <div className="p-8">
            {!success ? (
              <motion.form
                onSubmit={handleGrantAccess}
                className="space-y-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.4 }}
              >
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Enter the email you used for your access code
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-lavender-500 focus:border-transparent transition-all duration-200"
                    disabled={isProcessing}
                    required
                  />
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center"
                  >
                    <XCircle className="w-5 h-5 text-red-400 mr-3 flex-shrink-0" />
                    <p className="text-red-400 text-sm">{error}</p>
                  </motion.div>
                )}

                <motion.button
                  type="submit"
                  disabled={!email.trim() || isProcessing}
                  className="w-full flex items-center justify-center px-6 py-3 bg-gradient-to-r from-lavender-600 to-purple-600 hover:from-lavender-700 hover:to-purple-700 disabled:from-gray-700 disabled:to-gray-700 text-white font-medium rounded-lg transition-all duration-200 disabled:cursor-not-allowed group"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Setting Up Access...
                    </>
                  ) : (
                    <>
                      <Key className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform duration-200" />
                      Grant Beta Access
                      <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform duration-200" />
                    </>
                  )}
                </motion.button>
              </motion.form>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
                className="text-center space-y-6"
              >
                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-3" />
                  <p className="text-green-400 font-medium">
                    Beta access granted!
                  </p>
                  <p className="text-gray-400 text-sm mt-2">
                    Redirecting you to sign in...
                  </p>
                </div>

                <Link
                  href="/sign-in"
                  className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-lavender-600 to-purple-600 hover:from-lavender-700 hover:to-purple-700 text-white font-medium rounded-lg transition-all duration-200 group"
                >
                  <LogIn className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform duration-200" />
                  Go to Sign In
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform duration-200" />
                </Link>
              </motion.div>
            )}

            {/* Back to landing */}
            <div className="mt-8 pt-6 border-t border-gray-800/50 text-center">
              <Link
                href="/"
                className="text-sm text-gray-400 hover:text-lavender-400 transition-colors duration-200"
              >
                ← Back to landing page
              </Link>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
