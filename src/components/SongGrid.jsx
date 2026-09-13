import { useContext } from "react";
import MusicContext from "../context/MusicContext";
import he from "he";

const getImage = (image) => {
  if (!image) return "/Unknown.png";
  if (typeof image === "string") return image;
  if (Array.isArray(image)) {
    for (let i = image.length - 1; i >= 0; i -= 1) {
      const value = image[i];
      const url = typeof value === "string" ? value : value?.url || value?.link || value?.src;
      if (url) return url;
    }
  }
  return image?.url || image?.link || image?.src || "/Unknown.png";
};

const SongGrid = (props) => {
  const { playMusic } = useContext(MusicContext) || {};
  const {
    name, title, artists, artist, duration, downloadUrl,
    audio, audioUrl, image, id, song
  } = props;

  // Supports both <SongGrid song={song}/> and the older spread-props API.
  const item = (song && typeof song === "object" && !Array.isArray(song))
    ? song
    : props;

  const songName = item?.name || item?.title || name || title || "Unknown Song";
  const songImage = getImage(item?.image || image);
  const artistData = item?.artists || item?.artist || artists || artist;
  const artistNames = Array.isArray(artistData?.primary)
    ? artistData.primary.map((a) => a?.name).filter(Boolean).join(", ")
    : typeof artistData === "string" ? artistData : "Unknown Artist";

  const handlePlay = () => {
    if (typeof playMusic === "function") playMusic(item);
  };

  return (
    <button
      type="button"
      className="card w-[9.5rem] h-[11.9rem] overflow-hidden p-1 rounded-lg cursor-pointer shadow-md text-left shrink-0"
      onClick={handlePlay}
    >
      <div className="p-1">
        <img
          src={songImage}
          alt={songName}
          className="w-full aspect-square rounded-lg object-cover"
          onError={(e) => { e.currentTarget.src = "/Unknown.png"; }}
        />
      </div>
      <div className="px-2 text-[13px]">
        <div className="font-semibold overflow-hidden whitespace-nowrap text-ellipsis">
          {safeDecode(songName)}
        </div>
        <div className="overflow-hidden whitespace-nowrap text-ellipsis">
          by <span className="font-semibold">{safeDecode(artistNames)}</span>
        </div>
      </div>
    </button>
  );
};

const safeDecode = (value) => {
  try { return he.decode(String(value || "")); } catch { return String(value || ""); }
};

export default SongGrid;
