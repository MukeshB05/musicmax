const API_URL = "https://jiosaavndev.vercel.app/api";

// Make sure the API URL exists
if (!API_URL) {
  console.error("API URL is missing");
}

// Common API request helper
const apiRequest = async (endpoint) => {
  try {
    const response = await fetch(`${API_URL}${endpoint}`);

    // Read response as text first so HTML/non-JSON errors don't crash JSON parsing
    const text = await response.text();

    let data;

    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      throw new Error(
        `API returned invalid JSON (${response.status} ${response.statusText})`
      );
    }

    if (!response.ok) {
      throw new Error(
        data?.message ||
          data?.error ||
          `API request failed: ${response.status} ${response.statusText}`
      );
    }

    return data;
  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
};

// Encode search/query parameters safely
const encode = (value) => encodeURIComponent(String(value ?? ""));

// ----------------------------------------------------
// Song Suggestions
// ----------------------------------------------------
export const getSuggestionSong = async (id) => {
  if (!id) {
    throw new Error("Song ID is required");
  }

  return apiRequest(
    `/songs/${encode(id)}/suggestions?limit=150`
  );
};

// ----------------------------------------------------
// General Search
// ----------------------------------------------------
export const getSearchData = async (query) => {
  if (!query) {
    throw new Error("Search query is required");
  }

  return apiRequest(
    `/search?query=${encode(query)}&limit=150`
  );
};

// ----------------------------------------------------
// Search Songs
// ----------------------------------------------------
export const getSongbyQuery = async (query, limit = 50) => {
  if (!query) {
    throw new Error("Song search query is required");
  }

  return apiRequest(
    `/search/songs?query=${encode(query)}&limit=${Number(limit) || 50}`
  );
};

// ----------------------------------------------------
// Search Artists
// ----------------------------------------------------
export const getArtistbyQuery = async (query, limit = 50) => {
  if (!query) {
    throw new Error("Artist search query is required");
  }

  return apiRequest(
    `/search/artists?query=${encode(query)}&limit=${Number(limit) || 50}`
  );
};

// ----------------------------------------------------
// Get Song By ID
// ----------------------------------------------------
export const getSongById = async (songId) => {
  if (!songId) {
    throw new Error("Song ID is required");
  }

  return apiRequest(`/songs/${encode(songId)}`);
};

// ----------------------------------------------------
// Search Albums
// ----------------------------------------------------
export const searchAlbumByQuery = async (query) => {
  if (!query) {
    throw new Error("Album search query is required");
  }

  return apiRequest(
    `/search/albums?query=${encode(query)}&limit=130`
  );
};

// ----------------------------------------------------
// Search Artists
// ----------------------------------------------------
export const searchArtistByQuery = async (query) => {
  if (!query) {
    throw new Error("Artist search query is required");
  }

  return apiRequest(
    `/search/artists?query=${encode(query)}&limit=130`
  );
};

// ----------------------------------------------------
// Get Album By ID
// ----------------------------------------------------
export const fetchAlbumByID = async (ID) => {
  if (!ID) {
    throw new Error("Album ID is required");
  }

  return apiRequest(
    `/albums?id=${encode(ID)}&limit=130`
  );
};

// ----------------------------------------------------
// Get Artist By ID
// ----------------------------------------------------
export const fetchArtistByID = async (ID) => {
  if (!ID) {
    throw new Error("Artist ID is required");
  }

  return apiRequest(
    `/artists?id=${encode(ID)}`
  );
};

// ----------------------------------------------------
// Search Playlists
// ----------------------------------------------------
export const searchPlayListByQuery = async (query) => {
  if (!query) {
    throw new Error("Playlist search query is required");
  }

  return apiRequest(
    `/search/playlists?query=${encode(query)}&limit=130`
  );
};

// ----------------------------------------------------
// Get Playlist By ID
// ----------------------------------------------------
export const fetchplaylistsByID = async (ID) => {
  if (!ID) {
    throw new Error("Playlist ID is required");
  }

  return apiRequest(
    `/playlists?id=${encode(ID)}&limit=130`
  );
};

// ----------------------------------------------------
// Get Song Suggestions By ID
// ----------------------------------------------------
// IMPORTANT:
// Your old code was calling:
// https://jiosaavndev.vercel.app/api/?id=ID
//
// That is almost certainly the wrong endpoint.
// Use /songs/{ID}/suggestions instead.
export const fetchSongSuggestionsByID = async (ID) => {
  if (!ID) {
    throw new Error("Song ID is required");
  }

  return apiRequest(
    `/songs/${encode(ID)}/suggestions?limit=130`
  );
};

// ----------------------------------------------------
// Lyrics By ID
// ----------------------------------------------------
export const LyricsByID = async (ID) => {
  if (!ID) {
    throw new Error("Song ID is required");
  }

  return apiRequest(
    `/songs/${encode(ID)}/lyrics`
  );
};
