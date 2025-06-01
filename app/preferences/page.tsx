"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { motion } from "framer-motion";
import {
  Settings,
  Monitor,
  Moon,
  Sun,
  Globe,
  Bell,
  BellOff,
  Mail,
  Smartphone,
  Brain,
  Zap,
  Shield,
  Trash2,
  Save,
  ArrowLeft,
  Palette,
  Volume2,
  Eye,
  Lock,
  Database,
  Clock,
} from "lucide-react";
import Link from "next/link";

interface PreferenceSection {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
}

const PREFERENCE_SECTIONS: PreferenceSection[] = [
  {
    id: "appearance",
    title: "Appearance",
    description: "Customize the look and feel of your interface",
    icon: Palette,
    color: "purple",
  },
  {
    id: "notifications",
    title: "Notifications",
    description: "Manage how and when you receive notifications",
    icon: Bell,
    color: "blue",
  },
  {
    id: "ai",
    title: "AI Settings",
    description: "Configure AI model preferences and behavior",
    icon: Brain,
    color: "green",
  },
  {
    id: "privacy",
    title: "Privacy & Security",
    description: "Control your data and privacy settings",
    icon: Shield,
    color: "red",
  },
];

export default function PreferencesPage() {
  const preferences = useQuery(api.queries.getUserPreferences);
  const updatePreferences = useMutation(api.mutations.updateUserPreferences);

  const [activeSection, setActiveSection] = useState("appearance");
  const [formData, setFormData] = useState({
    theme: "dark" as "dark" | "light" | "system",
    language: "en",
    timezone: "UTC",
    emailNotifications: true,
    pushNotifications: true,
    weeklyDigest: true,
    defaultModel: "gpt-4",
    maxTokensPerRequest: 4000,
    temperature: 0.7,
    autoSaveChats: true,
    dataRetention: 90,
    shareUsageData: false,
  });

  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (preferences) {
      const newFormData = {
        theme: (preferences.theme || "dark") as "dark" | "light" | "system",
        language: preferences.language || "en",
        timezone: preferences.timezone || "UTC",
        emailNotifications: preferences.emailNotifications ?? true,
        pushNotifications: preferences.pushNotifications ?? true,
        weeklyDigest: preferences.weeklyDigest ?? true,
        defaultModel: preferences.defaultModel || "gpt-4",
        maxTokensPerRequest: preferences.maxTokensPerRequest || 4000,
        temperature: preferences.temperature || 0.7,
        autoSaveChats: preferences.autoSaveChats ?? true,
        dataRetention: preferences.dataRetention || 90,
        shareUsageData: preferences.shareUsageData ?? false,
      };
      setFormData(newFormData);
    }
  }, [preferences]);

  const handleSave = async () => {
    try {
      await updatePreferences(formData);
      setHasChanges(false);
    } catch (error) {
      console.error("Failed to update preferences:", error);
    }
  };

  const updateFormData = (key: string, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  if (!preferences) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lavender-400"></div>
      </div>
    );
  }

  const renderAppearanceSection = () => (
    <div className="space-y-6">
      {/* Theme Selection */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-3">Theme</h3>
        <div className="grid grid-cols-3 gap-3">
          {[
            { value: "dark", label: "Dark", icon: Moon },
            { value: "light", label: "Light", icon: Sun },
            { value: "system", label: "System", icon: Monitor },
          ].map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => updateFormData("theme", value)}
              className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                formData.theme === value
                  ? "border-lavender-500 bg-lavender-500/10"
                  : "border-gray-600 bg-gray-800/50 hover:border-gray-500"
              }`}
            >
              <Icon className="h-6 w-6 mx-auto mb-2 text-gray-300" />
              <span className="text-sm text-gray-300">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Language */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-3">Language</h3>
        <select
          value={formData.language}
          onChange={(e) => updateFormData("language", e.target.value)}
          className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-lavender-500 focus:outline-none"
        >
          <option value="en">English</option>
          <option value="es">Español</option>
          <option value="fr">Français</option>
          <option value="de">Deutsch</option>
          <option value="ja">日本語</option>
          <option value="zh">中文</option>
        </select>
      </div>

      {/* Timezone */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-3">Timezone</h3>
        <select
          value={formData.timezone}
          onChange={(e) => updateFormData("timezone", e.target.value)}
          className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-lavender-500 focus:outline-none"
        >
          <option value="UTC">UTC</option>
          <option value="America/New_York">Eastern Time</option>
          <option value="America/Chicago">Central Time</option>
          <option value="America/Denver">Mountain Time</option>
          <option value="America/Los_Angeles">Pacific Time</option>
          <option value="Europe/London">London</option>
          <option value="Europe/Paris">Paris</option>
          <option value="Asia/Tokyo">Tokyo</option>
          <option value="Asia/Shanghai">Shanghai</option>
        </select>
      </div>
    </div>
  );

  const renderNotificationsSection = () => (
    <div className="space-y-6">
      {/* Email Notifications */}
      <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg">
        <div className="flex items-center gap-3">
          <Mail className="h-5 w-5 text-blue-400" />
          <div>
            <h3 className="text-white font-medium">Email Notifications</h3>
            <p className="text-gray-400 text-sm">Receive updates via email</p>
          </div>
        </div>
        <button
          onClick={() =>
            updateFormData("emailNotifications", !formData.emailNotifications)
          }
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            formData.emailNotifications ? "bg-lavender-600" : "bg-gray-600"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              formData.emailNotifications ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      {/* Push Notifications */}
      <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg">
        <div className="flex items-center gap-3">
          <Smartphone className="h-5 w-5 text-green-400" />
          <div>
            <h3 className="text-white font-medium">Push Notifications</h3>
            <p className="text-gray-400 text-sm">
              Receive browser notifications
            </p>
          </div>
        </div>
        <button
          onClick={() =>
            updateFormData("pushNotifications", !formData.pushNotifications)
          }
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            formData.pushNotifications ? "bg-lavender-600" : "bg-gray-600"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              formData.pushNotifications ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      {/* Weekly Digest */}
      <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg">
        <div className="flex items-center gap-3">
          <Mail className="h-5 w-5 text-purple-400" />
          <div>
            <h3 className="text-white font-medium">Weekly Digest</h3>
            <p className="text-gray-400 text-sm">
              Weekly summary of your activity
            </p>
          </div>
        </div>
        <button
          onClick={() => updateFormData("weeklyDigest", !formData.weeklyDigest)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            formData.weeklyDigest ? "bg-lavender-600" : "bg-gray-600"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              formData.weeklyDigest ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>
    </div>
  );

  const renderAISection = () => (
    <div className="space-y-6">
      {/* Default Model */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-3">
          Default AI Model
        </h3>
        <select
          value={formData.defaultModel}
          onChange={(e) => updateFormData("defaultModel", e.target.value)}
          className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-lavender-500 focus:outline-none"
        >
          <option value="gpt-4">GPT-4</option>
          <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
          <option value="claude-3-opus">Claude 3 Opus</option>
          <option value="claude-3-sonnet">Claude 3 Sonnet</option>
          <option value="gemini-pro">Gemini Pro</option>
        </select>
      </div>

      {/* Max Tokens */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-3">
          Max Tokens per Request: {formData.maxTokensPerRequest}
        </h3>
        <input
          type="range"
          min="1000"
          max="8000"
          step="500"
          value={formData.maxTokensPerRequest}
          onChange={(e) =>
            updateFormData("maxTokensPerRequest", parseInt(e.target.value))
          }
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
        />
        <div className="flex justify-between text-sm text-gray-400 mt-1">
          <span>1,000</span>
          <span>8,000</span>
        </div>
      </div>

      {/* Temperature */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-3">
          Creativity Level: {formData.temperature}
        </h3>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={formData.temperature}
          onChange={(e) =>
            updateFormData("temperature", parseFloat(e.target.value))
          }
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
        />
        <div className="flex justify-between text-sm text-gray-400 mt-1">
          <span>Focused</span>
          <span>Creative</span>
        </div>
      </div>

      {/* Auto Save */}
      <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg">
        <div className="flex items-center gap-3">
          <Save className="h-5 w-5 text-green-400" />
          <div>
            <h3 className="text-white font-medium">Auto-save Chats</h3>
            <p className="text-gray-400 text-sm">
              Automatically save chat sessions
            </p>
          </div>
        </div>
        <button
          onClick={() =>
            updateFormData("autoSaveChats", !formData.autoSaveChats)
          }
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            formData.autoSaveChats ? "bg-lavender-600" : "bg-gray-600"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              formData.autoSaveChats ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>
    </div>
  );

  const renderPrivacySection = () => (
    <div className="space-y-6">
      {/* Data Retention */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-3">
          Data Retention: {formData.dataRetention} days
        </h3>
        <input
          type="range"
          min="30"
          max="365"
          step="30"
          value={formData.dataRetention}
          onChange={(e) =>
            updateFormData("dataRetention", parseInt(e.target.value))
          }
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
        />
        <div className="flex justify-between text-sm text-gray-400 mt-1">
          <span>30 days</span>
          <span>1 year</span>
        </div>
      </div>

      {/* Share Usage Data */}
      <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg">
        <div className="flex items-center gap-3">
          <Database className="h-5 w-5 text-blue-400" />
          <div>
            <h3 className="text-white font-medium">Share Usage Data</h3>
            <p className="text-gray-400 text-sm">
              Help improve our service with anonymous usage data
            </p>
          </div>
        </div>
        <button
          onClick={() =>
            updateFormData("shareUsageData", !formData.shareUsageData)
          }
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            formData.shareUsageData ? "bg-lavender-600" : "bg-gray-600"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              formData.shareUsageData ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      {/* Danger Zone */}
      <div className="border border-red-500/30 rounded-lg p-4 bg-red-500/5">
        <h3 className="text-red-400 font-semibold mb-2">Danger Zone</h3>
        <p className="text-gray-400 text-sm mb-4">
          These actions are irreversible. Please be certain before proceeding.
        </p>
        <button className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors">
          <Trash2 className="h-4 w-4" />
          Delete Account
        </button>
      </div>
    </div>
  );

  const renderSectionContent = () => {
    switch (activeSection) {
      case "appearance":
        return renderAppearanceSection();
      case "notifications":
        return renderNotificationsSection();
      case "ai":
        return renderAISection();
      case "privacy":
        return renderPrivacySection();
      default:
        return renderAppearanceSection();
    }
  };

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
              <h1 className="text-2xl font-bold text-white">Preferences</h1>
            </div>
            {hasChanges && (
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-4 py-2 bg-lavender-600 hover:bg-lavender-700 rounded-lg transition-colors"
              >
                <Save className="h-4 w-4" />
                Save Changes
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="space-y-2">
              {PREFERENCE_SECTIONS.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center gap-3 p-4 rounded-lg transition-all duration-200 ${
                    activeSection === section.id
                      ? "bg-lavender-600/20 border border-lavender-500/50"
                      : "bg-gray-800/50 hover:bg-gray-700/50 border border-transparent"
                  }`}
                >
                  <section.icon
                    className={`h-5 w-5 ${
                      activeSection === section.id
                        ? "text-lavender-400"
                        : "text-gray-400"
                    }`}
                  />
                  <div className="text-left">
                    <h3
                      className={`font-medium ${
                        activeSection === section.id
                          ? "text-white"
                          : "text-gray-300"
                      }`}
                    >
                      {section.title}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {section.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="lg:col-span-3">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-gray-900/50 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-6"
            >
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-white mb-2">
                  {
                    PREFERENCE_SECTIONS.find((s) => s.id === activeSection)
                      ?.title
                  }
                </h2>
                <p className="text-gray-400">
                  {
                    PREFERENCE_SECTIONS.find((s) => s.id === activeSection)
                      ?.description
                  }
                </p>
              </div>
              {renderSectionContent()}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
