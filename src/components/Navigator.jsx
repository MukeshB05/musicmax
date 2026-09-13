import { GoHome, GoHomeFill } from "react-icons/go";
import { IoHeartOutline, IoHeartSharp } from "react-icons/io5";
import { RiFolderMusicFill, RiFolderMusicLine } from "react-icons/ri";
import { MdLiveTv } from "react-icons/md";
import { useState, useEffect } from "react"; // Keep useState and useEffect
import { Link, useLocation } from "react-router-dom";

const Navigator = () => {
  const location = useLocation();
  const [showTVModal, setShowTVModal] = useState(false);
  const [wakeLockStatus, setWakeLockStatus] = useState("Inactive");
  const [wakeLock, setWakeLock] = useState(null);

  const openTVModal = () => {
    setShowTVModal(true);
    setWakeLockStatus("Active"); // Set status to Active when iframe is opened
  };
  const closeTVModal = () => {
    setShowTVModal(false);
    if (wakeLock) {
      wakeLock.release();
      setWakeLock(null);
      setWakeLockStatus("Inactive");
    }
  };

  const requestWakeLock = async () => {
    try {
      if ("wakeLock" in navigator) {
        const lock = await navigator.wakeLock.request("screen");
        setWakeLock(lock);
        setWakeLockStatus("Active");
        lock.addEventListener("release", () => {
          setWakeLockStatus("Inactive");
        });
      } else {
        setWakeLockStatus("Not Supported");
      }
    } catch (err) {
      console.error("Wake Lock request failed:", err);
      setWakeLockStatus("Failed");
    }
  };

  const releaseWakeLock = () => {
    if (wakeLock) {
      wakeLock.release();
      setWakeLock(null);
      setWakeLockStatus("Inactive");
    }
  };

  const handleLiveTvClick = () => {
    requestWakeLock();
    openTVModal();
  };

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && !wakeLock) {
        requestWakeLock();
        setWakeLockStatus("Active");
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [wakeLock]);

  return (
    <>
      <div className="lg:hidden fixed bottom-0 z-20 w-full Navigator h-[3.6rem] lg:h-[3.5rem] flex items-center justify-around bg-white border-t border-gray-200">
        {/* Home Link */}
        <Link to="/">
          <div className="flex flex-col items-center text-sm">
            {location.pathname === "/" ? (
              <GoHomeFill className="text-2xl" />
            ) : (
              <GoHome className="text-2xl" />
            )}
            Home
          </div>
        </Link>

        {/* Playlist Link */}
        <Link to="/Playlist">
          <div className="flex flex-col items-center text-sm">
            {location.pathname === "/Playlist" ? (
              <RiFolderMusicFill className="text-2xl" />
            ) : (
              <RiFolderMusicLine className="text-2xl" />
            )}
            Playlist
          </div>
        </Link>

        {/* Favourite Link */}
        <Link to="/Favourite">
          <div className="flex flex-col items-center text-sm">
            {location.pathname === "/Favourite" ? (
              <IoHeartSharp className="text-2xl" />
            ) : (
              <IoHeartOutline className="text-2xl" />
            )}
            Favourite
          </div>
        </Link>

        {/* Live TV Button with Status Indicator */}
        <button onClick={handleLiveTvClick} className="relative flex flex-col items-center text-sm">
          <div className="flex items-center space-x-2">
            <MdLiveTv className="text-2xl" />
            {wakeLockStatus === "Active" && (
              <span className="text-xs text-green-500 font-semibold">Active</span>
            )}
          </div>
          <span>Live TV</span>
        </button>

        {/* Optional: Remove or comment out the wake lock status button below */}
        {/*
        <div className="flex flex-col items-center text-sm px-2">
          <button
            className="flex items-center space-x-2"
            onClick={
              wakeLock ? releaseWakeLock : requestWakeLock
            }
          >
            <MdLiveTv className="text-2xl" />
            <span className="text-xs font-semibold">
              {wakeLockStatus}
            </span>
          </button>
        </div>
        */}
      </div>

      {showTVModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
          <div className="relative w-full h-full max-w-4xl max-h-[80vh] bg-black">
            <button
              className="absolute -top-10 right-0 text-white text-2xl z-10 p-2"
              onClick={closeTVModal}
            >
              × Close
            </button>
            <iframe
              src="https://dreamplay.pages.dev/"
              className="w-full h-full border-none"
              title="Dreamly5 Live TV"
              allowFullScreen
              frameBorder="0"
              scrolling="yes"
              style={{ overflow: "hidden" }}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default Navigator;
