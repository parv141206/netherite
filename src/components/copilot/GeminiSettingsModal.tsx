"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Key,
  Bot,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  ShieldCheck,
  Cpu,
} from "lucide-react";

interface GeminiSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApiKeySaved?: (apiKey: string, model: string) => void;
}

export const GEMINI_MODELS = [
  {
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    tag: "Recommended • Ultra Fast & Capable",
    description: "Best balance of reasoning, speed, and coding capabilities.",
  },
  {
    id: "gemini-1.5-flash",
    name: "Gemini 1.5 Flash",
    tag: "High Speed",
    description: "Lightweight, low latency for quick explanations and summaries.",
  },
  {
    id: "gemini-1.5-pro",
    name: "Gemini 1.5 Pro",
    tag: "Deep Reasoning",
    description: "Maximum analytical depth for complex engineering numericals.",
  },
];

export function GeminiSettingsModal({
  isOpen,
  onClose,
  onApiKeySaved,
}: GeminiSettingsModalProps) {
  const [apiKey, setApiKey] = useState("");
  const [selectedModel, setSelectedModel] = useState("gemini-2.5-flash");
  const [showKey, setShowKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedKey = localStorage.getItem("netherite_gemini_api_key") || "";
      const savedModel =
        localStorage.getItem("netherite_gemini_model") || "gemini-2.5-flash";
      setApiKey(savedKey);
      setSelectedModel(savedModel);
      setTestResult(null);
    }
  }, [isOpen]);

  const handleTestAndSave = async () => {
    const trimmed = apiKey.trim();
    if (!trimmed) {
      setTestResult({
        success: false,
        message: "Please enter a valid Google Gemini API Key.",
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      // Official Google Gemini API Endpoint validation
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${trimmed}`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "Hello! Respond with just the word: READY" }] }],
          generationConfig: { maxOutputTokens: 10 },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error?.message || `Google API error (Status ${response.status})`
        );
      }

      // Successful validation!
      localStorage.setItem("netherite_gemini_api_key", trimmed);
      localStorage.setItem("netherite_gemini_model", selectedModel);

      setTestResult({
        success: true,
        message: "Key verified successfully! Connected to Google Gemini.",
      });

      if (onApiKeySaved) {
        onApiKeySaved(trimmed, selectedModel);
      }

      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err?.message || "Failed to verify API key. Please check your key.",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleRemoveKey = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("netherite_gemini_api_key");
      setApiKey("");
      setTestResult({
        success: true,
        message: "API key removed from local storage.",
      });
      if (onApiKeySaved) {
        onApiKeySaved("", selectedModel);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[99999] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-card border border-border shadow-2xl rounded-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/20">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-semibold text-base text-foreground flex items-center gap-2">
                Gemini Copilot Configuration
              </h2>
              <p className="text-xs text-muted-foreground">
                Official, secure & client-side Google AI integration
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* Security Guarantee Banner */}
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs leading-relaxed">
            <ShieldCheck className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
            <div>
              <span className="font-semibold">100% Official & Private</span>: Your API key is stored strictly on your local browser. Requests are transmitted directly to Google&rsquo;s official Gemini API endpoints. No intermediary servers, no risk of account suspension.
            </div>
          </div>

          {/* API Key Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-purple-500" />
                Google Gemini API Key
              </label>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 font-medium"
              >
                <span>Get a free key</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                placeholder="AIzaSy..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-xs font-mono text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-2.5 text-xs text-muted-foreground hover:text-foreground font-mono"
              >
                {showKey ? "Hide" : "Show"}
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Create an API key in Google AI Studio. Free tier provides generous quotas.
            </p>
          </div>

          {/* Model Selector */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-blue-500" />
              Gemini Model
            </label>
            <div className="space-y-2">
              {GEMINI_MODELS.map((model) => {
                const isSelected = selectedModel === model.id;
                return (
                  <div
                    key={model.id}
                    onClick={() => setSelectedModel(model.id)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? "border-purple-500/60 bg-purple-500/10 text-foreground shadow-xs"
                        : "border-border/60 hover:bg-muted/40 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-foreground flex items-center gap-2">
                        {model.name}
                        {isSelected && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                        )}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-muted/60 text-muted-foreground border border-border/40">
                        {model.tag}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {model.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Status Message */}
          {testResult && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
                testResult.success
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                  : "bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400"
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-border bg-muted/20 flex items-center justify-between gap-3">
          {apiKey ? (
            <button
              type="button"
              onClick={handleRemoveKey}
              className="text-xs text-red-500 hover:text-red-600 transition-colors font-medium cursor-pointer"
            >
              Disconnect Key
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isTesting || !apiKey.trim()}
              onClick={handleTestAndSave}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer"
            >
              {isTesting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Verifying Key...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Save & Connect</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
