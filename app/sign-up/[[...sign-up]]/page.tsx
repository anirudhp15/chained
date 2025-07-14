"use client";

import { SignUp } from "@clerk/nextjs";
import { motion } from "framer-motion";
import { useState } from "react";
import Link from "next/link";
import { Link2, Unlink, Menu, X } from "lucide-react";
import Beams from "@/components/Backgrounds/Beams/Beams";

export default function SignUpPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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
      `}</style>

      <div className="min-h-screen bg-gray-950 relative overflow-hidden">
        {/* Fixed Beams Background */}
        <motion.div
          className="fixed inset-0 z-5"
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
          <motion.div className="transition-all duration-300 ease-out p-2">
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
                  href="/#demo"
                  className="text-gray-400 hover:text-lavender-400 transition-all duration-300 relative group"
                >
                  Demo
                  <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-lavender-400 group-hover:w-full transition-all duration-300"></div>
                </Link>
                <Link
                  href="/features"
                  className="text-gray-400 hover:text-lavender-400 transition-all duration-300 relative group"
                >
                  Features
                  <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-lavender-400 group-hover:w-full transition-all duration-300"></div>
                </Link>
                <Link
                  href="/pricing"
                  className="text-gray-400 hover:text-lavender-400 transition-all duration-300 relative group"
                >
                  Pricing
                  <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-lavender-400 group-hover:w-full transition-all duration-300"></div>
                </Link>
              </div>

              <div className="flex items-center space-x-4">
                <div className="hidden md:block">
                  <Link
                    href="/sign-in"
                    className="inline-flex items-center bg-lavender-600/20 border border-lavender-600/50 hover:bg-lavender-600/30 text-lavender-400 px-2 py-1 text-sm font-medium transition-all duration-300 shadow-lg hover:shadow-lavender-500/25 group rounded-xl"
                  >
                    Go to Console
                  </Link>
                </div>

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
                href="/features"
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
                href="/pricing"
                className="text-black text-4xl font-bold hover:text-gray-800 transition-colors duration-200"
                onClick={() => setIsMenuOpen(false)}
              >
                Pricing
              </Link>
              <Link
                href="/sign-in"
                className="text-black text-4xl font-bold hover:text-gray-800 transition-colors duration-200"
                onClick={() => setIsMenuOpen(false)}
              >
                Sign In
              </Link>
            </div>
          </motion.div>
        )}

        {/* Content */}
        <div className="flex min-h-screen items-center justify-center p-4 pt-[calc(6rem+env(safe-area-inset-top))] sm:pt-[calc(8rem+env(safe-area-inset-top))]">
          <div className="w-full max-w-md relative z-10">
            <SignUp
              routing="path"
              path="/sign-up"
              signInUrl="/sign-in"
              forceRedirectUrl="/chat"
              fallbackRedirectUrl="/chat"
            />
          </div>
        </div>
      </div>
    </>
  );
}
