"use client";

import { useState, useEffect } from "react";
import Editor from "@/components/Editor";
import PreviewPanel from "@/components/PreviewPanel";
import PublishBar from "@/components/PublishBar";
import SettingsModal from "@/components/SettingsModal";
import { getTokens } from "@/lib/converter";
import { PenLine } from "lucide-react";

const DEFAULT_MARKDOWN = `# My Awesome Blog Post

Write your blog post here in **Markdown** and see it previewed exactly as it will appear on each platform.

## Getting Started

BlogKit lets you:

- Write once in Markdown
- Preview for **Hashnode**, **Dev.to**, **Medium**, and **LinkedIn**
- Publish everywhere with one click
- Export to HTML, DOCX, or plain text

## Code Blocks

\`\`\`bash
# Install something cool
npm install blogkit
echo "Hello, world!"
\`\`\`

\`\`\`javascript
function greet(name) {
  return \`Hello, \${name}! Welcome to BlogKit.\`;
}
\`\`\`

## Tables

| Platform | Supports Markdown | API Available |
|----------|:-:|:-:|
| Hashnode | Yes | Yes |
| Dev.to | Yes | Yes |
| Medium | Partial | Yes |
| LinkedIn | No | Limited |

## Blockquotes

> "The best way to predict the future is to create it." — Peter Drucker

## Images

![Example image](https://placehold.co/800x400/1e293b/e2e8f0?text=Your+Image+Here)

## Next Steps

1. Connect your platforms in **Settings**
2. Write your post
3. Click **Publish** — done!

---

*Built with BlogKit by [Kubesimplify](https://kubesimplify.com)*
`;

export default function Home() {
  const [markdown, setMarkdown] = useState(DEFAULT_MARKDOWN);
  const [activeTab, setActiveTab] = useState("hashnode");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [connectedPlatforms, setConnectedPlatforms] = useState<Record<string, boolean>>({
    hashnode: false,
    devto: false,
  });

  useEffect(() => {
    const tokens = getTokens();
    setConnectedPlatforms({
      hashnode: Boolean(tokens.hashnode?.trim()),
      devto: Boolean(tokens.devto?.trim()),
    });
  }, []);

  const handleTokensSave = (tokens: Record<string, string>) => {
    setConnectedPlatforms({
      hashnode: Boolean(tokens.hashnode?.trim()),
      devto: Boolean(tokens.devto?.trim()),
    });
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2.5 bg-slate-800 border-b border-slate-700">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 bg-blue-600 rounded-lg">
            <PenLine size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white leading-tight">BlogKit</h1>
            <p className="text-[10px] text-slate-400 leading-tight">Write once, publish everywhere</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="https://github.com/kubesimplify/blogkit"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-slate-400 hover:text-white transition-colors"
          >
            GitHub
          </a>
          <span className="text-slate-600">|</span>
          <a
            href="https://kubesimplify.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-slate-400 hover:text-white transition-colors"
          >
            Built by <span className="text-blue-400">Kubesimplify</span>
          </a>
        </div>
      </header>

      {/* Main content - split panels */}
      <main className="flex-1 flex flex-col md:flex-row gap-3 p-3 overflow-hidden">
        {/* Editor panel */}
        <div className="flex-1 min-h-0 md:max-w-[50%]">
          <Editor value={markdown} onChange={setMarkdown} />
        </div>

        {/* Preview panel */}
        <div className="flex-1 min-h-0 md:max-w-[50%]">
          <PreviewPanel
            markdown={markdown}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        </div>
      </main>

      {/* Bottom publish bar */}
      <PublishBar
        markdown={markdown}
        onOpenSettings={() => setSettingsOpen(true)}
        connectedPlatforms={connectedPlatforms}
      />

      {/* Settings modal */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onSave={handleTokensSave}
      />
    </div>
  );
}
