import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { title, markdown, tags, token } = await req.json();

    if (!token) {
      return NextResponse.json({ success: false, error: "No Hashnode token provided" }, { status: 400 });
    }

    // First, get the user's publication
    const meRes = await fetch("https://gql.hashnode.com", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token,
      },
      body: JSON.stringify({
        query: `query { me { publications(first: 1) { edges { node { id } } } } }`,
      }),
    });

    const meData = await meRes.json();
    const publicationId = meData?.data?.me?.publications?.edges?.[0]?.node?.id;

    if (!publicationId) {
      return NextResponse.json(
        { success: false, error: "Could not find your Hashnode publication. Make sure you have a blog set up." },
        { status: 400 }
      );
    }

    // Publish the post
    const publishRes = await fetch("https://gql.hashnode.com", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token,
      },
      body: JSON.stringify({
        query: `
          mutation PublishPost($input: PublishPostInput!) {
            publishPost(input: $input) {
              post {
                id
                url
                title
              }
            }
          }
        `,
        variables: {
          input: {
            title,
            contentMarkdown: markdown,
            publicationId,
            tags: tags?.length
              ? tags.map((t: string) => ({ slug: t.toLowerCase().replace(/\s+/g, "-"), name: t }))
              : [],
          },
        },
      }),
    });

    const publishData = await publishRes.json();

    if (publishData.errors) {
      return NextResponse.json(
        { success: false, error: publishData.errors[0]?.message || "Hashnode API error" },
        { status: 400 }
      );
    }

    const post = publishData?.data?.publishPost?.post;
    return NextResponse.json({
      success: true,
      url: post?.url || "",
      id: post?.id || "",
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: `Server error: ${error}` },
      { status: 500 }
    );
  }
}
