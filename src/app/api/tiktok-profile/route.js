const tiktokUsername = "femzoo.mc";
const analyzerUrl = "https://tiktok-api-8czj.onrender.com/api/analyze";

function formatTikTokProfile(json) {
  const user = json?.data?.user ?? {};
  const stats = json?.data?.stats ?? {};

  return {
    username: user.uniqueId || tiktokUsername,
    nickname: user.nickname || "Femzoo",
    signature: user.signature || "Just A Minecraft Vibes 4k Ultra HD.",
    avatar: user.avatarLarger || user.avatarMedium || user.avatarThumb || "",
    verified: Boolean(user.verified),
    followers: stats.followerCount || 0,
    following: stats.followingCount || 0,
    likes: stats.heartCount || stats.heart || 0,
    videos: stats.videoCount || 0,
    posts: [],
  };
}

function formatTikTokPosts(json) {
  if (!json?.success || !Array.isArray(json.data)) {
    return [];
  }

  return json.data.slice(0, 6).map((video) => ({
    id: video.id,
    title: video.title || "TikTok video",
    views: video.views || 0,
    likes: video.likes || 0,
    comments: video.comments || 0,
    shares: video.shares || 0,
    cover: video.cover
      ? `/api/tiktok-cover?url=${encodeURIComponent(video.cover)}`
      : "",
    url: `https://www.tiktok.com/@${tiktokUsername}/video/${video.id}`,
  }));
}

async function getTikTokThumbnail(url) {
  try {
    const response = await fetch(
      `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 FemzooWallpaper/1.0",
        },
        next: { revalidate: 1800 },
      },
    );

    if (!response.ok) {
      return "";
    }

    const data = await response.json();
    return data.thumbnail_url || "";
  } catch {
    return "";
  }
}

async function enrichPostsWithThumbnails(posts) {
  return Promise.all(
    posts.map(async (post) => ({
      ...post,
      cover: (await getTikTokThumbnail(post.url)) || post.cover,
    })),
  );
}

export async function GET() {
  try {
    const profileResponse = await fetch(
      `https://www.tikwm.com/api/user/info?unique_id=${encodeURIComponent(tiktokUsername)}`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 FemzooWallpaper/1.0",
        },
        next: { revalidate: 1800 },
      },
    );

    if (!profileResponse.ok) {
      throw new Error("TikWM profile request failed");
    }

    const profileJson = await profileResponse.json();
    let posts = [];

    try {
      const postsResponse = await fetch(
        `${analyzerUrl}?username=${encodeURIComponent(tiktokUsername)}`,
        { next: { revalidate: 1800 } },
      );

      if (postsResponse.ok) {
        posts = await enrichPostsWithThumbnails(
          formatTikTokPosts(await postsResponse.json()),
        );
      }
    } catch {
      posts = [];
    }

    if (profileJson.code !== 0 || !profileJson.data?.user) {
      throw new Error("TikWM profile data invalid");
    }

    return Response.json({
      success: true,
      profile: {
        ...formatTikTokProfile(profileJson),
        posts,
      },
    });
  } catch {
    return Response.json({
      success: true,
      profile: {
        username: tiktokUsername,
        nickname: "Femzoo",
        signature: "Just A Minecraft Vibes 4k Ultra HD.",
        avatar: "/profile.png",
        verified: false,
        followers: 5149,
        following: 6,
        likes: 853245,
        videos: 11,
        posts: [],
      },
    });
  }
}
