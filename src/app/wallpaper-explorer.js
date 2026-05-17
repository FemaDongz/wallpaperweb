"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

function normalizeText(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function formatCount(value) {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }

  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }

  return value.toString();
}

const initialVisibleCount = 6;
const loadMoreCount = 6;

const favoritesStorageKey = "femzoo-favorite-wallpapers";

function getFavoriteSnapshot() {
  if (typeof window === "undefined") {
    return "[]";
  }

  return window.localStorage.getItem(favoritesStorageKey) || "[]";
}

function subscribeFavorites(callback) {
  window.addEventListener("storage", callback);
  window.addEventListener("femzoo-favorites-change", callback);

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("femzoo-favorites-change", callback);
  };
}

function getInitialDownloadMode() {
  if (typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches) {
    return "mobile";
  }

  return "pc";
}

function getModeConfig(mode) {
  if (mode === "mobile") {
    return { label: "Mobile", description: "Portrait 9:16 crop", ratio: 9 / 16, needsCrop: true };
  }

  if (mode === "tablet") {
    return { label: "Tablet", description: "Portrait 3:4 crop", ratio: 3 / 4, needsCrop: true };
  }

  return { label: "Desktop", description: "Landscape 16:9", ratio: 16 / 9, needsCrop: false };
}

