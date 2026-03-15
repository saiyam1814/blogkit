"use client";

import React, { useState } from "react";
import {
  Send,
  Download,
  Copy,
  Settings,
  Check,
  AlertCircle,
  FileText,
  FileCode,
  Linkedin,
} from "lucide-react";
import {
  markdownToLinkedIn,
  markdownToHtml,
  markdownToMediumHtml,
  extractTitle,
  isConnected,
} from "@/lib/converter";
import { resolveForPublish } from "@/lib/images";

interface PublishBarProps {
  markdown: string;
  onOpenSettings: () => void;
  connectedPlatforms: Record<string, boolean>;
}

interface Toast {
  message: string;
  type: "success" | "error";
}

export default function PublishBar({
  markdown,
  onOpenSettings,
  connectedPlatforms,
}: PublishBarProps) {
  const [toast, setToast] = useState<Toast | null>(null);
  const [publishing, setPublishing] = useState<string | null>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(`${label} copied to clipboard!`, "success");
    } catch {
      showToast("Failed to copy to clipboard", "error");
    }
  };

  const copyRichHtml = async (html: string, label: string) => {
    try {
      const blob = new Blob([html], { type: "text/html" });
      const textBlob = new Blob([html], { type: "text/plain" });
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": blob,
          "text/plain": textBlob,
        }),
      ]);
      showToast(`${label} copied! Paste into Medium with Cmd/Ctrl+V`, "success");
    } catch {
      // Fallback to plain text copy
      await navigator.clipboard.writeText(html);
      showToast(`${label} copied as text (rich paste not supported in this browser)`, "success");
    }
  };

  const publishTo = async (platform: string) => {
    if (!isConnected(platform)) {
      onOpenSettings();
      return;
    }

    setPublishing(platform);
    try {
      const tokens = JSON.parse(localStorage.getItem("blogkit_tokens") || "{}");
      const title = extractTitle(markdown);
      // Resolve blob image URLs to base64 for publishing
      const resolvedMarkdown = await resolveForPublish(markdown);

      const res = await fetch(`/api/publish/${platform}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          markdown: resolvedMarkdown,
          tags: [],
          token: tokens[platform],
          published: false,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast(`Draft created on ${platform}! ${data.url || ""}`, "success");
      } else {
        showToast(`Failed: ${data.error || "Unknown error"}`, "error");
      }
    } catch (err) {
      showToast(`Error publishing to ${platform}: ${err}`, "error");
    } finally {
      setPublishing(null);
    }
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportDocx = async () => {
    try {
      const res = await fetch("/api/export/docx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markdown, title: extractTitle(markdown) }),
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "blog.doc";
      a.click();
      URL.revokeObjectURL(url);
      showToast("Downloaded blog.doc!", "success");
    } catch {
      showToast("Failed to export DOCX", "error");
    }
  };

  return (
    <>
      <div className="flex items-center gap-2 px-4 py-3 bg-slate-800 border-t border-slate-700 flex-wrap">
        {/* Publish buttons */}
        <div className="flex items-center gap-2">
          <PublishButton
            label="Hashnode"
            connected={connectedPlatforms.hashnode}
            publishing={publishing === "hashnode"}
            color="bg-blue-600 hover:bg-blue-500"
            onClick={() => publishTo("hashnode")}
          />
          <PublishButton
            label="Dev.to"
            connected={connectedPlatforms.devto}
            publishing={publishing === "devto"}
            color="bg-slate-600 hover:bg-slate-500"
            onClick={() => publishTo("devto")}
          />
          <button
            onClick={async () => {
              const resolved = await resolveForPublish(markdown);
              copyRichHtml(markdownToMediumHtml(resolved), "Medium HTML");
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white rounded-lg transition-colors bg-green-700 hover:bg-green-600"
          >
            <Copy size={13} />
            Copy for Medium
          </button>
        </div>

        <div className="w-px h-6 bg-slate-600 mx-1" />

        {/* Export buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => copyToClipboard(markdownToHtml(markdown), "HTML")}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-700 rounded transition-colors"
            title="Copy as HTML"
          >
            <Copy size={13} />
            HTML
          </button>
          <button
            onClick={() => copyToClipboard(markdownToLinkedIn(markdown), "LinkedIn text")}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-700 rounded transition-colors"
            title="Copy LinkedIn text"
          >
            <Linkedin size={13} />
            LinkedIn
          </button>
          <button
            onClick={() =>
              downloadFile(markdown, "blog.md", "text/markdown")
            }
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-700 rounded transition-colors"
            title="Download Markdown"
          >
            <FileCode size={13} />
            .md
          </button>
          <button
            onClick={exportDocx}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-700 rounded transition-colors"
            title="Download Word document"
          >
            <FileText size={13} />
            .doc
          </button>
          <button
            onClick={() => {
              const html = markdownToHtml(markdown);
              downloadFile(html, "blog.html", "text/html");
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-700 rounded transition-colors"
            title="Download HTML"
          >
            <Download size={13} />
            .html
          </button>
        </div>

        <div className="flex-1" />

        {/* Settings */}
        <button
          onClick={onOpenSettings}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
        >
          <Settings size={15} />
          <span className="hidden sm:inline">Platforms</span>
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium ${
            toast.type === "success"
              ? "bg-green-600 text-white"
              : "bg-red-600 text-white"
          }`}
        >
          {toast.type === "success" ? <Check size={16} /> : <AlertCircle size={16} />}
          {toast.message}
        </div>
      )}
    </>
  );
}

function PublishButton({
  label,
  connected,
  publishing,
  color,
  onClick,
}: {
  label: string;
  connected: boolean;
  publishing: boolean;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={publishing}
      className={`flex items-center gap-1.5 px-3 py-1.5 text-sm text-white rounded-lg transition-colors ${color} ${
        publishing ? "opacity-50 cursor-wait" : ""
      }`}
    >
      {publishing ? (
        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      ) : connected ? (
        <Send size={13} />
      ) : (
        <Settings size={13} />
      )}
      {publishing ? "Creating draft..." : connected ? label : `Connect ${label}`}
    </button>
  );
}
