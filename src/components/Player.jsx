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

import {
  FaVolumeHigh,
  FaVolumeLow,
  FaVolumeXmark,
} from "react-icons/fa6";

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
   CONSTANTS
========================================================= */

const FALLBACK_IMAGE = "/Unknown.png";

/* =========================================================
   SAFE DECODE
========================================================= */

const safeDecode = (value) => {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  try {
    return he.decode(String(value));
  } catch {
    return String(value);
  }
};

/* =========================================================
   IMAGE RESOLVER
========================================================= */

const resolveImage = (value) => {
  if (
    typeof value === "string" &&
    value.trim()
  ) {
    return value.trim();
  }

  if (Array.isArray(value)) {
    for (
      let index = value.length - 1;
      index >= 0;
      index--
    ) {
      const item = value[index];

      if (
        typeof item === "string" &&
        item.trim()
      ) {
        return item.trim();
      }

      if (
        item &&
        typeof item === "object"
      ) {
        const url =
          item.url ||
          item.link ||
          item.src;

        if (
          typeof url === "string" &&
          url.trim()
        ) {
          return url.trim();
        }
      }
    }
  }

  if (
    value &&
    typeof value === "object"
  ) {
    const url =
      value.url ||
      value.link ||
      value.src;

    if (
      typeof url === "string" &&
      url.trim()
    ) {
      return url.trim();
    }
  }

  return "";
};

/* =========================================================
   GET ARTWORK
========================================================= */

const getImage = (
  song,
  coverImage
) => {
  const contextImage =
    resolveImage(coverImage);

  if (contextImage) {
    return contextImage;
  }

  const songImage =
    resolveImage(song?.image);

  if (songImage) {
    return songImage;
  }

  const albumImage =
    resolveImage(
      song?.album?.image
    );

  if (albumImage) {
    return albumImage;
  }

  return FALLBACK_IMAGE;
};

