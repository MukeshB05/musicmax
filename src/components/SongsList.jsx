import { GoPlay } from "react-icons/go";
import { useContext, useState } from "react";
import MusicContext from "../context/MusicContext";
import he from "he";

const safeDecode = (value) => {
  try { return he.decode(String(value || "")); } catch { return String(value || ""); }
};

const formatTime = (value) => {
  const seconds = Math.max(0, Math.floor(Number(value) || 0));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
};

const SongsList = (props) => {
  const [hovering, setHovering] = useState(false);
  const { playMusic } = useContext(MusicContext) || {};

  const {
    name, title, artists, artist, duration, image, id, song, songs, onPlay
  } = props;

  const item = song && typeof song === "object" && !Array.isArray(song) ? song : props;
  const songName = item?.name || item?.title || name || title || "Unknown Song";
  const artistData = item?.artists || item?.artist || artists || artist;
  const artistNames = Array.isArray(artistData?.primary)
    ? artistData.primary.map((a) => a?.name).filter(Boolean).join(", ")
    : typeof artistData === "string" ? artistData : "Unknown Artist";

  const imageValue = item?.image || image;
  const imageUrl = typeof imageValue === "string"
    ? imageValue
    : Array.isArray(imageValue)
      ? imageValue.map((x) => typeof x === "string" ? x : x?.url).filter(Boolean).at(-1) || "/Unknown.png"
      : imageValue?.url || imageValue?.link || "/Unknown.png";

  const handleClick = () => {
    if (typeof onPlay === "function") {
      onPlay();
      return;
    }
    if (typeof playMusic === "function") playMusic(item, Array.isArray(songs) ? songs : undefined);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      className="overflow-hidden h-[3.5rem] w-full song-item flex justify-between items-center p-2 song-info text-left"
    >
      <div className="relative cursor-pointer shrink-0">
        <img
          src={imageUrl}
          alt=""
          className="w-[5rem] h-[3rem] rounded object-cover"
          onError={(e) => { e.currentTarget.src = "/Unknown.png"; }}
        />
        {hovering && (
          <GoPlay className="absolute inset-0 hidden lg:block m-auto w-[2.35rem] h-[2.35rem] opacity-80 icon" />
        )}
      </div>
      <div className="flex w-full min-w-0 pl-5">
        <h3 className="overflow-hidden text-ellipsis whitespace-nowrap text-[0.75rem] lg:text-[0.875rem] font-medium">
          {safeDecode(songName)}
        </h3>
      </div>
      <div className="flex w-full min-w-0">
        <p className="text-[0.60rem] lg:text-[0.75rem] overflow-hidden text-ellipsis whitespace-nowrap mr-3">
          {safeDecode(artistNames)}
        </p>
      </div>
      <div className="song-duration mr-2 shrink-0">
        <span className="text-[0.60rem] lg:text-[0.75rem]">
          {formatTime(item?.duration ?? duration)}
        </span>
      </div>
    </button>
  );
};

export default SongsList;
