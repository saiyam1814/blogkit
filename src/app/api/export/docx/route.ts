import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { markdown, title } = await req.json();

    // Since pandoc isn't available on Vercel, we generate an HTML file
    // that Word can open directly (save as .doc)
    let html = markdown;

    // Code blocks
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_m: string, lang: string, code: string) => {
      const cls = lang ? ` class="language-${lang}"` : "";
      const escaped = code.trim().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      return `<pre style="background:#f4f4f4;padding:12px;border-radius:4px;font-family:Consolas,monospace;font-size:10pt;overflow-x:auto;"><code${cls}>${escaped}</code></pre>`;
    });

    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code style="background:#f4f4f4;padding:2px 4px;border-radius:2px;font-family:Consolas,monospace;">$1</code>');

    // Headers
    html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
    html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
    html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");

    // Bold and italic
    html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");

    // Images
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%;">');

    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

    // Blockquotes
    html = html.replace(/^>\s*(.+)$/gm, '<blockquote style="border-left:3px solid #ccc;padding:8px 16px;margin:8px 0;color:#555;">$1</blockquote>');

    // Lists
    html = html.replace(/^- (.+)$/gm, "<li>$1</li>");

    // Paragraphs
    html = html.replace(/^(?!<[hpuolbd]|<li|<pre|<img|<block)(.+)$/gm, "<p>$1</p>");

    // HR
    html = html.replace(/^---$/gm, "<hr>");

    const doc = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<title>${title || "Blog Post"}</title>
<style>
  body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; line-height: 1.6; max-width: 7in; margin: 0 auto; color: #333; }
  h1 { font-size: 20pt; color: #1a1a2e; }
  h2 { font-size: 16pt; color: #1e293b; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
  h3 { font-size: 13pt; color: #334155; }
  a { color: #2563eb; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
  th { background: #f5f5f5; }
</style>
</head>
<body>
${html}
</body>
</html>`;

    return new NextResponse(doc, {
      headers: {
        "Content-Type": "application/msword",
        "Content-Disposition": `attachment; filename="${(title || "blog").replace(/[^a-zA-Z0-9]/g, "-")}.doc"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: `Server error: ${error}` },
      { status: 500 }
    );
  }
}
