export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const coverUrl = searchParams.get("url");

  if (!coverUrl || !/^https:\/\//i.test(coverUrl)) {
    return new Response("Invalid cover url", { status: 400 });
  }

  try {
    const response = await fetch(coverUrl, {
      headers: {
        Referer: "https://www.tiktok.com/",
        Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36",
      },
      next: { revalidate: 1800 },
    });

    if (!response.ok) {
      throw new Error("Cover request failed");
    }

    return new Response(response.body, {
      headers: {
        "Content-Type": response.headers.get("content-type") || "image/jpeg",
        "Cache-Control": "public, max-age=1800, stale-while-revalidate=86400",
      },
    });
  } catch {
    return new Response("Cover unavailable", { status: 502 });
  }
}
