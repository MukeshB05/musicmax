import { useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  IoMdSkipBackward,
  IoMdSkipForward,
} from "react-icons/io";
import { IoShareSocial } from "react-icons/io5";
import { PiShuffleBold, PiSpeakerLowFill } from "react-icons/pi";
import { LuRepeat, LuRepeat1 } from "react-icons/lu";
import { FaPlay, FaPause, FaHeart, FaRegHeart } from "react-icons/fa";
import { MdDownload } from "react-icons/md";
import { CiMaximize1 } from "react-icons/ci";
import { MdOutlineKeyboardArrowLeft, MdOutlineKeyboardArrowRight } from "react-icons/md";
import { Link } from "react-router-dom";
import he from "he";
import MusicContext from "../context/MusicContext";
import ArtistItems from "./Items/ArtistItems";
import SongGrid from "./SongGrid";
import { getSongById, getSuggestionSong } from "../../fetch";

const safeDecode = (value) => {
  try { return he.decode(String(value || "")); } catch { return String(value || ""); }
};

const Player = () => {
  const {
    currentSong,
    queue,
    playMusic,
    isPlaying,
    setIsPlaying,
    shuffle,
    nextSong,
    prevSong,
    toggleShuffle,
    repeatMode,
    toggleRepeatMode,
    downloadSong,
    lyrics,
    coverImage,
  } = useContext(MusicContext) || {};

  const [volume, setVolume] = useState(() => {
    const value = Number(localStorage.getItem("volume"));
    return Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 100;
  });
  const [isMaximized, setIsMaximized] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [detail, setDetail] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [likedSongs, setLikedSongs] = useState(() => {
    try {
      const data = JSON.parse(localStorage.getItem("likedSongs") || "[]");
      return Array.isArray(data) ? data : [];
    } catch { return []; }
  });

  const scrollRef = useRef(null);

  const audio = currentSong?.audio;
  const duration = Number(currentSong?.duration) > 0
    ? Number(currentSong.duration)
    : audioDuration;
  const progress = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;

  const songName = useMemo(
    () => safeDecode(currentSong?.name || "Unknown Song"),
    [currentSong?.name]
  );

  const artistNames = useMemo(() => {
    const primary = currentSong?.artists?.primary;
    if (Array.isArray(primary) && primary.length) {
      return primary.map((artist) => safeDecode(artist?.name || "Unknown Artist")).join(", ");
    }
    return safeDecode(currentSong?.artists?.name || currentSong?.artist || "Unknown Artist");
  }, [currentSong?.artists, currentSong?.artist]);

  const isLiked = likedSongs.some(
    (item) => String(item?.id) === String(currentSong?.id)
  );

  useEffect(() => {
    setShowLyrics(false);
  }, [currentSong?.id]);

  useEffect(() => {
    if (!audio) {
      setCurrentTime(0);
      setAudioDuration(0);
      return undefined;
    }

    const update = () => {
      setCurrentTime(Number.isFinite(audio.currentTime) ? audio.currentTime : 0);
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        setAudioDuration(audio.duration);
      }
    };
    const loaded = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) setAudioDuration(audio.duration);
      update();
    };
    const ended = () => {
      // repeat-one is handled by audio.loop in App.
      if (repeatMode !== "one") nextSong?.();
    };

    audio.addEventListener("timeupdate", update);
    audio.addEventListener("loadedmetadata", loaded);
    audio.addEventListener("durationchange", loaded);
    audio.addEventListener("ended", ended);
    update();

    return () => {
      audio.removeEventListener("timeupdate", update);
      audio.removeEventListener("loadedmetadata", loaded);
      audio.removeEventListener("durationchange", loaded);
      audio.removeEventListener("ended", ended);
    };
  }, [audio, nextSong, repeatMode]);

  useEffect(() => {
    if (audio) {
      audio.volume = volume / 100;
      audio.loop = repeatMode === "one";
    }
  }, [audio, volume, repeatMode]);

  useEffect(() => {
    if (!currentSong?.id) {
      setDetail(null);
      setSuggestions([]);
      return undefined;
    }
    let cancelled = false;

    Promise.allSettled([
      getSongById(currentSong.id),
      getSuggestionSong(currentSong.id),
    ]).then(([detailResult, suggestionResult]) => {
      if (cancelled) return;
      if (detailResult.status === "fulfilled") {
        setDetail(detailResult.value?.data?.[0] || null);
      } else {
        setDetail(null);
      }
      if (suggestionResult.status === "fulfilled") {
        setSuggestions(Array.isArray(suggestionResult.value?.data) ? suggestionResult.value.data : []);
      } else {
        setSuggestions([]);
      }
    });

    return () => { cancelled = true; };
  }, [currentSong?.id]);

  useEffect(() => {
    if (!currentSong || !("mediaSession" in navigator) || typeof MediaMetadata === "undefined") return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: songName,
        artist: artistNames,
        album: safeDecode(detail?.album?.name || "Dreamly"),
        artwork: currentSong.image ? [{ src: currentSong.image, sizes: "500x500", type: "image/jpeg" }] : [],
      });
      navigator.mediaSession.setActionHandler("play", () => audio?.play().then(() => setIsPlaying?.(true)).catch(() => {}));
      navigator.mediaSession.setActionHandler("pause", () => { audio?.pause(); setIsPlaying?.(false); });
      navigator.mediaSession.setActionHandler("previoustrack", () => prevSong?.());
      navigator.mediaSession.setActionHandler("nexttrack", () => nextSong?.());
    } catch {}
  }, [currentSong, songName, artistNames, detail, audio, setIsPlaying, prevSong, nextSong]);

  const playPause = async () => {
    if (!audio) return;
    try {
      if (audio.paused) {
        await audio.play();
        setIsPlaying?.(true);
      } else {
        audio.pause();
        setIsPlaying?.(false);
      }
    } catch (error) {
      console.error("Play/pause error:", error);
      setIsPlaying?.(false);
    }
  };

  const seek = (event) => {
    if (!audio || duration <= 0) return;
    const value = Number(event.target.value);
    const time = (value / 100) * duration;
    try { audio.currentTime = Math.max(0, Math.min(duration, time)); } catch {}
    setCurrentTime(time);
  };

  const changeVolume = (event) => {
    const value = Math.min(100, Math.max(0, Number(event.target.value)));
    setVolume(value);
    try { localStorage.setItem("volume", String(value)); } catch {}
    if (audio) audio.volume = value / 100;
  };

  const formatTime = (value) => {
    const seconds = Math.max(0, Math.floor(Number(value) || 0));
    return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  };

  const toggleLike = () => {
    if (!currentSong?.id) return;
    setLikedSongs((old) => {
      const exists = old.some((x) => String(x.id) === String(currentSong.id));
      const next = exists
        ? old.filter((x) => String(x.id) !== String(currentSong.id))
        : [...old, {
            id: currentSong.id,
            name: currentSong.name,
            duration: currentSong.duration,
            image: currentSong.image,
            artists: currentSong.artists,
            audio: currentSong.audio?.currentSrc || currentSong.audio?.src || currentSong.audioUrl,
          }];
      try { localStorage.setItem("likedSongs", JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const share = async () => {
    const albumId = detail?.album?.id || currentSong?.album?.id;
    const url = albumId ? `${window.location.origin}/albums/${albumId}` : window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: songName, text: `Listen to ${songName} on Dreamly`, url });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
      }
    } catch (error) {
      if (error?.name !== "AbortError") console.error("Share failed:", error);
    }
  };

  if (!currentSong) return null;

  const suggestionList = Array.isArray(suggestions) ? suggestions : [];

  return (
    <div className="fixed bottom-14 lg:bottom-0 left-0 z-50 w-full">
      <div className={`relative w-full rounded-t-xl shadow-2xl bg-auto ${isMaximized ? "min-h-[90vh] max-h-[90vh] overflow-y-auto p-4" : "p-3 lg:px-6 Player"}`}>
        {!isMaximized ? (
          <div className="flex items-center gap-3">
            <img
              src={coverImage || currentSong.image || "/Unknown.png"}
              alt={songName}
              className="h-12 w-12 rounded object-cover"
              onError={(e) => { e.currentTarget.src = "/Unknown.png"; }}
            />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">{songName}</div>
              <div className="truncate text-xs opacity-70">{artistNames}</div>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-[10px]">{formatTime(currentTime)}</span>
                <input
                  aria-label="Song progress"
                  type="range" min="0" max="100" step="0.1" value={progress}
                  onChange={seek} className="range w-full"
                />
                <span className="text-[10px]">{formatTime(duration)}</span>
              </div>
            </div>
            <button type="button" onClick={prevSong} title="Previous"><IoMdSkipBackward className="text-2xl" /></button>
            <button type="button" onClick={playPause} title={isPlaying ? "Pause" : "Play"}>
              {isPlaying ? <FaPause className="text-2xl" /> : <FaPlay className="text-2xl" />}
            </button>
            <button type="button" onClick={nextSong} title="Next"><IoMdSkipForward className="text-2xl" /></button>
            <button type="button" onClick={toggleLike} title="Like">
              {isLiked ? <FaHeart className="text-xl text-red-500" /> : <FaRegHeart className="text-xl" />}
            </button>
            <button type="button" onClick={() => setIsMaximized(true)} title="Maximize"><CiMaximize1 className="text-xl" /></button>
          </div>
        ) : (
          <div className="mx-auto flex max-w-3xl flex-col items-center">
            <div className="flex w-full justify-between">
              <button type="button" onClick={() => setIsMaximized(false)} className="text-sm">Minimize</button>
              <button type="button" onClick={share}><IoShareSocial className="text-2xl" /></button>
            </div>

            <div className="mt-4 flex gap-1 rounded-full border border-white/10 bg-white/5 p-1">
              <button type="button" onClick={() => setShowLyrics(false)} className={`rounded-full px-5 py-2 text-sm ${!showLyrics ? "bg-white text-black" : "opacity-60"}`}>Cover</button>
              <button type="button" onClick={() => setShowLyrics(true)} className={`rounded-full px-5 py-2 text-sm ${showLyrics ? "bg-white text-black" : "opacity-60"}`}>Lyrics</button>
            </div>

            {!showLyrics ? (
              <img
                src={coverImage || currentSong.image || "/Unknown.png"}
                alt={songName}
                className="mt-4 h-64 w-64 rounded-xl object-cover shadow-lg"
                onError={(e) => { e.currentTarget.src = "/Unknown.png"; }}
              />
            ) : (
              <div className="mt-4 min-h-64 max-h-64 w-full max-w-xl overflow-y-auto rounded-xl border border-white/10 bg-white/5 p-5 text-center">
                {lyrics?.synced && lyrics.lines?.length ? lyrics.lines.map((line, index) => {
                  const activeIndex = lyrics.lines.reduce((active, item, i) => item.time <= currentTime ? i : active, -1);
                  return <p key={`${line.time}-${index}`} className={`my-2 transition-all ${index === activeIndex ? "scale-105 font-bold opacity-100" : "opacity-50"}`}>{line.text}</p>;
                }) : lyrics?.plain ? (
                  <p className="whitespace-pre-line text-sm leading-7 opacity-80">{lyrics.plain}</p>
                ) : (
                  <p className="opacity-60">No lyrics available.</p>
                )}
              </div>
            )}

            <h2 className="mt-4 text-xl font-bold text-center">{songName}</h2>
            <p className="text-center text-sm opacity-70">{artistNames}</p>

            <div className="mt-5 flex w-full items-center gap-2">
              <span className="text-xs">{formatTime(currentTime)}</span>
              <input aria-label="Song progress" type="range" min="0" max="100" step="0.1" value={progress} onChange={seek} className="range flex-1" />
              <span className="text-xs">{formatTime(duration)}</span>
            </div>

            <div className="mt-5 flex items-center gap-6">
              <button type="button" onClick={toggleShuffle} className={shuffle ? "text-red-500" : ""}><PiShuffleBold className="text-2xl" /></button>
              <button type="button" onClick={prevSong}><IoMdSkipBackward className="text-3xl" /></button>
              <button type="button" onClick={playPause} className="rounded-full p-4">
                {isPlaying ? <FaPause className="text-3xl" /> : <FaPlay className="text-3xl" />}
              </button>
              <button type="button" onClick={nextSong}><IoMdSkipForward className="text-3xl" /></button>
              <button type="button" onClick={toggleRepeatMode} className={repeatMode === "one" ? "text-red-500" : ""}>
                {repeatMode === "one" ? <LuRepeat1 className="text-2xl" /> : <LuRepeat className="text-2xl" />}
              </button>
            </div>

            <div className="mt-4 flex w-full max-w-sm items-center gap-2">
              <PiSpeakerLowFill />
              <input aria-label="Volume" type="range" min="0" max="100" value={volume} onChange={changeVolume} className="range flex-1" />
            </div>

            <div className="mt-3 flex gap-4">
              <button type="button" onClick={toggleLike}>{isLiked ? <FaHeart className="text-red-500" /> : <FaRegHeart />}</button>
              <button type="button" onClick={downloadSong}><MdDownload className="text-2xl" /></button>
            </div>

            {detail?.album?.id && (
              <Link to={`/albums/${detail.album.id}`} className="mt-6 w-full max-w-sm">
                <h3 className="mb-2 font-semibold">From Album</h3>
                <div className="flex items-center gap-3 rounded-lg p-2">
                  <img src={detail.album.image?.[0]?.url || currentSong.image || "/Unknown.png"} alt="" className="h-16 w-16 rounded object-cover" />
                  <span>{safeDecode(detail.album.name)}</span>
                </div>
              </Link>
            )}

            {suggestionList.length > 0 && (
              <div className="mt-6 w-full">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">You Might Like</h3>
                  <div className="hidden lg:flex gap-2">
                    <button type="button" onClick={() => scrollRef.current?.scrollBy({ left: -500, behavior: "smooth" })}><MdOutlineKeyboardArrowLeft className="text-2xl" /></button>
                    <button type="button" onClick={() => scrollRef.current?.scrollBy({ left: 500, behavior: "smooth" })}><MdOutlineKeyboardArrowRight className="text-2xl" /></button>
                  </div>
                </div>
                <div ref={scrollRef} className="mt-2 flex gap-3 overflow-x-auto scroll-hide">
                  {suggestionList.map((item, index) => (
                    <SongGrid key={item?.id || index} song={item} />
                  ))}
                </div>
              </div>
            )}

            {currentSong?.artists?.primary?.length > 0 && (
              <div className="mt-6 w-full">
                <h3 className="mb-2 font-semibold">Artists</h3>
                <div className="flex gap-4 overflow-x-auto">
                  {currentSong.artists.primary.map((artist, index) => (
                    <ArtistItems key={artist?.id || index} {...artist} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Player;
