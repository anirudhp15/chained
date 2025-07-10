"use client";

import React, { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { Info, X } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import {
  DEFAULT_PROMPT_TEMPLATES,
  CONNECTION_TYPES,
  type PromptTemplate,
  type EnabledConnectionType,
} from "@/lib/constants";
import {
  analyzeUserPatterns,
  generatePersonalizedTemplates,
} from "@/lib/template-personalization";
import type { Agent } from "./agent-input";
import { v4 as uuidv4 } from "uuid";

interface PromptTemplatesProps {
  onLoadTemplate: (agents: Agent[]) => void;
}

interface TemplateDetailModalProps {
  template: PromptTemplate;
  isOpen: boolean;
  onClose: () => void;
  onLoadTemplate: (agents: Agent[]) => void;
}

// Helper function to convert template to Agent format
const convertTemplateToAgents = (template: PromptTemplate): Agent[] => {
  return template.agents.map((templateAgent, index) => ({
    id: uuidv4(),
    name: templateAgent.name,
    prompt: templateAgent.prompt,
    model: templateAgent.model,
    connection: index === 0 ? undefined : templateAgent.connection,
    // Include default LLM parameters
    temperature: 0.5,
    top_p: 1,
    max_tokens: 1000,
    frequency_penalty: 0,
    presence_penalty: 0,
    // Initialize optional fields as undefined
    images: undefined,
    audioBlob: undefined,
    audioDuration: undefined,
    audioTranscription: undefined,
    webSearchData: undefined,
    webSearchEnabled: false,
    grokOptions: undefined,
    claudeOptions: undefined,
  }));
};

// Helper function to get connection type configuration
const getConnectionConfig = (type: EnabledConnectionType | "mixed") => {
  if (type === "mixed") {
    return {
      Icon: CONNECTION_TYPES[0].Icon, // Use direct as default for mixed
      color: "text-gray-400",
      label: "Mixed",
    };
  }

  const config = CONNECTION_TYPES.find((ct) => ct.type === type);
  return config
    ? {
        Icon: config.Icon,
        color: config.color,
        label: config.label,
        iconRotate: config.iconRotate,
      }
    : {
        Icon: CONNECTION_TYPES[0].Icon,
        color: "text-blue-400",
        label: "Direct",
      };
};

// Template Detail Modal Component
function TemplateDetailModal({
  template,
  isOpen,
  onClose,
  onLoadTemplate,
}: TemplateDetailModalProps) {
  if (!isOpen) return null;

  const handleLoadTemplate = () => {
    const agents = convertTemplateToAgents(template);
    onLoadTemplate(agents);
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700/50">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {(() => {
                const config = getConnectionConfig(
                  template.primaryConnectionType
                );
                const IconComponent = config.Icon;
                return (
                  <div
                    className={`p-2 rounded-lg bg-gray-800/50 ${config.color}`}
                  >
                    <IconComponent
                      size={20}
                      className={config.iconRotate || ""}
                    />
                  </div>
                );
              })()}
              <div>
                <h3 className="text-xl font-bold text-white">
                  {template.title}
                </h3>
                <p className="text-sm text-gray-400">{template.description}</p>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800/50 rounded-lg text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Template Info */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-gray-400">Agents:</span>
              <span className="text-white font-medium">
                {template.agentCount}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400">Connection Type:</span>
              <span className="text-white font-medium">
                {getConnectionConfig(template.primaryConnectionType).label}
              </span>
            </div>
          </div>

          {/* Agents List */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-white">Agent Workflow</h4>
            {template.agents.map((agent, index) => (
              <div
                key={index}
                className="bg-gray-800/30 border border-gray-700/50 rounded-lg p-4"
              >
                {/* Agent Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-lavender-500/20 rounded-full flex items-center justify-center text-lavender-400 font-medium text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <h5 className="font-medium text-white">{agent.name}</h5>
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <span>{agent.model}</span>
                        {index > 0 && agent.connection && (
                          <>
                            <span>•</span>
                            <span className="capitalize">
                              {agent.connection.type} connection
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Connection Type Icon */}
                  {index > 0 && agent.connection && (
                    <div className="flex items-center gap-1">
                      {(() => {
                        const config = getConnectionConfig(
                          agent.connection.type
                        );
                        const IconComponent = config.Icon;
                        return (
                          <div className={`p-1.5 rounded ${config.color}`}>
                            <IconComponent
                              size={16}
                              className={config.iconRotate || ""}
                            />
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>

                {/* Agent Prompt */}
                <div className="bg-gray-900/50 rounded-lg p-3">
                  <p className="text-sm text-gray-300 leading-relaxed">
                    {agent.prompt}
                  </p>
                </div>

                {/* Condition (if applicable) */}
                {agent.connection?.condition && (
                  <div className="mt-2 text-xs">
                    <span className="text-amber-400">Condition:</span>
                    <code className="ml-2 px-2 py-1 bg-amber-500/10 text-amber-300 rounded font-mono">
                      {agent.connection.condition}
                    </code>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Action Button */}
          <div className="flex justify-end pt-4 border-t border-gray-700/50">
            <button
              onClick={handleLoadTemplate}
              className="flex items-center gap-2 px-6 py-3 bg-lavender-500 hover:bg-lavender-600 text-white rounded-lg font-medium transition-colors shadow-lg hover:shadow-lavender-500/25"
            >
              Use This Template
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// Main PromptTemplates Component
export function PromptTemplates({ onLoadTemplate }: PromptTemplatesProps) {
  const [selectedTemplate, setSelectedTemplate] =
    useState<PromptTemplate | null>(null);

  // Get user's recent chains for personalization
  const recentChains = useQuery(api.queries.getChatSessionsDetailed);

  // Generate personalized templates based on user patterns
  const templates = useMemo(() => {
    if (!recentChains || recentChains.length === 0) {
      return DEFAULT_PROMPT_TEMPLATES;
    }

    // For now, use simple heuristics based on available metadata
    // TODO: Enhance with actual prompt analysis when needed
    const userChains = recentChains.slice(0, 10).map((chain) => ({
      title: chain.title || "",
      agentSteps: [] as Array<{
        prompt: string;
        model: string;
        connectionType?: string;
      }>, // Empty for now
    }));

    const analysis = analyzeUserPatterns(userChains);
    return generatePersonalizedTemplates(analysis, DEFAULT_PROMPT_TEMPLATES);
  }, [recentChains]);

  const handleTemplateClick = (template: PromptTemplate) => {
    const agents = convertTemplateToAgents(template);
    onLoadTemplate(agents);
  };

  const handleInfoClick = (template: PromptTemplate, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedTemplate(template);
  };

  return (
    <>
      {/* Desktop-only prompt templates */}
      <div className="hidden lg:block">
        <div className="grid grid-cols-4 gap-1.5 px-2 w-full max-w-3xl mx-auto">
          {templates.map((template) => {
            const config = getConnectionConfig(template.primaryConnectionType);
            const IconComponent = config.Icon;

            return (
              <button
                key={template.id}
                onClick={() => handleTemplateClick(template)}
                className="group relative bg-gray-800/30 hover:bg-gray-800/50 border border-gray-700/40 hover:border-gray-600/60 rounded-md p-2 transition-all duration-200 text-left"
              >
                {/* Info Button */}
                <div
                  onClick={(e) => handleInfoClick(template, e)}
                  className="absolute top-1 right-1 p-0.5 opacity-0 group-hover:opacity-100 bg-gray-700/70 hover:bg-gray-600/70 rounded text-gray-400 hover:text-white transition-all duration-200 z-10 cursor-pointer"
                >
                  <Info size={10} />
                </div>

                {/* Template Content */}
                <div className="space-y-1.5">
                  {/* Header with icon */}
                  <div className="flex items-center gap-1.5">
                    <div
                      className={`p-1 rounded ${config.color} bg-gray-700/20`}
                    >
                      <IconComponent
                        size={10}
                        className={config.iconRotate || ""}
                      />
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-gray-500">
                      <span>{template.agentCount}</span>
                      <span>•</span>
                      <span className="capitalize">{config.label}</span>
                    </div>
                  </div>

                  {/* Title */}
                  <h4 className="text-xs font-medium text-white group-hover:text-lavender-300 transition-colors line-clamp-1">
                    {template.title}
                  </h4>

                  {/* Description */}
                  <p className="text-[10px] text-gray-400 line-clamp-2 leading-tight">
                    {template.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Template Detail Modal */}
      {selectedTemplate && (
        <TemplateDetailModal
          template={selectedTemplate}
          isOpen={!!selectedTemplate}
          onClose={() => setSelectedTemplate(null)}
          onLoadTemplate={onLoadTemplate}
        />
      )}
    </>
  );
}
