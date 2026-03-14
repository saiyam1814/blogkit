import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { title, markdown, tags, token, published } = await req.json();

    if (!token) {
      return NextResponse.json({ success: false, error: "No Dev.to token provided" }, { status: 400 });
    }

    const res = await fetch("https://dev.to/api/articles", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": token,
      },
      body: JSON.stringify({
        article: {
          title,
          body_markdown: markdown,
          tags: tags?.slice(0, 4) || [],
          published: published ?? false,
        },
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: data.error || data.message || "Dev.to API error" },
        { status: res.status }
      );
    }

    return NextResponse.json({
      success: true,
      url: data.url || `https://dev.to/${data.user?.username}/${data.slug}`,
      id: data.id,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: `Server error: ${error}` },
      { status: 500 }
    );
  }
}
