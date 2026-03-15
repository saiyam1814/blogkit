"use client";

import React, { useState, useEffect } from "react";
import { X, Eye, EyeOff, Check, ExternalLink, Trash2 } from "lucide-react";
import { getTokens, saveTokens } from "@/lib/converter";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (tokens: Record<string, string>) => void;
}

const PLATFORMS = [
  {
    id: "hashnode",
    name: "Hashnode",
    color: "bg-blue-500",
    tokenUrl: "https://hashnode.com/settings/developer",
    hint: "Settings → Developer → Personal Access Token",
  },
  {
    id: "devto",
    name: "Dev.to",
    color: "bg-slate-700",
    tokenUrl: "https://dev.to/settings/extensions",
    hint: "Settings → Extensions → DEV Community API Keys",
  },
];

export default function SettingsModal({ isOpen, onClose, onSave }: SettingsModalProps) {
  const [tokens, setTokens] = useState<Record<string, string>>({});
  const [showToken, setShowToken] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (isOpen) {
      setTokens(getTokens());
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSave = () => {
    saveTokens(tokens);
    onSave(tokens);
    onClose();
  };

  const handleClearAll = () => {
    setTokens({});
    saveTokens({});
    onSave({});
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-slate-800 rounded-xl w-full max-w-lg mx-4 shadow-2xl border border-slate-700">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-700">
          <div>
            <h2 className="text-lg font-bold text-white">Connect Your Platforms</h2>
            <p className="text-xs text-slate-400 mt-1">
              Tokens are stored only in your browser. Never sent to any server.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Platform tokens */}
        <div className="p-5 space-y-4">
          {PLATFORMS.map((platform) => (
            <div key={platform.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${platform.color}`} />
                  <span className="text-sm font-medium text-white">{platform.name}</span>
                  {tokens[platform.id]?.trim() && (
                    <Check size={14} className="text-green-400" />
                  )}
                </div>
                <a
                  href={platform.tokenUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
                >
                  Get token <ExternalLink size={10} />
                </a>
              </div>
              <div className="relative">
                <input
                  type={showToken[platform.id] ? "text" : "password"}
                  value={tokens[platform.id] || ""}
                  onChange={(e) =>
                    setTokens({ ...tokens, [platform.id]: e.target.value })
                  }
                  placeholder={platform.hint}
                  className="w-full px-3 py-2 pr-10 bg-slate-900 border border-slate-600 rounded-lg text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-blue-500 transition-colors"
                />
                <button
                  onClick={() =>
                    setShowToken({ ...showToken, [platform.id]: !showToken[platform.id] })
                  }
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showToken[platform.id] ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-5 border-t border-slate-700">
          <button
            onClick={handleClearAll}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded transition-colors"
          >
            <Trash2 size={14} />
            Clear All
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
