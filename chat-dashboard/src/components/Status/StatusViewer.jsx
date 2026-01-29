// StatusViewer.jsx - VIEWER ONLY
import React, { useState, useEffect, useRef } from "react";
import API_BASE_URL from "../../config/api";
//  Profile Image Component
function ProfileImageWithAuth({ user, size = "w-10 h-10", ring = false }) {
  const [imageSrc, setImageSrc] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadImage = async () => {
      if (!user?.profileImage) {
        setLoading(false);
        return;
      }

      try {
        let imageUrl = user.profileImage.trim();

        // External URLs
        const isExternal =
          imageUrl.startsWith("https://") &&
          (imageUrl.includes("googleusercontent.com") ||
            imageUrl.includes("graph.facebook.com") ||
            imageUrl.includes("fbsbx.com"));

        if (isExternal) {
          if (imageUrl.includes("googleusercontent.com")) {
            imageUrl = imageUrl.replace(/s\d+-c$/, "s400-c");
          }
          if (imageUrl.includes("graph.facebook.com")) {
            imageUrl = imageUrl.replace(/type=\w+/, "type=large");
          }
          setImageSrc(imageUrl);
          setLoading(false);
          return;
        }

        // Local images
        const token = localStorage.getItem("token");
        if (!token) {
          setLoading(false);
          return;
        }

        let filename = imageUrl.split("/").pop();
        const apiUrl = `${API_BASE_URL}/api/file/profile/${filename}?t=${Date.now()}`;

        const response = await fetch(apiUrl, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const blob = await response.blob();
          const objectUrl = URL.createObjectURL(blob);
          setImageSrc(objectUrl);
        }
      } catch (err) {
        console.error(" Image load error:", err);
      } finally {
        setLoading(false);
      }
    };

    loadImage();

    return () => {
      if (imageSrc && imageSrc.startsWith("blob:")) {
        URL.revokeObjectURL(imageSrc);
      }
    };
  }, [user?.profileImage]);

  return (
    <div
      className={`${size} rounded-full overflow-hidden ${ring ? "ring-2 ring-white" : "border-2 border-white"}`}
    >
      {loading ? (
        <div className="w-full h-full bg-gray-300 animate-pulse" />
      ) : imageSrc ? (
        <img
          src={imageSrc}
          alt={user?.username}
          className="w-full h-full object-cover"
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
          {user?.username?.charAt(0)?.toUpperCase() || "U"}
        </div>
      )}
    </div>
  );
}

