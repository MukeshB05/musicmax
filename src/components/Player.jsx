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

import { ID3Writer } from "browser-id3-writer";

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
   RESOLVE IMAGE
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
    lyrics,
    coverImage,
  } = useContext(MusicContext) || {};

  /* =======================================================
     THEME
  ======================================================= */

  const [themeVersion, setThemeVersion] =
    useState(0);

  const theme =
    typeof document !== "undefined"
      ? document.documentElement.getAttribute(
          "data-theme"
        )
      : "light";

  const isDark =
    theme === "dark" ||
    theme === "black" ||
    theme === "night";

  useEffect(() => {
    if (
      typeof document ===
      "undefined"
    ) {
      return undefined;
    }

    const root =
      document.documentElement;

    const observer =
      new MutationObserver(() => {
        setThemeVersion(
          (value) => value + 1
        );
      });

    observer.observe(root, {
      attributes: true,
      attributeFilter: [
        "data-theme",
      ],
    });

    return () =>
      observer.disconnect();
  }, []);

  void themeVersion;

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

  const [isDownloading, setIsDownloading] =
    useState(false);

  /* =======================================================
     LIKED SONGS
  ======================================================= */

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
    Number(
      currentSong?.duration
    ) > 0
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
     ARTIST
  ======================================================= */

  const artistNames = useMemo(() => {
    const primary =
      currentSong?.artists
        ?.primary;

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
     DEFAULT AUDIO VOLUME
     Volume controls are intentionally removed.
     Audio always starts at 100% volume.
  ======================================================= */

  useEffect(() => {
    if (!audio) {
      return;
    }

    try {
      audio.volume = 1;
      audio.muted = false;
    } catch {}
  }, [audio]);

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

      try {
        audio.volume = 1;
        audio.muted = false;
      } catch {}
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
     FETCH SONG DETAILS
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
      return undefined;
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
          behavior: "smooth",
        });
      });

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

    if (
      !Number.isFinite(value)
    ) {
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

    setCurrentTime(time);
  };

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

    const url =
      albumId
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
     DOWNLOAD MP3 WITH ID3 METADATA
     - Song title
     - Artist name
     - Album name
     - Album cover artwork
     - Falls back to the original MP3 when tagging is blocked
       by remote-server CORS restrictions.
  ======================================================= */

  const handleDownload = async () => {
    if (isDownloading) {
      return;
    }

    const url =
      audio?.currentSrc ||
      audio?.src ||
      currentSong?.audioUrl ||
      currentSong?.downloadUrl;

    if (!url) {
      alert("Download URL is not available.");
      return;
    }

    const title =
      safeDecode(songName).trim() ||
      "Unknown Song";

    const artist =
      safeDecode(artistNames).trim() ||
      "Unknown Artist";

    const album =
      safeDecode(
        detail?.album?.name ||
          currentSong?.album?.name ||
          currentSong?.albumName ||
          "MusicMax"
      ).trim() ||
      "MusicMax";

    const filename =
      `${title} - ${artist}.mp3`
        .replace(/[\\/:*?"<>|]/g, "_")
        .replace(/\s+/g, " ")
        .trim();

    const downloadBlob = (blob, name) => {
      const objectUrl =
        URL.createObjectURL(blob);

      const link =
        document.createElement("a");

      link.href = objectUrl;
      link.download = name;
      link.style.display = "none";

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.setTimeout(() => {
        URL.revokeObjectURL(objectUrl);
      }, 1500);
    };

    const dataUrlToArrayBuffer = (dataUrl) => {
      const match =
        String(dataUrl).match(
          /^data:([^;,]+)?(;base64)?,(.*)$/s
        );

      if (!match) {
        return null;
      }

      const isBase64 = Boolean(match[2]);
      const data = match[3] || "";

      if (isBase64) {
        const binary = atob(data);
        const bytes = new Uint8Array(binary.length);

        for (let index = 0; index < binary.length; index += 1) {
          bytes[index] = binary.charCodeAt(index);
        }

        return bytes.buffer;
      }

      return new TextEncoder().encode(
        decodeURIComponent(data)
      ).buffer;
    };

    const getArrayBuffer = async (resourceUrl) => {
      if (!resourceUrl) {
        throw new Error("Resource URL is empty.");
      }

      if (String(resourceUrl).startsWith("data:")) {
        const buffer = dataUrlToArrayBuffer(resourceUrl);

        if (!buffer) {
          throw new Error("Invalid data URL.");
        }

        return buffer;
      }

      const response = await fetch(resourceUrl, {
        mode: "cors",
        credentials: "omit",
      });

      if (!response.ok) {
        throw new Error(
          `HTTP ${response.status} while fetching resource.`
        );
      }

      return response.arrayBuffer();
    };

    setIsDownloading(true);

    try {
      const audioBuffer =
        await getArrayBuffer(url);

      const writer =
        new ID3Writer(audioBuffer);

      writer
        .setFrame("TIT2", title)
        .setFrame("TPE1", [artist])
        .setFrame("TALB", album);

      // Album artwork is optional: if the image server blocks CORS,
      // the MP3 will still receive title/artist/album metadata.
      if (artwork && artwork !== FALLBACK_IMAGE) {
        try {
          const coverBuffer =
            await getArrayBuffer(artwork);

          writer.setFrame("APIC", {
            type: 3,
            data: coverBuffer,
            description: "Album Cover",
          });
        } catch (coverError) {
          console.warn(
            "Album cover metadata could not be embedded:",
            coverError
          );
        }
      }

      writer.addTag();

      const taggedBlob =
        writer.getBlob();

      downloadBlob(
        taggedBlob,
        filename
      );
    } catch (error) {
      console.warn(
        "Metadata download failed. Falling back to original MP3:",
        error
      );

      // A browser cannot embed ID3 metadata when the remote MP3 does not
      // allow CORS. In that case, download the original file instead.
      try {
        const response = await fetch(url, {
          mode: "cors",
          credentials: "omit",
        });

        if (!response.ok) {
          throw new Error(
            `HTTP ${response.status}`
          );
        }

        const blob =
          await response.blob();

        downloadBlob(blob, filename);
      } catch (fallbackError) {
        console.warn(
          "Blob download failed; opening source URL:",
          fallbackError
        );

        const link =
          document.createElement("a");

        link.href = url;
        link.download = filename;
        link.target = "_blank";
        link.rel = "noopener noreferrer";

        document.body.appendChild(link);
        link.click();
        link.remove();
      }
    } finally {
      setIsDownloading(false);
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
     THEME COLORS
  ======================================================= */

  const panelClass =
    isDark
      ? "bg-black/75 border-white/10 text-white"
      : "bg-white/85 border-black/10 text-gray-900";

  const softPanelClass =
    isDark
      ? "bg-white/5 border-white/10"
      : "bg-black/5 border-black/10";

  const mutedTextClass =
    isDark
      ? "text-white/55"
      : "text-black/55";

  const iconMutedClass =
    isDark
      ? "text-white/70 hover:text-white"
      : "text-black/65 hover:text-black";

  /* =======================================================
     UI
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
      <div
        className={`
          relative
          w-full
          overflow-hidden
          rounded-t-3xl
          border-t
          shadow-[0_-20px_80px_rgba(0,0,0,0.35)]
          backdrop-blur-3xl
          ${panelClass}
          ${
            isMaximized
              ? "h-[92vh]"
              : ""
          }
        `}
      >
        {/* =================================================
            BACKGROUND ART
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
              opacity-35
              blur-3xl
            "
            onError={(event) => {
              event.currentTarget.src =
                FALLBACK_IMAGE;
            }}
          />

          <div
            className={`
              absolute
              inset-0
              backdrop-blur-2xl
              ${
                isDark
                  ? "bg-black/70"
                  : "bg-white/70"
              }
            `}
          />

          <div
            className={`
              absolute
              inset-0
              bg-gradient-to-b
              ${
                isDark
                  ? "from-black/20 via-black/60 to-black/95"
                  : "from-white/30 via-white/65 to-white/95"
              }
            `}
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
              <img
                src={
                  artwork ||
                  FALLBACK_IMAGE
                }
                alt={songName}
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
                onError={(event) => {
                  event.currentTarget.src =
                    FALLBACK_IMAGE;
                }}
              />

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
                  {songName}
                </div>

                <div
                  className={`
                    truncate
                    text-xs
                    ${mutedTextClass}
                  `}
                >
                  {artistNames}
                </div>

                {/* MINI RED PROGRESS */}

                <div
                  className="
                    mt-1
                    flex
                    items-center
                    gap-2
                  "
                >
                  <span className="text-[10px] opacity-60">
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
                      music-progress
                      flex-1
                    "
                    style={{
                      "--progress": `${progress}%`,
                    }}
                  />

                  <span className="text-[10px] opacity-60">
                    {formatTime(
                      duration
                    )}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  prevSong?.()
                }
                title="Previous"
                className={`
                  hidden
                  rounded-full
                  p-2
                  transition
                  hover:bg-white/10
                  sm:block
                  ${iconMutedClass}
                `}
              >
                <IoMdSkipBackward className="text-2xl" />
              </button>

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
                  bg-white
                  p-2.5
                  text-black
                  shadow-xl
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

              <button
                type="button"
                onClick={() =>
                  nextSong?.()
                }
                title="Next"
                className={`
                  hidden
                  rounded-full
                  p-2
                  transition
                  hover:bg-white/10
                  sm:block
                  ${iconMutedClass}
                `}
              >
                <IoMdSkipForward className="text-2xl" />
              </button>

              <button
                type="button"
                onClick={
                  toggleLike
                }
                title="Like"
                className={`
                  hidden
                  rounded-full
                  p-2
                  transition
                  hover:bg-white/10
                  sm:block
                  ${iconMutedClass}
                `}
              >
                {isLiked ? (
                  <FaHeart className="text-lg text-red-500" />
                ) : (
                  <FaRegHeart className="text-lg" />
                )}
              </button>

              <button
                type="button"
                onClick={() =>
                  setIsMaximized(
                    true
                  )
                }
                title="Open full player"
                className={`
                  shrink-0
                  rounded-full
                  p-2
                  transition
                  hover:bg-white/10
                  ${iconMutedClass}
                `}
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
              {/* HEADER */}

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
                  className={`
                    rounded-full
                    border
                    px-4
                    py-2
                    text-sm
                    font-medium
                    backdrop-blur-xl
                    transition
                    hover:bg-white/10
                    ${softPanelClass}
                  `}
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
                    className={`
                      hidden
                      text-xs
                      font-semibold
                      tracking-[0.2em]
                      sm:block
                      ${mutedTextClass}
                    `}
                  >
                    NOW PLAYING
                  </span>

                  <button
                    type="button"
                    onClick={share}
                    title="Share"
                    className={`
                      rounded-full
                      border
                      p-2.5
                      backdrop-blur-xl
                      transition
                      hover:bg-white/10
                      ${softPanelClass}
                    `}
                  >
                    <IoShareSocial className="text-xl" />
                  </button>
                </div>
              </div>

              {/* COVER / LYRICS */}

              {!showLyrics ? (
                <div
                  className="
                    flex
                    min-h-[38vh]
                    flex-1
                    w-full
                    items-center
                    justify-center
                    py-5
                  "
                >
                  <div className="relative">
                    <div
                      className="
                        absolute
                        inset-0
                        scale-90
                        rounded-[2rem]
                        bg-red-500/20
                        blur-3xl
                      "
                    />

                    <img
                      src={
                        artwork ||
                        FALLBACK_IMAGE
                      }
                      alt={songName}
                      className="
                        relative
                        h-52
                        w-52
                        rounded-[1.75rem]
                        object-cover
                        shadow-[0_30px_100px_rgba(0,0,0,0.7)]
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
                      onError={(event) => {
                        event.currentTarget.src =
                          FALLBACK_IMAGE;
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div
                  ref={
                    lyricContainerRef
                  }
                  className={`
                    mt-5
                    h-[45vh]
                    min-h-[280px]
                    w-full
                    max-w-3xl
                    overflow-x-hidden
                    overflow-y-auto
                    rounded-3xl
                    border
                    px-3
                    py-8
                    shadow-inner
                    backdrop-blur-xl
                    sm:h-[48vh]
                    sm:px-6
                    ${softPanelClass}
                  `}
                  style={{
                    scrollbarWidth:
                      "thin",
                    overscrollBehavior:
                      "contain",
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
                                      bg-red-400/20
                                      font-bold
                                      text-red-500
                                      shadow-[0_8px_30px_rgba(248,113,113,0.18)]
                                      ring-1
                                      ring-red-400/20
                                      sm:text-base
                                    `
                                    : `
                                      opacity-35
                                      hover:opacity-70
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
                          opacity-70
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
                      <p className="opacity-50">
                        No lyrics available.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* SONG INFORMATION */}

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
                  className={`
                    mt-1
                    truncate
                    text-sm
                    ${mutedTextClass}
                  `}
                >
                  {artistNames}
                </p>
              </div>

              {/* =================================================
                  FULL RED PROGRESS BAR
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
                <span className="w-10 text-[11px] opacity-50">
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
                    music-progress
                    flex-1
                  "
                  style={{
                    "--progress": `${progress}%`,
                  }}
                />

                <span className="w-10 text-right text-[11px] opacity-50">
                  {formatTime(
                    duration
                  )}
                </span>
              </div>

              {/* CONTROLS */}

              <div
                className="
                  mt-5
                  flex
                  items-center
                  justify-center
                  gap-4
                  sm:gap-7
                "
              >
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
                        ? "text-red-500"
                        : "opacity-60 hover:opacity-100"
                    }
                  `}
                >
                  <PiShuffleBold className="text-xl sm:text-2xl" />
                </button>

                <button
                  type="button"
                  onClick={() =>
                    prevSong?.()
                  }
                  title="Previous"
                  className="
                    rounded-full
                    p-2
                    opacity-80
                    transition
                    hover:bg-white/10
                    hover:opacity-100
                  "
                >
                  <IoMdSkipBackward className="text-2xl sm:text-3xl" />
                </button>

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
                    shadow-[0_12px_50px_rgba(255,255,255,0.25)]
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

                <button
                  type="button"
                  onClick={() =>
                    nextSong?.()
                  }
                  title="Next"
                  className="
                    rounded-full
                    p-2
                    opacity-80
                    transition
                    hover:bg-white/10
                    hover:opacity-100
                  "
                >
                  <IoMdSkipForward className="text-2xl sm:text-3xl" />
                </button>

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
                        ? "text-red-500"
                        : "opacity-60 hover:opacity-100"
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

              {/* LIKE / DOWNLOAD */}

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
                    <FaRegHeart className="text-xl opacity-80" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={
                    handleDownload
                  }
                  disabled={isDownloading}
                  title={
                    isDownloading
                      ? "Downloading..."
                      : "Download MP3"
                  }
                  className="
                    rounded-full
                    p-2
                    opacity-80
                    transition
                    hover:scale-110
                    hover:bg-white/10
                    hover:opacity-100
                  "
                >
                  <MdDownload
                    className={`text-2xl ${
                      isDownloading
                        ? "animate-pulse opacity-50"
                        : ""
                    }`}
                  />
                </button>
              </div>

              {/* COVER / LYRICS */}

              <div
                className="
                  mt-5
                  flex
                  w-full
                  justify-center
                  pb-3
                "
              >
                <div
                  className={`
                    flex
                    items-center
                    gap-1
                    rounded-full
                    border
                    p-1
                    shadow-2xl
                    backdrop-blur-2xl
                    ${softPanelClass}
                  `}
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
                      px-7
                      py-2.5
                      text-sm
                      font-semibold
                      transition-all
                      duration-300
                      ${
                        !showLyrics
                          ? "bg-red-500 text-white shadow-lg shadow-red-500/25"
                          : "opacity-55 hover:opacity-100"
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
                      px-7
                      py-2.5
                      text-sm
                      font-semibold
                      transition-all
                      duration-300
                      ${
                        showLyrics
                          ? "bg-red-500 text-white shadow-lg shadow-red-500/25"
                          : "opacity-55 hover:opacity-100"
                      }
                    `}
                  >
                    Lyrics
                  </button>
                </div>
              </div>

              {/* ALBUM */}

              {detail?.album?.id && (
                <Link
                  to={`/albums/${detail.album.id}`}
                  className="
                    mt-5
                    w-full
                    max-w-md
                  "
                >
                  <h3 className="mb-2 text-sm font-semibold opacity-80">
                    From Album
                  </h3>

                  <div
                    className={`
                      flex
                      items-center
                      gap-3
                      rounded-2xl
                      border
                      p-2
                      backdrop-blur-xl
                      transition
                      hover:bg-white/10
                      ${softPanelClass}
                    `}
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
                      onError={(event) => {
                        event.currentTarget.src =
                          FALLBACK_IMAGE;
                      }}
                    />

                    <span className="truncate text-sm font-medium">
                      {safeDecode(
                        detail
                          .album
                          .name
                      )}
                    </span>
                  </div>
                </Link>
              )}

              {/* SUGGESTIONS */}

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
                          song={item}
                        />
                      )
                    )}
                  </div>
                </div>
              )}

              {/* ARTISTS */}

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
                    <h3 className="mb-3 font-semibold">
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
