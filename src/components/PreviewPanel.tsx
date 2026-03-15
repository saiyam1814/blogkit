"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import rehypeRaw from "rehype-raw";
import { markdownToLinkedIn, markdownToHtml } from "@/lib/converter";
import { resolveAllForPreview } from "@/lib/images";

interface PreviewPanelProps {
  markdown: string;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const TABS = [
  { id: "hashnode", label: "Hashnode", color: "bg-blue-500" },
  { id: "devto", label: "Dev.to", color: "bg-slate-600" },
  { id: "medium", label: "Medium", color: "bg-green-700" },
  { id: "linkedin", label: "LinkedIn", color: "bg-blue-700" },
  { id: "html", label: "HTML", color: "bg-orange-600" },
];

const hashnodeStyles = `
  .preview-hashnode { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1e293b; line-height: 1.8; }
  .preview-hashnode h1 { font-size: 2em; font-weight: 800; margin: 1em 0 0.5em; color: #0f172a; }
  .preview-hashnode h2 { font-size: 1.5em; font-weight: 700; margin: 1.2em 0 0.4em; color: #1e293b; border-bottom: 2px solid #e2e8f0; padding-bottom: 0.3em; }
  .preview-hashnode h3 { font-size: 1.25em; font-weight: 600; margin: 1em 0 0.3em; color: #334155; }
  .preview-hashnode p { margin: 0.8em 0; }
  .preview-hashnode a { color: #2563eb; text-decoration: none; }
  .preview-hashnode a:hover { text-decoration: underline; }
  .preview-hashnode code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 0.9em; color: #dc2626; }
  .preview-hashnode pre { background: #1e293b; color: #e2e8f0; padding: 16px; border-radius: 8px; overflow-x: auto; margin: 1em 0; }
  .preview-hashnode pre code { background: none; color: inherit; padding: 0; font-size: 0.85em; }
  .preview-hashnode blockquote { border-left: 4px solid #3b82f6; padding: 8px 16px; margin: 1em 0; background: #eff6ff; border-radius: 0 4px 4px 0; }
  .preview-hashnode img { max-width: 100%; border-radius: 8px; margin: 1em 0; display: block; height: auto; }
  .preview-hashnode table { border-collapse: collapse; width: 100%; margin: 1em 0; }
  .preview-hashnode th, .preview-hashnode td { border: 1px solid #e2e8f0; padding: 10px 14px; text-align: left; }
  .preview-hashnode th { background: #f8fafc; font-weight: 600; }
  .preview-hashnode ul, .preview-hashnode ol { padding-left: 1.5em; margin: 0.8em 0; }
  .preview-hashnode li { margin: 0.3em 0; }
  .preview-hashnode hr { border: none; border-top: 2px solid #e2e8f0; margin: 2em 0; }
`;

const devtoStyles = `
  .preview-devto { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #171717; line-height: 1.7; }
  .preview-devto h1 { font-size: 1.8em; font-weight: 800; margin: 0.8em 0 0.4em; }
  .preview-devto h2 { font-size: 1.4em; font-weight: 700; margin: 1em 0 0.3em; }
  .preview-devto h3 { font-size: 1.15em; font-weight: 600; margin: 0.8em 0 0.3em; }
  .preview-devto p { margin: 0.6em 0; }
  .preview-devto a { color: #3b49df; text-decoration: none; }
  .preview-devto code { background: #f5f5f5; padding: 2px 5px; border-radius: 3px; font-size: 0.9em; }
  .preview-devto pre { background: #282c34; color: #abb2bf; padding: 16px; border-radius: 6px; overflow-x: auto; margin: 1em 0; }
  .preview-devto pre code { background: none; color: inherit; padding: 0; }
  .preview-devto blockquote { border-left: 3px solid #3b49df; padding: 4px 16px; margin: 1em 0; color: #555; }
  .preview-devto img { max-width: 100%; border-radius: 6px; margin: 1em 0; display: block; height: auto; }
  .preview-devto table { border-collapse: collapse; width: 100%; margin: 1em 0; }
  .preview-devto th, .preview-devto td { border: 1px solid #ddd; padding: 8px 12px; }
  .preview-devto th { background: #f5f5f5; }
  .preview-devto ul, .preview-devto ol { padding-left: 1.5em; }
  .preview-devto li { margin: 0.2em 0; }
`;

const mediumStyles = `
  .preview-medium { font-family: Georgia, Cambria, 'Times New Roman', Times, serif; color: #292929; line-height: 1.9; letter-spacing: -0.003em; }
  .preview-medium h1 { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 2em; font-weight: 700; margin: 1.2em 0 0.4em; letter-spacing: -0.02em; }
  .preview-medium h2 { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 1.4em; font-weight: 600; margin: 1.4em 0 0.4em; letter-spacing: -0.015em; }
  .preview-medium h3 { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 1.2em; font-weight: 600; margin: 1em 0 0.4em; }
  .preview-medium p { margin: 1em 0; font-size: 1.05em; }
  .preview-medium a { color: inherit; text-decoration: underline; }
  .preview-medium code { background: #f2f2f2; padding: 3px 6px; border-radius: 3px; font-family: Menlo, Monaco, monospace; font-size: 0.85em; }
  .preview-medium pre { background: #f2f2f2; padding: 20px; border-radius: 0; overflow-x: auto; margin: 1.5em 0; border-left: 3px solid #292929; }
  .preview-medium pre code { background: none; font-size: 0.85em; }
  .preview-medium blockquote { border-left: 3px solid #292929; padding: 0 20px; margin: 1.5em 0; font-style: italic; color: #555; }
  .preview-medium img { max-width: 100%; margin: 1.5em 0; display: block; height: auto; }
  .preview-medium table { border-collapse: collapse; width: 100%; margin: 1em 0; }
  .preview-medium th, .preview-medium td { border: 1px solid #ddd; padding: 10px; }
  .preview-medium th { background: #f9f9f9; }
  .preview-medium ul, .preview-medium ol { padding-left: 1.5em; }
  .preview-medium li { margin: 0.4em 0; font-size: 1.05em; }
  .preview-medium hr { border: none; text-align: center; margin: 2em 0; }
  .preview-medium hr::before { content: "..."; font-size: 1.5em; letter-spacing: 0.6em; color: #999; }
`;

export default function PreviewPanel({
  markdown,
  activeTab,
  onTabChange,
}: PreviewPanelProps) {
  // Resolve upload:// refs to blob URLs for preview display
  const previewMarkdown = resolveAllForPreview(markdown);

  return (
    <div className="flex flex-col h-full bg-white rounded-lg overflow-hidden border border-slate-200">
      <style dangerouslySetInnerHTML={{ __html: hashnodeStyles + devtoStyles + mediumStyles }} />

      {/* Tabs */}
      <div className="flex items-center gap-1 px-3 py-2 bg-slate-50 border-b border-slate-200 flex-wrap">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? `${tab.color} text-white`
                : "text-slate-600 hover:bg-slate-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Preview content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === "linkedin" ? (
          <LinkedInPreview markdown={previewMarkdown} />
        ) : activeTab === "html" ? (
          <HtmlPreview markdown={previewMarkdown} />
        ) : (
          <div className={`preview-${activeTab} max-w-none`}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight, rehypeRaw]}
            >
              {previewMarkdown}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}

function LinkedInPreview({ markdown }: { markdown: string }) {
  const text = markdownToLinkedIn(markdown);
  return (
    <div className="max-w-xl mx-auto">
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
            K
          </div>
          <div>
            <div className="font-semibold text-sm text-slate-900">Kubesimplify</div>
            <div className="text-xs text-slate-500">Cloud Native · DevOps · Kubernetes</div>
          </div>
        </div>
        <pre className="whitespace-pre-wrap font-sans text-sm text-slate-800 leading-relaxed">
          {text}
        </pre>
        <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-400">
          ⚠️ Code blocks will need to be posted as carousel images. Use the code-images from export.
        </div>
      </div>
    </div>
  );
}

function HtmlPreview({ markdown }: { markdown: string }) {
  const html = markdownToHtml(markdown);
  return (
    <div>
      <div className="mb-3 text-sm text-slate-500">
        Raw HTML output — copy this for WordPress or email newsletters.
      </div>
      <pre className="bg-slate-900 text-green-400 p-4 rounded-lg text-xs overflow-x-auto leading-relaxed">
        {html}
      </pre>
    </div>
  );
}
