import {
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  IoMdSkipBackward,
  IoMdSkipForward,
} from "react-icons/io";

import { IoShareSocial } from "react-icons/io5";

import { PiShuffleBold } from "react-icons/pi";

import {
  LuRepeat,
  LuRepeat1,
} from "react-icons/lu";

import {
  FaPlay,
  FaPause,
  FaHeart,
  FaRegHeart,
} from "react-icons/fa";

import { MdDownload } from "react-icons/md";

import { CiMaximize1 } from "react-icons/ci";

import {
  MdOutlineKeyboardArrowLeft,
  MdOutlineKeyboardArrowRight,
} from "react-icons/md";

import { Link } from "react-router-dom";

import he from "he";

import MusicContext from "../context/MusicContext";

import ArtistItems from "./Items/ArtistItems";

import SongGrid from "./SongGrid";

import {
  getSongById,
  getSuggestionSong,
} from "../../fetch";

/* =========================================================
   SAFE HTML ENTITY DECODE
========================================================= */

const safeDecode = (value) => {
  if (value === null || value === undefined) {
    return "";
  }

  try {
    return he.decode(String(value));
  } catch {
    return String(value);
  }
};

/* =========================================================
   GET IMAGE URL
========================================================= */

const getImage = (song, coverImage) => {
  if (
    typeof coverImage === "string" &&
    coverImage.trim()
  ) {
    return coverImage;
  }

  if (
    typeof song?.image === "string" &&
    song.image.trim()
  ) {
    return song.image;
  }

  if (Array.isArray(song?.image)) {
    return (
      song.image?.[2]?.url ||
      song.image?.[2]?.link ||
      song.image?.[1]?.url ||
      song.image?.[1]?.link ||
      song.image?.[0]?.url ||
      song.image?.[0]?.link ||
      "/Unknown.png"
    );
  }

  if (
    song?.image &&
    typeof song.image === "object"
  ) {
    return (
      song.image?.url ||
      song.image?.link ||
      song.image?.[2]?.url ||
      song.image?.[1]?.url ||
      song.image?.[0]?.url ||
      "/Unknown.png"
    );
  }

  return "/Unknown.png";
};

/* =========================================================
   GET SONG ID
========================================================= */

const getSongId = (song) => {
  return (
    song?.id ||
    song?.songId ||
    song?.song_id ||
    song?.trackId ||
    null
  );
};

/* =========================================================
   NORMALISE LYRIC TIME
   Supports seconds + milliseconds
========================================================= */

const getLyricTime = (line) => {
  const rawTime = Number(
    line?.time ??
      line?.startTime ??
      line?.start ??
      0
  );

  if (!Number.isFinite(rawTime)) {
    return null;
  }

  return rawTime > 10000
    ? rawTime / 1000
    : rawTime;
};

