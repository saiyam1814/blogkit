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
      const result = await mammoth.convertToHtml({ buffer });
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

    return NextResponse.json({ markdown });
  } catch (err) {
    console.error("Document conversion error:", err);
    return NextResponse.json(
      { error: "Failed to convert document" },
      { status: 500 }
    );
  }
}
