import WallpaperExplorer from "./wallpaper-explorer";

export const dynamic = "force-dynamic";

const githubOwner = "FemaDongz";
const githubRepo = "Wallpapers";
const githubBranch = "main";
const githubImageBase =
  "https://raw.githubusercontent.com/FemaDongz/Wallpapers/main/Image";

function createPreviewImageUrl(imageUrl, version) {
  const versionedImageUrl = version ? `${imageUrl}?v=${version}` : imageUrl;
  return `https://wsrv.nl/?url=${encodeURIComponent(versionedImageUrl)}&w=1280&h=720&fit=cover&output=webp&q=78`;
}

const filters = ["All", "Morning", "Midday", "Afternoon", "Evening"];
const weatherFolders = filters.filter((filter) => filter !== "All");
const imagesPerFolder = 12;

function shuffleItems(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

function createWallpaperTitle(fileName) {
  return fileName
    .replace(/\.[^/.]+$/, "")
    .replace(/([a-zA-Z]+)(\d+)/g, "$1 $2")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function createWallpaperStats(fileName, folder) {
  const seed = `${folder}-${fileName}`
    .split("")
    .reduce((total, letter) => total + letter.charCodeAt(0), 0);

  return {
    views: (seed % 84000) + 16000,
    downloads: (seed % 900) + 100,
  };
}

async function getWallpapersByFolder(folder) {
  const apiUrl = `https://api.github.com/repos/${githubOwner}/${githubRepo}/contents/Image/${folder}?ref=${githubBranch}`;

  try {
    const response = await fetch(apiUrl, { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`GitHub API failed for ${folder}`);
    }

    const files = await response.json();

    if (!Array.isArray(files)) {
      throw new Error(`GitHub API returned invalid files for ${folder}`);
    }

    const wallpapers = shuffleItems(
      files
        .filter(
          (file) =>
            file.type === "file" && /\.(png|jpe?g|webp|gif)$/i.test(file.name),
        )
        .map((file) => {
          const image =
            file.download_url ||
            `${githubImageBase}/${folder}/${encodeURIComponent(file.name)}`;

          return {
            id: `${folder}-${file.name}`,
            title: createWallpaperTitle(file.name),
            filter: folder,
            fileName: file.name,
            image,
            previewImage: createPreviewImageUrl(image, file.sha),
            ...createWallpaperStats(file.name, folder),
          };
        }),
    ).slice(0, imagesPerFolder);

    return wallpapers;
  } catch {
    return [];
  }
}

async function getRandomWallpapers() {
  const groupedWallpapers = await Promise.all(
    weatherFolders.map((folder) => getWallpapersByFolder(folder)),
  );
  const wallpapers = shuffleItems(groupedWallpapers.flat());

  if (wallpapers.length > 0) {
    return wallpapers;
  }

  return [];
}

export default async function Home() {
  const wallpapers = await getRandomWallpapers();

  return (
    <main className="min-h-screen bg-white p-1 sm:p-1.5 lg:p-2">
      <section className="relative min-h-[calc(100vh-0.5rem)] rounded-[1rem] bg-black p-4 text-white shadow-2xl shadow-black/20 sm:min-h-[calc(100vh-0.75rem)] sm:rounded-[1.25rem] sm:p-6 lg:min-h-[calc(100vh-1rem)] lg:rounded-[1.5rem] lg:p-8">
        <WallpaperExplorer filters={filters} wallpapers={wallpapers} />
      </section>
    </main>
  );
}
