import WallpaperExplorer from "./wallpaper-explorer";

export const dynamic = "force-dynamic";

const githubOwner = "FemaDongz";
const githubRepo = "Wallpapers";
const githubBranch = "main";
const githubImageBase =
  "https://raw.githubusercontent.com/FemaDongz/Wallpapers/main/Image";
const jsDelivrFileListUrl =
  "https://data.jsdelivr.com/v1/package/gh/FemaDongz/Wallpapers@main/flat";

function createPreviewImageUrl(imageUrl) {
  return `https://wsrv.nl/?url=${encodeURIComponent(imageUrl)}&w=1280&h=720&fit=cover&output=webp&q=78`;
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
          const image = `${githubImageBase}/${folder}/${encodeURIComponent(file.name)}`;

          return {
            id: `${folder}-${file.name}`,
            title: createWallpaperTitle(file.name),
            filter: folder,
            fileName: file.name,
            image,
            previewImage: createPreviewImageUrl(image),
            ...createWallpaperStats(file.name, folder),
          };
        }),
    ).slice(0, imagesPerFolder);

    if (wallpapers.length === 0) {
      throw new Error(`No images found for ${folder}`);
    }

    return wallpapers;
  } catch {
    return [1, 2].map((index) => ({
      id: `${folder}-fallback-${index}`,
      title: `${folder} ${index}`,
      filter: folder,
      fileName: `${folder.toLowerCase()}${index}.jpeg`,
      image: `${githubImageBase}/${folder}/${folder.toLowerCase()}${index}.jpeg`,
      views: 0,
      downloads: 0,
    }));
  }
}

function createFallbackWallpapers(folder) {
  const fallbackFiles = [
    `${folder.toLowerCase()}1.jpeg`,
    `${folder.toLowerCase()}2.jpeg`,
  ];

  if (folder === "Midday") {
    fallbackFiles.unshift("AncinetCrsytal.jpeg", "AncientCrystal.jpeg");
  }

  return fallbackFiles.map((fileName) => {
    const image = `${githubImageBase}/${folder}/${encodeURIComponent(fileName)}`;

    return {
      id: `${folder}-fallback-${fileName}`,
      title: createWallpaperTitle(fileName),
      filter: folder,
      fileName,
      image,
      previewImage: createPreviewImageUrl(image),
      views: 0,
      downloads: 0,
    };
  });
}

async function getWallpapersFromJsDelivr() {
  const response = await fetch(jsDelivrFileListUrl, { cache: "no-store" });

  if (!response.ok) {
    throw new Error("jsDelivr file list failed");
  }

  const data = await response.json();

  if (!Array.isArray(data.files)) {
    throw new Error("jsDelivr file list invalid");
  }

  const wallpapers = data.files
    .filter((file) => /\/Image\/[^/]+\/[^/]+\.(png|jpe?g|webp|gif)$/i.test(file.name))
    .map((file) => {
      const [, , folder, fileName] = file.name.split("/");

      const image = `${githubImageBase}/${folder}/${encodeURIComponent(fileName)}`;

      return {
        id: `${folder}-${fileName}`,
        title: createWallpaperTitle(fileName),
        filter: folder,
        fileName,
        image,
        previewImage: createPreviewImageUrl(image),
        ...createWallpaperStats(fileName, folder),
      };
    })
    .filter((wallpaper) => weatherFolders.includes(wallpaper.filter));

  if (wallpapers.length === 0) {
    throw new Error("No jsDelivr wallpapers found");
  }

  return shuffleItems(wallpapers);
}

async function getRandomWallpapers() {
  try {
    return await getWallpapersFromJsDelivr();
  } catch {
    const groupedWallpapers = await Promise.all(
      weatherFolders.map((folder) => getWallpapersByFolder(folder)),
    );
    const wallpapers = shuffleItems(groupedWallpapers.flat());

    if (wallpapers.length > 0) {
      return wallpapers;
    }

    return shuffleItems(weatherFolders.flatMap((folder) => createFallbackWallpapers(folder)));
  }
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
