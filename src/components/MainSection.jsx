import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  fetchplaylistsByID,
  searchAlbumByQuery,
  searchPlayListByQuery,
} from "../../fetch";

import AlbumSlider from "./Sliders/AlbumSlider";
import PlaylistSlider from "./Sliders/PlaylistSlider";
import ArtistSlider from "./Sliders/ArtistSlider";
import SongGrid from "./SongGrid";

import {
  MdOutlineKeyboardArrowLeft,
  MdOutlineKeyboardArrowRight,
} from "react-icons/md";

import { artistData } from "../genreData";

// =========================================================
// CONSTANTS
// =========================================================

const HOME_PLAYLIST_IDS = {
  trending: 10763385,
  latest: 80802063,
};

const ROW_CLASSES = {
  1: "lg:grid-rows-1",
  2: "lg:grid-rows-2",
};

const getId = (song) =>
  song?.id ?? song?._id ?? song?.songId ?? null;

// =========================================================
// HELPERS
// =========================================================

const scrollByAmount = (ref, direction) => {
  if (!ref?.current) return;
  const amount = ref.current.clientWidth * 0.8;
  ref.current.scrollBy({
    left: direction * amount,
    behavior: "smooth",
  });
};

const pickArray = (result, path) => {
  if (result?.status !== "fulfilled") return [];
  const value = path.reduce(
    (acc, key) => (acc == null ? acc : acc[key]),
    result.value
  );
  return Array.isArray(value) ? value : [];
};

// =========================================================
// SONG CAROUSEL (extracted to avoid 3x copy-paste)
// =========================================================

const SongCarousel = ({ title, songs, queue, rows = 1, hideIfEmpty = false }) => {
  const scrollRef = useRef(null);

  if (hideIfEmpty && songs.length === 0) return null;

  const rowClass = ROW_CLASSES[rows] ?? ROW_CLASSES[1];

  return (
    <section className="flex flex-col justify-center items-center w-full">
      <h2 className="m-4 mt-0 text-xl lg:text-2xl font-semibold w-full ml-[3.5rem] lg:ml-[6.5rem]">
        {title}
      </h2>

      <div className="flex justify-center items-center gap-3 w-full">
        <button
          type="button"
          aria-label={`Scroll ${title} left`}
          onClick={() => scrollByAmount(scrollRef, -1)}
          className="text-3xl hover:scale-125 transition-all duration-200 cursor-pointer h-[9rem] arrow-btn hidden lg:flex items-center justify-center"
        >
          <MdOutlineKeyboardArrowLeft />
        </button>

        <div
          ref={scrollRef}
          className={`
            grid grid-rows-1 ${rowClass} grid-flow-col justify-start
            overflow-x-auto scroll-hide items-center gap-3 lg:gap-2
            w-full px-3 lg:px-0 scroll-smooth
          `}
        >
          {songs.map((song, index) => (
            <SongGrid
              key={getId(song) ?? `song-${index}`}
              {...song}
              song={song}
              songs={queue}
              index={index}
            />
          ))}
        </div>

        <button
          type="button"
          aria-label={`Scroll ${title} right`}
          onClick={() => scrollByAmount(scrollRef, 1)}
          className="text-3xl hover:scale-125 transition-all duration-200 cursor-pointer h-[9rem] arrow-btn hidden lg:flex items-center justify-center"
        >
          <MdOutlineKeyboardArrowRight />
        </button>
      </div>
    </section>
  );
};

// =========================================================
// MAIN SECTION
// =========================================================

