// HTML to Markdown converter (for Google Docs paste, .doc upload)
export function htmlToMarkdown(html: string): string {
  // Create a DOM parser
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const body = doc.body;

  function processNode(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent?.replace(/\n\s*/g, " ") || "";
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return "";

    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();
    const children = Array.from(el.childNodes).map(processNode).join("");

    switch (tag) {
      case "h1":
        return `\n# ${children.trim()}\n\n`;
      case "h2":
        return `\n## ${children.trim()}\n\n`;
      case "h3":
        return `\n### ${children.trim()}\n\n`;
      case "h4":
        return `\n#### ${children.trim()}\n\n`;
      case "h5":
        return `\n##### ${children.trim()}\n\n`;
      case "h6":
        return `\n###### ${children.trim()}\n\n`;
      case "p":
        return `\n${children.trim()}\n\n`;
      case "br":
        return "\n";
      case "strong":
      case "b":
        return `**${children.trim()}**`;
      case "em":
      case "i":
        return `*${children.trim()}*`;
      case "code":
        // If inside a <pre>, don't add backticks
        if (el.parentElement?.tagName.toLowerCase() === "pre") {
          return el.textContent || "";
        }
        return `\`${children.trim()}\``;
      case "pre": {
        const code = el.querySelector("code");
        const text = code ? code.textContent : el.textContent;
        const lang = code?.className?.match(/language-(\w+)/)?.[1] || "";
        return `\n\`\`\`${lang}\n${(text || "").trim()}\n\`\`\`\n\n`;
      }
      case "a": {
        const href = el.getAttribute("href") || "";
        if (href && children.trim()) {
          return `[${children.trim()}](${href})`;
        }
        return children;
      }
      case "img": {
        const src = el.getAttribute("src") || "";
        const alt = el.getAttribute("alt") || "image";
        return `\n![${alt}](${src})\n\n`;
      }
      case "ul":
        return `\n${children}\n`;
      case "ol":
        return `\n${children}\n`;
      case "li": {
        const parent = el.parentElement?.tagName.toLowerCase();
        if (parent === "ol") {
          const idx = Array.from(el.parentElement!.children).indexOf(el) + 1;
          return `${idx}. ${children.trim()}\n`;
        }
        return `- ${children.trim()}\n`;
      }
      case "blockquote":
        return `\n> ${children.trim().replace(/\n/g, "\n> ")}\n\n`;
      case "hr":
        return "\n---\n\n";
      case "table":
        return `\n${processTable(el)}\n\n`;
      case "div":
      case "section":
      case "article":
      case "main":
      case "span":
        return children;
      case "style":
      case "script":
      case "meta":
      case "link":
        return "";
      default:
        return children;
    }
  }

  function processTable(table: HTMLElement): string {
    const rows = Array.from(table.querySelectorAll("tr"));
    if (rows.length === 0) return "";

    const result: string[] = [];
    rows.forEach((row, rowIdx) => {
      const cells = Array.from(row.querySelectorAll("th, td"));
      const cellTexts = cells.map((c) => processNode(c).trim().replace(/\n/g, " "));
      result.push(`| ${cellTexts.join(" | ")} |`);
      if (rowIdx === 0) {
        result.push(`| ${cellTexts.map(() => "---").join(" | ")} |`);
      }
    });
    return result.join("\n");
  }

  let md = processNode(body);

  // Clean up
  md = md.replace(/\n{3,}/g, "\n\n"); // Max 2 consecutive newlines
  md = md.replace(/^\s+/, ""); // Trim leading whitespace
  md = md.replace(/\s+$/, "\n"); // Trim trailing, keep one newline

  return md;
}

// Token management
const STORAGE_KEY = "blogkit_tokens";

export function getTokens(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

export function saveTokens(tokens: Record<string, string>): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
}

export function isConnected(platform: string): boolean {
  const tokens = getTokens();
  return Boolean(tokens[platform]?.trim());
}

// Markdown to LinkedIn plain text
export function markdownToLinkedIn(md: string): string {
  let text = md;

  // Remove HTML comments
  text = text.replace(/<!--[\s\S]*?-->/g, "");

  // Headers → UPPERCASE with dividers
  text = text.replace(/^### (.+)$/gm, (_m, h) => `\n${h.toUpperCase()}\n`);
  text = text.replace(/^## (.+)$/gm, (_m, h) => `\n${"─".repeat(35)}\n\n${h.toUpperCase()}\n`);
  text = text.replace(/^# (.+)$/gm, (_m, h) => `${h.toUpperCase()}\n${"═".repeat(35)}\n`);

  // Bold
  text = text.replace(/\*\*(.+?)\*\*/g, "𝗕 $1");

  // Inline code
  text = text.replace(/`([^`]+)`/g, "'$1'");

  // Code blocks → placeholder
  let blockIdx = 0;
  text = text.replace(/```\w*\n[\s\S]*?```/g, () => {
    blockIdx++;
    return `\n[Code Block ${blockIdx} — see attached image]\n`;
  });

  // Links
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)");

  // Blockquotes
  text = text.replace(/^>\s*(.+)$/gm, "  → $1");

  // Bullets
  text = text.replace(/^- /gm, "• ");

  // Images
  text = text.replace(/!\[([^\]]*)\]\([^)]+\)/g, "[$1]");

  // Tables - remove separator rows, simplify
  text = text.replace(/\|[-:| ]+\|/g, "");
  text = text.replace(/^\|(.+)\|$/gm, (_m, row) =>
    row
      .split("|")
      .map((c: string) => c.trim())
      .join("  ")
  );

  // Clean excessive newlines
  text = text.replace(/\n{4,}/g, "\n\n\n");

  text += "\n\n─ ─ ─\n♻️ Repost if this was helpful\n🔔 Follow for more\n";

  return text.trim();
}

// Basic markdown to HTML (for clipboard)
export function markdownToHtml(md: string): string {
  let html = md;

  // Code blocks
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_m, lang, code) => {
    const cls = lang ? ` class="language-${lang}"` : "";
    return `<pre><code${cls}>${escapeHtml(code.trim())}</code></pre>`;
  });

  // Inline code
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

  // Headers
  html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");

  // Bold and italic
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");

  // Images
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // Blockquotes
  html = html.replace(/^>\s*(.+)$/gm, "<blockquote>$1</blockquote>");

  // Lists
  html = html.replace(/^- (.+)$/gm, "<li>$1</li>");

  // Paragraphs - wrap loose lines
  html = html.replace(/^(?!<[hpuolbd]|<li|<pre|<img|<block)(.+)$/gm, "<p>$1</p>");

  // HR
  html = html.replace(/^---$/gm, "<hr>");

  return html;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Extract title from markdown
export function extractTitle(md: string): string {
  const match = md.match(/^#\s+(.+)$/m);
  return match ? match[1] : "Untitled Post";
}

// Extract tags from markdown (looks for a line like "tags: tag1, tag2")
export function extractTags(md: string): string[] {
  const match = md.match(/^tags?:\s*(.+)$/im);
  if (match) {
    return match[1].split(",").map((t) => t.trim().toLowerCase());
  }
  return [];
}
