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
        query: `query { me { publications(first: 1) { edges { node { id url } } } } }`,
      }),
    });

    const meData = await meRes.json();
    const publication = meData?.data?.me?.publications?.edges?.[0]?.node;

    if (!publication?.id) {
      return NextResponse.json(
        { success: false, error: "Could not find your Hashnode publication. Make sure you have a blog set up." },
        { status: 400 }
      );
    }

    // Create a draft (not publish directly)
    const draftRes = await fetch("https://gql.hashnode.com", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token,
      },
      body: JSON.stringify({
        query: `
          mutation CreateDraft($input: CreateDraftInput!) {
            createDraft(input: $input) {
              draft {
                id
                title
                slug
              }
            }
          }
        `,
        variables: {
          input: {
            title,
            contentMarkdown: markdown,
            publicationId: publication.id,
            tags: tags?.length
              ? tags.map((t: string) => ({ slug: t.toLowerCase().replace(/\s+/g, "-"), name: t }))
              : [],
          },
        },
      }),
    });

    const draftData = await draftRes.json();

    if (draftData.errors) {
      return NextResponse.json(
        { success: false, error: draftData.errors[0]?.message || "Hashnode API error" },
        { status: 400 }
      );
    }

    const draft = draftData?.data?.createDraft?.draft;
    // Link to the draft in Hashnode dashboard
    const draftUrl = draft?.id
      ? `${publication.url}/draft/${draft.id}`
      : "";

    return NextResponse.json({
      success: true,
      url: draftUrl,
      id: draft?.id || "",
      isDraft: true,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: `Server error: ${error}` },
      { status: 500 }
    );
  }
}
