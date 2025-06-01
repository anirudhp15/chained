"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { motion } from "framer-motion";
import {
  User,
  Mail,
  MapPin,
  Building,
  Globe,
  Calendar,
  Edit3,
  Save,
  X,
  Camera,
  BarChart3,
  MessageSquare,
  Zap,
  DollarSign,
  Clock,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";

export default function ProfilePage() {
  const { user: clerkUser } = useUser();
  const user = useQuery(api.queries.getCurrentUser);
  const userStats = useQuery(api.queries.getUserStats);
  const userActivity = useQuery(api.queries.getUserActivity, { days: 30 });
  const updateProfile = useMutation(api.mutations.updateUserProfile);

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    bio: "",
    company: "",
    location: "",
    website: "",
    timezone: "",
  });

  // Initialize form data when user data loads
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || "",
        email: user.email || "",
        bio: user.bio || "",
        company: user.company || "",
        location: user.location || "",
        website: user.website || "",
        timezone: user.timezone || "",
      });
    }
  }, [user]);

  const handleSave = async () => {
    try {
      await updateProfile(formData);
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update profile:", error);
    }
  };

  const handleCancel = () => {
    if (user) {
      setFormData({
        name: user.name || "",
        email: user.email || "",
        bio: user.bio || "",
        company: user.company || "",
        location: user.location || "",
        website: user.website || "",
        timezone: user.timezone || "",
      });
    }
    setIsEditing(false);
  };

  if (!user || !userStats) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lavender-400"></div>
      </div>
    );
  }

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
              <h1 className="text-2xl font-bold text-white">Profile</h1>
            </div>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="flex items-center gap-2 px-4 py-2 bg-lavender-600 hover:bg-lavender-700 rounded-lg transition-colors"
            >
              <Edit3 className="h-4 w-4" />
              {isEditing ? "Cancel" : "Edit Profile"}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Profile Information */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gray-900/50 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-6"
            >
              <div className="flex items-start gap-6">
                {/* Profile Image */}
                <div className="relative">
                  <div className="w-24 h-24 bg-gradient-to-br from-lavender-500 to-purple-600 rounded-full flex items-center justify-center text-2xl font-bold">
                    {clerkUser?.imageUrl ? (
                      <img
                        src={clerkUser.imageUrl}
                        alt="Profile"
                        className="w-24 h-24 rounded-full object-cover"
                      />
                    ) : (
                      formData.name.charAt(0).toUpperCase() || "U"
                    )}
                  </div>
                  {isEditing && (
                    <button className="absolute -bottom-2 -right-2 p-2 bg-lavender-600 hover:bg-lavender-700 rounded-full transition-colors">
                      <Camera className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Profile Details */}
                <div className="flex-1 space-y-4">
                  {isEditing ? (
                    <div className="space-y-4">
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-lavender-500 focus:outline-none"
                        placeholder="Full Name"
                      />
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                        className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-lavender-500 focus:outline-none"
                        placeholder="Email"
                      />
                      <textarea
                        value={formData.bio}
                        onChange={(e) =>
                          setFormData({ ...formData, bio: e.target.value })
                        }
                        className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-lavender-500 focus:outline-none resize-none"
                        rows={3}
                        placeholder="Bio"
                      />
                    </div>
                  ) : (
                    <div>
                      <h2 className="text-2xl font-bold text-white">
                        {formData.name || "No name set"}
                      </h2>
                      <p className="text-gray-400 flex items-center gap-2 mt-1">
                        <Mail className="h-4 w-4" />
                        {formData.email}
                      </p>
                      {formData.bio && (
                        <p className="text-gray-300 mt-3">{formData.bio}</p>
                      )}
                    </div>
                  )}

                  {/* Additional Info */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    {isEditing ? (
                      <>
                        <input
                          type="text"
                          value={formData.company}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              company: e.target.value,
                            })
                          }
                          className="px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-lavender-500 focus:outline-none"
                          placeholder="Company"
                        />
                        <input
                          type="text"
                          value={formData.location}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              location: e.target.value,
                            })
                          }
                          className="px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-lavender-500 focus:outline-none"
                          placeholder="Location"
                        />
                        <input
                          type="url"
                          value={formData.website}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              website: e.target.value,
                            })
                          }
                          className="px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-lavender-500 focus:outline-none"
                          placeholder="Website"
                        />
                        <select
                          value={formData.timezone}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              timezone: e.target.value,
                            })
                          }
                          className="px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-lavender-500 focus:outline-none"
                        >
                          <option value="">Select Timezone</option>
                          <option value="UTC">UTC</option>
                          <option value="America/New_York">Eastern Time</option>
                          <option value="America/Chicago">Central Time</option>
                          <option value="America/Denver">Mountain Time</option>
                          <option value="America/Los_Angeles">
                            Pacific Time
                          </option>
                          <option value="Europe/London">London</option>
                          <option value="Europe/Paris">Paris</option>
                          <option value="Asia/Tokyo">Tokyo</option>
                        </select>
                      </>
                    ) : (
                      <>
                        {formData.company && (
                          <div className="flex items-center gap-2 text-gray-400">
                            <Building className="h-4 w-4" />
                            <span>{formData.company}</span>
                          </div>
                        )}
                        {formData.location && (
                          <div className="flex items-center gap-2 text-gray-400">
                            <MapPin className="h-4 w-4" />
                            <span>{formData.location}</span>
                          </div>
                        )}
                        {formData.website && (
                          <div className="flex items-center gap-2 text-gray-400">
                            <Globe className="h-4 w-4" />
                            <a
                              href={formData.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:text-lavender-400 transition-colors"
                            >
                              {formData.website}
                            </a>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-gray-400">
                          <Calendar className="h-4 w-4" />
                          <span>
                            Joined{" "}
                            {new Date(user.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Action Buttons */}
                  {isEditing && (
                    <div className="flex gap-3 pt-4">
                      <button
                        onClick={handleSave}
                        className="flex items-center gap-2 px-4 py-2 bg-lavender-600 hover:bg-lavender-700 rounded-lg transition-colors"
                      >
                        <Save className="h-4 w-4" />
                        Save Changes
                      </button>
                      <button
                        onClick={handleCancel}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                      >
                        <X className="h-4 w-4" />
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Activity Chart */}
            {userActivity && userActivity.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-gray-900/50 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-6"
              >
                <h3 className="text-lg font-semibold text-white mb-4">
                  Activity Overview (Last 30 Days)
                </h3>
                <div className="h-64 flex items-end gap-2">
                  {userActivity.map((day, index) => (
                    <div
                      key={day.date}
                      className="flex-1 flex flex-col items-center gap-1"
                    >
                      <div
                        className="w-full bg-gradient-to-t from-lavender-600 to-purple-500 rounded-t-sm min-h-[4px] transition-all duration-300 hover:from-lavender-500 hover:to-purple-400"
                        style={{
                          height: `${Math.max(
                            4,
                            (day.sessions /
                              Math.max(
                                ...userActivity.map((d) => d.sessions)
                              )) *
                              200
                          )}px`,
                        }}
                        title={`${day.date}: ${day.sessions} sessions, ${day.tokens} tokens`}
                      />
                      {index % 7 === 0 && (
                        <span className="text-xs text-gray-500 mt-1">
                          {new Date(day.date).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>

          {/* Stats Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-gray-900/50 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-6"
            >
              <h3 className="text-lg font-semibold text-white mb-4">
                Quick Stats
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/20 rounded-lg">
                      <MessageSquare className="h-4 w-4 text-blue-400" />
                    </div>
                    <span className="text-gray-300">Chat Sessions</span>
                  </div>
                  <span className="text-white font-semibold">
                    {userStats.totalSessions}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-500/20 rounded-lg">
                      <Zap className="h-4 w-4 text-purple-400" />
                    </div>
                    <span className="text-gray-300">Agent Steps</span>
                  </div>
                  <span className="text-white font-semibold">
                    {userStats.totalAgentSteps}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-500/20 rounded-lg">
                      <BarChart3 className="h-4 w-4 text-green-400" />
                    </div>
                    <span className="text-gray-300">Tokens Used</span>
                  </div>
                  <span className="text-white font-semibold">
                    {userStats.totalTokensUsed.toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-yellow-500/20 rounded-lg">
                      <DollarSign className="h-4 w-4 text-yellow-400" />
                    </div>
                    <span className="text-gray-300">Total Cost</span>
                  </div>
                  <span className="text-white font-semibold">
                    ${userStats.totalCost.toFixed(2)}
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Account Info */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-gray-900/50 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-6"
            >
              <h3 className="text-lg font-semibold text-white mb-4">
                Account Info
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Account Type</span>
                  <span className="text-white">Free Trial</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Member Since</span>
                  <span className="text-white">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Last Active</span>
                  <span className="text-white">
                    {new Date(user.lastSeen).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-gray-900/50 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-6"
            >
              <h3 className="text-lg font-semibold text-white mb-4">
                Quick Actions
              </h3>
              <div className="space-y-3">
                <Link
                  href="/preferences"
                  className="flex items-center gap-3 p-3 bg-gray-800/50 hover:bg-gray-700/50 rounded-lg transition-colors group"
                >
                  <div className="p-2 bg-lavender-500/20 rounded-lg group-hover:bg-lavender-500/30 transition-colors">
                    <User className="h-4 w-4 text-lavender-400" />
                  </div>
                  <span className="text-gray-300 group-hover:text-white transition-colors">
                    Preferences
                  </span>
                </Link>

                <Link
                  href="/billing"
                  className="flex items-center gap-3 p-3 bg-gray-800/50 hover:bg-gray-700/50 rounded-lg transition-colors group"
                >
                  <div className="p-2 bg-green-500/20 rounded-lg group-hover:bg-green-500/30 transition-colors">
                    <DollarSign className="h-4 w-4 text-green-400" />
                  </div>
                  <span className="text-gray-300 group-hover:text-white transition-colors">
                    Billing
                  </span>
                </Link>

                <Link
                  href="/chat"
                  className="flex items-center gap-3 p-3 bg-gray-800/50 hover:bg-gray-700/50 rounded-lg transition-colors group"
                >
                  <div className="p-2 bg-blue-500/20 rounded-lg group-hover:bg-blue-500/30 transition-colors">
                    <MessageSquare className="h-4 w-4 text-blue-400" />
                  </div>
                  <span className="text-gray-300 group-hover:text-white transition-colors">
                    Back to Chat
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
