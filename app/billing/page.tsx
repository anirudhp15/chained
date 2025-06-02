"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { motion } from "framer-motion";
import {
  CreditCard,
  DollarSign,
  TrendingUp,
  Calendar,
  Download,
  AlertCircle,
  CheckCircle,
  Clock,
  Zap,
  Star,
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  BarChart3,
  Activity,
  Package,
  Crown,
  Gift,
  X,
} from "lucide-react";
import Link from "next/link";

interface PlanFeature {
  name: string;
  included: boolean;
  limit?: string;
}

interface Plan {
  id: string;
  name: string;
  price: number;
  period: string;
  description: string;
  features: PlanFeature[];
  popular?: boolean;
  current?: boolean;
}

const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    price: 0,
    period: "month",
    description: "Perfect for getting started",
    features: [
      { name: "10 chat sessions", included: true, limit: "10/month" },
      { name: "Basic AI models", included: true },
      { name: "Standard support", included: true },
      { name: "Advanced models", included: false },
      { name: "Priority support", included: false },
      { name: "Custom integrations", included: false },
    ],
    current: true,
  },
  {
    id: "pro",
    name: "Pro",
    price: 29,
    period: "month",
    description: "For power users and professionals",
    popular: true,
    features: [
      { name: "Unlimited chat sessions", included: true },
      { name: "All AI models", included: true },
      { name: "Priority support", included: true },
      { name: "Advanced analytics", included: true },
      { name: "API access", included: true },
      { name: "Custom integrations", included: false },
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 99,
    period: "month",
    description: "For teams and organizations",
    features: [
      { name: "Everything in Pro", included: true },
      { name: "Custom integrations", included: true },
      { name: "Dedicated support", included: true },
      { name: "SLA guarantee", included: true },
      { name: "Custom models", included: true },
      { name: "On-premise deployment", included: true },
    ],
  },
];