//  MAIN VIEWER COMPONENT
export default function StatusViewer({
  statuses = [],
  currentUserId,
  onClose,
  initialUserIndex = 0,
}) {
  const [currentUserIndex, setCurrentUserIndex] = useState(initialUserIndex);
  const [currentStatusIndex, setCurrentStatusIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  const progressInterval = useRef(null);
  const statusDuration = 5000;

  const currentUserStatuses = statuses[currentUserIndex];
  const currentStatus = currentUserStatuses?.statuses?.[currentStatusIndex];

  useEffect(() => {
    //  If no status, clear and return
    if (!currentStatus) {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
        progressInterval.current = null;
      }
      return;
    }

    // If paused, just clear interval and keep progress
    if (isPaused) {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
        progressInterval.current = null;
      }
      return; // Don't reset progress!
    }

    //  Start/resume interval
    const interval = 50;
    const increment = (interval / statusDuration) * 100;

    progressInterval.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          if (progressInterval.current) {
            clearInterval(progressInterval.current);
            progressInterval.current = null;
          }

          setTimeout(() => handleNext(), 0); // Pause until next tick

          return 100; // Keep at 100%
        }
        return prev + increment;
      });
    }, interval);
    //  Cleanup
    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
        progressInterval.current = null;
      }
    };
  }, [
    currentUserIndex,
    currentStatusIndex,
    isPaused,
    currentStatus,
    statusDuration,
  ]);
  useEffect(() => {
    if (!currentStatus) return;

    const markAsViewed = async () => {
      try {
        const token = localStorage.getItem("token");
        await fetch(`${API_BASE_URL}/api/status/${currentStatus._id}/view`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
      } catch (err) {
        console.error("Mark as viewed error:", err);
      }
    };

    if (currentStatus.userId._id !== currentUserId) {
      markAsViewed();
    }
  }, [currentStatus?._id]);
  const handleNext = () => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }

    if (!currentUserStatuses || !currentUserStatuses.statuses) return;

    const totalStatuses = currentUserStatuses.statuses.length;

    if (currentStatusIndex < totalStatuses - 1) {
      setCurrentStatusIndex((prev) => prev + 1);
      setProgress(0);
    } else if (currentUserIndex < statuses.length - 1) {
      setCurrentUserIndex((prev) => prev + 1);
      setCurrentStatusIndex(0);
      setProgress(0);
    } else {
      setTimeout(() => onClose(), 0);
    }
  };
  const handlePrevious = () => {
    if (!currentUserStatuses || !currentUserStatuses.statuses) return;
    if (currentStatusIndex > 0) {
      setCurrentStatusIndex((prev) => prev - 1);
      setProgress(0);
    } else if (currentUserIndex > 0) {
      setCurrentUserIndex((prev) => prev - 1);
      const prevUserStatuses = statuses[currentUserIndex - 1].statuses;
      setCurrentStatusIndex(prevUserStatuses.length - 1);
      setProgress(0);
    }
  };

  const handlePauseToggle = () => {
    setIsPaused((prev) => !prev);
  };
  const handleTouchStart = () => {
    setIsPaused(true);
  };

  const handleTouchEnd = () => {
    setIsPaused(false);
  };

  const formatTime = (date) => {
    if (!date) return "";
    const now = new Date();
    const statusDate = new Date(date);
    const diff = now - statusDate;

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days}d ago`;

    return statusDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  if (!currentStatus || !currentUserStatuses) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
      {/* Progress Bars */}
      <div className="absolute top-0 left-0 right-0 flex gap-1 p-2 sm:p-3 z-10">
        {currentUserStatuses.statuses.map((_, idx) => (
          <div
            key={idx}
            className="flex-1 h-1 sm:h-0.5 bg-white/20 rounded-full overflow-hidden backdrop-blur-sm"
          >
            <div
              className={`h-full transition-all duration-100 ${
                idx < currentStatusIndex
                  ? "bg-white"
                  : idx === currentStatusIndex
                    ? "bg-white"
                    : "bg-white/0"
              }`}
              style={{
                width:
                  idx < currentStatusIndex
                    ? "100%"
                    : idx === currentStatusIndex
                      ? `${progress}%`
                      : "0%",
              }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="absolute top-4 left-0 right-0 px-4 z-10 flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3">
          <ProfileImageWithAuth
            user={currentUserStatuses.user}
            size="w-8 sm:w-10 h-8 sm:h-10"
            ring={false}
          />
          <div className="flex-1">
            <p className="text-white font-semibold">
              {currentUserStatuses.user.username}
            </p>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-white/80">
                {formatTime(currentStatus.createdAt)}
              </span>
              <span className="text-white/60">•</span>
              <span className="text-white/80 text-[10px] sm:text-xs">
                {currentStatusIndex + 1}/{currentUserStatuses.statuses.length}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePauseToggle}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            {isPaused ? (
              <svg
                className="w-6 h-6 text-white"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            ) : (
              <svg
                className="w-6 h-6 text-white"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
            )}
          </button>

          <button
            onClick={() => setShowInfo(!showInfo)}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
              />
            </svg>
          </button>

          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Status Content */}
      <div className="relative w-full h-full flex items-center justify-center">
        {/* LEFT: Previous */}
        <div
          className="absolute left-0 top-0 bottom-0 w-1/3 cursor-pointer z-20"
          onClick={handlePrevious}
        />

        {/* CENTER: Pause/Resume on tap */}
        <div
          className="absolute left-1/3 right-1/3 top-0 bottom-0 cursor-pointer z-20"
          onClick={handlePauseToggle}
        />

        {/* RIGHT: Next */}
        <div
          className="absolute right-0 top-0 bottom-0 w-1/3 cursor-pointer z-20"
          onClick={handleNext}
        />
        <div
          className="w-full h-full flex items-center justify-center"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {currentStatus.type === "text" ? (
            <div
              className="w-full h-full flex items-center justify-center p-8"
              style={{
                backgroundColor: currentStatus.backgroundColor,
                color: currentStatus.textColor,
                fontFamily: currentStatus.font,
              }}
            >
              <div className="max-w-2xl text-center">
                <p className="text-4xl font-bold break-words">
                  {currentStatus.content}
                </p>
                {currentStatus.caption && (
                  <p className="mt-4 text-xl opacity-90">
                    {currentStatus.caption}
                  </p>
                )}
              </div>
            </div>
          ) : currentStatus.type === "image" ? (
            <div className="relative w-full h-full">
              <img
                src={`${API_BASE_URL}${currentStatus.content}`}
                alt="status"
                className="w-full h-full object-contain"
              />
              {currentStatus.caption && (
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent">
                  <p className="text-white text-lg text-center">
                    {currentStatus.caption}
                  </p>
                </div>
              )}
            </div>
          ) : currentStatus.type === "video" ? (
            <div className="relative w-full h-full">
              <video
                src={`${API_BASE_URL}${currentStatus.content}`}
                className="w-full h-full object-contain"
                autoPlay
                muted
                onEnded={() => {
                  if (progressInterval.current) {
                    clearInterval(progressInterval.current);
                  }
                  setTimeout(() => handleNext(), 0);
                }}
              />
              {currentStatus.caption && (
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent">
                  <p className="text-white text-lg text-center">
                    {currentStatus.caption}
                  </p>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {showInfo && (
        <div className="absolute bottom-0 left-0 right-0 bg-black/90 backdrop-blur-sm p-6 z-30">
          <div className="max-w-2xl mx-auto">
            <h3 className="text-white font-bold mb-3">Status Info</h3>
            <div className="space-y-2 text-white/80 text-sm">
              <p>Type: {currentStatus.type}</p>
              <p>
                Posted: {new Date(currentStatus.createdAt).toLocaleString()}
              </p>
              <p>
                Expires: {new Date(currentStatus.expiresAt).toLocaleString()}
              </p>
              {currentStatus.viewedBy && (
                <p>Views: {currentStatus.viewedBy.length}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
