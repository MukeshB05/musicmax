import { useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  IoMdSkipBackward,
  IoMdSkipForward,
} from "react-icons/io";
import { IoShareSocial } from "react-icons/io5";
import {
  PiShuffleBold,
  PiSpeakerLowFill,
} from "react-icons/pi";
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
  MdDownload,
  MdKeyboardArrowDown,
} from "react-icons/md";
import { CiMaximize1 } from "react-icons/ci";
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
   HELPERS
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

const getImage = (song, coverImage) => {
  // Context cover image
  if (
    typeof coverImage === "string" &&
    coverImage.trim()
  ) {
    return coverImage;
  }

  // Direct string image
  if (
    typeof song?.image === "string" &&
    song.image.trim()
  ) {
    return song.image;
  }

  // Array image format
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

  // Object image format
  return (
    song?.image?.url ||
    song?.image?.link ||
    song?.image?.[2]?.url ||
    song?.image?.[1]?.url ||
    song?.image?.[0]?.url ||
    "/Unknown.png"
  );
};

const getSongId = (song) => {
  return (
    song?.id ||
    song?.songId ||
    song?.song_id ||
    song?.perma_url ||
    null
  );
};

/* =========================================================
   PLAYER COMPONENT
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
  } = useContext(MusicContext);

  /* =======================================================
     STATE
  ======================================================= */

  const [volume, setVolume] = useState(1);
  const [isMaximized, setIsMaximized] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);

  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);

  const [detail, setDetail] = useState(null);
  const [suggestions, setSuggestions] = useState([]);

  const [likedSongs, setLikedSongs] = useState(() => {
    try {
      const saved = localStorage.getItem("musicmax-liked");

      return saved
        ? JSON.parse(saved)
        : [];
    } catch {
      return [];
    }
  });

  /* =======================================================
     REFS
  ======================================================= */

  const scrollRef = useRef(null);

  // IMPORTANT:
  // This ref belongs ONLY to the lyrics scroll container.
  const lyricContainerRef = useRef(null);

  /* =======================================================
     SONG DATA
  ======================================================= */

  const audio = currentSong?.audio || null;

  const songId = getSongId(currentSong);

  const songName = safeDecode(
    currentSong?.name ||
      currentSong?.title ||
      "Unknown Song"
  );

  const artistNames = safeDecode(
    currentSong?.primaryArtists ||
      currentSong?.artists?.primary
        ?.map((artist) => artist?.name)
        ?.join(", ") ||
      currentSong?.artist ||
      "Unknown Artist"
  );

  const artwork = getImage(
    currentSong,
    coverImage
  );

  const isLiked = useMemo(() => {
    if (!songId) return false;

    return likedSongs.some(
      (song) => song?.id === songId
    );
  }, [likedSongs, songId]);

  /* =======================================================
     AUDIO DURATION
  ======================================================= */

  const progress = useMemo(() => {
    if (
      !audioDuration ||
      !Number.isFinite(audioDuration)
    ) {
      return 0;
    }

    return Math.min(
      100,
      Math.max(
        0,
        (currentTime / audioDuration) * 100
      )
    );
  }, [currentTime, audioDuration]);

  /* =======================================================
     ACTIVE LYRIC
  ======================================================= */

  const activeLyricIndex = useMemo(() => {
    if (
      !lyrics?.synced ||
      !Array.isArray(lyrics?.lines) ||
      lyrics.lines.length === 0
    ) {
      return -1;
    }

    let active = -1;

    lyrics.lines.forEach((line, index) => {
      const rawTime = Number(line?.time);

      if (!Number.isFinite(rawTime)) {
        return;
      }

      /*
        Some APIs can return milliseconds instead of seconds.
        If the value is unusually large, convert it.
      */
      const lineTime =
        rawTime > 10000
          ? rawTime / 1000
          : rawTime;

      if (lineTime <= currentTime) {
        active = index;
      }
    });

    return active;
  }, [lyrics, currentTime]);

  /* =======================================================
     RESET WHEN SONG CHANGES
  ======================================================= */

  useEffect(() => {
    setCurrentTime(0);
    setAudioDuration(0);
    setShowLyrics(false);
  }, [songId]);

  /* =======================================================
     AUDIO EVENT LISTENERS
  ======================================================= */

  useEffect(() => {
    if (!audio) {
      return;
    }

    const handleTimeUpdate = () => {
      const time = Number(audio.currentTime);

      if (Number.isFinite(time)) {
        setCurrentTime(time);
      }
    };

    const handleLoadedMetadata = () => {
      const duration = Number(audio.duration);

      if (
        Number.isFinite(duration) &&
        duration > 0
      ) {
        setAudioDuration(duration);
      }
    };

    const handleDurationChange = () => {
      const duration = Number(audio.duration);

      if (
        Number.isFinite(duration) &&
        duration > 0
      ) {
        setAudioDuration(duration);
      }
    };

    const handleEnded = () => {
      if (repeatMode === "one") {
        try {
          audio.currentTime = 0;
          audio.play();
        } catch {
          // Ignore browser autoplay errors
        }

        return;
      }

      nextSong?.();
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

    // Get existing duration immediately
    if (
      Number.isFinite(audio.duration) &&
      audio.duration > 0
    ) {
      setAudioDuration(audio.duration);
    }

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
  }, [audio, nextSong, repeatMode]);

  /* =======================================================
     AUDIO VOLUME
  ======================================================= */

  useEffect(() => {
    if (!audio) {
      return;
    }

    try {
      audio.volume = Math.min(
        1,
        Math.max(0, volume)
      );
    } catch {
      // Ignore
    }
  }, [audio, volume]);

  /* =======================================================
     AUTO SCROLL ACTIVE LYRIC
     
     IMPORTANT:
     This scrolls ONLY the lyrics container.
  ======================================================= */

  useEffect(() => {
    if (
      !showLyrics ||
      activeLyricIndex < 0 ||
      !lyricContainerRef.current
    ) {
      return;
    }

    const container =
      lyricContainerRef.current;

    const frame = requestAnimationFrame(() => {
      const activeEl =
        container.children[
          activeLyricIndex
        ];

      if (!activeEl) {
        return;
      }

      const top =
        activeEl.offsetTop -
        container.clientHeight / 2 +
        activeEl.clientHeight / 2;

      container.scrollTo({
        top: Math.max(0, top),
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
     FETCH SONG DETAILS / SUGGESTIONS
  ======================================================= */

  useEffect(() => {
    let cancelled = false;

    const loadSongData = async () => {
      if (!songId) {
        setDetail(null);
        setSuggestions([]);
        return;
      }

      try {
        const results =
          await Promise.allSettled([
            getSongById(songId),
            getSuggestionSong(songId),
          ]);

        if (cancelled) {
          return;
        }

        const detailResult = results[0];

        const suggestionResult = results[1];

        if (
          detailResult?.status === "fulfilled"
        ) {
          const data =
            detailResult.value;

          setDetail(
            data?.data ||
              data?.result ||
              data ||
              null
          );
        } else {
          setDetail(null);
        }

        if (
          suggestionResult?.status ===
          "fulfilled"
        ) {
          const data =
            suggestionResult.value;

          const list =
            data?.data?.songs ||
            data?.data?.results ||
            data?.songs ||
            data?.results ||
            [];

          setSuggestions(
            Array.isArray(list)
              ? list
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

    loadSongData();

    return () => {
      cancelled = true;
    };
  }, [songId]);

  /* =======================================================
     SAVE LIKES
  ======================================================= */

  useEffect(() => {
    try {
      localStorage.setItem(
        "musicmax-liked",
        JSON.stringify(likedSongs)
      );
    } catch {
      // Ignore localStorage errors
    }
  }, [likedSongs]);

  /* =======================================================
     MEDIA SESSION
  ======================================================= */

  useEffect(() => {
    if (
      typeof navigator === "undefined" ||
      !("mediaSession" in navigator)
    ) {
      return;
    }

    try {
      navigator.mediaSession.metadata =
        new MediaMetadata({
          title: songName,
          artist: artistNames,
          album:
            detail?.album?.name ||
            detail?.album ||
            "MusicMax",
          artwork: [
            {
              src: artwork,
              sizes: "512x512",
              type: "image/jpeg",
            },
          ],
        });

      navigator.mediaSession.setActionHandler(
        "play",
        () => {
          try {
            audio?.play();
            setIsPlaying(true);
          } catch {
            // Ignore
          }
        }
      );

      navigator.mediaSession.setActionHandler(
        "pause",
        () => {
          try {
            audio?.pause();
            setIsPlaying(false);
          } catch {
            // Ignore
          }
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

      navigator.mediaSession.setActionHandler(
        "seekbackward",
        () => {
          if (!audio) return;

          audio.currentTime = Math.max(
            0,
            audio.currentTime - 10
          );
        }
      );

      navigator.mediaSession.setActionHandler(
        "seekforward",
        () => {
          if (!audio) return;

          audio.currentTime = Math.min(
            audio.duration || Infinity,
            audio.currentTime + 10
          );
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
        [
          "play",
          "pause",
          "previoustrack",
          "nexttrack",
          "seekbackward",
          "seekforward",
        ].forEach((action) => {
          try {
            navigator.mediaSession.setActionHandler(
              action,
              null
            );
          } catch {
            // Browser may not support all actions
          }
        });
      } catch {
        // Ignore
      }
    };
  }, [
    audio,
    artwork,
    artistNames,
    detail,
    nextSong,
    prevSong,
    setIsPlaying,
    songName,
  ]);

  /* =======================================================
     PLAY / PAUSE
  ======================================================= */

  const playPause = async () => {
    if (!audio) {
      return;
    }

    try {
      if (audio.paused) {
        await audio.play();
        setIsPlaying(true);
      } else {
        audio.pause();
        setIsPlaying(false);
      }
    } catch (error) {
      console.error(
        "Playback error:",
        error
      );
    }
  };

  /* =======================================================
     SEEK
  ======================================================= */

  const seek = (event) => {
    if (!audio || !audioDuration) {
      return;
    }

    const value =
      Number(event.target.value);

    if (!Number.isFinite(value)) {
      return;
    }

    const newTime =
      (value / 100) * audioDuration;

    try {
      audio.currentTime = newTime;
      setCurrentTime(newTime);
    } catch {
      // Ignore
    }
  };

  /* =======================================================
     VOLUME
  ======================================================= */

  const changeVolume = (event) => {
    const value =
      Number(event.target.value) / 100;

    if (!Number.isFinite(value)) {
      return;
    }

    setVolume(value);
  };

  /* =======================================================
     FORMAT TIME
  ======================================================= */

  const formatTime = (seconds) => {
    const value = Number(seconds);

    if (
      !Number.isFinite(value) ||
      value < 0
    ) {
      return "0:00";
    }

    const mins = Math.floor(value / 60);

    const secs = Math.floor(value % 60)
      .toString()
      .padStart(2, "0");

    return `${mins}:${secs}`;
  };

  /* =======================================================
     LIKE
  ======================================================= */

  const toggleLike = () => {
    if (!songId) {
      return;
    }

    setLikedSongs((previous) => {
      const exists = previous.some(
        (song) => song?.id === songId
      );

      if (exists) {
        return previous.filter(
          (song) => song?.id !== songId
        );
      }

      return [
        ...previous,
        {
          id: songId,
          name: songName,
          artist: artistNames,
          image: artwork,
          audio:
            audio?.currentSrc ||
            audio?.src ||
            currentSong?.audio ||
            "",
        },
      ];
    });
  };

  /* =======================================================
     SHARE
  ======================================================= */

  const share = async () => {
    const shareData = {
      title: songName,
      text: `${songName} - ${artistNames}`,
      url: window.location.href,
    };

    try {
      if (
        navigator.share &&
        typeof navigator.share === "function"
      ) {
        await navigator.share(
          shareData
        );
        return;
      }

      if (
        navigator.clipboard &&
        navigator.clipboard.writeText
      ) {
        await navigator.clipboard.writeText(
          window.location.href
        );

        alert(
          "Song link copied to clipboard!"
        );
      }
    } catch (error) {
      // User cancelled share
      if (
        error?.name !==
        "AbortError"
      ) {
        console.error(
          "Share error:",
          error
        );
      }
    }
  };

  /* =======================================================
     DOWNLOAD
  ======================================================= */

  const handleDownload = async () => {
    try {
      if (typeof downloadSong === "function") {
        await downloadSong(
          currentSong
        );
      }
    } catch (error) {
      console.error(
        "Download error:",
        error
      );
    }
  };

  /* =======================================================
     REPEAT ICON
  ======================================================= */

  const RepeatIcon =
    repeatMode === "one"
      ? LuRepeat1
      : LuRepeat;

  /* =======================================================
     NO SONG
  ======================================================= */

  if (!currentSong) {
    return null;
  }

  /* =======================================================
     FULL SCREEN PLAYER
  ======================================================= */

  return (
    <>
      {/* ===================================================
          FULL PLAYER
      ================================================== */}

      {isMaximized && (
        <div
          ref={scrollRef}
          className="
            fixed
            inset-0
            z-[9999]
            overflow-hidden
            bg-black
            text-white
          "
        >
          {/* Background Artwork */}
          <div
            className="
              absolute
              inset-0
              scale-110
              bg-cover
              bg-center
              opacity-35
              blur-3xl
            "
            style={{
              backgroundImage: `url("${artwork}")`,
            }}
          />

          {/* Dark Overlay */}
          <div
            className="
              absolute
              inset-0
              bg-black/75
              backdrop-blur-xl
            "
          />

          {/* Content */}
          <div
            className="
              relative
              z-10
              flex
              h-full
              flex-col
            "
          >
            {/* =========================================
                HEADER
            ========================================= */}

            <div
              className="
                flex
                items-center
                justify-between
                px-4
                py-4
                sm:px-8
              "
            >
              <button
                type="button"
                onClick={() =>
                  setIsMaximized(false)
                }
                className="
                  rounded-full
                  bg-white/10
                  p-2
                  text-white
                  transition
                  hover:bg-white/20
                  active:scale-95
                "
                aria-label="Close player"
              >
                <MdKeyboardArrowDown
                  size={28}
                />
              </button>

              <div
                className="
                  text-center
                "
              >
                <p
                  className="
                    text-[10px]
                    font-semibold
                    uppercase
                    tracking-[0.3em]
                    text-white/50
                  "
                >
                  Now Playing
                </p>

                <p
                  className="
                    mt-1
                    max-w-[180px]
                    truncate
                    text-xs
                    font-medium
                    text-white/80
                    sm:max-w-[300px]
                  "
                >
                  {songName}
                </p>
              </div>

              <button
                type="button"
                onClick={share}
                className="
                  rounded-full
                  bg-white/10
                  p-2
                  text-white
                  transition
                  hover:bg-white/20
                  active:scale-95
                "
                aria-label="Share song"
              >
                <IoShareSocial
                  size={20}
                />
              </button>
            </div>

            {/* =========================================
                COVER / LYRICS AREA
            ========================================= */}

            <div
              className="
                flex
                min-h-0
                flex-1
                flex-col
                px-4
                pb-4
                sm:px-8
              "
            >
              {/* COVER */}
              {!showLyrics && (
                <div
                  className="
                    flex
                    min-h-0
                    flex-1
                    items-center
                    justify-center
                  "
                >
                  <div
                    className="
                      w-[min(78vw,380px)]
                      sm:w-[min(55vw,430px)]
                    "
                  >
                    <div
                      className="
                        overflow-hidden
                        rounded-[28px]
                        bg-white/10
                        shadow-2xl
                        ring-1
                        ring-white/10
                      "
                    >
                      <img
                        src={artwork}
                        alt={songName}
                        className="
                          aspect-square
                          w-full
                          object-cover
                        "
                        onError={(event) => {
                          event.currentTarget.src =
                            "/Unknown.png";
                        }}
                      />
                    </div>

                    <div
                      className="
                        mt-5
                        text-center
                      "
                    >
                      <h1
                        className="
                          truncate
                          text-xl
                          font-bold
                          sm:text-2xl
                        "
                      >
                        {songName}
                      </h1>

                      <p
                        className="
                          mt-1
                          truncate
                          text-sm
                          text-white/60
                        "
                      >
                        {artistNames}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* =======================================
                  LYRICS
              ======================================= */}

              {showLyrics && (
                <div
                  ref={lyricContainerRef}
                  className="
                    flex-1
                    min-h-0
                    overflow-y-auto
                    px-1
                    scroll-smooth
                  "
                  style={{
                    scrollbarWidth: "thin",
                    scrollBehavior: "smooth",
                  }}
                >
                  <div
                    className="
                      mx-auto
                      flex
                      min-h-full
                      max-w-2xl
                      flex-col
                      justify-center
                      gap-2
                      py-20
                    "
                  >
                    {lyrics?.synced &&
                    Array.isArray(
                      lyrics?.lines
                    ) &&
                    lyrics.lines.length > 0 ? (
                      lyrics.lines.map(
                        (line, index) => {
                          const active =
                            index ===
                            activeLyricIndex;

                          return (
                            <p
                              key={`${line?.time}-${index}`}
                              className={`
                                mx-auto
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
                                  active
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
                      )
                    ) : lyrics?.text ? (
                      <p
                        className="
                          whitespace-pre-wrap
                          text-center
                          text-base
                          leading-8
                          text-white/80
                        "
                      >
                        {safeDecode(
                          lyrics.text
                        )}
                      </p>
                    ) : (
                      <div
                        className="
                          flex
                          min-h-[50vh]
                          items-center
                          justify-center
                          text-center
                        "
                      >
                        <div>
                          <p
                            className="
                              text-lg
                              font-semibold
                              text-white/70
                            "
                          >
                            Lyrics unavailable
                          </p>

                          <p
                            className="
                              mt-2
                              text-sm
                              text-white/40
                            "
                          >
                            Lyrics are not
                            available for
                            this song.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* =======================================
                  COVER / LYRICS SWITCH
              ======================================= */}

              <div
                className="
                  flex
                  justify-center
                  py-3
                "
              >
                <div
                  className="
                    flex
                    rounded-full
                    border
                    border-white/10
                    bg-black/30
                    p-1
                    shadow-lg
                    backdrop-blur-xl
                  "
                >
                  <button
                    type="button"
                    onClick={() =>
                      setShowLyrics(false)
                    }
                    className={`
                      rounded-full
                      px-5
                      py-2
                      text-xs
                      font-semibold
                      transition-all
                      ${
                        !showLyrics
                          ? `
                            bg-white
                            text-black
                            shadow
                          `
                          : `
                            text-white/50
                            hover:text-white
                          `
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
                      text-xs
                      font-semibold
                      transition-all
                      ${
                        showLyrics
                          ? `
                            bg-white
                            text-black
                            shadow
                          `
                          : `
                            text-white/50
                            hover:text-white
                          `
                      }
                    `}
                  >
                    Lyrics
                  </button>
                </div>
              </div>
            </div>

            {/* =========================================
                BOTTOM PLAYER
            ========================================= */}

            <div
              className="
                px-4
                pb-5
                sm:px-8
              "
            >
              {/* Song info */}
              <div
                className="
                  mb-3
                  flex
                  items-center
                  justify-between
                  gap-3
                "
              >
                <div
                  className="
                    min-w-0
                    flex-1
                  "
                >
                  <p
                    className="
                      truncate
                      text-base
                      font-bold
                    "
                  >
                    {songName}
                  </p>

                  <p
                    className="
                      truncate
                      text-xs
                      text-white/50
                    "
                  >
                    {artistNames}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={toggleLike}
                  className="
                    shrink-0
                    p-2
                    text-white
                    transition
                    active:scale-90
                  "
                  aria-label={
                    isLiked
                      ? "Unlike"
                      : "Like"
                  }
                >
                  {isLiked ? (
                    <FaHeart
                      className="
                        text-red-400
                      "
                    />
                  ) : (
                    <FaRegHeart />
                  )}
                </button>
              </div>

              {/* Progress */}
              <div
                className="
                  flex
                  items-center
                  gap-2
                "
              >
                <span
                  className="
                    w-10
                    text-right
                    text-[10px]
                    text-white/50
                  "
                >
                  {formatTime(
                    currentTime
                  )}
                </span>

                <input
                  type="range"
                  min="0"
                  max="100"
                  step="0.1"
                  value={progress}
                  onChange={seek}
                  className="
                    h-1
                    flex-1
                    cursor-pointer
                    accent-red-400
                  "
                  aria-label="Song progress"
                />

                <span
                  className="
                    w-10
                    text-[10px]
                    text-white/50
                  "
                >
                  {formatTime(
                    audioDuration
                  )}
                </span>
              </div>

              {/* Controls */}
              <div
                className="
                  mt-3
                  flex
                  items-center
                  justify-center
                  gap-4
                  sm:gap-6
                "
              >
                <button
                  type="button"
                  onClick={toggleShuffle}
                  className={`
                    transition
                    active:scale-90
                    ${
                      shuffle
                        ? "text-red-400"
                        : "text-white/50"
                    }
                  `}
                  aria-label="Shuffle"
                >
                  <PiShuffleBold
                    size={18}
                  />
                </button>

                <button
                  type="button"
                  onClick={prevSong}
                  className="
                    text-white
                    transition
                    active:scale-90
                  "
                  aria-label="Previous"
                >
                  <IoMdSkipBackward
                    size={25}
                  />
                </button>

                <button
                  type="button"
                  onClick={playPause}
                  className="
                    flex
                    h-14
                    w-14
                    items-center
                    justify-center
                    rounded-full
                    bg-white
                    text-black
                    shadow-xl
                    transition
                    hover:scale-105
                    active:scale-95
                  "
                  aria-label={
                    isPlaying
                      ? "Pause"
                      : "Play"
                  }
                >
                  {isPlaying ? (
                    <FaPause size={18} />
                  ) : (
                    <FaPlay
                      size={18}
                      className="ml-1"
                    />
                  )}
                </button>

                <button
                  type="button"
                  onClick={nextSong}
                  className="
                    text-white
                    transition
                    active:scale-90
                  "
                  aria-label="Next"
                >
                  <IoMdSkipForward
                    size={25}
                  />
                </button>

                <button
                  type="button"
                  onClick={toggleRepeatMode}
                  className={`
                    transition
                    active:scale-90
                    ${
                      repeatMode !== "off"
                        ? "text-red-400"
                        : "text-white/50"
                    }
                  `}
                  aria-label="Repeat"
                >
                  <RepeatIcon
                    size={19}
                  />
                </button>
              </div>

              {/* Extra controls */}
              <div
                className="
                  mt-4
                  flex
                  items-center
                  justify-between
                "
              >
                <div
                  className="
                    flex
                    items-center
                    gap-2
                  "
                >
                  <PiSpeakerLowFill
                    size={17}
                    className="
                      text-white/50
                    "
                  />

                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={volume * 100}
                    onChange={changeVolume}
                    className="
                      w-20
                      cursor-pointer
                      accent-red-400
                      sm:w-28
                    "
                    aria-label="Volume"
                  />
                </div>

                <div
                  className="
                    flex
                    items-center
                    gap-1
                  "
                >
                  <button
                    type="button"
                    onClick={
                      handleDownload
                    }
                    className="
                      rounded-full
                      p-2
                      text-white/60
                      transition
                      hover:bg-white/10
                      hover:text-white
                    "
                    aria-label="Download"
                  >
                    <MdDownload
                      size={21}
                    />
                  </button>

                  <button
                    type="button"
                    onClick={share}
                    className="
                      rounded-full
                      p-2
                      text-white/60
                      transition
                      hover:bg-white/10
                      hover:text-white
                    "
                    aria-label="Share"
                  >
                    <IoShareSocial
                      size={19}
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =================================================
          MINI PLAYER
      ================================================= */}

      <div
        className="
          fixed
          bottom-0
          left-0
          right-0
          z-[999]
          border-t
          border-white/10
          bg-black/80
          backdrop-blur-2xl
        "
      >
        {/* Progress */}
        <div
          className="
            absolute
            left-0
            right-0
            top-0
            h-[2px]
            bg-white/10
          "
        >
          <div
            className="
              h-full
              bg-red-400
              transition-[width]
              duration-200
            "
            style={{
              width: `${progress}%`,
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
            pt-3
            sm:px-5
          "
        >
          {/* Artwork */}
          <button
            type="button"
            onClick={() =>
              setIsMaximized(true)
            }
            className="
              relative
              h-12
              w-12
              shrink-0
              overflow-hidden
              rounded-lg
              bg-white/10
            "
          >
            <img
              src={artwork}
              alt={songName}
              className="
                h-full
                w-full
                object-cover
              "
              onError={(event) => {
                event.currentTarget.src =
                  "/Unknown.png";
              }}
            />
          </button>

          {/* Song info */}
          <div
            className="
              min-w-0
              flex-1
            "
          >
            <p
              className="
                truncate
                text-sm
                font-semibold
                text-white
              "
            >
              {songName}
            </p>

            <p
              className="
                truncate
                text-[11px]
                text-white/50
              "
            >
              {artistNames}
            </p>
          </div>

          {/* Desktop like */}
          <button
            type="button"
            onClick={toggleLike}
            className="
              hidden
              p-2
              text-white/60
              transition
              hover:text-white
              sm:block
            "
            aria-label={
              isLiked
                ? "Unlike"
                : "Like"
            }
          >
            {isLiked ? (
              <FaHeart
                className="
                  text-red-400
                "
              />
            ) : (
              <FaRegHeart />
            )}
          </button>

          {/* Previous */}
          <button
            type="button"
            onClick={prevSong}
            className="
              hidden
              p-2
              text-white/70
              transition
              hover:text-white
              sm:block
            "
            aria-label="Previous"
          >
            <IoMdSkipBackward
              size={20}
            />
          </button>

          {/* Play */}
          <button
            type="button"
            onClick={playPause}
            className="
              flex
              h-10
              w-10
              shrink-0
              items-center
              justify-center
              rounded-full
              bg-white
              text-black
              transition
              active:scale-90
            "
            aria-label={
              isPlaying
                ? "Pause"
                : "Play"
            }
          >
            {isPlaying ? (
              <FaPause size={14} />
            ) : (
              <FaPlay
                size={14}
                className="ml-0.5"
              />
            )}
          </button>

          {/* Next */}
          <button
            type="button"
            onClick={nextSong}
            className="
              hidden
              p-2
              text-white/70
              transition
              hover:text-white
              sm:block
            "
            aria-label="Next"
          >
            <IoMdSkipForward
              size={20}
            />
          </button>

          {/* Maximize */}
          <button
            type="button"
            onClick={() =>
              setIsMaximized(true)
            }
            className="
              rounded-full
              p-2
              text-white/60
              transition
              hover:bg-white/10
              hover:text-white
            "
            aria-label="Open full player"
          >
            <CiMaximize1
              size={21}
            />
          </button>
        </div>
      </div>

      {/* =================================================
          CONTENT BELOW PLAYER
      ================================================= */}

      <div
        className="
          mx-auto
          max-w-7xl
          px-4
          pb-28
          pt-6
        "
      >
        {/* Song detail */}
        {detail && (
          <div
            className="
              mb-8
            "
          >
            {detail?.album?.id && (
              <Link
                to={`/album/${detail.album.id}`}
                className="
                  inline-block
                  text-xs
                  text-white/50
                  transition
                  hover:text-white
                "
              >
                {safeDecode(
                  detail.album.name ||
                    "Album"
                )}
              </Link>
            )}
          </div>
        )}

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <section
            className="
              mb-8
            "
          >
            <h2
              className="
                mb-4
                text-lg
                font-bold
                text-white
              "
            >
              You may also like
            </h2>

            <SongGrid
              songs={suggestions}
            />
          </section>
        )}

        {/* Artists */}
        {detail?.artists?.primary &&
          Array.isArray(
            detail.artists.primary
          ) &&
          detail.artists.primary.length >
            0 && (
            <section>
              <h2
                className="
                  mb-4
                  text-lg
                  font-bold
                  text-white
                "
              >
                Artists
              </h2>

              <div
                className="
                  grid
                  grid-cols-2
                  gap-4
                  sm:grid-cols-4
                  md:grid-cols-6
                "
              >
                {detail.artists.primary.map(
                  (artist) => (
                    <ArtistItems
                      key={
                        artist?.id ||
                        artist?.name
                      }
                      artist={artist}
                    />
                  )
                )}
              </div>
            </section>
          )}
      </div>
    </>
  );
};

export default Player;
