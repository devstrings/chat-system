import React, { useState, useEffect } from "react";
import API_BASE_URL from "../../config/api";

//  Profile Image Component
function ProfileImageWithAuth({ user, size = "w-16 h-16", ring = true }) {
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
      className={`${size} rounded-full overflow-hidden ${ring ? "ring-2 ring-gray-300" : ""}`}
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
        <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-2xl">
          {user?.username?.charAt(0)?.toUpperCase() || "U"}
        </div>
      )}
    </div>
  );
}

//  MAIN COMPONENT
export default function StatusRingsList({
  onOpenViewer,
  currentUserId,
  onCreateStatus,
  onViewMyStatus,
  currentUserForStatus,
}) {
  const [statusUpdates, setStatusUpdates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStatuses();
  }, []);

  const loadStatuses = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE_URL}/api/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();

      // Filter expired statuses
      const now = new Date();
      const filtered = data
        .map((userStatus) => ({
          ...userStatus,
          statuses: userStatus.statuses.filter(
            (s) => new Date(s.expiresAt) > now,
          ),
        }))
        .filter((u) => u.statuses.length > 0);

      const uniqueUsers = Object.values(
        filtered.reduce((acc, item) => {
          const userId = item.user._id;
          if (!acc[userId]) {
            acc[userId] = { user: item.user, statuses: [] };
          }
          acc[userId].statuses.push(...item.statuses);
          return acc;
        }, {}),
      );

      setStatusUpdates(uniqueUsers);
    } catch (err) {
      console.error(" Load statuses error:", err);
      setStatusUpdates([]);
    } finally {
      setLoading(false);
    }
  };

  const hasUnseenStatus = (userStatuses) => {
    if (!userStatuses?.statuses) return false;
    return userStatuses.statuses.some(
      (status) =>
        !status.viewedBy.some((view) => view.userId === currentUserId),
    );
  };

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse flex items-center gap-3">
          <div className="w-16 h-16 bg-gray-300 rounded-full" />
          <div className="flex-1">
            <div className="h-4 bg-gray-300 rounded w-3/4 mb-2" />
            <div className="h-3 bg-gray-300 rounded w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  const myStatus = statusUpdates.find((u) => u.user?._id === currentUserId);
  const othersStatuses = statusUpdates.filter(
    (u) => u.user._id !== currentUserId,
  );

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div
            className="relative cursor-pointer"
            onClick={() => {
              if (myStatus) {
                onViewMyStatus();
              } else {
                onCreateStatus();
              }
            }}
          >
            <ProfileImageWithAuth
              user={{
                username: currentUserForStatus?.username || "You",
                profileImage:
                  currentUserForStatus?.profileImage ||
                  myStatus?.user?.profileImage,
              }}
              size="w-14 sm:w-16 h-14 sm:h-16"
              ring={!!myStatus}
            />
            {!myStatus && (
              <div className="absolute bottom-0 right-0 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center border-2 border-white">
                <svg
                  className="w-3 h-3 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              </div>
            )}
          </div>

          <div
            className="flex-1 cursor-pointer"
            onClick={() => {
              if (myStatus) {
                onViewMyStatus();
              } else {
                onCreateStatus();
              }
            }}
          >
            <p className="text-sm text-gray-600">
              {myStatus ? (
                <span className="flex items-center gap-1">
                  <span className="font-semibold text-blue-600">
                    {myStatus.statuses.length}
                  </span>
                  {myStatus.statuses.length === 1 ? "status" : "statuses"}
                </span>
              ) : (
                "Tap to add status"
              )}
            </p>
          </div>
        </div>
      </div>

      {othersStatuses.length > 0 && (
        <div className="p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-3">
            Recent updates
          </p>
          <div className="space-y-3">
            {othersStatuses.map((userStatus) => {
              const isUnseen = hasUnseenStatus(userStatus);

              return (
                <div
                  key={userStatus.user._id}
                  className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors"
                  onClick={() => {
                    if (typeof onOpenViewer === "function") {
                      onOpenViewer(userStatus);
                    }
                  }}
                >
                  <div
                    className={`p-0.5 rounded-full ${
                      isUnseen
                        ? "bg-gradient-to-tr from-yellow-400 via-red-500 to-pink-500"
                        : "bg-gray-300"
                    }`}
                  >
                    <ProfileImageWithAuth
                      user={userStatus.user}
                      size="w-12 sm:w-14 h-12 sm:h-14"
                      ring={false}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {userStatus.user.username}
                    </p>
                    <p className="text-sm text-gray-600 flex items-center gap-1">
                      {userStatus.statuses.length > 1 && (
                        <span className="font-semibold text-blue-600">
                          {userStatus.statuses.length}
                        </span>
                      )}
                      {userStatus.statuses.length > 1 ? "statuses •" : ""}
                      <span className="text-xs">
                        {new Date(
                          userStatus.statuses[userStatus.statuses.length - 1]
                            .createdAt,
                        ).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {othersStatuses.length === 0 && !myStatus && (
        <div className="p-8 text-center">
          <svg
            className="w-12 h-12 mx-auto mb-3 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
          <p className="text-gray-600 text-sm">No status updates</p>
          <p className="text-gray-500 text-xs mt-1">Be the first to share!</p>
        </div>
      )}
    </div>
  );
}
