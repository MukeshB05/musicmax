import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  FaHeart,
  FaPause,
  FaPlay,
  FaRegHeart,
  FaStepBackward,
  FaStepForward,
} from "react-icons/fa";

import {
  IoChevronDown,
  IoChevronUp,
  IoShareSocial,
} from "react-icons/io5";

import {
  MdDownload,
  MdLyrics,
  MdRepeat,
  MdShuffle,
} from "react-icons/md";

import { CiMaximize1 } from "react-icons/ci";

import {
  useMusic,
} from "../context/MusicContext";

import {
  getSongById,
  getSuggestionSong,
} from "../services/songService";


const Player = () => {
  const {
    currentSong,
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
  } = useMusic();

  const audioRef = useRef(null);
  const progressRef = useRef(null);
  const lyricsContainerRef = useRef(null);

  const [isMaximized, setIsMaximized] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume] = useState(1);

  const [songDetails, setSongDetails] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const [isLiked, setIsLiked] = useState(false);

  const [activeLyricIndex, setActiveLyricIndex] = useState(-1);

  /* =================================================
     SONG ID
  ================================================= */

  const songId = useMemo(() => {
    if (!currentSong) return null;

    return (
      currentSong.id ??
      currentSong.songId ??
      currentSong.song_id ??
      currentSong.trackId ??
      null
    );
  }, [currentSong]);

  /* =================================================
     ARTWORK
  ================================================= */

  const artwork = useMemo(() => {
    return (
      coverImage ||
      currentSong?.image ||
      currentSong?.album?.image ||
      "/Unknown.png"
    );
  }, [coverImage, currentSong]);

  /* =================================================
     SONG TITLE
  ================================================= */

  const title = useMemo(() => {
    return (
      currentSong?.title ||
      currentSong?.name ||
      currentSong?.songName ||
      "Unknown Song"
    );
  }, [currentSong]);

  /* =================================================
     ARTIST
  ================================================= */

  const artist = useMemo(() => {
    if (!currentSong) return "Unknown Artist";

    if (currentSong.artist) {
      if (typeof currentSong.artist === "string") {
        return currentSong.artist;
      }

      return (
        currentSong.artist.name ||
        currentSong.artist.title ||
        "Unknown Artist"
      );
    }

    if (Array.isArray(currentSong.artists)) {
      return currentSong.artists
        .map((item) =>
          typeof item === "string"
            ? item
            : item?.name || item?.title
        )
        .filter(Boolean)
        .join(", ");
    }

    return (
      currentSong.artistName ||
      currentSong.singer ||
      "Unknown Artist"
    );
  }, [currentSong]);

  /* =================================================
     ALBUM
  ================================================= */

  const album = useMemo(() => {
    return (
      currentSong?.album?.name ||
      currentSong?.album?.title ||
      currentSong?.albumName ||
      songDetails?.album?.name ||
      "Unknown Album"
    );
  }, [currentSong, songDetails]);

  /* =================================================
     DARK MODE
  ================================================= */

  const isDark =
    typeof document !== "undefined" &&
    document.documentElement.classList.contains("dark");

  const softPanelClass = isDark
    ? "border-white/10 bg-white/5"
    : "border-black/10 bg-white/70";

  /* =================================================
     FORMAT TIME
  ================================================= */

  const formatTime = (seconds) => {
    if (!Number.isFinite(seconds) || seconds < 0) {
      return "0:00";
    }

    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);

    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  /* =================================================
     LIKE
  ================================================= */

  const getLikedSongs = () => {
    try {
      const saved = localStorage.getItem("likedSongs");

      if (!saved) return {};

      return JSON.parse(saved);
    } catch {
      return {};
    }
  };

  const saveLikedSongs = (songs) => {
    try {
      localStorage.setItem(
        "likedSongs",
        JSON.stringify(songs)
      );
    } catch {
      // Ignore localStorage errors.
    }
  };

  const toggleLike = useCallback(() => {
    if (!songId) return;

    const likedSongs = getLikedSongs();

    const nextLiked = !likedSongs[songId];

    if (nextLiked) {
      likedSongs[songId] = true;
    } else {
      delete likedSongs[songId];
    }

    saveLikedSongs(likedSongs);

    setIsLiked(nextLiked);
  }, [songId]);

  /* =================================================
     CHECK LIKE STATE
  ================================================= */

  useEffect(() => {
    if (!songId) {
      setIsLiked(false);
      return;
    }

    const likedSongs = getLikedSongs();

    setIsLiked(Boolean(likedSongs[songId]));
  }, [songId]);

  /* =================================================
     AUDIO SOURCE
  ================================================= */

  const audioSource = useMemo(() => {
    return (
      currentSong?.url ||
      currentSong?.audio ||
      currentSong?.audioUrl ||
      currentSong?.audio_url ||
      currentSong?.downloadUrl ||
      currentSong?.download_url ||
      currentSong?.media_url ||
      ""
    );
  }, [currentSong]);

  /* =================================================
     PLAY / PAUSE
  ================================================= */

  const togglePlay = useCallback(() => {
    if (!audioRef.current) return;

    if (audioRef.current.paused) {
      audioRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch(() => {
          setIsPlaying(false);
        });
    } else {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, [setIsPlaying]);

  /* =================================================
     AUDIO SOURCE CHANGE
  ================================================= */

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio) return;

    audio.pause();

    setCurrentTime(0);
    setDuration(0);

    if (!audioSource) {
      setIsPlaying(false);
      return;
    }

    audio.src = audioSource;
    audio.load();

    if (isPlaying) {
      audio
        .play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch(() => {
          setIsPlaying(false);
        });
    }
  }, [audioSource]);

  /* =================================================
     PLAY STATE
  ================================================= */

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio) return;

    if (isPlaying) {
      audio
        .play()
        .catch(() => {
          setIsPlaying(false);
        });
    } else {
      audio.pause();
    }
  }, [isPlaying, setIsPlaying]);

  /* =================================================
     VOLUME
  ================================================= */

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio) return;

    audio.volume = 1;
    audio.muted = false;
  }, [volume]);

  /* =================================================
     AUDIO EVENTS
  ================================================= */

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime || 0);
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration || 0);
    };

    const handleDurationChange = () => {
      setDuration(audio.duration || 0);
    };

    const handleEnded = () => {
      if (repeatMode === "one") {
        audio.currentTime = 0;

        audio
          .play()
          .catch(() => {});

        return;
      }

      setIsPlaying(false);
      nextSong();
    };

    audio.addEventListener(
      "timeupdate",
      handleTimeUpdate
    );

    audio.addEventListener(
      "loadedmetadata",
      handleLoadedMetadata
    );

    audio.addEventListener(
      "durationchange",
      handleDurationChange
    );

    audio.addEventListener(
      "ended",
      handleEnded
    );

    return () => {
      audio.removeEventListener(
        "timeupdate",
        handleTimeUpdate
      );

      audio.removeEventListener(
        "loadedmetadata",
        handleLoadedMetadata
      );

      audio.removeEventListener(
        "durationchange",
        handleDurationChange
      );

      audio.removeEventListener(
        "ended",
        handleEnded
      );
    };
  }, [
    nextSong,
    repeatMode,
    setIsPlaying,
  ]);

  /* =================================================
     REPEAT
  ================================================= */

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio) return;

    audio.loop = repeatMode === "one";
  }, [repeatMode]);

  /* =================================================
     PROGRESS
  ================================================= */

  const handleProgressClick = (event) => {
    const audio = audioRef.current;
    const progress = progressRef.current;

    if (!audio || !progress || !duration) {
      return;
    }

    const rect =
      progress.getBoundingClientRect();

    const clickPosition =
      event.clientX - rect.left;

    const percentage =
      Math.min(
        1,
        Math.max(
          0,
          clickPosition / rect.width
        )
      );

    audio.currentTime =
      percentage * duration;

    setCurrentTime(audio.currentTime);
  };

  const progressPercentage =
    duration > 0
      ? Math.min(
          100,
          Math.max(
            0,
            (currentTime / duration) * 100
          )
        )
      : 0;

  /* =================================================
     SONG DETAILS
  ================================================= */

  useEffect(() => {
    let cancelled = false;

    const loadSongDetails = async () => {
      if (!songId) {
        setSongDetails(null);
        return;
      }

      try {
        const result =
          await getSongById(songId);

        if (!cancelled) {
          setSongDetails(result);
        }
      } catch {
        if (!cancelled) {
          setSongDetails(null);
        }
      }
    };

    loadSongDetails();

    return () => {
      cancelled = true;
    };
  }, [songId]);

  /* =================================================
     SUGGESTIONS
  ================================================= */

  useEffect(() => {
    let cancelled = false;

    const loadSuggestions = async () => {
      if (!songId) {
        setSuggestions([]);
        return;
      }

      setLoadingSuggestions(true);

      try {
        const result =
          await getSuggestionSong(songId);

        if (cancelled) return;

        const list = Array.isArray(result)
          ? result
          : result?.songs ||
            result?.data ||
            result?.results ||
            [];

        setSuggestions(
          Array.isArray(list)
            ? list
            : []
        );
      } catch {
        if (!cancelled) {
          setSuggestions([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingSuggestions(false);
        }
      }
    };

    loadSuggestions();

    return () => {
      cancelled = true;
    };
  }, [songId]);

  /* =================================================
     LYRICS
  ================================================= */

  const normalizedLyrics = useMemo(() => {
    if (!lyrics) return [];

    if (Array.isArray(lyrics)) {
      return lyrics
        .map((line) => {
          if (typeof line === "string") {
            return {
              text: line,
              time: null,
            };
          }

          return {
            text:
              line?.text ||
              line?.words ||
              line?.lyric ||
              "",
            time:
              line?.time ??
              line?.startTime ??
              line?.timestamp ??
              null,
          };
        })
        .filter((line) => line.text);
    }

    if (typeof lyrics === "string") {
      return lyrics
        .split("\n")
        .map((line) => ({
          text: line,
          time: null,
        }))
        .filter((line) => line.text.trim());
    }

    if (Array.isArray(lyrics?.lines)) {
      return lyrics.lines
        .map((line) => ({
          text:
            line?.text ||
            line?.words ||
            "",
          time:
            line?.time ??
            line?.startTime ??
            line?.timestamp ??
            null,
        }))
        .filter((line) => line.text);
    }

    return [];
  }, [lyrics]);

  /* =================================================
     ACTIVE LYRIC
  ================================================= */

  useEffect(() => {
    if (!normalizedLyrics.length) {
      setActiveLyricIndex(-1);
      return;
    }

    const syncedLines =
      normalizedLyrics.filter(
        (line) =>
          line.time !== null &&
          Number.isFinite(
            Number(line.time)
          )
      );

    if (!syncedLines.length) {
      setActiveLyricIndex(-1);
      return;
    }

    let active = -1;

    normalizedLyrics.forEach(
      (line, index) => {
        if (
          line.time !== null &&
          Number(line.time) <= currentTime
        ) {
          active = index;
        }
      }
    );

    setActiveLyricIndex(active);
  }, [
    currentTime,
    normalizedLyrics,
  ]);

  /* =================================================
     AUTO SCROLL LYRICS
  ================================================= */

  useEffect(() => {
    if (
      activeLyricIndex < 0 ||
      !lyricsContainerRef.current
    ) {
      return;
    }

    const activeElement =
      lyricsContainerRef.current.querySelector(
        `[data-lyric-index="${activeLyricIndex}"]`
      );

    if (!activeElement) return;

    activeElement.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, [activeLyricIndex]);

  /* =================================================
     SHARE
  ================================================= */

  const share = async () => {
    const albumId =
      currentSong?.album?.id ||
      currentSong?.album?.albumId ||
      currentSong?.albumId;

    const shareUrl = albumId
      ? `${window.location.origin}/album/${albumId}`
      : window.location.href;

    const shareData = {
      title,
      text: `${title} - ${artist}`,
      url: shareUrl,
    };

    try {
      if (
        navigator.share &&
        typeof navigator.share === "function"
      ) {
        await navigator.share(shareData);
        return;
      }

      if (
        navigator.clipboard &&
        typeof navigator.clipboard.writeText ===
          "function"
      ) {
        await navigator.clipboard.writeText(
          shareUrl
        );

        alert("Link copied");
      }
    } catch {
      // User cancelled share.
    }
  };

  /* =================================================
     DOWNLOAD
  ================================================= */

  const handleDownload = async () => {
    try {
      if (typeof downloadSong === "function") {
        const result =
          await downloadSong(currentSong);

        if (result) return;
      }
    } catch {
      // Fallback below.
    }

    if (!audioSource) return;

    try {
      const response =
        await fetch(audioSource);

      if (!response.ok) {
        throw new Error(
          "Download failed"
        );
      }

      const blob =
        await response.blob();

      const url =
        window.URL.createObjectURL(blob);

      const link =
        document.createElement("a");

      link.href = url;

      link.download =
        `${title || "song"}.mp3`;

      document.body.appendChild(link);

      link.click();

      link.remove();

      window.URL.revokeObjectURL(url);
    } catch {
      window.open(
        audioSource,
        "_blank",
        "noopener,noreferrer"
      );
    }
  };

  /* =================================================
     MEDIA SESSION
  ================================================= */

  useEffect(() => {
    if (
      typeof navigator === "undefined" ||
      !("mediaSession" in navigator) ||
      !currentSong
    ) {
      return;
    }

    try {
      navigator.mediaSession.metadata =
        new MediaMetadata({
          title,
          artist,
          album,
          artwork: [
            {
              src: artwork,
            },
          ],
        });

      navigator.mediaSession.setActionHandler(
        "play",
        () => {
          setIsPlaying(true);
        }
      );

      navigator.mediaSession.setActionHandler(
        "pause",
        () => {
          setIsPlaying(false);
        }
      );

      navigator.mediaSession.setActionHandler(
        "previoustrack",
        () => {
          prevSong();
        }
      );

      navigator.mediaSession.setActionHandler(
        "nexttrack",
        () => {
          nextSong();
        }
      );
    } catch {
      // Media Session may not support all actions.
    }

    return () => {
      if (
        typeof navigator !== "undefined" &&
        "mediaSession" in navigator
      ) {
        try {
          navigator.mediaSession.metadata =
            null;
        } catch {
          // Ignore cleanup errors.
        }
      }
    };
  }, [
    currentSong,
    title,
    artist,
    album,
    artwork,
    nextSong,
    prevSong,
    setIsPlaying,
  ]);

  /* =================================================
     EMPTY STATE
  ================================================= */

  if (!currentSong) {
    return null;
  }

  /* =================================================
     MINI PLAYER
  ================================================= */

  if (!isMaximized) {
    return (
      <>
        <audio
          ref={audioRef}
          preload="metadata"
        />

        <div
          className="
            fixed
            bottom-0
            left-0
            right-0
            z-50
            border-t
            border-white/10
            bg-black/90
            shadow-2xl
            backdrop-blur-2xl
          "
        >
          {/* PROGRESS */}

          <div
            ref={progressRef}
            onClick={handleProgressClick}
            className="
              absolute
              left-0
              right-0
              top-0
              h-1
              cursor-pointer
              bg-white/10
            "
          >
            <div
              className="
                h-full
                bg-red-500
                transition-[width]
                duration-100
              "
              style={{
                width: `${progressPercentage}%`,
              }}
            />
          </div>

          <div
            className="
              mx-auto
              flex
              max-w-7xl
              items-center
              gap-3
              px-3
              py-2
              sm:px-5
            "
          >
            {/* ARTWORK */}

            <button
              type="button"
              onClick={() =>
                setIsMaximized(true)
              }
              className="
                shrink-0
                overflow-hidden
                rounded-lg
              "
              title="Open player"
            >
              <img
                src={artwork}
                alt={title}
                className="
                  h-12
                  w-12
                  object-cover
                  sm:h-14
                  sm:w-14
                "
              />
            </button>

            {/* SONG INFO */}

            <button
              type="button"
              onClick={() =>
                setIsMaximized(true)
              }
              className="
                min-w-0
                flex-1
                text-left
              "
            >
              <div
                className="
                  truncate
                  text-sm
                  font-semibold
                "
              >
                {title}
              </div>

              <div
                className="
                  truncate
                  text-xs
                  opacity-60
                "
              >
                {artist}
              </div>
            </button>

            {/* PREVIOUS */}

            <button
              type="button"
              onClick={prevSong}
              title="Previous"
              aria-label="Previous song"
              className="
                hidden
                h-10
                w-10
                items-center
                justify-center
                rounded-full
                transition
                hover:bg-white/10
                sm:flex
              "
            >
              <FaStepBackward />
            </button>

            {/* PLAY */}

            <button
              type="button"
              onClick={togglePlay}
              title={
                isPlaying
                  ? "Pause"
                  : "Play"
              }
              aria-label={
                isPlaying
                  ? "Pause"
                  : "Play"
              }
              className="
                flex
                h-10
                w-10
                shrink-0
                items-center
                justify-center
                rounded-full
                bg-red-500
                text-white
                shadow-lg
                transition
                hover:scale-105
              "
            >
              {isPlaying ? (
                <FaPause />
              ) : (
                <FaPlay className="ml-0.5" />
              )}
            </button>

            {/* NEXT */}

            <button
              type="button"
              onClick={nextSong}
              title="Next"
              aria-label="Next song"
              className="
                hidden
                h-10
                w-10
                items-center
                justify-center
                rounded-full
                transition
                hover:bg-white/10
                sm:flex
              "
            >
              <FaStepForward />
            </button>

            {/* MAXIMIZE */}

            <button
              type="button"
              onClick={() =>
                setIsMaximized(true)
              }
              title="Open full player"
              aria-label="Open full player"
              className="
                flex
                h-10
                w-10
                shrink-0
                items-center
                justify-center
                rounded-full
                opacity-70
                transition
                hover:bg-white/10
                hover:opacity-100
              "
            >
              <CiMaximize1 className="text-xl" />
            </button>
          </div>
        </div>
      </>
    );
  }

  /* =================================================
     FULL PLAYER
  ================================================= */

  return (
    <>
      <audio
        ref={audioRef}
        preload="metadata"
      />

      <div
        className="
          fixed
          inset-0
          z-[100]
          overflow-y-auto
          bg-black
          text-white
        "
      >
        {/* BACKGROUND */}

        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <img
            src={artwork}
            alt=""
            className="
              absolute
              inset-0
              h-full
              w-full
              object-cover
              opacity-20
              blur-3xl
            "
          />

          <div className="absolute inset-0 bg-black/75" />
        </div>

        {/* CONTENT */}

        <div
          className="
            relative
            mx-auto
            flex
            min-h-screen
            w-full
            max-w-6xl
            flex-col
            px-4
            py-4
            sm:px-6
            sm:py-6
            lg:px-8
          "
        >
          {/* =================================================
              TOP BAR
          ================================================= */}

          <div
            className="
              flex
              w-full
              items-center
              justify-end
            "
          >
            <button
              type="button"
              onClick={() => {
                setIsMaximized(false);
                setShowLyrics(false);
              }}
              title="Close"
              aria-label="Close player"
              className={`
                flex
                h-10
                w-10
                items-center
                justify-center
                rounded-full
                border
                text-xl
                font-medium
                backdrop-blur-xl
                transition
                hover:bg-red-500
                hover:text-white
                ${softPanelClass}
              `}
            >
              ✕
            </button>
          </div>

          {/* =================================================
              MAIN PLAYER
          ================================================= */}

          <div
            className="
              flex
              flex-1
              flex-col
              items-center
              justify-center
              py-6
            "
          >
            {/* =================================================
                COVER / LYRICS AREA
            ================================================= */}

            <div
              className="
                flex
                w-full
                justify-center
              "
            >
              {!showLyrics ? (
                <div
                  className="
                    relative
                    aspect-square
                    w-[min(78vw,420px)]
                    overflow-hidden
                    rounded-3xl
                    shadow-2xl
                    ring-1
                    ring-white/10
                  "
                >
                  <img
                    src={artwork}
                    alt={title}
                    className="
                      h-full
                      w-full
                      object-cover
                    "
                  />
                </div>
              ) : (
                <div
                  ref={lyricsContainerRef}
                  className="
                    h-[min(55vh,430px)]
                    w-full
                    max-w-2xl
                    overflow-y-auto
                    rounded-3xl
                    border
                    border-white/10
                    bg-black/20
                    px-5
                    py-8
                    text-center
                    backdrop-blur-xl
                  "
                >
                  {normalizedLyrics.length >
                  0 ? (
                    <div
                      className="
                        flex
                        flex-col
                        gap-5
                      "
                    >
                      {normalizedLyrics.map(
                        (
                          line,
                          index
                        ) => (
                          <div
                            key={`${index}-${line.text}`}
                            data-lyric-index={
                              index
                            }
                            className={`
                              text-lg
                              leading-relaxed
                              transition-all
                              duration-300
                              sm:text-xl
                              ${
                                index ===
                                activeLyricIndex
                                  ? "scale-105 font-bold text-white"
                                  : "text-white/45"
                              }
                            `}
                          >
                            {line.text}
                          </div>
                        )
                      )}
                    </div>
                  ) : (
                    <div
                      className="
                        flex
                        h-full
                        items-center
                        justify-center
                        text-sm
                        opacity-50
                      "
                    >
                      No lyrics available
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* =================================================
                SONG INFO
            ================================================= */}

            <div
              className="
                mt-6
                w-full
                max-w-2xl
                text-center
              "
            >
              <h1
                className="
                  truncate
                  text-2xl
                  font-bold
                  sm:text-3xl
                "
              >
                {title}
              </h1>

              <p
                className="
                  mt-1
                  truncate
                  text-sm
                  opacity-60
                  sm:text-base
                "
              >
                {artist}
              </p>
            </div>

            {/* =================================================
                PROGRESS
            ================================================= */}

            <div
              className="
                mt-6
                w-full
                max-w-2xl
              "
            >
              <div
                ref={progressRef}
                onClick={
                  handleProgressClick
                }
                className="
                  group
                  h-2
                  w-full
                  cursor-pointer
                  rounded-full
                  bg-white/15
                "
              >
                <div
                  className="
                    relative
                    h-full
                    rounded-full
                    bg-red-500
                    transition-[width]
                    duration-100
                  "
                  style={{
                    width: `${progressPercentage}%`,
                  }}
                >
                  <div
                    className="
                      absolute
                      right-0
                      top-1/2
                      h-4
                      w-4
                      -translate-y-1/2
                      rounded-full
                      bg-white
                      opacity-0
                      shadow-lg
                      transition
                      group-hover:opacity-100
                    "
                  />
                </div>
              </div>

              <div
                className="
                  mt-2
                  flex
                  justify-between
                  text-xs
                  opacity-50
                "
              >
                <span>
                  {formatTime(
                    currentTime
                  )}
                </span>

                <span>
                  {formatTime(duration)}
                </span>
              </div>
            </div>

            {/* =================================================
                MAIN CONTROLS
            ================================================= */}

            <div
              className="
                mt-5
                flex
                items-center
                justify-center
                gap-3
                sm:gap-5
              "
            >
              {/* SHUFFLE */}

              <button
                type="button"
                onClick={
                  toggleShuffle
                }
                title="Shuffle"
                aria-label="Toggle shuffle"
                className={`
                  flex
                  h-10
                  w-10
                  items-center
                  justify-center
                  rounded-full
                  transition
                  hover:bg-white/10
                  ${
                    shuffle
                      ? "text-red-500"
                      : "opacity-60"
                  }
                `}
              >
                <MdShuffle className="text-xl" />
              </button>

              {/* PREVIOUS */}

              <button
                type="button"
                onClick={prevSong}
                title="Previous"
                aria-label="Previous song"
                className="
                  flex
                  h-11
                  w-11
                  items-center
                  justify-center
                  rounded-full
                  transition
                  hover:bg-white/10
                "
              >
                <FaStepBackward className="text-lg" />
              </button>

              {/* PLAY */}

              <button
                type="button"
                onClick={togglePlay}
                title={
                  isPlaying
                    ? "Pause"
                    : "Play"
                }
                aria-label={
                  isPlaying
                    ? "Pause"
                    : "Play"
                }
                className="
                  flex
                  h-16
                  w-16
                  items-center
                  justify-center
                  rounded-full
                  bg-red-500
                  text-white
                  shadow-xl
                  shadow-red-500/25
                  transition
                  hover:scale-105
                "
              >
                {isPlaying ? (
                  <FaPause className="text-xl" />
                ) : (
                  <FaPlay className="ml-1 text-xl" />
                )}
              </button>

              {/* NEXT */}

              <button
                type="button"
                onClick={nextSong}
                title="Next"
                aria-label="Next song"
                className="
                  flex
                  h-11
                  w-11
                  items-center
                  justify-center
                  rounded-full
                  transition
                  hover:bg-white/10
                "
              >
                <FaStepForward className="text-lg" />
              </button>

              {/* REPEAT */}

              <button
                type="button"
                onClick={
                  toggleRepeatMode
                }
                title="Repeat"
                aria-label="Toggle repeat"
                className={`
                  flex
                  h-10
                  w-10
                  items-center
                  justify-center
                  rounded-full
                  transition
                  hover:bg-white/10
                  ${
                    repeatMode !== "off"
                      ? "text-red-500"
                      : "opacity-60"
                  }
                `}
              >
                <MdRepeat className="text-xl" />

                {repeatMode === "one" && (
                  <span
                    className="
                      absolute
                      mt-5
                      ml-5
                      text-[8px]
                      font-bold
                    "
                  >
                    1
                  </span>
                )}
              </button>
            </div>

            {/* =================================================
                PLAYER ACTIONS
                COVER | LYRICS | LIKE | SHARE | DOWNLOAD
            ================================================= */}

            <div
              className={`
                mt-5
                flex
                flex-wrap
                items-center
                justify-center
                gap-1.5
                rounded-full
                border
                p-1.5
                shadow-2xl
                backdrop-blur-2xl
                ${softPanelClass}
              `}
            >
              {/* COVER */}

              <button
                type="button"
                onClick={() =>
                  setShowLyrics(false)
                }
                title="Show Cover"
                aria-label="Show cover"
                className={`
                  rounded-full
                  px-4
                  py-2.5
                  text-sm
                  font-semibold
                  transition-all
                  duration-300
                  ${
                    !showLyrics
                      ? "bg-red-500 text-white shadow-lg shadow-red-500/25"
                      : "opacity-60 hover:bg-white/10 hover:opacity-100"
                  }
                `}
              >
                Cover
              </button>

              {/* LYRICS */}

              <button
                type="button"
                onClick={() =>
                  setShowLyrics(true)
                }
                title="Show Lyrics"
                aria-label="Show lyrics"
                className={`
                  flex
                  items-center
                  gap-1.5
                  rounded-full
                  px-4
                  py-2.5
                  text-sm
                  font-semibold
                  transition-all
                  duration-300
                  ${
                    showLyrics
                      ? "bg-red-500 text-white shadow-lg shadow-red-500/25"
                      : "opacity-60 hover:bg-white/10 hover:opacity-100"
                  }
                `}
              >
                <MdLyrics />
                Lyrics
              </button>

              {/* DIVIDER */}

              <div
                className={`
                  mx-1
                  h-6
                  w-px
                  ${
                    isDark
                      ? "bg-white/15"
                      : "bg-black/15"
                  }
                `}
              />

              {/* LIKE */}

              <button
                type="button"
                onClick={
                  toggleLike
                }
                title={
                  isLiked
                    ? "Unlike"
                    : "Like"
                }
                aria-label={
                  isLiked
                    ? "Unlike song"
                    : "Like song"
                }
                className={`
                  flex
                  h-10
                  w-10
                  items-center
                  justify-center
                  rounded-full
                  transition-all
                  hover:scale-110
                  hover:bg-white/10
                  ${
                    isLiked
                      ? "text-red-500"
                      : "opacity-75 hover:opacity-100"
                  }
                `}
              >
                {isLiked ? (
                  <FaHeart className="text-lg" />
                ) : (
                  <FaRegHeart className="text-lg" />
                )}
              </button>

              {/* SHARE */}

              <button
                type="button"
                onClick={share}
                title="Share"
                aria-label="Share song"
                className="
                  flex
                  h-10
                  w-10
                  items-center
                  justify-center
                  rounded-full
                  opacity-75
                  transition-all
                  hover:scale-110
                  hover:bg-white/10
                  hover:opacity-100
                "
              >
                <IoShareSocial className="text-lg" />
              </button>

              {/* DOWNLOAD */}

              <button
                type="button"
                onClick={
                  handleDownload
                }
                title="Download"
                aria-label="Download song"
                className="
                  flex
                  h-10
                  w-10
                  items-center
                  justify-center
                  rounded-full
                  opacity-75
                  transition-all
                  hover:scale-110
                  hover:bg-white/10
                  hover:opacity-100
                "
              >
                <MdDownload className="text-xl" />
              </button>
            </div>
          </div>

          {/* =================================================
              ALBUM
          ================================================= */}

          {(songDetails?.album ||
            currentSong?.album) && (
            <div
              className={`
                mt-4
                rounded-2xl
                border
                p-4
                backdrop-blur-xl
                ${softPanelClass}
              `}
            >
              <div
                className="
                  flex
                  items-center
                  gap-4
                "
              >
                <img
                  src={
                    songDetails?.album?.image ||
                    currentSong?.album?.image ||
                    artwork
                  }
                  alt={album}
                  className="
                    h-16
                    w-16
                    rounded-xl
                    object-cover
                  "
                />

                <div className="min-w-0">
                  <p
                    className="
                      text-xs
                      uppercase
                      tracking-wider
                      opacity-50
                    "
                  >
                    Album
                  </p>

                  <p
                    className="
                      truncate
                      text-base
                      font-semibold
                    "
                  >
                    {album}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* =================================================
              SUGGESTIONS
          ================================================= */}

          {suggestions.length > 0 && (
            <div className="mt-6 pb-8">
              <div
                className="
                  mb-3
                  flex
                  items-center
                  justify-between
                "
              >
                <h2
                  className="
                    text-lg
                    font-bold
                  "
                >
                  Suggested Songs
                </h2>

                {loadingSuggestions && (
                  <span
                    className="
                      text-xs
                      opacity-50
                    "
                  >
                    Loading...
                  </span>
                )}
              </div>

              <div
                className="
                  grid
                  grid-cols-2
                  gap-3
                  sm:grid-cols-3
                  lg:grid-cols-4
                "
              >
                {suggestions
                  .slice(0, 8)
                  .map(
                    (song, index) => {
                      const suggestionImage =
                        song?.image ||
                        song?.album?.image ||
                        "/Unknown.png";

                      const suggestionTitle =
                        song?.title ||
                        song?.name ||
                        "Unknown Song";

                      const suggestionArtist =
                        typeof song?.artist ===
                        "string"
                          ? song.artist
                          : song?.artist?.name ||
                            song?.artistName ||
                            "Unknown Artist";

                      return (
                        <button
                          type="button"
                          key={
                            song?.id ||
                            song?.songId ||
                            index
                          }
                          className={`
                            overflow-hidden
                            rounded-2xl
                            border
                            text-left
                            transition
                            hover:-translate-y-1
                            hover:bg-white/10
                            ${softPanelClass}
                          `}
                        >
                          <img
                            src={
                              suggestionImage
                            }
                            alt={
                              suggestionTitle
                            }
                            className="
                              aspect-square
                              w-full
                              object-cover
                            "
                          />

                          <div className="p-3">
                            <div
                              className="
                                truncate
                                text-sm
                                font-semibold
                              "
                            >
                              {
                                suggestionTitle
                              }
                            </div>

                            <div
                              className="
                                mt-1
                                truncate
                                text-xs
                                opacity-50
                              "
                            >
                              {
                                suggestionArtist
                              }
                            </div>
                          </div>
                        </button>
                      );
                    }
                  )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Player;
