"use client";

import React, { useRef, useCallback } from "react";
import {
  Bold,
  Italic,
  Code,
  Link,
  Image,
  Heading,
  List,
  Quote,
  Table2,
  Upload,
  FileUp,
  ClipboardPaste,
} from "lucide-react";
import { htmlToMarkdown } from "@/lib/converter";

interface EditorProps {
  value: string;
  onChange: (value: string) => void;
}

interface ToolbarAction {
  icon: React.ReactNode;
  label: string;
  prefix: string;
  suffix: string;
  block?: boolean;
}

const TOOLBAR_ACTIONS: ToolbarAction[] = [
  { icon: <Heading size={16} />, label: "Heading", prefix: "## ", suffix: "", block: true },
  { icon: <Bold size={16} />, label: "Bold", prefix: "**", suffix: "**" },
  { icon: <Italic size={16} />, label: "Italic", prefix: "*", suffix: "*" },
  { icon: <Code size={16} />, label: "Code", prefix: "`", suffix: "`" },
  { icon: <Link size={16} />, label: "Link", prefix: "[", suffix: "](url)" },
  { icon: <Image size={16} />, label: "Image", prefix: "![alt](", suffix: ")" },
  { icon: <List size={16} />, label: "List", prefix: "- ", suffix: "", block: true },
  { icon: <Quote size={16} />, label: "Quote", prefix: "> ", suffix: "", block: true },
  {
    icon: <Table2 size={16} />,
    label: "Table",
    prefix: "| Column 1 | Column 2 |\n|----------|----------|\n| ",
    suffix: " | data |",
    block: true,
  },
];