export default function WallpaperExplorer({ filters, wallpapers }) {
  const headerRef = useRef(null);
  const [activeFilter, setActiveFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCollectionsOpen, setIsCollectionsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [tiktokProfile, setTiktokProfile] = useState(null);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [selectedWallpaper, setSelectedWallpaper] = useState(null);
  const [downloadMode, setDownloadMode] = useState(getInitialDownloadMode);
  const [cropX, setCropX] = useState(50);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [loadedImages, setLoadedImages] = useState({});
  const favoriteSnapshot = useSyncExternalStore(
    subscribeFavorites,
    getFavoriteSnapshot,
    () => "[]",
  );
  const favoriteIds = useMemo(() => {
    try {
      const parsedFavorites = JSON.parse(favoriteSnapshot);
      return Array.isArray(parsedFavorites) ? parsedFavorites : [];
    } catch {
      return [];
    }
  }, [favoriteSnapshot]);
  const [visibleCount, setVisibleCount] = useState(initialVisibleCount);
  const [visibleScope, setVisibleScope] = useState("All-");
  const currentVisibleScope = `${activeFilter}-${searchQuery}`;
  const safeVisibleCount =
    visibleScope === currentVisibleScope ? visibleCount : initialVisibleCount;

  const filteredWallpapers = useMemo(() => {
    const normalizedQuery = normalizeText(searchQuery);
    const queryWords = normalizedQuery.split(" ").filter(Boolean);

    return wallpapers.filter((wallpaper) => {
      const matchesFilter =
        activeFilter === "All" ||
        wallpaper.filter === activeFilter ||
        (activeFilter === "Favorites" && favoriteIds.includes(wallpaper.id));

      if (!matchesFilter) {
        return false;
      }

      if (queryWords.length === 0) {
        return true;
      }

      const searchableText = normalizeText(
        `${wallpaper.title} ${wallpaper.filter} ${wallpaper.fileName}`,
      );

      return queryWords.every((word) => searchableText.includes(word));
    });
  }, [activeFilter, favoriteIds, searchQuery, wallpapers]);

  const visibleWallpapers = useMemo(
    () => filteredWallpapers.slice(0, safeVisibleCount),
    [filteredWallpapers, safeVisibleCount],
  );

  useEffect(() => {
    function closeMenuOnOutsideClick(event) {
      if (!headerRef.current?.contains(event.target)) {
        setIsMenuOpen(false);
        setIsCollectionsOpen(false);
      }
    }

    document.addEventListener("pointerdown", closeMenuOnOutsideClick);

    return () => {
      document.removeEventListener("pointerdown", closeMenuOnOutsideClick);
    };
  }, []);

  useEffect(() => {
    const shouldLockScroll = Boolean(selectedWallpaper || isProfileOpen);
    const previousOverflow = document.body.style.overflow;

    if (shouldLockScroll) {
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [selectedWallpaper, isProfileOpen]);

  function openCropModal(wallpaper) {
    setSelectedWallpaper(wallpaper);
    setDownloadMode(getInitialDownloadMode());
    setCropX(50);
    setDownloadProgress(0);
  }

  function selectFilter(filter) {
    setActiveFilter(filter);
    setSearchQuery("");
    setIsSearchOpen(false);
    setIsMenuOpen(false);
    setIsCollectionsOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function openProfile() {
    setIsProfileOpen(true);
    setIsMenuOpen(false);
    setIsCollectionsOpen(false);

    if (tiktokProfile || isProfileLoading) {
      return;
    }

    setIsProfileLoading(true);

    try {
      const response = await fetch("/api/tiktok-profile");
      const json = await response.json();
      setTiktokProfile(json.profile);
    } catch {
      setTiktokProfile(null);
    } finally {
      setIsProfileLoading(false);
    }
  }

  function openSearch() {
    setIsSearchOpen(true);
    setIsMenuOpen(false);
    setIsCollectionsOpen(false);
  }

  function closeSearch() {
    setSearchQuery("");
    setIsSearchOpen(false);
    setIsMenuOpen(false);
    setIsCollectionsOpen(false);
  }

  function toggleMenu() {
    setIsSearchOpen(false);
    setSearchQuery("");
    setIsMenuOpen((value) => !value);
  }

  function toggleFavorite(wallpaperId) {
    const nextIds = favoriteIds.includes(wallpaperId)
      ? favoriteIds.filter((id) => id !== wallpaperId)
      : [...favoriteIds, wallpaperId];

    window.localStorage.setItem(favoritesStorageKey, JSON.stringify(nextIds));
    window.dispatchEvent(new Event("femzoo-favorites-change"));
  }

  function updateCropX(value) {
    setCropX(Math.min(100, Math.max(0, Number(value) || 0)));
  }

  function handleMockupPointerMove(event) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const nextCropX = ((event.clientX - bounds.left) / bounds.width) * 100;
    updateCropX(Math.round(nextCropX));
  }

  async function downloadUpscaledWallpaper() {
    if (!selectedWallpaper || isDownloading) {
      return;
    }

    setIsDownloading(true);
    setDownloadProgress(12);

    try {
      const response = await fetch(selectedWallpaper.image);
      if (!response.ok) {
        throw new Error("Wallpaper image download failed");
      }

      const blob = await response.blob();
      const imageBitmap = await createImageBitmap(blob);
      setDownloadProgress(38);

      const scale = 1;
      const modeConfig = getModeConfig(downloadMode);
      const cropRatio = modeConfig.ratio;
      const cropWidth = Math.min(imageBitmap.width, Math.round(imageBitmap.height * cropRatio));
      const cropHeight = Math.min(imageBitmap.height, Math.round(cropWidth / cropRatio));
      const targetWidth = cropWidth * scale;
      const targetHeight = cropHeight * scale;
      const maxCropX = Math.max(0, imageBitmap.width - cropWidth);
      const maxCropY = Math.max(0, imageBitmap.height - cropHeight);
      const cropSourceX = modeConfig.needsCrop ? Math.round(maxCropX * (cropX / 100)) : 0;
      const cropSourceY = Math.round(maxCropY / 2);

      const canvas = document.createElement("canvas");
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      const context = canvas.getContext("2d");
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      setDownloadProgress(68);

      context.drawImage(
        imageBitmap,
        cropSourceX,
        cropSourceY,
        cropWidth,
        cropHeight,
        0,
        0,
        targetWidth,
        targetHeight,
      );

      canvas.toBlob((upscaledBlob) => {
        if (!upscaledBlob) {
          setIsDownloading(false);
          return;
        }

        const downloadUrl = URL.createObjectURL(upscaledBlob);
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download = `${selectedWallpaper.title.toLowerCase().replace(/\s+/g, "-")}-${downloadMode}.png`;
        link.click();
        URL.revokeObjectURL(downloadUrl);
        setDownloadProgress(100);

        setTimeout(() => {
          setIsDownloading(false);
          setSelectedWallpaper(null);
          setDownloadProgress(0);
        }, 500);
      }, "image/jpeg", 0.95);
    } catch {
      setIsDownloading(false);
      setDownloadProgress(0);
    }
  }

  return (
    <>
      <div className="scroll-glass scroll-glass-top" />
      <div className="scroll-glass scroll-glass-bottom" />

      <header ref={headerRef} className="sticky top-3 z-40 mb-10 flex w-full items-center justify-between gap-2 rounded-[0.8rem] bg-white/90 px-3 py-2 text-black shadow-xl shadow-black/15 ring-1 ring-black/5 backdrop-blur-md sm:top-4 sm:rounded-[1rem] sm:px-4 sm:py-2.5 lg:top-5 lg:rounded-[1.2rem]">
        <button onClick={openProfile} type="button" className={`min-w-0 items-center gap-3 text-left ${isSearchOpen || searchQuery ? "hidden sm:flex" : "flex"}`}>
          <span className="relative flex size-12 shrink-0 overflow-hidden rounded-[0.7rem] bg-black/5 ring-1 ring-black/10 sm:size-13 sm:rounded-[0.85rem]">
            <Image
              src={tiktokProfile?.avatar || "/profile.png"}
              alt="FemzooMC company profile"
              fill
              unoptimized
              sizes="52px"
              className="object-cover"
              priority
            />
          </span>
          <span className="truncate text-base font-black tracking-tight sm:text-xl">
            {tiktokProfile?.nickname || "FemzooMC"}
          </span>
        </button>

        <div className={`flex items-center gap-2 sm:gap-3 ${isSearchOpen || searchQuery ? "flex-1" : ""}`}>
          <label className={`flex h-11 items-center gap-2 rounded-[0.7rem] bg-black/[0.06] text-xs font-black text-black/70 focus-within:bg-black/10 sm:justify-start sm:rounded-[0.85rem] ${isSearchOpen || searchQuery ? "flex-1 px-3 sm:px-4" : "w-11 justify-center px-0 sm:w-64 sm:justify-start sm:px-4"}`}>
            <button
              className="flex size-7 shrink-0 items-center justify-center text-lg leading-none"
              onClick={openSearch}
              type="button"
              aria-label="Open search"
            >
              ⌕
            </button>
            <input
              className={`bg-transparent text-xs font-black text-black outline-none placeholder:text-black/40 ${isSearchOpen || searchQuery ? "block w-full" : "hidden sm:block sm:w-full"}`}
              onBlur={() => {
                if (!searchQuery) {
                  setIsSearchOpen(false);
                }
              }}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                openSearch();
              }}
              onFocus={openSearch}
              placeholder="Type to search..."
              type="search"
              value={searchQuery}
            />
            {(isSearchOpen || searchQuery) && (
              <button
                className="flex size-7 shrink-0 items-center justify-center rounded-[0.5rem] bg-black text-[10px] text-white transition hover:bg-black/75"
                onMouseDown={(event) => event.preventDefault()}
                onClick={closeSearch}
                type="button"
                aria-label="Close search"
              >
                ✕
              </button>
            )}
          </label>
          <button
            className={`h-11 rounded-[0.7rem] bg-emerald-500 px-4 text-xs font-black text-white transition hover:bg-emerald-400 sm:rounded-[0.85rem] sm:px-5 ${isSearchOpen || searchQuery ? "hidden sm:block" : "block"}`}
            onClick={() => {
              setIsMenuOpen(false);
              setIsCollectionsOpen(false);
              window.open("https://sociabuzz.com/femzoomc/tribe", "_blank", "noopener,noreferrer");
            }}
            type="button"
          >
            Donate
          </button>
          <button
            className={`size-11 flex-col items-center justify-center gap-1.5 rounded-[0.7rem] bg-black text-white transition hover:bg-black/80 sm:rounded-[0.85rem] ${isSearchOpen || searchQuery ? "hidden sm:flex" : "flex"}`}
            onClick={toggleMenu}
            type="button"
            aria-label="Open menu"
            aria-expanded={isMenuOpen}
          >
            <span className="h-0.5 w-5 rounded-full bg-current" />
            <span className="h-0.5 w-5 rounded-full bg-current" />
            <span className="h-0.5 w-5 rounded-full bg-current" />
          </button>
        </div>

        {isMenuOpen && (
          <div className="absolute left-0 top-[calc(100%+0.5rem)] w-full rounded-[1rem] border border-black/5 bg-white p-2 text-xs font-black text-black shadow-xl shadow-black/15">
            <button className="w-full rounded-[0.75rem] px-3 py-3 text-left hover:bg-black/5" onClick={openProfile} type="button">
              Profile
            </button>
            <div className="rounded-[0.75rem] px-3 py-3">
              <button
                className="flex w-full items-center justify-between text-left text-black/70"
                onClick={() => setIsCollectionsOpen((value) => !value)}
                type="button"
              >
                Collections
                <span>{isCollectionsOpen ? "−" : "+"}</span>
              </button>
              {isCollectionsOpen && <div className="mt-2 grid gap-1 sm:grid-cols-5">
                <button
                  className="rounded-[0.65rem] bg-black/[0.04] px-3 py-2 text-left hover:bg-black/10"
                  onClick={() => selectFilter("Favorites")}
                  type="button"
                >
                  Favorites ({favoriteIds.length})
                </button>
                {filters.map((filter) => (
                  <button
                    className="rounded-[0.65rem] bg-black/[0.04] px-3 py-2 text-left hover:bg-black/10"
                    key={filter}
                    onClick={() => selectFilter(filter)}
                    type="button"
                  >
                    {filter}
                  </button>
                ))}
              </div>}
            </div>
            <a className="block w-full rounded-[0.75rem] bg-blue-600 px-3 py-3 text-left text-white transition hover:bg-blue-500" href="https://t.me/fmanha" onClick={() => setIsMenuOpen(false)} target="_blank" rel="noopener noreferrer">
              Contact Me @fmanha
            </a>
          </div>
        )}
      </header>

      <div className="flex h-full min-h-[calc(100vh-8rem)] flex-col gap-10 sm:min-h-[calc(100vh-9rem)] lg:min-h-[calc(100vh-10rem)]">
        <div className="max-w-4xl">
          <h1 className="text-4xl font-black leading-none tracking-tight sm:text-6xl lg:text-7xl">
            Discover clean <span className="text-emerald-400">Minecraft</span> wallpapers for every screen.
          </h1>
        </div>

        <div className="relative -mx-4 sm:mx-0">
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-black to-transparent sm:hidden" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-black to-transparent sm:hidden" />
          <div className="flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
          <button
            className={`shrink-0 rounded-[0.85rem] border px-4 py-2 text-xs font-black ${
              activeFilter === "Favorites"
                ? "border-emerald-400 bg-emerald-400 text-white"
                : "border-white/10 bg-white/10 text-white/70 hover:bg-white hover:text-black"
            }`}
            onClick={() => selectFilter("Favorites")}
            type="button"
          >
            Favorites {favoriteIds.length > 0 ? `(${favoriteIds.length})` : ""}
          </button>
          {filters.map((filter) => {
            const isActive = filter === activeFilter;

            return (
              <button
                className={`shrink-0 rounded-[0.85rem] border px-4 py-2 text-xs font-black ${
                  isActive
                    ? "border-white bg-white text-black"
                    : "border-white/10 bg-white/10 text-white/70 hover:bg-white hover:text-black"
                }`}
                key={filter}
                onClick={() => selectFilter(filter)}
                type="button"
              >
                {filter}
              </button>
            );
          })}
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {visibleWallpapers.map((wallpaper, index) => (
              <article
                className="group overflow-hidden rounded-[1rem] border border-white/10 bg-white/5"
                key={wallpaper.id}
              >
                <div className="relative aspect-video overflow-hidden bg-white/10">
                  <Image
                    src={wallpaper.previewImage || wallpaper.image}
                    alt={`${wallpaper.title} wallpaper`}
                    fill
                    unoptimized
                    loading={index < 2 ? "eager" : "lazy"}
                    priority={index < 2}
                    sizes="(min-width: 1280px) 25vw, (min-width: 768px) 50vw, 100vw"
                    className={`object-cover ${loadedImages[wallpaper.id] ? "opacity-100" : "opacity-0"}`}
                    onLoad={() => setLoadedImages((loaded) => ({ ...loaded, [wallpaper.id]: true }))}
                  />
                  {!loadedImages[wallpaper.id] && (
                    <div className="skeleton-shimmer absolute inset-0 bg-white/10" />
                  )}
                  <button
                    className={`absolute right-3 top-3 z-20 flex size-10 items-center justify-center rounded-full border text-white shadow-lg shadow-black/30 ${favoriteIds.includes(wallpaper.id) ? "border-yellow-300 bg-yellow-400" : "border-white/20 bg-black/45"}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      toggleFavorite(wallpaper.id);
                    }}
                    type="button"
                    aria-label="Toggle favorite"
                  >
                    <svg aria-hidden="true" className="size-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 3.75A2.75 2.75 0 0 1 8.75 1h6.5A2.75 2.75 0 0 1 18 3.75v17.1a.9.9 0 0 1-1.42.73L12 18.3l-4.58 3.28A.9.9 0 0 1 6 20.85V3.75Z" />
                    </svg>
                  </button>
                  <button
                    className="absolute inset-0 z-10"
                    onClick={() => openCropModal(wallpaper)}
                    type="button"
                    aria-label={`Open ${wallpaper.title} download editor`}
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/70 to-transparent p-4 pt-16">
                    <div className="flex items-end justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[10px] font-black text-white/55">
                          {wallpaper.filter}
                        </p>
                        <h2 className="mt-1 truncate text-lg font-black leading-tight text-white">
                          {wallpaper.title}
                        </h2>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
          ))}

          {filteredWallpapers.length === 0 && (
            <div className="rounded-[1rem] border border-white/10 bg-white/5 p-6 text-sm text-white/50 md:col-span-2 xl:col-span-4">
              No wallpapers match this filter or search.
            </div>
          )}
        </div>

        {safeVisibleCount < filteredWallpapers.length && (
          <button
            className="mx-auto h-12 rounded-[0.9rem] bg-white px-6 text-xs font-black text-black hover:bg-emerald-400 hover:text-white"
            onClick={() => {
              setVisibleScope(currentVisibleScope);
              setVisibleCount(safeVisibleCount + loadMoreCount);
            }}
            type="button"
          >
            Load More
          </button>
        )}

        <footer className="mt-4 border-t border-white/10 pt-8 text-white/55">
          <div className="grid gap-8 md:grid-cols-[1.4fr_1fr_1fr]">
            <div>
              <div className="flex items-center gap-3">
                <span className="relative flex size-11 overflow-hidden rounded-[0.75rem] bg-white/10">
                  <Image
                    src="/profile.png"
                    alt="FemzooMC footer profile"
                    fill
                    sizes="44px"
                    className="object-cover"
                  />
                </span>
                <p className="text-sm font-black text-white">FemzooMC</p>
              </div>
              <p className="mt-4 max-w-sm text-xs leading-6">
                Clean Minecraft wallpaper collection for desktop and mobile screens.
              </p>
            </div>

            <div>
              <p className="text-xs font-black text-white">Collections</p>
              <div className="mt-4 grid gap-2 text-xs">
                {filters.map((filter) => (
                  <button
                    className="w-fit text-left transition hover:text-white"
                    key={filter}
                    onClick={() => selectFilter(filter)}
                    type="button"
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-black text-white">Support</p>
              <div className="mt-4 grid gap-2 text-xs">
                <a className="transition hover:text-white" href="https://sociabuzz.com/femzoomc/tribe" target="_blank" rel="noopener noreferrer">
                  Donate
                </a>
                <a className="transition hover:text-white" href="https://t.me/fmanha" target="_blank" rel="noopener noreferrer">
                  Contact Telegram
                </a>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3 border-t border-white/10 pt-5 text-[10px] sm:flex-row sm:items-center sm:justify-between">
            <p>© 2026 FemzooMC. All rights reserved.</p>
            <p>Built for clean wallpaper browsing.</p>
          </div>
        </footer>
      </div>

      {selectedWallpaper && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-white p-1 sm:p-1.5 lg:p-2">
          <div className="min-h-[calc(100vh-0.5rem)] rounded-[1rem] bg-black p-4 text-white shadow-2xl shadow-black/20 sm:min-h-[calc(100vh-0.75rem)] sm:rounded-[1.25rem] sm:p-6 lg:min-h-[calc(100vh-1rem)] lg:rounded-[1.5rem] lg:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black text-emerald-400">
                  Minecraft Wallpaper Download
                </p>
                <h2 className="mt-2 truncate text-2xl font-black leading-none sm:text-4xl">
                  {selectedWallpaper.title}
                </h2>
              </div>
              <button className="rounded-[0.7rem] bg-white px-3 py-2 text-xs font-black text-black transition hover:bg-red-500 hover:text-white" onClick={() => setSelectedWallpaper(null)} type="button">
                Close
              </button>
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-[1.45fr_0.75fr]">
              <div>
                {downloadMode === "pc" ? (
                  <div className="rounded-[1.25rem] border border-white/10 bg-zinc-950 p-3 shadow-2xl shadow-emerald-500/10">
                    <div className="relative aspect-video overflow-hidden rounded-[0.9rem] border border-white/10 bg-white/10">
                      <Image
                        src={selectedWallpaper.previewImage || selectedWallpaper.image}
                        alt={`${selectedWallpaper.title} desktop preview`}
                        fill
                        unoptimized
                        sizes="100vw"
                        className="object-cover"
                      />
                      <div className="absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/45 to-transparent px-5 py-4 text-white">
                        <div>
                          <p className="text-xl font-black leading-none">09:41</p>
                          <p className="mt-1 text-[10px] font-black text-white/75">Sunday, May 17</p>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-black text-white/80">
                          <span>Wi‑Fi</span>
                          <span className="h-2.5 w-5 rounded-[0.25rem] border border-white/70 p-[1px]">
                            <span className="block h-full w-3 rounded-[0.15rem] bg-white" />
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="mx-auto mt-3 h-3 w-24 rounded-b-[0.7rem] bg-white/15" />
                    <div className="mx-auto h-2 w-36 rounded-full bg-white/10" />
                  </div>
                ) : (
                  <div className={`mx-auto ${downloadMode === "tablet" ? "max-w-[390px] rounded-[2rem]" : "max-w-[280px] rounded-[2.1rem]"} border border-white/15 bg-zinc-950 p-3 shadow-2xl shadow-emerald-500/10`}>
                    <div
                      className={`relative ${downloadMode === "tablet" ? "aspect-[3/4] rounded-[1.35rem]" : "aspect-[9/16] rounded-[1.55rem]"} cursor-ew-resize touch-none overflow-hidden border border-white/10 bg-white/10`}
                      onPointerDown={(event) => {
                        event.currentTarget.setPointerCapture(event.pointerId);
                        handleMockupPointerMove(event);
                      }}
                      onPointerMove={(event) => {
                        if (event.buttons === 1) {
                          handleMockupPointerMove(event);
                        }
                      }}
                    >
                      <Image
                        src={selectedWallpaper.previewImage || selectedWallpaper.image}
                        alt={`${selectedWallpaper.title} ${downloadMode} preview`}
                        fill
                        unoptimized
                        sizes={downloadMode === "tablet" ? "390px" : "280px"}
                        className="object-cover"
                        style={{ objectPosition: `${cropX}% center` }}
                      />
                      {downloadMode === "mobile" && <div className="absolute left-1/2 top-2 z-10 h-5 w-24 -translate-x-1/2 rounded-full bg-black/85" />}
                      <div className={`absolute inset-x-0 top-0 bg-gradient-to-b from-black/45 to-transparent text-center text-white ${downloadMode === "tablet" ? "px-8 pb-28 pt-12" : "px-6 pb-24 pt-16"}`}>
                        <p className={`${downloadMode === "tablet" ? "text-sm" : "text-[11px]"} font-black leading-none text-white/85`}>Sunday, May 17</p>
                        <p className={`${downloadMode === "tablet" ? "mt-4 text-[56px] tracking-[-0.01em]" : "mt-3 text-[44px] tracking-[-0.02em]"} font-black leading-none text-white`}>9:41</p>
                      </div>
                      <div className={`absolute inset-x-0 flex items-center justify-between ${downloadMode === "tablet" ? "bottom-6 px-10" : "bottom-5 px-7"}`}>
                        <span className="flex size-11 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-md">
                          <svg aria-hidden="true" className="size-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
                            <path d="M9 2h6" />
                            <path d="M10 6h4" />
                            <path d="m14 10-4 6h4l-2 6" />
                          </svg>
                        </span>
                        <span className="flex size-11 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-md">
                          <svg aria-hidden="true" className="size-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
                            <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z" />
                            <circle cx="12" cy="13" r="3" />
                          </svg>
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {getModeConfig(downloadMode).needsCrop && <div className="mt-4 rounded-[1rem] border border-white/10 bg-white/5 p-4 text-xs font-black text-white/65">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p>Adjust {downloadMode === "tablet" ? "tablet 3:4" : "mobile 9:16"} crop</p>
                      <p className="mt-1 text-[10px] text-white/35">Drag on the mockup, use the slider, or type a percentage.</p>
                    </div>
                    <label className="flex w-fit items-center gap-2 rounded-[0.8rem] bg-black/25 px-3 py-2">
                      <input
                        className="w-12 bg-transparent text-right text-white outline-none"
                        max="100"
                        min="0"
                        onChange={(event) => updateCropX(event.target.value)}
                        type="number"
                        value={cropX}
                      />
                      <span>%</span>
                    </label>
                  </div>
                  <input
                    className="mt-4 w-full accent-emerald-400"
                    max="100"
                    min="0"
                    onChange={(event) => updateCropX(event.target.value)}
                    type="range"
                    value={cropX}
                  />
                </div>}
              </div>

              <aside className="rounded-[1.25rem] border border-white/10 bg-white/[0.06] p-4">
                <p className="text-xs font-black text-white/45">Choose format</p>
                <div className="mt-3 grid gap-2">
                  {["pc", "tablet", "mobile"].map((mode) => (
                    <button
                      className={`rounded-[0.9rem] border px-4 py-3 text-left text-xs font-black transition ${downloadMode === mode ? "border-white bg-white text-black" : "border-white/10 bg-black/20 text-white/70 hover:bg-white/10"}`}
                      key={mode}
                      onClick={() => setDownloadMode(mode)}
                      type="button"
                    >
                      <span className="block">{getModeConfig(mode).label}</span>
                      <span className="mt-1 block text-[10px] opacity-55">{getModeConfig(mode).description}</span>
                    </button>
                  ))}
                </div>

                <div className="mt-4 rounded-[1rem] bg-black/25 p-4 text-[10px] leading-5 text-white/45">
                  Optimized export with smooth browser rendering. Best for Minecraft homescreen, lockscreen, and desktop background.
                </div>

                {isDownloading && (
                  <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${downloadProgress}%` }} />
                  </div>
                )}

                <button className="mt-4 h-12 w-full rounded-[0.9rem] bg-emerald-500 text-xs font-black text-white transition hover:bg-emerald-400" onClick={downloadUpscaledWallpaper} type="button">
                  {isDownloading ? `Preparing ${downloadProgress}%` : "Download"}
                </button>
              </aside>
            </div>
          </div>
        </div>
      )}

      {isProfileOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-white p-1 sm:p-1.5 lg:p-2">
          <div className="min-h-[calc(100vh-0.5rem)] rounded-[1rem] bg-black p-4 text-white shadow-2xl shadow-black/20 sm:min-h-[calc(100vh-0.75rem)] sm:rounded-[1.25rem] sm:p-6 lg:min-h-[calc(100vh-1rem)] lg:rounded-[1.5rem] lg:p-8">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-black text-emerald-400">
                TikTok Creator Profile
              </p>
              <button className="rounded-[0.7rem] bg-white px-3 py-2 text-xs font-black text-black transition hover:bg-red-500 hover:text-white" onClick={() => setIsProfileOpen(false)} type="button">
                Close
              </button>
            </div>

            {isProfileLoading && (
              <div className="mt-6 rounded-[1.25rem] border border-white/10 bg-white/5 p-6 text-sm text-white/50">
                Loading TikTok profile...
              </div>
            )}

            {!isProfileLoading && tiktokProfile && (
              <div className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
                <section className="rounded-[1.25rem] border border-white/10 bg-white/[0.06] p-5">
                  <div className="flex items-center gap-4">
                    <span className="relative size-24 overflow-hidden rounded-[1.25rem] bg-white/10">
                      <Image
                        src={tiktokProfile.avatar || "/profile.png"}
                        alt={`${tiktokProfile.nickname} TikTok avatar`}
                        fill
                        unoptimized
                        sizes="96px"
                        className="object-cover"
                      />
                    </span>
                    <div className="min-w-0">
                      <h2 className="truncate text-3xl font-black leading-none">
                        {tiktokProfile.nickname}
                      </h2>
                      <a className="mt-2 block truncate text-xs text-emerald-400" href={`https://www.tiktok.com/@${tiktokProfile.username}`} target="_blank" rel="noopener noreferrer">
                        @{tiktokProfile.username}
                      </a>
                    </div>
                  </div>

                  <p className="mt-5 whitespace-pre-line text-xs leading-6 text-white/55">
                    {tiktokProfile.signature}
                  </p>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    {[
                      ["Followers", tiktokProfile.followers],
                      ["Following", tiktokProfile.following],
                      ["Likes", tiktokProfile.likes],
                      ["Videos", tiktokProfile.videos],
                    ].map(([label, value]) => (
                      <div className="rounded-[0.9rem] bg-black/25 p-4" key={label}>
                        <p className="text-xl font-black text-white">{formatCount(value)}</p>
                        <p className="mt-1 text-[10px] text-white/40">{label}</p>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-[1.25rem] border border-white/10 bg-white/[0.06] p-5">
                  <p className="text-xs font-black text-white">Uploaded Videos</p>
                  {tiktokProfile.posts?.length > 0 ? (
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {tiktokProfile.posts.map((video) => (
                        <a className="overflow-hidden rounded-[1rem] border border-white/10 bg-black/25" href={video.url} key={video.id} target="_blank" rel="noopener noreferrer">
                          {video.cover ? (
                            <span className="relative block aspect-video bg-white/10">
                              <Image
                                src={video.cover}
                                alt={video.title}
                                fill
                                unoptimized
                                sizes="(min-width: 1024px) 240px, 50vw"
                                className="object-cover"
                              />
                              <span className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />
                              <span className="absolute bottom-2 left-2 rounded-[0.5rem] bg-black/50 px-2 py-1 text-[9px] text-white">
                                TikTok Preview
                              </span>
                            </span>
                          ) : (
                            <span className="flex aspect-video items-center justify-center bg-white/10 text-[10px] text-white/35">
                              No Preview
                            </span>
                          )}
                          <span className="block p-3">
                            <span className="line-clamp-2 block text-[10px] leading-5 text-white/75">
                              {video.title}
                            </span>
                            <span className="mt-3 grid grid-cols-2 gap-2 text-[10px] text-white/45">
                              <span>{formatCount(video.views)} views</span>
                              <span>{formatCount(video.likes)} likes</span>
                            </span>
                          </span>
                        </a>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-4 rounded-[1rem] border border-dashed border-white/10 bg-black/20 p-5 text-xs leading-6 text-white/45">
                      Video data is not available yet. Open TikTok to view the latest uploads.
                    </div>
                  )}
                  <a className="mt-4 inline-flex rounded-[0.9rem] bg-emerald-500 px-4 py-3 text-xs font-black text-white" href={`https://www.tiktok.com/@${tiktokProfile.username}`} target="_blank" rel="noopener noreferrer">
                    Open TikTok Videos
                  </a>
                </section>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