export default function BillingPage() {
  const user = useQuery(api.queries.getCurrentUser);
  const userBilling = useQuery(api.queries.getUserBilling);
  const userStats = useQuery(api.queries.getUserStats);

  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">(
    "monthly"
  );

  if (!user || !userBilling || !userStats) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lavender-400"></div>
      </div>
    );
  }

  const currentUsage = {
    sessions: userStats.totalSessions,
    tokens: userStats.totalTokensUsed,
    cost: userStats.totalCost,
  };

  const usagePercentage = Math.min((currentUsage.sessions / 10) * 100, 100);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/chat"
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-gray-400" />
              </Link>
              <h1 className="text-2xl font-bold text-white">Billing & Usage</h1>
            </div>
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors">
                <Download className="h-4 w-4" />
                Download Invoice
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-lavender-600 hover:bg-lavender-700 rounded-lg transition-colors">
                <Plus className="h-4 w-4" />
                Add Payment Method
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Current Plan */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gray-900/50 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Current Plan</h2>
                <div className="flex items-center gap-2 px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm">
                  <CheckCircle className="h-4 w-4" />
                  Active
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="p-4 bg-gradient-to-br from-lavender-500 to-purple-600 rounded-xl">
                  <Gift className="h-8 w-8 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-white">Free Plan</h3>
                  <p className="text-gray-400">Perfect for getting started</p>
                  <div className="flex items-center gap-4 mt-2">
                    <span className="text-3xl font-bold text-white">$0</span>
                    <span className="text-gray-400">/month</span>
                  </div>
                </div>
                <button className="px-6 py-2 bg-lavender-600 hover:bg-lavender-700 rounded-lg transition-colors">
                  Upgrade Plan
                </button>
              </div>

              {/* Usage Progress */}
              <div className="mt-6 p-4 bg-gray-800/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-300">Chat Sessions Used</span>
                  <span className="text-white font-semibold">
                    {currentUsage.sessions} / 10
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-lavender-500 to-purple-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${usagePercentage}%` }}
                  />
                </div>
                {usagePercentage > 80 && (
                  <div className="flex items-center gap-2 mt-2 text-amber-400 text-sm">
                    <AlertCircle className="h-4 w-4" />
                    You're approaching your monthly limit
                  </div>
                )}
              </div>
            </motion.div>

            {/* Usage Statistics */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-gray-900/50 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-6"
            >
              <h2 className="text-xl font-bold text-white mb-6">
                Usage This Month
              </h2>
              <div className="grid sm:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="p-3 bg-blue-500/20 rounded-lg w-fit mx-auto mb-3">
                    <BarChart3 className="h-6 w-6 text-blue-400" />
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {currentUsage.sessions}
                  </div>
                  <div className="text-gray-400 text-sm">Chat Sessions</div>
                </div>

                <div className="text-center">
                  <div className="p-3 bg-green-500/20 rounded-lg w-fit mx-auto mb-3">
                    <Zap className="h-6 w-6 text-green-400" />
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {currentUsage.tokens.toLocaleString()}
                  </div>
                  <div className="text-gray-400 text-sm">Tokens Used</div>
                </div>

                <div className="text-center">
                  <div className="p-3 bg-purple-500/20 rounded-lg w-fit mx-auto mb-3">
                    <DollarSign className="h-6 w-6 text-purple-400" />
                  </div>
                  <div className="text-2xl font-bold text-white">
                    ${currentUsage.cost.toFixed(2)}
                  </div>
                  <div className="text-gray-400 text-sm">Total Cost</div>
                </div>
              </div>
            </motion.div>

            {/* Available Plans */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-gray-900/50 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">
                  Available Plans
                </h2>
                <div className="flex items-center gap-2 p-1 bg-gray-800 rounded-lg">
                  <button
                    onClick={() => setBillingPeriod("monthly")}
                    className={`px-3 py-1 rounded text-sm transition-colors ${
                      billingPeriod === "monthly"
                        ? "bg-lavender-600 text-white"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    onClick={() => setBillingPeriod("yearly")}
                    className={`px-3 py-1 rounded text-sm transition-colors ${
                      billingPeriod === "yearly"
                        ? "bg-lavender-600 text-white"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    Yearly
                  </button>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                {PLANS.map((plan) => (
                  <div
                    key={plan.id}
                    className={`relative p-6 rounded-xl border-2 transition-all duration-200 ${
                      plan.popular
                        ? "border-lavender-500 bg-lavender-500/5"
                        : plan.current
                          ? "border-green-500 bg-green-500/5"
                          : "border-gray-600 bg-gray-800/50 hover:border-gray-500"
                    }`}
                  >
                    {plan.popular && (
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                        <div className="flex items-center gap-1 px-3 py-1 bg-lavender-600 text-white rounded-full text-xs font-medium">
                          <Star className="h-3 w-3" />
                          Most Popular
                        </div>
                      </div>
                    )}

                    {plan.current && (
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                        <div className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded-full text-xs font-medium">
                          <CheckCircle className="h-3 w-3" />
                          Current Plan
                        </div>
                      </div>
                    )}

                    <div className="text-center mb-6">
                      <h3 className="text-xl font-bold text-white mb-2">
                        {plan.name}
                      </h3>
                      <p className="text-gray-400 text-sm mb-4">
                        {plan.description}
                      </p>
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-3xl font-bold text-white">
                          $
                          {billingPeriod === "yearly"
                            ? plan.price * 10
                            : plan.price}
                        </span>
                        <span className="text-gray-400">
                          /{billingPeriod === "yearly" ? "year" : "month"}
                        </span>
                      </div>
                      {billingPeriod === "yearly" && plan.price > 0 && (
                        <div className="text-green-400 text-sm mt-1">
                          Save 2 months free!
                        </div>
                      )}
                    </div>

                    <div className="space-y-3 mb-6">
                      {plan.features.map((feature, index) => (
                        <div key={index} className="flex items-center gap-3">
                          {feature.included ? (
                            <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
                          ) : (
                            <X className="h-4 w-4 text-gray-500 flex-shrink-0" />
                          )}
                          <span
                            className={`text-sm ${
                              feature.included
                                ? "text-gray-300"
                                : "text-gray-500"
                            }`}
                          >
                            {feature.name}
                            {feature.limit && (
                              <span className="text-gray-500 ml-1">
                                ({feature.limit})
                              </span>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>

                    <button
                      disabled={plan.current}
                      className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                        plan.current
                          ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                          : plan.popular
                            ? "bg-lavender-600 hover:bg-lavender-700 text-white"
                            : "bg-gray-700 hover:bg-gray-600 text-white"
                      }`}
                    >
                      {plan.current
                        ? "Current Plan"
                        : `Upgrade to ${plan.name}`}
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Payment Methods */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-gray-900/50 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-6"
            >
              <h3 className="text-lg font-semibold text-white mb-4">
                Payment Methods
              </h3>
              <div className="space-y-3">
                <div className="p-4 bg-gray-800/50 rounded-lg border-2 border-dashed border-gray-600">
                  <div className="text-center">
                    <CreditCard className="h-8 w-8 text-gray-500 mx-auto mb-2" />
                    <p className="text-gray-400 text-sm mb-3">
                      No payment methods added
                    </p>
                    <button className="text-lavender-400 hover:text-lavender-400 text-sm font-medium">
                      Add Payment Method
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Billing History */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-gray-900/50 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-6"
            >
              <h3 className="text-lg font-semibold text-white mb-4">
                Recent Invoices
              </h3>
              <div className="space-y-3">
                <div className="text-center py-8">
                  <Calendar className="h-8 w-8 text-gray-500 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">No invoices yet</p>
                  <p className="text-gray-500 text-xs mt-1">
                    Invoices will appear here after your first payment
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Support */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-gray-900/50 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-6"
            >
              <h3 className="text-lg font-semibold text-white mb-4">
                Need Help?
              </h3>
              <div className="space-y-3">
                <Link
                  href="/support"
                  className="flex items-center gap-3 p-3 bg-gray-800/50 hover:bg-gray-700/50 rounded-lg transition-colors group"
                >
                  <div className="p-2 bg-blue-500/20 rounded-lg group-hover:bg-blue-500/30 transition-colors">
                    <AlertCircle className="h-4 w-4 text-blue-400" />
                  </div>
                  <span className="text-gray-300 group-hover:text-white transition-colors">
                    Contact Support
                  </span>
                </Link>

                <Link
                  href="/docs/billing"
                  className="flex items-center gap-3 p-3 bg-gray-800/50 hover:bg-gray-700/50 rounded-lg transition-colors group"
                >
                  <div className="p-2 bg-green-500/20 rounded-lg group-hover:bg-green-500/30 transition-colors">
                    <Package className="h-4 w-4 text-green-400" />
                  </div>
                  <span className="text-gray-300 group-hover:text-white transition-colors">
                    Billing FAQ
                  </span>
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
