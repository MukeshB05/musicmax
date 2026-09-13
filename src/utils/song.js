const DEFAULT_IMAGE = "/Unknown.png";

export const extractImageUrl = (image) => {
  if (!image) return DEFAULT_IMAGE;
  if (typeof image === "string") return image;

  if (Array.isArray(image)) {
    const parsed = image
      .map((value) => {
        if (typeof value === "string") {
          return { url: value, quality: 0 };
        }
        if (value && typeof value === "object") {
          const url = value.url || value.link || value.src;
          const quality =
            Number(value.quality) ||
            Number(String(value.quality || "").replace(/\D/g, "")) ||
            0;
          return { url, quality };
        }
        return { url: null, quality: 0 };
      })
      .filter((x) => x.url);

    if (parsed.length === 0) return DEFAULT_IMAGE;
    parsed.sort((a, b) => b.quality - a.quality);
    return parsed[0].url;
  }

  return image?.url || image?.link || image?.src || DEFAULT_IMAGE;
};

export const extractAudioUrl = (song) => {
  if (!song) return null;

  const { downloadUrl } = song;

  if (Array.isArray(downloadUrl)) {
    const parsed = downloadUrl
      .map((item) => {
        if (typeof item === "string") {
          return { url: item, bitrate: 0 };
        }
        if (item && typeof item === "object") {
          const url = item.url || item.link || item.downloadUrl;
          const quality = String(item.quality || "").toLowerCase();
          const match = quality.match(/(\d+)\s*kbps/);
          const bitrate = match ? Number(match[1]) : 0;
          return { url, bitrate };
        }
        return { url: null, bitrate: 0 };
      })
      .filter((x) => typeof x.url === "string" && x.url.trim() !== "");

    if (parsed.length > 0) {
      parsed.sort((a, b) => b.bitrate - a.bitrate);
      return parsed[0].url;
    }
  }

  if (typeof downloadUrl === "string") return downloadUrl.trim() || null;

  if (downloadUrl && typeof downloadUrl === "object") {
    return downloadUrl.url || downloadUrl.link || null;
  }

  return (
    song.audioUrl ||
    song.audio ||
    song.streamUrl ||
    song.mediaUrl ||
    song.url ||
    null
  );
};

export const extractArtistNames = (artistData) => {
  if (!artistData) return "Unknown Artist";
  if (typeof artistData === "string") return artistData;

  if (Array.isArray(artistData)) {
    const names = artistData
      .map((a) => (typeof a === "string" ? a : a?.name))
      .filter(Boolean);
    return names.length > 0 ? names.join(", ") : "Unknown Artist";
  }

  if (typeof artistData === "object") {
    const source =
      artistData.primary ||
      artistData.all ||
      artistData.featured;

    if (Array.isArray(source)) {
      const names = source
        .map((a) => (typeof a === "string" ? a : a?.name))
        .filter(Boolean);
      return names.length > 0 ? names.join(", ") : "Unknown Artist";
    }

    if (typeof artistData.name === "string") return artistData.name;
  }

  return "Unknown Artist";
};