/* =========================================================
   PLAYER
========================================================= */

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
  } = useContext(MusicContext) || {};

  /* =======================================================
     STATE
  ======================================================= */

  const [isMaximized, setIsMaximized] =
    useState(false);

  const [showLyrics, setShowLyrics] =
    useState(false);

  const [currentTime, setCurrentTime] =
    useState(0);

  const [audioDuration, setAudioDuration] =
    useState(0);

  const [detail, setDetail] =
    useState(null);

  const [suggestions, setSuggestions] =
    useState([]);

  const [likedSongs, setLikedSongs] =
    useState(() => {
      try {
        const data = JSON.parse(
          localStorage.getItem(
            "likedSongs"
          ) || "[]"
        );

        return Array.isArray(data)
          ? data
          : [];
      } catch {
        return [];
      }
    });

  /* =======================================================
     REFS
  ======================================================= */

  const scrollRef = useRef(null);

  /*
    ONLY the lyrics box uses this ref.
    The page itself will never be scrolled
    by the lyric auto-scroll code.
  */
  const lyricContainerRef = useRef(null);

  /* =======================================================
     AUDIO
  ======================================================= */

  const audio =
    currentSong?.audio || null;

  /* =======================================================
     SONG DATA
  ======================================================= */

  const songId =
    getSongId(currentSong);

  const duration =
    Number(currentSong?.duration) > 0
      ? Number(currentSong.duration)
      : audioDuration;

  const progress =
    duration > 0
      ? Math.min(
          100,
          Math.max(
            0,
            (currentTime / duration) *
              100
          )
        )
      : 0;

  /*
    Album artwork used for:
    1. Player background
    2. Main cover
    3. Mini player
  */
  const artwork = getImage(
    currentSong,
    coverImage
  );

  /* =======================================================
     SONG NAME
  ======================================================= */

  const songName = useMemo(() => {
    return safeDecode(
      currentSong?.name ||
        currentSong?.title ||
        "Unknown Song"
    );
  }, [
    currentSong?.name,
    currentSong?.title,
  ]);

  /* =======================================================
     ARTIST NAME
  ======================================================= */

  const artistNames = useMemo(() => {
    const primary =
      currentSong?.artists?.primary;

    if (
      Array.isArray(primary) &&
      primary.length > 0
    ) {
      return primary
        .map((artist) =>
          safeDecode(
            artist?.name ||
              "Unknown Artist"
          )
        )
        .join(", ");
    }

    return safeDecode(
      currentSong?.artists?.name ||
        currentSong?.artist ||
        "Unknown Artist"
    );
  }, [
    currentSong?.artists,
    currentSong?.artist,
  ]);

  /* =======================================================
     LIKE STATUS
  ======================================================= */

  const isLiked = likedSongs.some(
    (item) =>
      String(item?.id) ===
      String(currentSong?.id)
  );

  /* =======================================================
     ACTIVE LYRIC INDEX
  ======================================================= */

  const activeLyricIndex = useMemo(() => {
    if (
      !lyrics?.synced ||
      !Array.isArray(lyrics?.lines) ||
      lyrics.lines.length === 0
    ) {
      return -1;
    }

    let activeIndex = -1;

    lyrics.lines.forEach(
      (line, index) => {
        const lineTime =
          getLyricTime(line);

        if (
          lineTime !== null &&
          lineTime <= currentTime
        ) {
          activeIndex = index;
        }
      }
    );

    return activeIndex;
  }, [
    lyrics,
    currentTime,
  ]);

  /* =======================================================
     RESET WHEN SONG CHANGES
  ======================================================= */

  useEffect(() => {
    setShowLyrics(false);
    setCurrentTime(0);
    setAudioDuration(0);

    if (
      lyricContainerRef.current
    ) {
      lyricContainerRef.current.scrollTo(
        {
          top: 0,
          behavior: "auto",
        }
      );
    }
  }, [songId]);

  /* =======================================================
     AUDIO EVENTS
  ======================================================= */

  useEffect(() => {
    if (
      !audio ||
      typeof audio.addEventListener !==
        "function"
    ) {
      setCurrentTime(0);
      setAudioDuration(0);

      return undefined;
    }

    const updateTime = () => {
      const time = Number(
        audio.currentTime
      );

      setCurrentTime(
        Number.isFinite(time)
          ? time
          : 0
      );

      const audioLength = Number(
        audio.duration
      );

      if (
        Number.isFinite(audioLength) &&
        audioLength > 0
      ) {
        setAudioDuration(
          audioLength
        );
      }
    };

    const loaded = () => {
      const audioLength = Number(
        audio.duration
      );

      if (
        Number.isFinite(audioLength) &&
        audioLength > 0
      ) {
        setAudioDuration(
          audioLength
        );
      }

      updateTime();
    };

    const ended = () => {
      /*
        When repeat one is enabled,
        HTMLAudioElement.loop handles it.
      */
      if (repeatMode !== "one") {
        nextSong?.();
      }
    };

    audio.addEventListener(
      "timeupdate",
      updateTime
    );

    audio.addEventListener(
      "loadedmetadata",
      loaded
    );

    audio.addEventListener(
      "durationchange",
      loaded
    );

    audio.addEventListener(
      "ended",
      ended
    );

    updateTime();

    return () => {
      audio.removeEventListener(
        "timeupdate",
        updateTime
      );

      audio.removeEventListener(
        "loadedmetadata",
        loaded
      );

      audio.removeEventListener(
        "durationchange",
        loaded
      );

      audio.removeEventListener(
        "ended",
        ended
      );
    };
  }, [
    audio,
    nextSong,
    repeatMode,
  ]);

  /* =======================================================
     REPEAT
  ======================================================= */

  useEffect(() => {
    if (!audio) {
      return;
    }

    try {
      audio.loop =
        repeatMode === "one";
    } catch {}
  }, [
    audio,
    repeatMode,
  ]);

  /* =======================================================
     FETCH SONG DETAILS + SUGGESTIONS
  ======================================================= */

  useEffect(() => {
    if (!songId) {
      setDetail(null);
      setSuggestions([]);

      return undefined;
    }

    let cancelled = false;

    const loadData = async () => {
      try {
        const [
          detailResult,
          suggestionResult,
        ] = await Promise.allSettled([
          getSongById(songId),
          getSuggestionSong(songId),
        ]);

        if (cancelled) {
          return;
        }

        if (
          detailResult.status ===
          "fulfilled"
        ) {
          setDetail(
            detailResult.value?.data?.[0] ||
              null
          );
        } else {
          setDetail(null);
        }

        if (
          suggestionResult.status ===
          "fulfilled"
        ) {
          const data =
            suggestionResult.value?.data;

          setSuggestions(
            Array.isArray(data)
              ? data
              : []
          );
        } else {
          setSuggestions([]);
        }
      } catch (error) {
        console.error(
          "Player data error:",
          error
        );

        if (!cancelled) {
          setDetail(null);
          setSuggestions([]);
        }
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, [songId]);

  /* =======================================================
     MEDIA SESSION
  ======================================================= */

  useEffect(() => {
    if (
      !currentSong ||
      !("mediaSession" in navigator) ||
      typeof MediaMetadata ===
        "undefined"
    ) {
      return;
    }

    try {
      navigator.mediaSession.metadata =
        new MediaMetadata({
          title: songName,
          artist: artistNames,
          album: safeDecode(
            detail?.album?.name ||
              "MusicMax"
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
            .then(() => {
              setIsPlaying?.(true);
            })
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
        () => {
          prevSong?.();
        }
      );

      navigator.mediaSession.setActionHandler(
        "nexttrack",
        () => {
          nextSong?.();
        }
      );
    } catch (error) {
      console.warn(
        "Media Session error:",
        error
      );
    }

    return () => {
      try {
        navigator.mediaSession.setActionHandler(
          "play",
          null
        );

        navigator.mediaSession.setActionHandler(
          "pause",
          null
        );

        navigator.mediaSession.setActionHandler(
          "previoustrack",
          null
        );

        navigator.mediaSession.setActionHandler(
          "nexttrack",
          null
        );
      } catch {}
    };
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

  /* =======================================================
     LYRIC AUTO SCROLL
     
     IMPORTANT:
     - Only lyricContainerRef is scrolled
     - Page/window is NOT scrolled
     - Active lyric is centered
     - Smooth scrolling
  ======================================================= */

  useEffect(() => {
    if (
      !showLyrics ||
      activeLyricIndex < 0 ||
      !lyricContainerRef.current
    ) {
      return undefined;
    }

    const container =
      lyricContainerRef.current;

    const frame =
      requestAnimationFrame(() => {
        const activeElement =
          container.querySelector(
            `[data-lyric-index="${activeLyricIndex}"]`
          );

        if (!activeElement) {
          return;
        }

        /*
          Get the exact position of the
          lyrics container.
        */
        const containerRect =
          container.getBoundingClientRect();

        /*
          Get active lyric position.
        */
        const activeRect =
          activeElement.getBoundingClientRect();

        /*
          Convert active lyric position
          into scroll-container coordinates.
        */
        const relativeTop =
          activeRect.top -
          containerRect.top +
          container.scrollTop;

        /*
          Center active lyric.
        */
        const targetScroll =
          relativeTop -
          container.clientHeight / 2 +
          activeElement.clientHeight / 2;

        /*
          ONLY scroll the lyrics box.
        */
        container.scrollTo({
          top: Math.max(
            0,
            Math.min(
              targetScroll,
              container.scrollHeight -
                container.clientHeight
            )
          ),
          behavior: "smooth",
        });
      });

    return () => {
      cancelAnimationFrame(frame);
    };
  }, [
    activeLyricIndex,
    showLyrics,
  ]);

  /* =======================================================
     PLAY / PAUSE
  ======================================================= */

  const playPause = async () => {
    if (
      !audio ||
      typeof audio.play !== "function"
    ) {
      return;
    }

    try {
      if (audio.paused) {
        await audio.play();
        setIsPlaying?.(true);
      } else {
        audio.pause();
        setIsPlaying?.(false);
      }
    } catch (error) {
      console.error(
        "Play/pause error:",
        error
      );

      setIsPlaying?.(false);
    }
  };

  /* =======================================================
     SEEK
  ======================================================= */

  const seek = (event) => {
    if (!audio || duration <= 0) {
      return;
    }

    const value = Number(
      event.target.value
    );

    const time =
      (value / 100) * duration;

    try {
      audio.currentTime =
        Math.max(
          0,
          Math.min(duration, time)
        );
    } catch {}

    setCurrentTime(time);
  };

  /* =======================================================
     FORMAT TIME
  ======================================================= */

  const formatTime = (value) => {
    const seconds = Math.max(
      0,
      Math.floor(
        Number(value) || 0
      )
    );

    const minutes = Math.floor(
      seconds / 60
    );

    const remaining =
      seconds % 60;

    return `${String(
      minutes
    ).padStart(
      2,
      "0"
    )}:${String(
      remaining
    ).padStart(
      2,
      "0"
    )}`;
  };

  /* =======================================================
     LIKE SONG
  ======================================================= */

  const toggleLike = () => {
    if (!currentSong?.id) {
      return;
    }

    setLikedSongs((oldSongs) => {
      const exists =
        oldSongs.some(
          (item) =>
            String(item?.id) ===
            String(currentSong.id)
        );

      const nextSongs = exists
        ? oldSongs.filter(
            (item) =>
              String(item?.id) !==
              String(currentSong.id)
          )
        : [
            ...oldSongs,
            {
              id: currentSong.id,
              name: currentSong.name,
              duration:
                currentSong.duration,
              image:
                currentSong.image,
              artists:
                currentSong.artists,
              audio:
                currentSong.audio
                  ?.currentSrc ||
                currentSong.audio
                  ?.src ||
                currentSong.audioUrl ||
                "",
            },
          ];

      try {
        localStorage.setItem(
          "likedSongs",
          JSON.stringify(
            nextSongs
          )
        );
      } catch {}

      return nextSongs;
    });
  };

  /* =======================================================
     SHARE
  ======================================================= */

  const share = async () => {
    const albumId =
      detail?.album?.id ||
      currentSong?.album?.id;

    const url = albumId
      ? `${window.location.origin}/albums/${albumId}`
      : window.location.href;

    try {
      if (
        typeof navigator.share ===
        "function"
      ) {
        await navigator.share({
          title: songName,
          text: `Listen to ${songName} on MusicMax`,
          url,
        });
      } else if (
        navigator.clipboard
      ) {
        await navigator.clipboard.writeText(
          url
        );
      }
    } catch (error) {
      if (
        error?.name !==
        "AbortError"
      ) {
        console.error(
          "Share failed:",
          error
        );
      }
    }
  };

  /* =======================================================
     DOWNLOAD
  ======================================================= */

  const handleDownload = async () => {
    if (
      typeof downloadSong ===
      "function"
    ) {
      try {
        await downloadSong();
        return;
      } catch (error) {
        console.warn(
          "Context download failed:",
          error
        );
      }
    }

    const url =
      audio?.currentSrc ||
      audio?.src ||
      currentSong?.audioUrl;

    if (!url) {
      alert(
        "Download URL is not available."
      );

      return;
    }

    const filename =
      `${songName || "song"}.mp3`.replace(
        /[\\/:*?"<>|]/g,
        "_"
      );

    try {
      const response =
        await fetch(url);

      if (!response.ok) {
        throw new Error(
          `HTTP ${response.status}`
        );
      }

      const blob =
        await response.blob();

      const objectUrl =
        URL.createObjectURL(blob);

      const link =
        document.createElement("a");

      link.href = objectUrl;
      link.download = filename;

      document.body.appendChild(link);

      link.click();

      link.remove();

      setTimeout(() => {
        URL.revokeObjectURL(
          objectUrl
        );
      }, 1000);
    } catch (error) {
      console.warn(
        "Direct download failed:",
        error
      );

      const link =
        document.createElement("a");

      link.href = url;
      link.download = filename;
      link.target = "_blank";
      link.rel = "noopener";

      document.body.appendChild(link);

      link.click();

      link.remove();
    }
  };

  /* =======================================================
     NO SONG
  ======================================================= */

  if (!currentSong) {
    return null;
  }

  const suggestionList =
    Array.isArray(suggestions)
      ? suggestions
      : [];

  const hasSyncedLyrics =
    Boolean(
      lyrics?.synced &&
        Array.isArray(
          lyrics?.lines
        ) &&
        lyrics.lines.length
    );

  /* =======================================================
     UI
  ======================================================= */

  return (
    <div className="fixed bottom-14 lg:bottom-0 left-0 z-50 w-full">

      {/* ===================================================
          PLAYER
      =================================================== */}

      <div
        className={`
          relative
          w-full
          overflow-hidden
          rounded-t-2xl
          border-t
          border-white/10
          bg-black
          shadow-2xl
          ${
            isMaximized
              ? "min-h-[90vh] max-h-[90vh]"
              : ""
          }
        `}
      >

        {/* =================================================
            ALBUM COVER BACKGROUND
        ================================================= */}

        <div className="absolute inset-0 overflow-hidden pointer-events-none">

          <img
            src={artwork}
            alt=""
            className="
              absolute
              inset-0
              h-full
              w-full
              object-cover
              scale-125
              blur-3xl
              opacity-40
            "
            onError={(event) => {
              if (
                event.currentTarget.src.includes(
                  "Unknown.png"
                )
              ) {
                return;
              }

              event.currentTarget.src =
                "/Unknown.png";
            }}
          />

          {/* DARK OVERLAY */}

          <div className="
            absolute
            inset-0
            bg-black/70
            backdrop-blur-xl
          " />

          {/* EXTRA GRADIENT */}

          <div className="
            absolute
            inset-0
            bg-gradient-to-b
            from-black/20
            via-black/50
            to-black/95
          " />

        </div>

        {/* =================================================
            CONTENT
        ================================================= */}

        <div
          className={`
            relative
            z-10
            ${
              isMaximized
                ? "h-[90vh] overflow-hidden p-4"
                : "p-3 lg:px-6"
            }
          `}
        >

          {/* =================================================
              MINI PLAYER
          ================================================= */}

          {!isMaximized ? (

            <div className="
              flex
              w-full
              items-center
              gap-3
            ">

              {/* COVER */}

              <img
                src={artwork}
                alt={songName}
                className="
                  h-12
                  w-12
                  shrink-0
                  rounded-lg
                  object-cover
                  shadow-xl
                  ring-1
                  ring-white/10
                "
                onError={(event) => {
                  event.currentTarget.src =
                    "/Unknown.png";
                }}
              />

              {/* SONG INFO */}

              <div className="
                min-w-0
                flex-1
              ">

                <div className="
                  truncate
                  text-sm
                  font-semibold
                ">
                  {songName}
                </div>

                <div className="
                  truncate
                  text-xs
                  text-white/60
                ">
                  {artistNames}
                </div>

                <div className="
                  mt-1
                  flex
                  items-center
                  gap-2
                ">

                  <span className="text-[10px]">
                    {formatTime(
                      currentTime
                    )}
                  </span>

                  <input
                    aria-label="Song progress"
                    type="range"
                    min="0"
                    max="100"
                    step="0.1"
                    value={progress}
                    onChange={seek}
                    className="range w-full"
                  />

                  <span className="text-[10px]">
                    {formatTime(
                      duration
                    )}
                  </span>

                </div>

              </div>

              {/* PREVIOUS */}

              <button
                type="button"
                onClick={() =>
                  prevSong?.()
                }
                title="Previous"
                className="
                  hidden
                  shrink-0
                  sm:block
                "
              >
                <IoMdSkipBackward className="text-2xl" />
              </button>

              {/* PLAY */}

              <button
                type="button"
                onClick={playPause}
                title={
                  isPlaying
                    ? "Pause"
                    : "Play"
                }
                className="
                  shrink-0
                  rounded-full
                "
              >
                {isPlaying ? (
                  <FaPause className="text-2xl" />
                ) : (
                  <FaPlay className="text-2xl" />
                )}
              </button>

              {/* NEXT */}

              <button
                type="button"
                onClick={() =>
                  nextSong?.()
                }
                title="Next"
                className="
                  hidden
                  shrink-0
                  sm:block
                "
              >
                <IoMdSkipForward className="text-2xl" />
              </button>

              {/* LIKE */}

              <button
                type="button"
                onClick={toggleLike}
                title="Like"
                className="
                  hidden
                  shrink-0
                  sm:block
                "
              >
                {isLiked ? (
                  <FaHeart className="text-xl text-red-500" />
                ) : (
                  <FaRegHeart className="text-xl" />
                )}
              </button>

              {/* MAXIMIZE */}

              <button
                type="button"
                onClick={() =>
                  setIsMaximized(true)
                }
                title="Maximize"
                className="shrink-0"
              >
                <CiMaximize1 className="text-xl" />
              </button>

            </div>

          ) : (

            /* =================================================
               FULL PLAYER
            ================================================= */

            <div className="
              mx-auto
              flex
              h-full
              max-w-4xl
              flex-col
              items-center
            ">

              {/* =================================================
                  HEADER
              ================================================= */}

              <div className="
                flex
                w-full
                items-center
                justify-between
              ">

                <button
                  type="button"
                  onClick={() =>
                    setIsMaximized(false)
                  }
                  className="
                    rounded-full
                    border
                    border-white/10
                    bg-white/5
                    px-4
                    py-2
                    text-sm
                    transition
                    hover:bg-white/10
                  "
                >
                  Minimize
                </button>

                <button
                  type="button"
                  onClick={share}
                  className="
                    rounded-full
                    p-2
                    transition
                    hover:bg-white/10
                  "
                  title="Share"
                >
                  <IoShareSocial className="text-2xl" />
                </button>

              </div>

              {/* =================================================
                  COVER / LYRICS
              ================================================= */}

              <div className="
                mt-4
                flex
                gap-1
                rounded-full
                border
                border-white/10
                bg-black/30
                p-1
                backdrop-blur-md
              ">

                <button
                  type="button"
                  onClick={() =>
                    setShowLyrics(false)
                  }
                  className={`
                    rounded-full
                    px-5
                    py-2
                    text-sm
                    transition-all
                    ${
                      !showLyrics
                        ? "bg-white text-black shadow-lg"
                        : "text-white/60 hover:text-white"
                    }
                  `}
                >
                  Cover
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setShowLyrics(true)
                  }
                  className={`
                    rounded-full
                    px-5
                    py-2
                    text-sm
                    transition-all
                    ${
                      showLyrics
                        ? "bg-white text-black shadow-lg"
                        : "text-white/60 hover:text-white"
                    }
                  `}
                >
                  Lyrics
                </button>

              </div>

              {/* =================================================
                  COVER VIEW
              ================================================= */}

              {!showLyrics ? (

                <div className="
                  flex
                  min-h-0
                  flex-1
                  w-full
                  flex-col
                  items-center
                  justify-center
                ">

                  <img
                    src={artwork}
                    alt={songName}
                    className="
                      mt-4
                      h-56
                      w-56
                      rounded-2xl
                      object-cover
                      shadow-[0_25px_80px_rgba(0,0,0,0.6)]
                      ring-1
                      ring-white/10
                      sm:h-72
                      sm:w-72
                    "
                    onError={(event) => {
                      event.currentTarget.src =
                        "/Unknown.png";
                    }}
                  />

                </div>

              ) : (

                /* =================================================
                   LYRICS VIEW
                ================================================= */

                <div
                  ref={lyricContainerRef}
                  className="
                    mt-4
                    min-h-0
                    h-[55vh]
                    w-full
                    max-w-2xl
                    overflow-y-auto
                    overflow-x-hidden
                    rounded-2xl
                    border
                    border-white/10
                    bg-black/30
                    px-3
                    py-8
                    sm:px-6
                  "
                  style={{
                    scrollbarWidth: "thin",

                    /*
                      Prevent scroll chaining
                      to the page.
                    */
                    overscrollBehavior:
                      "contain",

                    /*
                      Only this container
                      gets smooth scrolling.
                    */
                    scrollBehavior:
                      "smooth",
                  }}
                >

                  {hasSyncedLyrics ? (

                    <div className="
                      flex
                      min-h-full
                      flex-col
                      gap-2
                      pb-[30vh]
                      pt-[20vh]
                    ">

                      {lyrics.lines.map(
                        (line, index) => {

                          const isActive =
                            index ===
                            activeLyricIndex;

                          return (
                            <p
                              key={`${getLyricTime(
                                line
                              )}-${index}`}
                              data-lyric-index={
                                index
                              }
                              className={`
                                mx-auto
                                w-full
                                max-w-xl
                                rounded-2xl
                                px-5
                                py-3
                                text-center
                                leading-7
                                transition-all
                                duration-500
                                ease-out

                                ${
                                  isActive
                                    ? `
                                      scale-[1.03]
                                      bg-red-300/20
                                      font-bold
                                      text-red-50
                                      shadow-[0_8px_30px_rgba(248,113,113,0.15)]
                                      ring-1
                                      ring-red-300/20
                                    `
                                    : `
                                      text-white/35
                                      hover:text-white/60
                                    `
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

                    <div className="
                      flex
                      min-h-full
                      items-center
                      justify-center
                      px-4
                    ">

                      <p className="
                        whitespace-pre-line
                        text-center
                        text-sm
                        leading-7
                        text-white/70
                      ">
                        {safeDecode(
                          lyrics.plain
                        )}
                      </p>

                    </div>

                  ) : (

                    <div className="
                      flex
                      min-h-full
                      items-center
                      justify-center
                    ">

                      <p className="
                        text-center
                        text-white/50
                      ">
                        No lyrics available.
                      </p>

                    </div>

                  )}

                </div>
              )}

              {/* =================================================
                  SONG INFO
              ================================================= */}

              <h2 className="
                mt-4
                max-w-full
                truncate
                text-center
                text-xl
                font-bold
              ">
                {songName}
              </h2>

              <p className="
                max-w-full
                truncate
                text-center
                text-sm
                text-white/60
              ">
                {artistNames}
              </p>

              {/* =================================================
                  PROGRESS
              ================================================= */}

              <div className="
                mt-5
                flex
                w-full
                items-center
                gap-2
              ">

                <span className="
                  text-xs
                  text-white/60
                ">
                  {formatTime(
                    currentTime
                  )}
                </span>

                <input
                  aria-label="Song progress"
                  type="range"
                  min="0"
                  max="100"
                  step="0.1"
                  value={progress}
                  onChange={seek}
                  className="
                    range
                    flex-1
                  "
                />

                <span className="
                  text-xs
                  text-white/60
                ">
                  {formatTime(
                    duration
                  )}
                </span>

              </div>

              {/* =================================================
                  MAIN CONTROLS
              ================================================= */}

              <div className="
                mt-5
                flex
                items-center
                justify-center
                gap-6
              ">

                {/* SHUFFLE */}

                <button
                  type="button"
                  onClick={() =>
                    toggleShuffle?.()
                  }
                  className={`
                    transition
                    ${
                      shuffle
                        ? "text-red-500"
                        : "text-white/70 hover:text-white"
                    }
                  `}
                  title="Shuffle"
                >
                  <PiShuffleBold className="text-2xl" />
                </button>

                {/* PREVIOUS */}

                <button
                  type="button"
                  onClick={() =>
                    prevSong?.()
                  }
                  title="Previous"
                >
                  <IoMdSkipBackward className="text-3xl" />
                </button>

                {/* PLAY */}

                <button
                  type="button"
                  onClick={playPause}
                  className="
                    rounded-full
                    bg-white
                    p-4
                    text-black
                    shadow-xl
                    transition
                    hover:scale-105
                    active:scale-95
                  "
                  title={
                    isPlaying
                      ? "Pause"
                      : "Play"
                  }
                >
                  {isPlaying ? (
                    <FaPause className="text-2xl" />
                  ) : (
                    <FaPlay className="ml-0.5 text-2xl" />
                  )}
                </button>

                {/* NEXT */}

                <button
                  type="button"
                  onClick={() =>
                    nextSong?.()
                  }
                  title="Next"
                >
                  <IoMdSkipForward className="text-3xl" />
                </button>

                {/* REPEAT */}

                <button
                  type="button"
                  onClick={() =>
                    toggleRepeatMode?.()
                  }
                  className={`
                    transition
                    ${
                      repeatMode === "one"
                        ? "text-red-500"
                        : "text-white/70 hover:text-white"
                    }
                  `}
                  title="Repeat"
                >
                  {repeatMode ===
                  "one" ? (
                    <LuRepeat1 className="text-2xl" />
                  ) : (
                    <LuRepeat className="text-2xl" />
                  )}
                </button>

              </div>

              {/* =================================================
                  LIKE + DOWNLOAD
              ================================================= */}

              <div className="
                mt-4
                flex
                items-center
                gap-6
              ">

                <button
                  type="button"
                  onClick={toggleLike}
                  title="Like"
                  className="
                    transition
                    hover:scale-110
                  "
                >
                  {isLiked ? (
                    <FaHeart className="text-xl text-red-500" />
                  ) : (
                    <FaRegHeart className="text-xl" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleDownload}
                  title="Download"
                  className="
                    transition
                    hover:scale-110
                  "
                >
                  <MdDownload className="text-2xl" />
                </button>

              </div>

              {/* =================================================
                  ALBUM
              ================================================= */}

              {detail?.album?.id && (
                <Link
                  to={`/albums/${detail.album.id}`}
                  className="
                    mt-6
                    w-full
                    max-w-sm
                  "
                >

                  <h3 className="
                    mb-2
                    font-semibold
                  ">
                    From Album
                  </h3>

                  <div className="
                    flex
                    items-center
                    gap-3
                    rounded-xl
                    border
                    border-white/10
                    bg-white/5
                    p-2
                    transition
                    hover:bg-white/10
                  ">

                    <img
                      src={
                        detail.album.image?.[0]
                          ?.url ||
                        artwork ||
                        "/Unknown.png"
                      }
                      alt=""
                      className="
                        h-16
                        w-16
                        rounded-lg
                        object-cover
                      "
                      onError={(event) => {
                        event.currentTarget.src =
                          "/Unknown.png";
                      }}
                    />

                    <span className="
                      truncate
                    ">
                      {safeDecode(
                        detail.album.name
                      )}
                    </span>

                  </div>

                </Link>
              )}

              {/* =================================================
                  SUGGESTIONS
              ================================================= */}

              {suggestionList.length >
                0 && (

                <div className="
                  mt-6
                  w-full
                ">

                  <div className="
                    flex
                    items-center
                    justify-between
                  ">

                    <h3 className="
                      font-semibold
                    ">
                      You Might Like
                    </h3>

                    <div className="
                      hidden
                      gap-2
                      lg:flex
                    ">

                      <button
                        type="button"
                        onClick={() =>
                          scrollRef.current?.scrollBy(
                            {
                              left: -500,
                              behavior:
                                "smooth",
                            }
                          )
                        }
                      >
                        <MdOutlineKeyboardArrowLeft className="text-2xl" />
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          scrollRef.current?.scrollBy(
                            {
                              left: 500,
                              behavior:
                                "smooth",
                            }
                          )
                        }
                      >
                        <MdOutlineKeyboardArrowRight className="text-2xl" />
                      </button>

                    </div>

                  </div>

                  <div
                    ref={scrollRef}
                    className="
                      mt-2
                      flex
                      gap-3
                      overflow-x-auto
                      scroll-hide
                    "
                  >

                    {suggestionList.map(
                      (
                        item,
                        index
                      ) => (
                        <SongGrid
                          key={
                            item?.id ||
                            index
                          }
                          song={item}
                        />
                      )
                    )}

                  </div>

                </div>
              )}

              {/* =================================================
                  ARTISTS
              ================================================= */}

              {Array.isArray(
                currentSong?.artists
                  ?.primary
              ) &&
                currentSong.artists.primary
                  .length > 0 && (

                  <div className="
                    mt-6
                    w-full
                  ">

                    <h3 className="
                      mb-2
                      font-semibold
                    ">
                      Artists
                    </h3>

                    <div className="
                      flex
                      gap-4
                      overflow-x-auto
                    ">

                      {currentSong.artists.primary.map(
                        (
                          artist,
                          index
                        ) => (
                          <ArtistItems
                            key={
                              artist?.id ||
                              index
                            }
                            {...artist}
                          />
                        )
                      )}

                    </div>

                  </div>
                )}

            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default Player;
