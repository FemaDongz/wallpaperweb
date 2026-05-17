export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const videoUrl = searchParams.get("url");

  if (!videoUrl || !videoUrl.startsWith("https://www.tiktok.com/")) {
    return Response.json({ success: false, thumbnail: "" }, { status: 400 });
  }

  try {
    const response = await fetch(
      `https://www.tiktok.com/oembed?url=${encodeURIComponent(videoUrl)}`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36",
        },
        next: { revalidate: 1800 },
      },
    );

    if (!response.ok) {
      throw new Error("TikTok oEmbed failed");
    }

    const data = await response.json();

    return Response.json({
      success: true,
      thumbnail: data.thumbnail_url || "",
      title: data.title || "",
      author: data.author_name || "",
    });
  } catch {
    return Response.json({ success: false, thumbnail: "" }, { status: 502 });
  }
}
