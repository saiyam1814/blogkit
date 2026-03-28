import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";
// @ts-expect-error no type declarations
import WordExtractor from "word-extractor";
import TurndownService from "turndown";

const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  bulletListMarker: "-",
});

// Map common Word code/preformatted styles to <pre> so turndown picks them up
const codeStyleMap = [
  "p[style-name='Code'] => pre:separator('\\n')",
  "p[style-name='Code Block'] => pre:separator('\\n')",
  "p[style-name='Preformatted'] => pre:separator('\\n')",
  "p[style-name='Preformatted Text'] => pre:separator('\\n')",
  "p[style-name='HTML Preformatted'] => pre:separator('\\n')",
  "p[style-name='Source Code'] => pre:separator('\\n')",
  "p[style-name='macro'] => pre:separator('\\n')",
  "p[style-name='Plain Text'] => pre:separator('\\n')",
  "p[style-name='CodeBlock'] => pre:separator('\\n')",
  "p[style-name='OutputBlock'] => pre:separator('\\n')",
  "r[style-name='Code Char'] => code",
  "r[style-name='HTML Code'] => code",
  "r[style-name='Verbatim Char'] => code",
];

const CLI_PATTERN =
  /^(gcloud|kubectl|docker|helm|terraform|aws |az |npm |yarn |pip |curl |wget |git |make |cargo |go run|go build|python |ruby |java |mvn |gradle |apt|yum|brew |sudo |chmod |chown |mkdir |cp |mv |rm |ls |cat |echo |export |cd |ssh |scp |rsync )/;

function isCodeLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (/\\\s*$/.test(trimmed)) return true;
  if (/^\$\s/.test(trimmed)) return true;
  if (/^#!\s*\//.test(trimmed)) return true;
  if (CLI_PATTERN.test(trimmed)) return true;
  if (/^--[\w-]/.test(trimmed)) return true;
  return false;
}

/** Detect CLI commands/shell snippets and wrap them in fenced code blocks */
function wrapDetectedCodeBlocks(md: string): string {
  const lines = md.split("\n");
  const result: string[] = [];
  let inExistingCodeBlock = false;
  let codeBuffer: string[] = [];

  function flushCode() {
    // Pull trailing blank lines out of the buffer
    const trailingBlanks: string[] = [];
    while (codeBuffer.length > 0 && !codeBuffer[codeBuffer.length - 1].trim()) {
      trailingBlanks.unshift(codeBuffer.pop()!);
    }
    if (codeBuffer.length > 0) {
      result.push("```");
      result.push(...codeBuffer);
      result.push("```");
    }
    result.push(...trailingBlanks);
    codeBuffer = [];
  }

  for (const line of lines) {
    // Respect existing fenced code blocks
    if (/^```/.test(line.trim())) {
      flushCode();
      inExistingCodeBlock = !inExistingCodeBlock;
      result.push(line);
      continue;
    }

    if (inExistingCodeBlock) {
      result.push(line);
      continue;
    }

    if (isCodeLine(line)) {
      codeBuffer.push(line);
    } else if (!line.trim() && codeBuffer.length > 0) {
      // Blank line while buffering code — keep it (might separate commands)
      codeBuffer.push(line);
    } else {
      flushCode();
      result.push(line);
    }
  }

  flushCode();
  return result.join("\n");
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const name = file.name.toLowerCase();

    let markdown = "";

    if (name.endsWith(".docx")) {
      const result = await mammoth.convertToHtml(
        { buffer },
        { styleMap: codeStyleMap },
      );
      markdown = turndown.turndown(result.value);
    } else if (name.endsWith(".doc")) {
      const extractor = new WordExtractor();
      const doc = await extractor.extract(buffer);
      markdown = doc.getBody();
    } else if (name.endsWith(".html") || name.endsWith(".htm")) {
      const html = buffer.toString("utf-8");
      markdown = turndown.turndown(html);
    } else {
      return NextResponse.json(
        { error: "Unsupported file type" },
        { status: 400 }
      );
    }

    // Post-process: detect CLI commands and wrap in code fences
    markdown = wrapDetectedCodeBlocks(markdown);

    return NextResponse.json({ markdown });
  } catch (err) {
    console.error("Document conversion error:", err);
    return NextResponse.json(
      { error: "Failed to convert document" },
      { status: 500 }
    );
  }
}
