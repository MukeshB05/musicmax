import { useContext } from "react";
import he from "he";
import MusicContext from "../context/MusicContext";
import { extractImageUrl, extractAudioUrl, extractArtistNames } from "../utils/song";

const safeDecode = (value) => {
  try {
    return he.decode(String(value ?? ""));
  } catch {
    return String(value ?? "");
  }
};

const SongGrid = ({ song, queue, ...legacyProps }) => {
  const { playMusic } = useContext(MusicContext) || {};

  // Prefer the explicit `song` object; fall back to legacy spread-props API.
  const item =
    song && typeof song === "object" && !Array.isArray(song)
      ? song
      : legacyProps;

  const songName =
    item?.name || item?.title || legacyProps?.name || legacyProps?.title || "Unknown Song";

  const songImage = extractImageUrl(item?.image || legacyProps?.image);

  const artistNames = extractArtistNames(
    item?.artists || item?.artist || legacyProps?.artists || legacyProps?.artist
  );

  const handlePlay = () => {
    if (typeof playMusic !== "function") return;

    const url = extractAudioUrl(item);
    if (!url) {
      console.error("No playable audio URL for:", item);
      return;
    }

    const duration =
      Number(item?.duration) || Number(item?.durationInSeconds) || 0;

    const artists =
      item?.artists?.primary ||
      item?.artists?.all ||
      item?.artists ||
      item?.artist ||
      [];

    // Matches the 7-positional-arg convention used in PlaylistDetails.jsx.
    // TODO: refactor MusicContext.playMusic to take an object.
    playMusic(
      url,
      songName,
      duration,
      songImage,
      item?.id,
      artists,
      queue ?? null
    );
  };

  return (
    <button
      type="button"
      className="card w-[9.5rem] h-[11.9rem] overflow-hidden p-1 rounded-lg cursor-pointer shadow-md text-left"
      onClick={handlePlay}
    >
      <div className="p-1">
        <img
          src={songImage}
          alt={songName}
          className="w-full aspect-square rounded-lg object-cover"
          loading="lazy"
          onError={(e) => {
            const img = e.currentTarget;
            if (img.dataset.fallback === "true") return;
            img.dataset.fallback = "true";
            img.src = "/Unknown.png";
          }}
        />
      </div>

      <div className="px-2 text-[13px]">
        <div className="font-semibold overflow-hidden whitespace-nowrap text-ellipsis">
          {safeDecode(songName)}
        </div>

        <div className="overflow-hidden whitespace-nowrap text-ellipsis">
          {artistNames && artistNames !== "Unknown Artist" ? (
            <>
              by <span className="font-semibold">{safeDecode(artistNames)}</span>
            </>
          ) : (
            <span className="opacity-60">Unknown artist</span>
          )}
        </div>
      </div>
    </button>
  );
};

export default SongGrid;