/* =========================================================
   SONG ID
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
   LYRIC TIME
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
  } = useContext(
    MusicContext
  ) || {};

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

  const [isMuted, setIsMuted] =
    useState(false);

  const [volume, setVolume] =
    useState(() => {
      try {
        const saved =
          Number(
            localStorage.getItem(
              "musicVolume"
            )
          );

        if (
          Number.isFinite(saved) &&
          saved >= 0 &&
          saved <= 1
        ) {
          return saved;
        }
      } catch {}

      return 1;
    });

  const [previousVolume, setPreviousVolume] =
    useState(() => {
      try {
        const saved =
          Number(
            localStorage.getItem(
              "musicPreviousVolume"
            )
          );

        if (
          Number.isFinite(saved) &&
          saved > 0 &&
          saved <= 1
        ) {
          return saved;
        }
      } catch {}

      return 1;
    });

  const [likedSongs, setLikedSongs] =
    useState(() => {
      try {
        const data =
          JSON.parse(
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

  const scrollRef =
    useRef(null);

  const lyricContainerRef =
    useRef(null);

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
      ? Number(
          currentSong.duration
        )
      : audioDuration;

  const progress =
    duration > 0
      ? Math.min(
          100,
          Math.max(
            0,
            (currentTime /
              duration) *
              100
          )
        )
      : 0;

  /* =======================================================
     ARTWORK
  ======================================================= */

  const artwork = useMemo(
    () =>
      getImage(
        currentSong,
        coverImage
      ),
    [
      currentSong,
      coverImage,
    ]
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
     LIKE
  ======================================================= */

  const isLiked =
    likedSongs.some(
      (item) =>
        String(item?.id) ===
        String(
          currentSong?.id
        )
    );

  /* =======================================================
     ACTIVE LYRIC
  ======================================================= */

  const activeLyricIndex =
    useMemo(() => {
      if (
        !lyrics?.synced ||
        !Array.isArray(
          lyrics?.lines
        ) ||
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
     RESET SONG
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
     APPLY VOLUME TO AUDIO
  ======================================================= */

  useEffect(() => {
    if (!audio) {
      return;
    }

    try {
      audio.volume =
        isMuted
          ? 0
          : volume;

      audio.muted =
        isMuted;
    } catch {}

    try {
      localStorage.setItem(
        "musicVolume",
        String(volume)
      );

      localStorage.setItem(
        "musicPreviousVolume",
        String(
          previousVolume
        )
      );
    } catch {}
  }, [
    audio,
    volume,
    isMuted,
    previousVolume,
  ]);

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
      const time =
        Number(
          audio.currentTime
        );

      setCurrentTime(
        Number.isFinite(time)
          ? time
          : 0
      );

      const audioLength =
        Number(
          audio.duration
        );

      if (
        Number.isFinite(
          audioLength
        ) &&
        audioLength > 0
      ) {
        setAudioDuration(
          audioLength
        );
      }
    };

    const loaded = () => {
      const audioLength =
        Number(
          audio.duration
        );

      if (
        Number.isFinite(
          audioLength
        ) &&
        audioLength > 0
      ) {
        setAudioDuration(
          audioLength
        );
      }

      updateTime();
    };

    const ended = () => {
      if (
        repeatMode !== "one"
      ) {
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
     REPEAT ONE
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
     LOAD SONG DETAILS
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
        ] =
          await Promise.allSettled([
            getSongById(songId),
            getSuggestionSong(
              songId
            ),
          ]);

        if (cancelled) {
          return;
        }

        if (
          detailResult.status ===
          "fulfilled"
        ) {
          setDetail(
            detailResult.value
              ?.data?.[0] ||
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
            suggestionResult.value
              ?.data;

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
      !(
        "mediaSession" in
        navigator
      ) ||
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
                  sizes:
                    "500x500",
                  type:
                    "image/jpeg",
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
              setIsPlaying?.(
                true
              );
            })
            .catch(() => {});
        }
      );

      navigator.mediaSession.setActionHandler(
        "pause",
        () => {
          audio?.pause();

          setIsPlaying?.(
            false
          );
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
     Only lyricContainerRef is scrolled.
     The main page/window is never scrolled.
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
      requestAnimationFrame(
        () => {
          const activeElement =
            container.querySelector(
              `[data-lyric-index="${activeLyricIndex}"]`
            );

          if (!activeElement) {
            return;
          }

          const containerRect =
            container.getBoundingClientRect();

          const activeRect =
            activeElement.getBoundingClientRect();

          const relativeTop =
            activeRect.top -
            containerRect.top +
            container.scrollTop;

          const targetScroll =
            relativeTop -
            container.clientHeight /
              2 +
            activeElement.clientHeight /
              2;

          const maxScroll =
            container.scrollHeight -
            container.clientHeight;

          container.scrollTo({
            top: Math.max(
              0,
              Math.min(
                targetScroll,
                maxScroll
              )
            ),
            behavior:
              "smooth",
          });
        }
      );

    return () =>
      cancelAnimationFrame(
        frame
      );
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
      typeof audio.play !==
        "function"
    ) {
      return;
    }

    try {
      if (audio.paused) {
        await audio.play();

        setIsPlaying?.(
          true
        );
      } else {
        audio.pause();

        setIsPlaying?.(
          false
        );
      }
    } catch (error) {
      console.error(
        "Play/pause error:",
        error
      );

      setIsPlaying?.(
        false
      );
    }
  };

  /* =======================================================
     SEEK
  ======================================================= */

  const seek = (event) => {
    if (
      !audio ||
      duration <= 0
    ) {
      return;
    }

    const value =
      Number(
        event.target.value
      );

    if (!Number.isFinite(value)) {
      return;
    }

    const time =
      (value / 100) *
      duration;

    try {
      audio.currentTime =
        Math.max(
          0,
          Math.min(
            duration,
            time
          )
        );
    } catch {}

    setCurrentTime(
      time
    );
  };

  /* =======================================================
     VOLUME
  ======================================================= */

  const handleVolumeChange = (
    event
  ) => {
    const value =
      Number(
        event.target.value
      );

    if (!Number.isFinite(value)) {
      return;
    }

    const newVolume =
      Math.min(
        1,
        Math.max(
          0,
          value
        )
      );

    setVolume(
      newVolume
    );

    if (
      newVolume > 0
    ) {
      setPreviousVolume(
        newVolume
      );

      setIsMuted(
        false
      );
    } else {
      setIsMuted(
        true
      );
    }

    if (audio) {
      try {
        audio.volume =
          newVolume;

        audio.muted =
          newVolume === 0;
      } catch {}
    }
  };

  /* =======================================================
     MUTE
  ======================================================= */

  const toggleMute = () => {
    if (isMuted || volume === 0) {
      const restore =
        previousVolume > 0
          ? previousVolume
          : 1;

      setVolume(
        restore
      );

      setIsMuted(
        false
      );

      if (audio) {
        try {
          audio.volume =
            restore;

          audio.muted =
            false;
        } catch {}
      }

      return;
    }

    setPreviousVolume(
      volume
    );

    setIsMuted(
      true
    );

    if (audio) {
      try {
        audio.volume = 0;
        audio.muted = true;
      } catch {}
    }
  };

  /* =======================================================
     VOLUME ICON
  ======================================================= */

  const VolumeIcon =
    isMuted ||
    volume === 0
      ? FaVolumeXmark
      : volume < 0.5
      ? FaVolumeLow
      : FaVolumeHigh;

  /* =======================================================
     FORMAT TIME
  ======================================================= */

  const formatTime = (
    value
  ) => {
    const seconds =
      Math.max(
        0,
        Math.floor(
          Number(value) || 0
        )
      );

    const minutes =
      Math.floor(
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
     LIKE
  ======================================================= */

  const toggleLike = () => {
    if (
      !currentSong?.id
    ) {
      return;
    }

    setLikedSongs(
      (oldSongs) => {
        const exists =
          oldSongs.some(
            (item) =>
              String(
                item?.id
              ) ===
              String(
                currentSong.id
              )
          );

        const nextSongs =
          exists
            ? oldSongs.filter(
                (item) =>
                  String(
                    item?.id
                  ) !==
                  String(
                    currentSong.id
                  )
              )
            : [
                ...oldSongs,
                {
                  id:
                    currentSong.id,
                  name:
                    currentSong.name,
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
      }
    );
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
          title:
            songName,
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

  const handleDownload =
    async () => {
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
          URL.createObjectURL(
            blob
          );

        const link =
          document.createElement(
            "a"
          );

        link.href =
          objectUrl;

        link.download =
          filename;

        document.body.appendChild(
          link
        );

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
          document.createElement(
            "a"
          );

        link.href =
          url;

        link.download =
          filename;

        link.target =
          "_blank";

        link.rel =
          "noopener";

        document.body.appendChild(
          link
        );

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
    Array.isArray(
      suggestions
    )
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
     PLAYER
  ======================================================= */

  return (
    <div
      className="
        fixed
        bottom-14
        left-0
        z-50
        w-full
        lg:bottom-0
      "
    >
      {/* ===================================================
          MAIN PLAYER
      =================================================== */}

      <div
        className={`
          relative
          w-full
          overflow-hidden
          rounded-t-3xl
          border-t
          border-white/10
          bg-black
          shadow-[0_-20px_80px_rgba(0,0,0,0.65)]
          ${
            isMaximized
              ? "h-[92vh]"
              : ""
          }
        `}
      >
        {/* =================================================
            ARTWORK BACKGROUND
        ================================================= */}

        <div
          className="
            pointer-events-none
            absolute
            inset-0
            overflow-hidden
          "
        >
          <img
            src={
              artwork ||
              FALLBACK_IMAGE
            }
            alt=""
            aria-hidden="true"
            className="
              absolute
              inset-0
              h-full
              w-full
              scale-125
              object-cover
              opacity-40
              blur-3xl
            "
            onError={(
              event
            ) => {
              if (
                !event.currentTarget.src.includes(
                  "Unknown.png"
                )
              ) {
                event.currentTarget.src =
                  FALLBACK_IMAGE;
              }
            }}
          />

          <div
            className="
              absolute
              inset-0
              bg-black/65
              backdrop-blur-2xl
            "
          />

          <div
            className="
              absolute
              inset-0
              bg-gradient-to-b
              from-black/10
              via-black/60
              to-black/95
            "
          />
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
                ? "h-full overflow-y-auto p-3 sm:p-6"
                : "p-3 lg:px-6"
            }
          `}
        >
          {/* =================================================
              MINI PLAYER
          ================================================= */}

          {!isMaximized ? (
            <div
              className="
                flex
                w-full
                items-center
                gap-3
              "
            >
              {/* COVER */}

              <img
                src={
                  artwork ||
                  FALLBACK_IMAGE
                }
                alt={
                  songName
                }
                className="
                  h-12
                  w-12
                  shrink-0
                  rounded-xl
                  object-cover
                  shadow-xl
                  ring-1
                  ring-white/10
                "
                onError={(
                  event
                ) => {
                  event.currentTarget.src =
                    FALLBACK_IMAGE;
                }}
              />

              {/* SONG INFO */}

              <div
                className="
                  min-w-0
                  flex-1
                "
              >
                <div
                  className="
                    truncate
                    text-sm
                    font-semibold
                  "
                >
                  {
                    songName
                  }
                </div>

                <div
                  className="
                    truncate
                    text-xs
                    text-white/55
                  "
                >
                  {
                    artistNames
                  }
                </div>

                <div
                  className="
                    mt-1
                    flex
                    items-center
                    gap-2
                  "
                >
                  <span className="text-[10px] text-white/60">
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
                    value={
                      progress
                    }
                    onChange={
                      seek
                    }
                    className="
                      range
                      w-full
                    "
                  />

                  <span className="text-[10px] text-white/60">
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
                  rounded-full
                  p-2
                  transition
                  hover:bg-white/10
                  sm:block
                "
              >
                <IoMdSkipBackward className="text-2xl" />
              </button>

              {/* PLAY */}

              <button
                type="button"
                onClick={
                  playPause
                }
                title={
                  isPlaying
                    ? "Pause"
                    : "Play"
                }
                className="
                  shrink-0
                  rounded-full
                  bg-white
                  p-2.5
                  text-black
                  shadow-lg
                  transition
                  hover:scale-105
                  active:scale-95
                "
              >
                {isPlaying ? (
                  <FaPause className="text-base" />
                ) : (
                  <FaPlay className="ml-0.5 text-base" />
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
                  rounded-full
                  p-2
                  transition
                  hover:bg-white/10
                  sm:block
                "
              >
                <IoMdSkipForward className="text-2xl" />
              </button>

              {/* MINI VOLUME */}

              <div
                className="
                  hidden
                  items-center
                  gap-2
                  rounded-full
                  border
                  border-white/10
                  bg-white/5
                  px-3
                  py-2
                  backdrop-blur-xl
                  md:flex
                "
              >
                <button
                  type="button"
                  onClick={
                    toggleMute
                  }
                  title={
                    isMuted
                      ? "Unmute"
                      : "Mute"
                  }
                  className="
                    text-white/70
                    transition
                    hover:text-white
                  "
                >
                  <VolumeIcon />
                </button>

                <input
                  aria-label="Volume"
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={
                    isMuted
                      ? 0
                      : volume
                  }
                  onChange={
                    handleVolumeChange
                  }
                  className="
                    range
                    w-20
                  "
                />
              </div>

              {/* LIKE */}

              <button
                type="button"
                onClick={
                  toggleLike
                }
                title="Like"
                className="
                  hidden
                  rounded-full
                  p-2
                  transition
                  hover:bg-white/10
                  sm:block
                "
              >
                {isLiked ? (
                  <FaHeart className="text-lg text-red-500" />
                ) : (
                  <FaRegHeart className="text-lg" />
                )}
              </button>

              {/* MAXIMIZE */}

              <button
                type="button"
                onClick={() =>
                  setIsMaximized(
                    true
                  )
                }
                title="Open full player"
                className="
                  shrink-0
                  rounded-full
                  p-2
                  transition
                  hover:bg-white/10
                "
              >
                <CiMaximize1 className="text-xl" />
              </button>
            </div>
          ) : (
            /* =================================================
               FULL PLAYER
            ================================================= */

            <div
              className="
                mx-auto
                flex
                min-h-full
                w-full
                max-w-5xl
                flex-col
                items-center
              "
            >
              {/* =================================================
                  HEADER
              ================================================= */}

              <div
                className="
                  flex
                  w-full
                  items-center
                  justify-between
                "
              >
                <button
                  type="button"
                  onClick={() =>
                    setIsMaximized(
                      false
                    )
                  }
                  className="
                    rounded-full
                    border
                    border-white/10
                    bg-white/5
                    px-4
                    py-2
                    text-sm
                    font-medium
                    text-white/80
                    backdrop-blur-xl
                    transition
                    hover:bg-white/10
                    hover:text-white
                  "
                >
                  ↓ Minimize
                </button>

                <div
                  className="
                    flex
                    items-center
                    gap-2
                  "
                >
                  <span
                    className="
                      hidden
                      text-xs
                      font-medium
                      tracking-[0.2em]
                      text-white/40
                      sm:block
                    "
                  >
                    NOW PLAYING
                  </span>

                  <button
                    type="button"
                    onClick={
                      share
                    }
                    title="Share"
                    className="
                      rounded-full
                      border
                      border-white/10
                      bg-white/5
                      p-2.5
                      backdrop-blur-xl
                      transition
                      hover:bg-white/10
                    "
                  >
                    <IoShareSocial className="text-xl" />
                  </button>
                </div>
              </div>

              {/* =================================================
                  COVER / LYRICS AREA
              ================================================= */}

              {!showLyrics ? (
                <div
                  className="
                    flex
                    min-h-[40vh]
                    flex-1
                    w-full
                    items-center
                    justify-center
                    py-5
                  "
                >
                  <div className="relative">
                    {/* ARTWORK GLOW */}

                    <div
                      className="
                        absolute
                        inset-0
                        scale-90
                        rounded-[2rem]
                        bg-white/20
                        opacity-30
                        blur-3xl
                      "
                    />

                    <img
                      src={
                        artwork ||
                        FALLBACK_IMAGE
                      }
                      alt={
                        songName
                      }
                      className="
                        relative
                        h-52
                        w-52
                        rounded-[1.75rem]
                        object-cover
                        shadow-[0_30px_100px_rgba(0,0,0,0.75)]
                        ring-1
                        ring-white/10
                        transition-transform
                        duration-700
                        sm:h-64
                        sm:w-64
                        md:h-72
                        md:w-72
                        lg:h-80
                        lg:w-80
                      "
                      onError={(
                        event
                      ) => {
                        event.currentTarget.src =
                          FALLBACK_IMAGE;
                      }}
                    />
                  </div>
                </div>
              ) : (
                /* =================================================
                   LYRICS
                ================================================= */

                <div
                  ref={
                    lyricContainerRef
                  }
                  className="
                    mt-5
                    h-[45vh]
                    min-h-[280px]
                    w-full
                    max-w-3xl
                    overflow-x-hidden
                    overflow-y-auto
                    rounded-3xl
                    border
                    border-white/10
                    bg-black/25
                    px-3
                    py-8
                    shadow-inner
                    backdrop-blur-xl
                    sm:h-[48vh]
                    sm:px-6
                  "
                  style={{
                    scrollbarWidth:
                      "thin",
                    overscrollBehavior:
                      "contain",
                    scrollBehavior:
                      "smooth",
                  }}
                >
                  {hasSyncedLyrics ? (
                    <div
                      className="
                        flex
                        min-h-full
                        flex-col
                        gap-2
                        pb-[25vh]
                        pt-[18vh]
                      "
                    >
                      {lyrics.lines.map(
                        (
                          line,
                          index
                        ) => {
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
                                max-w-2xl
                                rounded-2xl
                                px-4
                                py-3
                                text-center
                                text-sm
                                leading-7
                                transition-all
                                duration-500
                                ${
                                  isActive
                                    ? `
                                      scale-[1.03]
                                      bg-white/10
                                      font-bold
                                      text-white
                                      shadow-xl
                                      ring-1
                                      ring-white/10
                                      sm:text-base
                                    `
                                    : `
                                      text-white/30
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
                    <div
                      className="
                        flex
                        min-h-full
                        items-center
                        justify-center
                        px-4
                      "
                    >
                      <p
                        className="
                          whitespace-pre-line
                          text-center
                          text-sm
                          leading-7
                          text-white/70
                        "
                      >
                        {safeDecode(
                          lyrics.plain
                        )}
                      </p>
                    </div>
                  ) : (
                    <div
                      className="
                        flex
                        min-h-full
                        items-center
                        justify-center
                      "
                    >
                      <p className="text-center text-white/40">
                        No lyrics available.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* =================================================
                  SONG INFORMATION
              ================================================= */}

              <div
                className="
                  mt-3
                  w-full
                  text-center
                "
              >
                <h2
                  className="
                    truncate
                    text-xl
                    font-bold
                    sm:text-2xl
                  "
                >
                  {songName}
                </h2>

                <p
                  className="
                    mt-1
                    truncate
                    text-sm
                    text-white/50
                  "
                >
                  {artistNames}
                </p>
              </div>

              {/* =================================================
                  PROGRESS
              ================================================= */}

              <div
                className="
                  mt-5
                  flex
                  w-full
                  items-center
                  gap-2
                "
              >
                <span className="text-[11px] text-white/50">
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
                  value={
                    progress
                  }
                  onChange={
                    seek
                  }
                  className="
                    range
                    flex-1
                  "
                />

                <span className="text-[11px] text-white/50">
                  {formatTime(
                    duration
                  )}
                </span>
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
                  gap-5
                  sm:gap-8
                "
              >
                {/* SHUFFLE */}

                <button
                  type="button"
                  onClick={() =>
                    toggleShuffle?.()
                  }
                  title="Shuffle"
                  className={`
                    rounded-full
                    p-2
                    transition
                    hover:bg-white/10
                    ${
                      shuffle
                        ? "text-white"
                        : "text-white/55 hover:text-white"
                    }
                  `}
                >
                  <PiShuffleBold className="text-xl sm:text-2xl" />
                </button>

                {/* PREVIOUS */}

                <button
                  type="button"
                  onClick={() =>
                    prevSong?.()
                  }
                  title="Previous"
                  className="
                    rounded-full
                    p-2
                    text-white/80
                    transition
                    hover:bg-white/10
                    hover:text-white
                  "
                >
                  <IoMdSkipBackward className="text-2xl sm:text-3xl" />
                </button>

                {/* PLAY */}

                <button
                  type="button"
                  onClick={
                    playPause
                  }
                  title={
                    isPlaying
                      ? "Pause"
                      : "Play"
                  }
                  className="
                    rounded-full
                    bg-white
                    p-4
                    text-black
                    shadow-[0_12px_50px_rgba(255,255,255,0.2)]
                    transition
                    hover:scale-105
                    active:scale-95
                    sm:p-5
                  "
                >
                  {isPlaying ? (
                    <FaPause className="text-xl sm:text-2xl" />
                  ) : (
                    <FaPlay className="ml-0.5 text-xl sm:text-2xl" />
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
                    rounded-full
                    p-2
                    text-white/80
                    transition
                    hover:bg-white/10
                    hover:text-white
                  "
                >
                  <IoMdSkipForward className="text-2xl sm:text-3xl" />
                </button>

                {/* REPEAT */}

                <button
                  type="button"
                  onClick={() =>
                    toggleRepeatMode?.()
                  }
                  title="Repeat"
                  className={`
                    rounded-full
                    p-2
                    transition
                    hover:bg-white/10
                    ${
                      repeatMode ===
                      "one"
                        ? "text-white"
                        : "text-white/55 hover:text-white"
                    }
                  `}
                >
                  {repeatMode ===
                  "one" ? (
                    <LuRepeat1 className="text-xl sm:text-2xl" />
                  ) : (
                    <LuRepeat className="text-xl sm:text-2xl" />
                  )}
                </button>
              </div>

              {/* =================================================
                  VOLUME
              ================================================= */}

              <div
                className="
                  mt-5
                  flex
                  w-full
                  max-w-xs
                  items-center
                  gap-3
                  rounded-full
                  border
                  border-white/10
                  bg-black/30
                  px-4
                  py-2.5
                  backdrop-blur-2xl
                "
              >
                <button
                  type="button"
                  onClick={
                    toggleMute
                  }
                  title={
                    isMuted
                      ? "Unmute"
                      : "Mute"
                  }
                  className="
                    shrink-0
                    text-white/70
                    transition
                    hover:text-white
                  "
                >
                  <VolumeIcon className="text-lg" />
                </button>

                <input
                  aria-label="Volume"
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={
                    isMuted
                      ? 0
                      : volume
                  }
                  onChange={
                    handleVolumeChange
                  }
                  className="
                    range
                    flex-1
                  "
                />

                <span
                  className="
                    w-9
                    text-right
                    text-[11px]
                    text-white/40
                  "
                >
                  {Math.round(
                    (isMuted
                      ? 0
                      : volume) *
                      100
                  )}
                </span>
              </div>

              {/* =================================================
                  LIKE + DOWNLOAD
              ================================================= */}

              <div
                className="
                  mt-4
                  flex
                  items-center
                  gap-7
                "
              >
                <button
                  type="button"
                  onClick={
                    toggleLike
                  }
                  title="Like"
                  className="
                    rounded-full
                    p-2
                    transition
                    hover:scale-110
                    hover:bg-white/10
                  "
                >
                  {isLiked ? (
                    <FaHeart className="text-xl text-red-500" />
                  ) : (
                    <FaRegHeart className="text-xl text-white/80" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={
                    handleDownload
                  }
                  title="Download"
                  className="
                    rounded-full
                    p-2
                    text-white/80
                    transition
                    hover:scale-110
                    hover:bg-white/10
                    hover:text-white
                  "
                >
                  <MdDownload className="text-2xl" />
                </button>
              </div>

              {/* =================================================
                  COVER / LYRICS
                  BOTTOM
              ================================================= */}

              <div
                className="
                  mt-5
                  flex
                  w-full
                  justify-center
                  pb-2
                "
              >
                <div
                  className="
                    flex
                    items-center
                    gap-1
                    rounded-full
                    border
                    border-white/10
                    bg-black/40
                    p-1
                    shadow-2xl
                    backdrop-blur-2xl
                  "
                >
                  <button
                    type="button"
                    onClick={() =>
                      setShowLyrics(
                        false
                      )
                    }
                    className={`
                      rounded-full
                      px-6
                      py-2.5
                      text-sm
                      font-medium
                      transition-all
                      duration-300
                      ${
                        !showLyrics
                          ? "bg-white text-black shadow-lg"
                          : "text-white/45 hover:text-white"
                      }
                    `}
                  >
                    Cover
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setShowLyrics(
                        true
                      )
                    }
                    className={`
                      rounded-full
                      px-6
                      py-2.5
                      text-sm
                      font-medium
                      transition-all
                      duration-300
                      ${
                        showLyrics
                          ? "bg-white text-black shadow-lg"
                          : "text-white/45 hover:text-white"
                      }
                    `}
                  >
                    Lyrics
                  </button>
                </div>
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
                    max-w-md
                  "
                >
                  <h3
                    className="
                      mb-2
                      text-sm
                      font-semibold
                      text-white/80
                    "
                  >
                    From Album
                  </h3>

                  <div
                    className="
                      flex
                      items-center
                      gap-3
                      rounded-2xl
                      border
                      border-white/10
                      bg-white/5
                      p-2
                      backdrop-blur-xl
                      transition
                      hover:bg-white/10
                    "
                  >
                    <img
                      src={
                        resolveImage(
                          detail
                            .album
                            .image
                        ) ||
                        artwork ||
                        FALLBACK_IMAGE
                      }
                      alt=""
                      className="
                        h-14
                        w-14
                        rounded-xl
                        object-cover
                      "
                      onError={(
                        event
                      ) => {
                        event.currentTarget.src =
                          FALLBACK_IMAGE;
                      }}
                    />

                    <span
                      className="
                        truncate
                        text-sm
                        font-medium
                      "
                    >
                      {safeDecode(
                        detail
                          .album
                          .name
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
                <div
                  className="
                    mt-7
                    w-full
                  "
                >
                  <div
                    className="
                      flex
                      items-center
                      justify-between
                    "
                  >
                    <h3 className="font-semibold">
                      You Might Like
                    </h3>

                    <div
                      className="
                        hidden
                        gap-2
                        lg:flex
                      "
                    >
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
                        className="
                          rounded-full
                          p-2
                          transition
                          hover:bg-white/10
                        "
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
                        className="
                          rounded-full
                          p-2
                          transition
                          hover:bg-white/10
                        "
                      >
                        <MdOutlineKeyboardArrowRight className="text-2xl" />
                      </button>
                    </div>
                  </div>

                  <div
                    ref={
                      scrollRef
                    }
                    className="
                      mt-3
                      flex
                      gap-3
                      overflow-x-auto
                      pb-2
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
                          song={
                            item
                          }
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
                currentSong
                  ?.artists
                  ?.primary
              ) &&
                currentSong
                  .artists
                  .primary
                  .length >
                  0 && (
                  <div
                    className="
                      mt-7
                      w-full
                      pb-8
                    "
                  >
                    <h3
                      className="
                        mb-3
                        font-semibold
                      "
                    >
                      Artists
                    </h3>

                    <div
                      className="
                        flex
                        gap-4
                        overflow-x-auto
                        pb-2
                      "
                    >
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
