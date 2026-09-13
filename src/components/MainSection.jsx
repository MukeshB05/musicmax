import { useEffect, useMemo, useRef, useState } from "react";

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

const MainSection = () => {
  // =========================================================
  // STATE
  // =========================================================

  const [trending, setTrending] = useState([]);
  const [latestSongs, setLatestSongs] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [artists, setArtists] = useState([]);
  const [playlists, setPlaylists] = useState([]);

  const [recentlyPlayedSongs, setRecentlyPlayedSongs] =
    useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // =========================================================
  // REFS
  // =========================================================

  const recentlyPlayedScrollRef = useRef(null);
  const latestSongsScrollRef = useRef(null);
  const trendingScrollRef = useRef(null);

  // =========================================================
  // READ RECENTLY PLAYED
  // =========================================================

  const loadRecentlyPlayed = () => {
    try {
      const storedSongs =
        localStorage.getItem("playedSongs");

      if (!storedSongs) {
        setRecentlyPlayedSongs([]);
        return;
      }

      const parsedSongs = JSON.parse(storedSongs);

      if (!Array.isArray(parsedSongs)) {
        setRecentlyPlayedSongs([]);
        return;
      }

      setRecentlyPlayedSongs(parsedSongs);
    } catch (err) {
      console.error(
        "Unable to read recently played songs:",
        err
      );

      setRecentlyPlayedSongs([]);
    }
  };

  // =========================================================
  // INITIAL RECENTLY PLAYED LOAD
  // =========================================================

  useEffect(() => {
    loadRecentlyPlayed();

    const handleStorage = () => {
      loadRecentlyPlayed();
    };

    window.addEventListener(
      "storage",
      handleStorage
    );

    return () => {
      window.removeEventListener(
        "storage",
        handleStorage
      );
    };
  }, []);

  // =========================================================
  // COMBINE SONGS
  // =========================================================

  const songList = useMemo(() => {
    const allSongs = [
      ...recentlyPlayedSongs,
      ...trending,
      ...latestSongs,
    ];

    const uniqueSongs = [];
    const songIds = new Set();

    for (const song of allSongs) {
      if (!song) {
        continue;
      }

      const id =
        song.id ??
        song.songId ??
        song.trackId;

      // Songs without an ID are still allowed
      if (id === undefined || id === null) {
        uniqueSongs.push(song);
        continue;
      }

      const stringId = String(id);

      if (!songIds.has(stringId)) {
        songIds.add(stringId);
        uniqueSongs.push(song);
      }
    }

    return uniqueSongs;
  }, [
    recentlyPlayedSongs,
    trending,
    latestSongs,
  ]);

  // =========================================================
  // SCROLL LEFT
  // =========================================================

  const scrollLeft = (ref) => {
    if (!ref?.current) {
      return;
    }

    ref.current.scrollBy({
      left: -800,
      behavior: "smooth",
    });
  };

  // =========================================================
  // SCROLL RIGHT
  // =========================================================

  const scrollRight = (ref) => {
    if (!ref?.current) {
      return;
    }

    ref.current.scrollBy({
      left: 800,
      behavior: "smooth",
    });
  };

  // =========================================================
  // GREETING
  // =========================================================

  const getGreeting = () => {
    const hour = new Date().getHours();

    if (hour < 12) {
      return "Good Morning";
    }

    if (hour < 18) {
      return "Good Afternoon";
    }

    if (hour < 21) {
      return "Good Evening";
    }

    return "Good Night";
  };

  // =========================================================
  // FETCH DATA
  // =========================================================

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      try {
        setLoading(true);
        setError("");

        const [
          trendingResponse,
          latestResponse,
          albumResponse,
          playlistResponse,
        ] = await Promise.all([
          fetchplaylistsByID(10763385),
          fetchplaylistsByID(80802063),
          searchAlbumByQuery(
            "Tamil, Malayalam"
          ),
          searchPlayListByQuery(
            "Tamil, Malayalam"
          ),
        ]);

        if (!mounted) {
          return;
        }

        // =====================================================
        // TRENDING
        // =====================================================

        const trendingSongs =
          trendingResponse?.data?.songs;

        setTrending(
          Array.isArray(trendingSongs)
            ? trendingSongs
            : []
        );

        // =====================================================
        // LATEST SONGS
        // =====================================================

        const newSongs =
          latestResponse?.data?.songs;

        setLatestSongs(
          Array.isArray(newSongs)
            ? newSongs
            : []
        );

        // =====================================================
        // ALBUMS
        // =====================================================

        const albumResults =
          albumResponse?.data?.results;

        setAlbums(
          Array.isArray(albumResults)
            ? albumResults
            : []
        );

        // =====================================================
        // PLAYLISTS
        // =====================================================

        const playlistResults =
          playlistResponse?.data?.results;

        setPlaylists(
          Array.isArray(playlistResults)
            ? playlistResults
            : []
        );

        // =====================================================
        // ARTISTS
        // =====================================================

        if (
          Array.isArray(
            artistData?.results
          )
        ) {
          setArtists(
            artistData.results
          );
        } else if (
          Array.isArray(artistData)
        ) {
          setArtists(artistData);
        } else {
          setArtists([]);
        }
      } catch (err) {
        console.error(
          "MainSection Error:",
          err
        );

        if (mounted) {
          setError(
            err?.message ||
              "Unable to load music data. Please try again."
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      mounted = false;
    };
  }, []);

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <div className="min-h-[60vh] w-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-gray-400 border-t-transparent rounded-full animate-spin" />

          <p className="text-lg font-medium">
            Loading...
          </p>
        </div>
      </div>
    );
  }

  // =========================================================
  // ERROR
  // =========================================================

  if (error) {
    return (
      <div className="min-h-[60vh] w-full flex items-center justify-center px-5">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-semibold text-red-500">
            Something went wrong
          </h2>

          <p className="mt-2 text-sm opacity-70 break-words">
            {error}
          </p>

          <button
            type="button"
            onClick={() =>
              window.location.reload()
            }
            className="
              mt-5
              px-5
              py-2
              rounded-lg
              bg-white
              text-black
              font-medium
              hover:opacity-80
              transition
            "
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // =========================================================
  // MAIN UI
  // =========================================================

  return (
    <main
      className="
        pt-[3rem]
        lg:pt-5
        my-[2rem]
        mt-[5rem]
        lg:my-[4rem]
        flex
        flex-col
        items-center
        overflow-x-clip
        gap-[0.3rem]
        w-full
      "
    >
      {/* =====================================================
          GREETING
      ====================================================== */}

      <div
        className="
          hidden
          lg:block
          text-2xl
          w-full
          font-semibold
          lg:ml-[5.5rem]
          m-1
        "
      >
        {getGreeting()}
      </div>

      {/* =====================================================
          RECENTLY PLAYED
      ====================================================== */}

      {recentlyPlayedSongs.length > 0 && (
        <section className="flex flex-col justify-center items-center w-full">
          <h2
            className="
              m-4
              mt-0
              text-xl
              lg:text-2xl
              font-semibold
              w-full
              ml-[3.5rem]
              lg:ml-[6.5rem]
            "
          >
            Recently Played
          </h2>

          <div className="flex justify-center items-center gap-3 w-full">
            <button
              type="button"
              aria-label="Scroll recently played left"
              onClick={() =>
                scrollLeft(
                  recentlyPlayedScrollRef
                )
              }
              className="
                text-3xl
                hover:scale-125
                transition-all
                duration-200
                cursor-pointer
                h-[9rem]
                arrow-btn
                hidden
                lg:flex
                items-center
                justify-center
              "
            >
              <MdOutlineKeyboardArrowLeft />
            </button>

            <div
              ref={recentlyPlayedScrollRef}
              className="
                grid
                grid-rows-1
                grid-flow-col
                justify-start
                overflow-x-auto
                scroll-hide
                items-center
                gap-3
                lg:gap-2
                w-full
                px-3
                lg:px-0
                scroll-smooth
              "
            >
              {recentlyPlayedSongs.map(
                (song, index) => (
                  <SongGrid
                    key={
                      song?.id ??
                      song?.songId ??
                      index
                    }
                    {...song}
                    song={songList}
                  />
                )
              )}
            </div>

            <button
              type="button"
              aria-label="Scroll recently played right"
              onClick={() =>
                scrollRight(
                  recentlyPlayedScrollRef
                )
              }
              className="
                text-3xl
                hover:scale-125
                transition-all
                duration-200
                cursor-pointer
                h-[9rem]
                arrow-btn
                hidden
                lg:flex
                items-center
                justify-center
              "
            >
              <MdOutlineKeyboardArrowRight />
            </button>
          </div>
        </section>
      )}

      {/* =====================================================
          NEW SONGS
      ====================================================== */}

      <section className="flex flex-col items-center w-full">
        <h2
          className="
            m-4
            text-xl
            lg:text-2xl
            font-semibold
            w-full
            ml-[3.5rem]
            lg:ml-[6.5rem]
          "
        >
          New Songs
        </h2>

        <div className="flex justify-center items-center gap-3 w-full">
          <button
            type="button"
            aria-label="Scroll new songs left"
            onClick={() =>
              scrollLeft(
                latestSongsScrollRef
              )
            }
            className="
              text-3xl
              hover:scale-125
              transition-all
              duration-200
              cursor-pointer
              h-[9rem]
              arrow-btn
              hidden
              lg:flex
              items-center
              justify-center
            "
          >
            <MdOutlineKeyboardArrowLeft />
          </button>

          <div
            ref={latestSongsScrollRef}
            className="
              grid
              grid-rows-1
              lg:grid-rows-2
              grid-flow-col
              justify-start
              overflow-x-auto
              scroll-hide
              items-center
              gap-3
              lg:gap-2
              w-full
              px-3
              lg:px-0
              scroll-smooth
            "
          >
            {latestSongs.map(
              (song, index) => (
                <SongGrid
                  key={
                    song?.id ??
                    song?.songId ??
                    index
                  }
                  {...song}
                  song={songList}
                />
              )
            )}
          </div>

          <button
            type="button"
            aria-label="Scroll new songs right"
            onClick={() =>
              scrollRight(
                latestSongsScrollRef
              )
            }
            className="
              text-3xl
              hover:scale-125
              transition-all
              duration-200
              cursor-pointer
              h-[9rem]
              arrow-btn
              hidden
              lg:flex
              items-center
              justify-center
            "
          >
            <MdOutlineKeyboardArrowRight />
          </button>
        </div>
      </section>

      <br />

      {/* =====================================================
          TODAY TRENDING
      ====================================================== */}

      <section className="flex flex-col justify-center items-center w-full">
        <h2
          className="
            m-4
            mt-0
            text-xl
            lg:text-2xl
            font-semibold
            w-full
            ml-[3.5rem]
            lg:ml-[6.5rem]
          "
        >
          Today Trending
        </h2>

        <div className="flex justify-center items-center gap-3 w-full">
          <button
            type="button"
            aria-label="Scroll trending songs left"
            onClick={() =>
              scrollLeft(
                trendingScrollRef
              )
            }
            className="
              text-3xl
              hover:scale-125
              transition-all
              duration-200
              cursor-pointer
              h-[9rem]
              arrow-btn
              hidden
              lg:flex
              items-center
              justify-center
            "
          >
            <MdOutlineKeyboardArrowLeft />
          </button>

          <div
            ref={trendingScrollRef}
            className="
              grid
              grid-rows-1
              sm:grid-rows-2
              grid-flow-col
              justify-start
              overflow-x-auto
              scroll-hide
              items-center
              gap-3
              lg:gap-2
              w-full
              px-3
              lg:px-0
              scroll-smooth
            "
          >
            {trending.map(
              (song, index) => (
                <SongGrid
                  key={
                    song?.id ??
                    song?.songId ??
                    index
                  }
                  {...song}
                  song={songList}
                />
              )
            )}
          </div>

          <button
            type="button"
            aria-label="Scroll trending songs right"
            onClick={() =>
              scrollRight(
                trendingScrollRef
              )
            }
            className="
              text-3xl
              hover:scale-125
              transition-all
              duration-200
              cursor-pointer
              h-[9rem]
              arrow-btn
              hidden
              lg:flex
              items-center
              justify-center
            "
          >
            <MdOutlineKeyboardArrowRight />
          </button>
        </div>
      </section>

      <br />

      {/* =====================================================
          TOP ALBUMS
      ====================================================== */}

      <section className="w-full">
        <h2
          className="
            m-4
            mt-0
            text-xl
            lg:text-2xl
            font-semibold
            w-full
            ml-[1rem]
            lg:ml-[3rem]
          "
        >
          Top Albums
        </h2>

        {albums.length > 0 ? (
          <AlbumSlider albums={albums} />
        ) : (
          <p className="px-5 opacity-60">
            No albums available.
          </p>
        )}
      </section>

      <br />

      {/* =====================================================
          TOP ARTISTS
      ====================================================== */}

      <section className="w-full">
        <h2
          className="
            pr-1
            m-4
            mt-0
            text-xl
            lg:text-2xl
            font-semibold
            w-full
            ml-[1rem]
            lg:ml-[3.5rem]
          "
        >
          Top Artists
        </h2>

        {artists.length > 0 ? (
          <ArtistSlider artists={artists} />
        ) : (
          <p className="px-5 opacity-60">
            No artists available.
          </p>
        )}
      </section>

      <br />

      {/* =====================================================
          TOP PLAYLISTS
      ====================================================== */}

      <section className="w-full flex flex-col gap-3">
        <h2
          className="
            m-1
            text-xl
            lg:text-2xl
            font-semibold
            w-full
            ml-[1rem]
            lg:ml-[2.8rem]
          "
        >
          Top Playlists
        </h2>

        {playlists.length > 0 ? (
          <PlaylistSlider
            playlists={playlists}
          />
        ) : (
          <p className="px-5 opacity-60">
            No playlists available.
          </p>
        )}
      </section>
    </main>
  );
};

export default MainSection;
