import { useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  IoMdSkipBackward,
  IoMdSkipForward,
} from "react-icons/io";
import { IoShareSocial } from "react-icons/io5";
import { PiShuffleBold, PiSpeakerLowFill } from "react-icons/pi";
import { LuRepeat, LuRepeat1 } from "react-icons/lu";
import { FaPlay, FaPause, FaHeart, FaRegHeart } from "react-icons/fa";
import { MdDownload, MdKeyboardArrowDown } from "react-icons/md";
import { CiMaximize1 } from "react-icons/ci";
import { Link } from "react-router-dom";
import he from "he";

import MusicContext from "../context/MusicContext";
import ArtistItems from "./Items/ArtistItems";
import SongGrid from "./SongGrid";
import { getSongById, getSuggestionSong } from "../../fetch";

const safeDecode = (value) => {
  try {
    return he.decode(String(value || ""));
  } catch {
    return String(value || "");
  }
};

const getImage = (song, coverImage) => {
  return (
    coverImage ||
    song?.image ||
    song?.image?.[2]?.url ||
    song?.image?.[0]?.url ||
    "/Unknown.png"
  );
};

const Player = () => {
  const {
    currentSong,
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
    try {
      const value = Number(localStorage.getItem("volume"));
      return Number.isFinite(value)
        ? Math.min(100, Math.max(0, value))
        : 100;
    } catch {
      return 100;
    }
  });

  const [isMaximized, setIsMaximized] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [detail, setDetail] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [likedSongs, setLikedSongs] = useState(() => {
    try {
      const data = JSON.parse(
        localStorage.getItem("likedSongs") || "[]"
      );
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  });

  const scrollRef = useRef(null);

  const audio = currentSong?.audio;

  const duration =
    Number(currentSong?.duration) > 0
      ? Number(currentSong.duration)
      : audioDuration;

  const progress =
    duration > 0
      ? Math.min(
          100,
          Math.max(0, (currentTime / duration) * 100)
        )
      : 0;

  const songName = useMemo(
    () => safeDecode(currentSong?.name || "Unknown Song"),
    [currentSong?.name]
  );

  const artistNames = useMemo(() => {
    const primary = currentSong?.artists?.primary;

    if (Array.isArray(primary) && primary.length) {
      return primary
        .map((artist) =>
          safeDecode(artist?.name || "Unknown Artist")
        )
        .join(", ");
    }

    return safeDecode(
      currentSong?.artists?.name ||
        currentSong?.artist ||
        "Unknown Artist"
    );
  }, [currentSong?.artists, currentSong?.artist]);

  const artwork = getImage(currentSong, coverImage);

  const isLiked = likedSongs.some(
    (item) =>
      String(item?.id) === String(currentSong?.id)
  );

  /* --------------------------------
     Reset lyrics when song changes
  -------------------------------- */
  useEffect(() => {
    setShowLyrics(false);
    setCurrentTime(0);
  }, [currentSong?.id]);

  /* --------------------------------
     Audio events
  -------------------------------- */
  useEffect(() => {
    if (!audio) {
      setCurrentTime(0);
      setAudioDuration(0);
      return undefined;
    }

    const updateTime = () => {
      setCurrentTime(
        Number.isFinite(audio.currentTime)
          ? audio.currentTime
          : 0
      );

      if (
        Number.isFinite(audio.duration) &&
        audio.duration > 0
      ) {
        setAudioDuration(audio.duration);
      }
    };

    const loadedMetadata = () => {
      if (
        Number.isFinite(audio.duration) &&
        audio.duration > 0
      ) {
        setAudioDuration(audio.duration);
      }

      updateTime();
    };

    const ended = () => {
      if (repeatMode !== "one") {
        nextSong?.();
      }
    };

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener(
      "loadedmetadata",
      loadedMetadata
    );
    audio.addEventListener(
      "durationchange",
      loadedMetadata
    );
    audio.addEventListener("ended", ended);

    updateTime();

    return () => {
      audio.removeEventListener(
        "timeupdate",
        updateTime
      );
      audio.removeEventListener(
        "loadedmetadata",
        loadedMetadata
      );
      audio.removeEventListener(
        "durationchange",
        loadedMetadata
      );
      audio.removeEventListener("ended", ended);
    };
  }, [audio, nextSong, repeatMode]);

  /* --------------------------------
     Volume + repeat
  -------------------------------- */
  useEffect(() => {
    if (!audio) return;

    audio.volume = volume / 100;
    audio.loop = repeatMode === "one";
  }, [audio, volume, repeatMode]);

  /* --------------------------------
     Fetch song details
  -------------------------------- */
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
        setDetail(
          detailResult.value?.data?.[0] || null
        );
      } else {
        setDetail(null);
      }

      if (suggestionResult.status === "fulfilled") {
        const data = suggestionResult.value?.data;

        setSuggestions(
          Array.isArray(data) ? data : []
        );
      } else {
        setSuggestions([]);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [currentSong?.id]);

  /* --------------------------------
     Media Session
  -------------------------------- */
  useEffect(() => {
    if (
      !currentSong ||
      !("mediaSession" in navigator) ||
      typeof MediaMetadata === "undefined"
    ) {
      return;
    }

    try {
      navigator.mediaSession.metadata =
        new MediaMetadata({
          title: songName,
          artist: artistNames,
          album: safeDecode(
            detail?.album?.name || "MusicMax"
          ),
          artwork: artwork
            ? [
                {
                  src: artwork,
                  sizes: "500x500",
                  type: "image/jpeg",
                },
              ]
            : [],
        });

      navigator.mediaSession.setActionHandler(
        "play",
        () => {
          audio
            ?.play()
            .then(() => setIsPlaying?.(true))
            .catch(() => {});
        }
      );

      navigator.mediaSession.setActionHandler(
        "pause",
        () => {
          audio?.pause();
          setIsPlaying?.(false);
        }
      );

      navigator.mediaSession.setActionHandler(
        "previoustrack",
        () => prevSong?.()
      );

      navigator.mediaSession.setActionHandler(
        "nexttrack",
        () => nextSong?.()
      );
    } catch {}
  }, [
    currentSong,
    songName,
    artistNames,
    detail,
    artwork,
    audio,
    setIsPlaying,
    prevSong,
    nextSong,
  ]);

  /* --------------------------------
     Play / Pause
  -------------------------------- */
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

  /* --------------------------------
     Seek
  -------------------------------- */
  const seek = (event) => {
    if (!audio || duration <= 0) return;

    const value = Number(event.target.value);
    const time = (value / 100) * duration;

    try {
      audio.currentTime = Math.max(
        0,
        Math.min(duration, time)
      );
    } catch {}

    setCurrentTime(time);
  };

  /* --------------------------------
     Volume
  -------------------------------- */
  const changeVolume = (event) => {
    const value = Math.min(
      100,
      Math.max(0, Number(event.target.value))
    );

    setVolume(value);

    try {
      localStorage.setItem(
        "volume",
        String(value)
      );
    } catch {}

    if (audio) {
      audio.volume = value / 100;
    }
  };

  /* --------------------------------
     Format time
  -------------------------------- */
  const formatTime = (value) => {
    const seconds = Math.max(
      0,
      Math.floor(Number(value) || 0)
    );

    return `${String(
      Math.floor(seconds / 60)
    ).padStart(2, "0")}:${String(
      seconds % 60
    ).padStart(2, "0")}`;
  };

  /* --------------------------------
     Like
  -------------------------------- */
  const toggleLike = () => {
    if (!currentSong?.id) return;

    setLikedSongs((old) => {
      const exists = old.some(
        (item) =>
          String(item?.id) ===
          String(currentSong.id)
      );

      const next = exists
        ? old.filter(
            (item) =>
              String(item?.id) !==
              String(currentSong.id)
          )
        : [
            ...old,
            {
              id: currentSong.id,
              name: currentSong.name,
              duration: currentSong.duration,
              image: artwork,
              artists: currentSong.artists,
              audio:
                currentSong.audio?.currentSrc ||
                currentSong.audio?.src ||
                currentSong.audioUrl,
            },
          ];

      try {
        localStorage.setItem(
          "likedSongs",
          JSON.stringify(next)
        );
      } catch {}

      return next;
    });
  };

  /* --------------------------------
     Share
  -------------------------------- */
  const share = async () => {
    const albumId =
      detail?.album?.id ||
      currentSong?.album?.id;

    const url = albumId
      ? `${window.location.origin}/albums/${albumId}`
      : window.location.href;

    try {
      if (navigator.share) {
        await navigator.share({
          title: songName,
          text: `Listen to ${songName} on MusicMax`,
          url,
        });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
      }
    } catch (error) {
      if (error?.name !== "AbortError") {
        console.error("Share failed:", error);
      }
    }
  };

  /* --------------------------------
     Active lyric
  -------------------------------- */
  const activeLyricIndex = useMemo(() => {
    if (!lyrics?.synced || !Array.isArray(lyrics.lines)) {
      return -1;
    }

    let active = -1;

    lyrics.lines.forEach((line, index) => {
      if (Number(line?.time) <= currentTime) {
        active = index;
      }
    });

    return active;
  }, [lyrics, currentTime]);

  if (!currentSong) return null;

  const suggestionList = Array.isArray(suggestions)
    ? suggestions
    : [];

  return (
    <div className="fixed bottom-0 left-0 z-[999] w-full">

      {/* ==========================================
          MINI PLAYER
      ========================================== */}
      {!isMaximized && (
        <div className="relative overflow-hidden border-t border-white/10 bg-[#100b0d]/95 px-3 py-2 shadow-[0_-10px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl lg:px-6">

          <div className="mx-auto flex max-w-[1600px] items-center gap-3">

            {/* Cover */}
            <button
              type="button"
              onClick={() => setIsMaximized(true)}
              className="relative shrink-0 overflow-hidden rounded-lg"
            >
              <img
                src={artwork}
                alt={songName}
                className="h-12 w-12 object-cover"
                onError={(e) => {
                  e.currentTarget.src =
                    "/Unknown.png";
                }}
              />

              <div className="absolute inset-0 grid place-items-center bg-black/20">
                <CiMaximize1 className="text-white" />
              </div>
            </button>

            {/* Song info */}
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-white">
                {songName}
              </div>

              <div className="truncate text-xs text-white/55">
                {artistNames}
              </div>

              <div className="mt-1 hidden items-center gap-2 sm:flex">
                <span className="text-[10px] text-white/50">
                  {formatTime(currentTime)}
                </span>

                <input
                  aria-label="Song progress"
                  type="range"
                  min="0"
                  max="100"
                  step="0.1"
                  value={progress}
                  onChange={seek}
                  className="range w-full accent-red-500"
                />

                <span className="text-[10px] text-white/50">
                  {formatTime(duration)}
                </span>
              </div>
            </div>

            {/* Controls */}
            <button
              type="button"
              onClick={prevSong}
              className="hidden text-white/70 transition hover:text-white sm:block"
              title="Previous"
            >
              <IoMdSkipBackward className="text-2xl" />
            </button>

            <button
              type="button"
              onClick={playPause}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-black transition hover:scale-105"
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <FaPause className="text-sm" />
              ) : (
                <FaPlay className="ml-0.5 text-sm" />
              )}
            </button>

            <button
              type="button"
              onClick={nextSong}
              className="hidden text-white/70 transition hover:text-white sm:block"
              title="Next"
            >
              <IoMdSkipForward className="text-2xl" />
            </button>

            <button
              type="button"
              onClick={toggleLike}
              className="hidden sm:block"
              title="Like"
            >
              {isLiked ? (
                <FaHeart className="text-xl text-red-500" />
              ) : (
                <FaRegHeart className="text-xl text-white/70" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setIsMaximized(true)}
              className="text-white/70"
              title="Open player"
            >
              <CiMaximize1 className="text-xl" />
            </button>
          </div>
        </div>
      )}

      {/* ==========================================
          FULL SCREEN / MAXIMIZED PLAYER
      ========================================== */}
      {isMaximized && (
        <div className="fixed inset-0 overflow-hidden bg-black">

          {/* Blurred album background */}
          <div
            className="absolute inset-0 scale-110 bg-cover bg-center opacity-35 blur-3xl"
            style={{
              backgroundImage: `url("${artwork}")`,
            }}
          />

          {/* Dark gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-[#140b0d]/85 to-[#090607]" />

          {/* Main content */}
          <div className="relative z-10 flex h-full flex-col overflow-y-auto">

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-4 sm:px-8">

              <button
                type="button"
                onClick={() => setIsMaximized(false)}
                className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white backdrop-blur-md transition hover:bg-white/20"
                title="Close player"
              >
                <MdKeyboardArrowDown className="text-2xl" />
              </button>

              <div className="text-center">
                <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-white/50">
                  Now Playing
                </p>
                <p className="mt-1 text-xs text-white/70">
                  MusicMax
                </p>
              </div>

              <button
                type="button"
                onClick={share}
                className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white backdrop-blur-md transition hover:bg-white/20"
                title="Share"
              >
                <IoShareSocial className="text-xl" />
              </button>
            </div>

            {/* Player body */}
            <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 pb-8">

              {/* Cover / Lyrics area */}
              <div className="relative mt-2 flex min-h-[360px] flex-1 items-center justify-center sm:mt-4">

                {!showLyrics ? (
                  /* COVER */
                  <div className="relative">

                    <div className="absolute inset-0 scale-95 rounded-[32px] bg-red-500/30 blur-3xl" />

                    <img
                      src={artwork}
                      alt={songName}
                      className="relative h-[min(72vw,390px)] w-[min(72vw,390px)] rounded-[28px] object-cover shadow-[0_25px_80px_rgba(0,0,0,0.7)] ring-1 ring-white/15"
                      onError={(e) => {
                        e.currentTarget.src =
                          "/Unknown.png";
                      }}
                    />
                  </div>
                ) : (
                  /* LYRICS */
                  <div className="flex h-[min(70vh,480px)] w-full max-w-xl flex-col overflow-hidden rounded-[28px] border border-white/10 bg-black/25 p-4 shadow-2xl backdrop-blur-xl sm:p-6">

                    <div className="mb-4 text-center">
                      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-red-300">
                        Lyrics
                      </p>
                    </div>

                    <div
                      className="flex-1 overflow-y-auto px-1"
                      style={{
                        scrollbarWidth: "thin",
                      }}
                    >
                      {lyrics?.synced &&
                      Array.isArray(lyrics.lines) &&
                      lyrics.lines.length > 0 ? (
                        <div className="space-y-2 py-8">
                          {lyrics.lines.map(
                            (line, index) => {
                              const active =
                                index ===
                                activeLyricIndex;

                              return (
                                <p
                                  key={`${line?.time}-${index}`}
                                  className={`
                                    rounded-2xl px-4 py-3
                                    text-center
                                    text-base
                                    leading-7
                                    transition-all
                                    duration-300
                                    sm:text-lg
                                    ${
                                      active
                                        ? "scale-[1.02] bg-red-300/20 font-bold text-red-50 shadow-[0_8px_30px_rgba(248,113,113,0.12)] ring-1 ring-red-300/20"
                                        : "text-white/35"
                                    }
                                  `}
                                >
                                  {safeDecode(
                                    line?.text ||
                                      ""
                                  )}
                                </p>
                              );
                            }
                          )}
                        </div>
                      ) : lyrics?.plain ? (
                        <div className="whitespace-pre-line px-3 py-8 text-center text-base leading-8 text-white/80 sm:text-lg">
                          {safeDecode(lyrics.plain)}
                        </div>
                      ) : (
                        <div className="flex h-full items-center justify-center text-center text-white/45">
                          <div>
                            <p className="text-lg">
                              No lyrics available
                            </p>
                            <p className="mt-2 text-sm text-white/30">
                              Lyrics are not available for this song.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Song information */}
              <div className="mt-5 text-center">

                <h1 className="truncate text-2xl font-bold text-white sm:text-3xl">
                  {songName}
                </h1>

                <p className="mt-1 truncate text-sm text-white/55 sm:text-base">
                  {artistNames}
                </p>
              </div>

              {/* Progress */}
              <div className="mt-6">

                <input
                  aria-label="Song progress"
                  type="range"
                  min="0"
                  max="100"
                  step="0.1"
                  value={progress}
                  onChange={seek}
                  className="h-1.5 w-full cursor-pointer accent-red-500"
                />

                <div className="mt-2 flex justify-between text-[11px] text-white/45">
                  <span>
                    {formatTime(currentTime)}
                  </span>
                  <span>
                    {formatTime(duration)}
                  </span>
                </div>
              </div>

              {/* Main controls */}
              <div className="mt-5 flex items-center justify-center gap-6 sm:gap-9">

                <button
                  type="button"
                  onClick={toggleShuffle}
                  className={`transition hover:scale-110 ${
                    shuffle
                      ? "text-red-400"
                      : "text-white/55"
                  }`}
                  title="Shuffle"
                >
                  <PiShuffleBold className="text-xl" />
                </button>

                <button
                  type="button"
                  onClick={prevSong}
                  className="text-white transition hover:scale-110"
                  title="Previous"
                >
                  <IoMdSkipBackward className="text-3xl" />
                </button>

                <button
                  type="button"
                  onClick={playPause}
                  className="grid h-16 w-16 place-items-center rounded-full bg-white text-black shadow-[0_10px_35px_rgba(255,255,255,0.18)] transition hover:scale-105"
                  title={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? (
                    <FaPause className="text-xl" />
                  ) : (
                    <FaPlay className="ml-1 text-xl" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={nextSong}
                  className="text-white transition hover:scale-110"
                  title="Next"
                >
                  <IoMdSkipForward className="text-3xl" />
                </button>

                <button
                  type="button"
                  onClick={toggleRepeatMode}
                  className={`transition hover:scale-110 ${
                    repeatMode === "one"
                      ? "text-red-400"
                      : "text-white/55"
                  }`}
                  title="Repeat"
                >
                  {repeatMode === "one" ? (
                    <LuRepeat1 className="text-xl" />
                  ) : (
                    <LuRepeat className="text-xl" />
                  )}
                </button>
              </div>

              {/* Volume */}
              <div className="mx-auto mt-5 flex w-full max-w-sm items-center gap-3">

                <PiSpeakerLowFill className="shrink-0 text-white/50" />

                <input
                  aria-label="Volume"
                  type="range"
                  min="0"
                  max="100"
                  value={volume}
                  onChange={changeVolume}
                  className="h-1 w-full cursor-pointer accent-red-500"
                />

                <span className="w-8 text-right text-[10px] text-white/40">
                  {volume}
                </span>
              </div>

              {/* Bottom actions */}
              <div className="mt-5 flex items-center justify-center gap-6">

                <button
                  type="button"
                  onClick={toggleLike}
                  className="grid h-10 w-10 place-items-center rounded-full bg-white/5 text-white/70 transition hover:bg-white/10"
                  title="Like"
                >
                  {isLiked ? (
                    <FaHeart className="text-red-500" />
                  ) : (
                    <FaRegHeart />
                  )}
                </button>

                <button
                  type="button"
                  onClick={downloadSong}
                  className="grid h-10 w-10 place-items-center rounded-full bg-white/5 text-white/70 transition hover:bg-white/10"
                  title="Download"
                >
                  <MdDownload className="text-xl" />
                </button>
              </div>

              {/* ======================================
                  COVER / LYRICS SWITCH - BOTTOM
              ====================================== */}
              <div className="mt-6 flex justify-center">

                <div className="flex rounded-full border border-white/10 bg-black/30 p-1 shadow-lg backdrop-blur-xl">

                  <button
                    type="button"
                    onClick={() => setShowLyrics(false)}
                    className={`
                      rounded-full px-7 py-2.5
                      text-sm font-medium
                      transition-all duration-300
                      ${
                        !showLyrics
                          ? "bg-white text-black shadow-lg"
                          : "text-white/50 hover:text-white"
                      }
                    `}
                  >
                    Cover
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowLyrics(true)}
                    className={`
                      rounded-full px-7 py-2.5
                      text-sm font-medium
                      transition-all duration-300
                      ${
                        showLyrics
                          ? "bg-red-400 text-white shadow-[0_5px_25px_rgba(248,113,113,0.25)]"
                          : "text-white/50 hover:text-white"
                      }
                    `}
                  >
                    Lyrics
                  </button>

                </div>
              </div>

              {/* Album */}
              {detail?.album?.id && (
                <Link
                  to={`/albums/${detail.album.id}`}
                  className="mt-7 block"
                >
                  <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 transition hover:bg-white/10">

                    <img
                      src={
                        detail.album.image?.[0]?.url ||
                        artwork
                      }
                      alt=""
                      className="h-14 w-14 rounded-xl object-cover"
                    />

                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-wider text-white/40">
                        From Album
                      </p>

                      <p className="truncate text-sm font-semibold text-white">
                        {safeDecode(
                          detail.album.name
                        )}
                      </p>
                    </div>
                  </div>
                </Link>
              )}

              {/* Suggestions */}
              {suggestionList.length > 0 && (
                <div className="mt-7 w-full">

                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-white">
                      You Might Like
                    </h3>

                    <div className="hidden gap-1 lg:flex">
                      <button
                        type="button"
                        onClick={() =>
                          scrollRef.current?.scrollBy({
                            left: -500,
                            behavior: "smooth",
                          })
                        }
                        className="grid h-8 w-8 place-items-center rounded-full bg-white/5"
                      >
                        <span className="text-white/60">
                          ‹
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          scrollRef.current?.scrollBy({
                            left: 500,
                            behavior: "smooth",
                          })
                        }
                        className="grid h-8 w-8 place-items-center rounded-full bg-white/5"
                      >
                        <span className="text-white/60">
                          ›
                        </span>
                      </button>
                    </div>
                  </div>

                  <div
                    ref={scrollRef}
                    className="flex gap-3 overflow-x-auto pb-2"
                    style={{
                      scrollbarWidth: "none",
                    }}
                  >
                    {suggestionList.map(
                      (item, index) => (
                        <SongGrid
                          key={
                            item?.id || index
                          }
                          song={item}
                        />
                      )
                    )}
                  </div>
                </div>
              )}

              {/* Artists */}
              {currentSong?.artists?.primary
                ?.length > 0 && (
                <div className="mt-7 w-full">

                  <h3 className="mb-3 text-sm font-semibold text-white">
                    Artists
                  </h3>

                  <div className="flex gap-4 overflow-x-auto pb-2">
                    {currentSong.artists.primary.map(
                      (artist, index) => (
                        <ArtistItems
                          key={
                            artist?.id || index
                          }
                          {...artist}
                        />
                      )
                    )}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Player;