export default function Editor({ value, onChange }: EditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const cursorPosRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 });

  // Save cursor position whenever textarea is focused/clicked/typed
  const saveCursorPos = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      cursorPosRef.current = { start: textarea.selectionStart, end: textarea.selectionEnd };
    }
  };

  const insertMarkdown = useCallback(
    (action: ToolbarAction) => {
      const { start, end } = cursorPosRef.current;
      const selected = value.substring(start, end);
      const before = value.substring(0, start);
      const after = value.substring(end);

      let newText: string;
      let cursorPos: number;

      if (action.block && !selected) {
        const needsNewline = before.length > 0 && !before.endsWith("\n") ? "\n" : "";
        newText = before + needsNewline + action.prefix + action.suffix + after;
        cursorPos = before.length + needsNewline.length + action.prefix.length;
      } else {
        const content = selected || "text";
        newText = before + action.prefix + content + action.suffix + after;
        cursorPos = before.length + action.prefix.length + content.length + action.suffix.length;
      }

      onChange(newText);
      setTimeout(() => {
        const textarea = textareaRef.current;
        if (textarea) {
          textarea.focus();
          textarea.setSelectionRange(cursorPos, cursorPos);
          cursorPosRef.current = { start: cursorPos, end: cursorPos };
        }
      }, 0);
    },
    [value, onChange]
  );

  const uploadImageToHashnode = async (file: File): Promise<string | null> => {
    try {
      const tokens = JSON.parse(localStorage.getItem("blogkit_tokens") || "{}");
      if (!tokens.hashnode) return null;

      // Get publication ID first
      const meRes = await fetch("/api/publish/hashnode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "get-upload-url", token: tokens.hashnode }),
      });

      // Use Hashnode's image upload via presigned URL
      // For now, convert to base64 data URL as a reliable fallback
      return null;
    } catch {
      return null;
    }
  };

  const handleImageUpload = async (file: File) => {
    // Try Hashnode CDN upload first
    const cdnUrl = await uploadImageToHashnode(file);

    if (cdnUrl) {
      insertImageAtCursor(file.name, cdnUrl);
    } else {
      // Fallback: convert to base64 data URL (works in preview, but large)
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          insertImageAtCursor(file.name, ev.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const insertImageAtCursor = (name: string, url: string) => {
    const { start } = cursorPosRef.current;
    const before = value.substring(0, start);
    const after = value.substring(start);
    const needsNewline = before.length > 0 && !before.endsWith("\n") ? "\n" : "";
    const imageMarkdown = `${needsNewline}![${name}](${url})\n`;
    onChange(before + imageMarkdown + after);
    const newPos = before.length + imageMarkdown.length;
    cursorPosRef.current = { start: newPos, end: newPos };
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;
      const start = textarea.selectionStart;
      const before = value.substring(0, start);
      const after = value.substring(textarea.selectionEnd);
      onChange(before + "  " + after);
      setTimeout(() => {
        textarea.setSelectionRange(start + 2, start + 2);
      }, 0);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const html = e.clipboardData.getData("text/html");
    if (html && html.includes("<")) {
      // Pasted from Google Docs, Word, or a webpage — convert to Markdown
      e.preventDefault();
      const md = htmlToMarkdown(html);
      const textarea = textareaRef.current;
      if (!textarea) return;
      const start = textarea.selectionStart;
      const before = value.substring(0, start);
      const after = value.substring(textarea.selectionEnd);
      onChange(before + md + after);
    }
    // Otherwise, let default paste (plain text) happen
  };

  const handlePasteFromDocs = async () => {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        if (item.types.includes("text/html")) {
          const blob = await item.getType("text/html");
          const html = await blob.text();
          const md = htmlToMarkdown(html);
          onChange(md);
          return;
        }
      }
      // Fallback to plain text
      const text = await navigator.clipboard.readText();
      onChange(text);
    } catch {
      // Clipboard API not available, prompt user
      alert("Copy your content from Google Docs first, then paste directly into the editor (Ctrl/Cmd+V). The HTML will auto-convert to Markdown.");
    }
  };

  const handleDocxUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) {
        // .docx files are ZIP archives, we can't parse them client-side easily
        // Instead, read as text for .doc (HTML-based) files
        const content = ev.target.result as string;
        if (content.includes("<html") || content.includes("<body")) {
          onChange(htmlToMarkdown(content));
        } else {
          onChange(content);
        }
      }
    };
    reader.readAsText(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type.startsWith("image/")) {
        handleImageUpload(file);
      } else if (file.name.endsWith(".md")) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          if (ev.target?.result) {
            onChange(ev.target.result as string);
          }
        };
        reader.readAsText(file);
      }
    }
  };

  // Stats
  const lines = value.split("\n").length;
  const words = value
    .trim()
    .split(/\s+/)
    .filter((w) => w).length;
  const chars = value.length;

  return (
    <div className="flex flex-col h-full bg-slate-900 rounded-lg overflow-hidden border border-slate-700">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-3 py-2 bg-slate-800 border-b border-slate-700 flex-wrap">
        {TOOLBAR_ACTIONS.map((action) => (
          action.label === "Image" ? (
            <button
              key={action.label}
              onClick={() => imageInputRef.current?.click()}
              title="Upload image"
              className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
            >
              {action.icon}
            </button>
          ) : (
            <button
              key={action.label}
              onClick={() => insertMarkdown(action)}
              title={action.label}
              className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
            >
              {action.icon}
            </button>
          )
        ))}
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleImageUpload(file);
            e.target.value = "";
          }}
        />
        <div className="flex-1" />
        <button
          onClick={handlePasteFromDocs}
          className="flex items-center gap-1.5 px-2 py-1 rounded text-xs text-slate-400 hover:bg-slate-700 hover:text-slate-200 transition-colors"
          title="Paste from Google Docs / clipboard (auto-converts HTML to Markdown)"
        >
          <ClipboardPaste size={14} />
          <span>Paste from Docs</span>
        </button>
        <label
          className="flex items-center gap-1.5 px-2 py-1 rounded text-xs text-slate-400 hover:bg-slate-700 hover:text-slate-200 cursor-pointer transition-colors"
          title="Upload .md or .doc file"
        >
          <Upload size={14} />
          <span>.md</span>
          <input
            type="file"
            accept=".md,.markdown,.txt"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                  if (ev.target?.result) onChange(ev.target.result as string);
                };
                reader.readAsText(file);
              }
            }}
          />
        </label>
        <label
          className="flex items-center gap-1.5 px-2 py-1 rounded text-xs text-slate-400 hover:bg-slate-700 hover:text-slate-200 cursor-pointer transition-colors"
          title="Upload .doc file (HTML-based Word doc)"
        >
          <FileUp size={14} />
          <span>.doc</span>
          <input
            type="file"
            accept=".doc,.html,.htm"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleDocxUpload(file);
            }}
          />
        </label>
      </div>

      {/* Editor area */}
      <div
        className="relative flex-1"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onSelect={saveCursorPos}
          onClick={saveCursorPos}
          onKeyUp={saveCursorPos}
          className="w-full h-full p-4 bg-slate-900 text-slate-200 font-mono text-sm resize-none outline-none placeholder-slate-600 leading-relaxed"
          placeholder="Start writing your blog post in Markdown..."
          spellCheck={false}
        />
        {isDragging && (
          <div className="absolute inset-0 bg-blue-500/20 border-2 border-dashed border-blue-400 rounded flex items-center justify-center z-10">
            <div className="text-blue-300 text-lg font-medium">
              Drop .md file or image here
            </div>
          </div>
        )}
      </div>

      {/* Status bar */}
      <div className="flex items-center gap-4 px-3 py-1.5 bg-slate-800 border-t border-slate-700 text-xs text-slate-500">
        <span>{lines} lines</span>
        <span>{words} words</span>
        <span>{chars} chars</span>
        <div className="flex-1" />
        <span>Markdown</span>
      </div>
    </div>
  );
}