const MainSection = () => {
  const [trending, setTrending] = useState([]);
  const [latestSongs, setLatestSongs] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [artists, setArtists] = useState([]);
  const [playlists, setPlaylists] = useState([]);

  const [recentlyPlayedSongs, setRecentlyPlayedSongs] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ---------- RECENTLY PLAYED READER ----------
  const readRecentlyPlayed = useCallback(() => {
    try {
      const stored = localStorage.getItem("playedSongs");
      const parsed = stored ? JSON.parse(stored) : [];
      setRecentlyPlayedSongs(Array.isArray(parsed) ? parsed : []);
    } catch (err) {
      console.error("Unable to read recently played songs:", err);
      setRecentlyPlayedSongs([]);
    }
  }, []);

  useEffect(() => {
    readRecentlyPlayed();

    const onFocus = () => readRecentlyPlayed();
    const onStorage = (e) => {
      if (e.key === "playedSongs") readRecentlyPlayed();
    };

    window.addEventListener("focus", onFocus);
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("storage", onStorage);
    };
  }, [readRecentlyPlayed]);

  // ---------- COMBINED QUEUE (deduped) ----------
  const songList = useMemo(() => {
    const allSongs = [...recentlyPlayedSongs, ...trending, ...latestSongs];
    const uniqueSongs = [];
    const seen = new Set();

    for (const song of allSongs) {
      if (!song) continue;
      const id = getId(song);
      if (id == null) {
        uniqueSongs.push(song);
        continue;
      }
      if (!seen.has(id)) {
        seen.add(id);
        uniqueSongs.push(song);
      }
    }

    return uniqueSongs;
  }, [recentlyPlayedSongs, trending, latestSongs]);

  // ---------- GREETING ----------
  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return "Good Morning";
    if (h < 18) return "Good Afternoon";
    if (h < 21) return "Good Evening";
    return "Good Night";
  }, []);

  // ---------- FETCH ----------
  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      try {
        setLoading(true);
        setError("");

        const results = await Promise.allSettled([
          fetchplaylistsByID(HOME_PLAYLIST_IDS.trending),
          fetchplaylistsByID(HOME_PLAYLIST_IDS.latest),
          searchAlbumByQuery("Tamil, Malayalam"),
          searchPlayListByQuery("Tamil, Malayalam"),
        ]);

        if (!mounted) return;

        const [trendingRes, latestRes, albumRes, playlistRes] = results;

        setTrending(pickArray(trendingRes, ["data", "songs"]));
        setLatestSongs(pickArray(latestRes, ["data", "songs"]));
        setAlbums(pickArray(albumRes, ["data", "results"]));
        setPlaylists(pickArray(playlistRes, ["data", "results"]));

        // Artists — local data, no fetch needed
        if (Array.isArray(artistData?.results)) {
          setArtists(artistData.results);
        } else if (Array.isArray(artistData)) {
          setArtists(artistData);
        } else {
          setArtists([]);
        }

        // Surface a soft error only if EVERYTHING failed
        const allFailed = results.every(
          (r) => r.status === "rejected"
        );
        if (allFailed) {
          setError("Unable to load music data.");
        }
      } catch (err) {
        console.error("MainSection Error:", err);
        if (mounted) setError(err?.message || "Unable to load music data.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadData();

    return () => {
      mounted = false;
    };
  }, []);

  // ---------- LOADING ----------
  if (loading) {
    return (
      <div className="min-h-[60vh] w-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-gray-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-lg font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  // ---------- ERROR ----------
  if (error) {
    return (
      <div className="min-h-[60vh] w-full flex items-center justify-center px-5">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-500">
            Something went wrong
          </h2>
          <p className="mt-2 text-sm opacity-70">{error}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 px-5 py-2 rounded-lg bg-white text-black font-medium hover:opacity-80 transition"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // ---------- MAIN UI ----------
  return (
    <main
      className="
        mt-[5rem] mb-[2rem] pt-[3rem]
        lg:my-[4rem] lg:pt-5
        flex flex-col items-center
        overflow-x-clip gap-[0.3rem] w-full
      "
    >
      {/* GREETING */}
      <div className="hidden lg:block text-2xl w-full font-semibold lg:ml-[5.5rem] m-1">
        {greeting}
      </div>

      {/* RECENTLY PLAYED */}
      <SongCarousel
        title="Recently Played"
        songs={recentlyPlayedSongs}
        queue={songList}
        rows={1}
        hideIfEmpty
      />

      {/* NEW SONGS */}
      <SongCarousel
        title="New Songs"
        songs={latestSongs}
        queue={songList}
        rows={2}
      />

      <br />

      {/* TODAY TRENDING */}
      <SongCarousel
        title="Today Trending"
        songs={trending}
        queue={songList}
        rows={2}
      />

      <br />

      {/* TOP ALBUMS */}
      <section className="w-full">
        <h2 className="m-4 mt-0 text-xl lg:text-2xl font-semibold w-full ml-[1rem] lg:ml-[3rem]">
          Top Albums
        </h2>
        {albums.length > 0 ? (
          <AlbumSlider albums={albums} />
        ) : (
          <p className="px-5 opacity-60">No albums available.</p>
        )}
      </section>

      <br />

      {/* TOP ARTISTS */}
      <section className="w-full">
        <h2 className="pr-1 m-4 mt-0 text-xl lg:text-2xl font-semibold w-full ml-[1rem] lg:ml-[3.5rem]">
          Top Artists
        </h2>
        {artists.length > 0 ? (
          <ArtistSlider artists={artists} />
        ) : (
          <p className="px-5 opacity-60">No artists available.</p>
        )}
      </section>

      <br />

      {/* TOP PLAYLISTS */}
      <section className="w-full flex flex-col gap-3">
        <h2 className="m-1 text-xl lg:text-2xl font-semibold w-full ml-[1rem] lg:ml-[2.8rem]">
          Top Playlists
        </h2>
        {playlists.length > 0 ? (
          <PlaylistSlider playlists={playlists} />
        ) : (
          <p className="px-5 opacity-60">No playlists available.</p>
        )}
      </section>
    </main>
  );
};

export default MainSection;
