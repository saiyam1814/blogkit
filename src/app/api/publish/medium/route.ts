import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { title, markdown, tags, token } = await req.json();

    if (!token) {
      return NextResponse.json({ success: false, error: "No Medium token provided" }, { status: 400 });
    }

    // Get user ID
    const meRes = await fetch("https://api.medium.com/v1/me", {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    const meData = await meRes.json();

    if (!meRes.ok || !meData.data?.id) {
      return NextResponse.json(
        { success: false, error: "Invalid Medium token or could not fetch user" },
        { status: 401 }
      );
    }

    const userId = meData.data.id;

    // Create post
    const postRes = await fetch(`https://api.medium.com/v1/users/${userId}/posts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        title,
        contentFormat: "markdown",
        content: markdown,
        tags: tags?.slice(0, 5) || [],
        publishStatus: "draft",
      }),
    });

    const postData = await postRes.json();

    if (!postRes.ok) {
      return NextResponse.json(
        { success: false, error: postData.errors?.[0]?.message || "Medium API error" },
        { status: postRes.status }
      );
    }

    return NextResponse.json({
      success: true,
      url: postData.data?.url || "",
      id: postData.data?.id || "",
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: `Server error: ${error}` },
      { status: 500 }
    );
  }
}
