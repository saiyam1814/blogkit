import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";
// @ts-expect-error no type declarations
import WordExtractor from "word-extractor";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const name = file.name.toLowerCase();

    let html = "";

    if (name.endsWith(".docx")) {
      const result = await mammoth.convertToHtml({ buffer });
      html = result.value;
    } else if (name.endsWith(".doc")) {
      const extractor = new WordExtractor();
      const doc = await extractor.extract(buffer);
      // word-extractor returns plain text; wrap paragraphs in <p> tags
      const body = doc.getBody();
      html = body
        .split(/\n/)
        .map((line: string) => (line.trim() ? `<p>${line}</p>` : ""))
        .join("\n");
    } else if (name.endsWith(".html") || name.endsWith(".htm")) {
      html = buffer.toString("utf-8");
    } else {
      return NextResponse.json(
        { error: "Unsupported file type" },
        { status: 400 }
      );
    }

    return NextResponse.json({ html });
  } catch (err) {
    console.error("Document conversion error:", err);
    return NextResponse.json(
      { error: "Failed to convert document" },
      { status: 500 }
    );
  }
}
