import React, { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { checkAuth, logout } from "@/store/slices/authSlice";
import { Navigate, useNavigate } from "react-router-dom";
import Sidebar from "@/components/SideBar";
import ProfileSetting from "@/components/ProfileSetting";
import StatusManager from "@/components/Status/StatusManager";
import StatusViewer from "@/components/Status/StatusViewer";
import AlertDialog from "@/components/base/AlertDialog";
import { setUser } from "@/store/slices/authSlice";
import { updateGroup } from "@/store/slices/groupSlice";
import {
  archiveConversation,
  pinConversation,
  deleteConversation,
  setSelectedUserId,
} from "@/store/slices/chatSlice";
import {
  loadAllStatuses,
  loadPinnedConversations,
  loadArchivedConversations,
} from "@/actions/dashboard.actions";

export default function Middleware({ children }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, currentUser, currentUserId } = useSelector(
    (state) => state.auth,
  );
  const selectedUserId = useSelector((state) => state.chat.selectedUserId);
  const { groups } = useSelector((state) => state.group);
  const { lastMessages } = useSelector((state) => state.chat);
  const fetchInitiated = useRef(false);

  const accessToken = localStorage.getItem("accessToken");
  const refreshToken = localStorage.getItem("refreshToken");

  // Sidebar state
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [pinnedConversations, setPinnedConversations] = useState(new Set());
  const [archivedConversations, setArchivedConversations] = useState(new Set());

  // Profile settings state
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [profileSettingsView, setProfileSettingsView] = useState("all");
  const [sharedProfileImage, setSharedProfileImage] = useState(null);
  const [sharedCoverPhoto, setSharedCoverPhoto] = useState(null);

  // Status state
  const [allStatuses, setAllStatuses] = useState([]);
  const [showStatusManager, setShowStatusManager] = useState(false);
  const [statusManagerMode, setStatusManagerMode] = useState("create");
  const [showStatusViewer, setShowStatusViewer] = useState(false);
  const [statusViewerIndex, setStatusViewerIndex] = useState(0);

  // Alert dialog
  const [alertDialog, setAlertDialog] = useState({
    isOpen: false,
    title: "",
    message: "",
    type: "info",
  });

  // Auth check
  useEffect(() => {
    if (
      (accessToken || refreshToken) &&
      !currentUser &&
      !fetchInitiated.current
    ) {
      fetchInitiated.current = true;
      dispatch(checkAuth());
    }
  }, [dispatch, currentUser]);

  // Load pinned conversations
  useEffect(() => {
    if (!currentUserId) return;
    const load = async () => {
      try {
        const pinnedIdsArray = await loadPinnedConversations();
        setPinnedConversations(new Set(pinnedIdsArray));
      } catch (err) {
        console.error("Failed to load pinned conversations:", err);
      }
    };
    load();
  }, [currentUserId]);

  // Load archived conversations
  useEffect(() => {
    if (!currentUserId) return;
    const load = async () => {
      try {
        const archivedIdsArray = await loadArchivedConversations();
        setArchivedConversations(new Set(archivedIdsArray));
      } catch (err) {
        console.error("Failed to load archived conversations:", err);
      }
    };
    load();
  }, [currentUserId]);

  // Load archived groups
  useEffect(() => {
    if (!groups || groups.length === 0) return;
    const archivedGroupIds = groups
      .filter((g) => g.archivedBy?.some((a) => a.userId === currentUserId))
      .map((g) => g._id);
    setArchivedConversations((prev) => {
      const newSet = new Set(prev);
      archivedGroupIds.forEach((id) => newSet.add(id));
      return newSet;
    });
  }, [groups, currentUserId]);

  // Load all statuses
  useEffect(() => {
    if (!currentUserId) return;
    const load = async () => {
      try {
        const data = await loadAllStatuses();
        setAllStatuses(data);
      } catch (err) {
        console.error("Load statuses error:", err);
      }
    };
    load();
  }, [currentUserId]);

  // Handlers
  const handleLogout = () => {
    localStorage.removeItem("selectedUserId");
    localStorage.removeItem("selectedGroupId");
    localStorage.removeItem("isGroupChat");
    dispatch(logout());
    navigate("/login", { replace: true });
  };

  const handleProfileImageUpdate = (newImageUrl, isCoverPhoto = false) => {
    if (isCoverPhoto) {
      setSharedCoverPhoto(newImageUrl);
      dispatch(setUser({ ...currentUser, coverPhoto: newImageUrl }));
    } else {
      setSharedProfileImage(newImageUrl);
      dispatch(setUser({ ...currentUser, profileImage: newImageUrl }));
    }
  };

  const handleArchiveConversation = async (conversationId, isArchived) => {
    try {
      const isGroup = groups.some((g) => g._id === conversationId);
      const result = await dispatch(
        archiveConversation({ conversationId, isArchived, isGroup }),
      ).unwrap();

      if (result.isArchived) {
        setArchivedConversations((prev) => new Set([...prev, conversationId]));
      } else {
        setArchivedConversations((prev) => {
          const newSet = new Set(prev);
          newSet.delete(conversationId);
          return newSet;
        });
      }

      setAlertDialog({
        isOpen: true,
        title: result.isArchived
          ? isGroup
            ? "Group Archived"
            : "Chat Archived"
          : isGroup
            ? "Group Unarchived"
            : "Chat Unarchived",
        message: result.isArchived
          ? isGroup
            ? "Group has been moved to archive."
            : "Chat has been moved to archive."
          : isGroup
            ? "Group has been restored to main list."
            : "Chat has been restored to main list.",
        type: "success",
      });
    } catch (err) {
      setAlertDialog({
        isOpen: true,
        title: "Error",
        message: err.message || "Failed to update archive status",
        type: "error",
      });
    }
  };

  const handlePinConversation = async (conversationId, isPinned) => {
    try {
      const isGroup = groups.some((g) => g._id === conversationId);
      const result = await dispatch(
        pinConversation({ conversationId, isPinned, isGroup }),
      ).unwrap();

      if (result.isPinned) {
        setPinnedConversations((prev) => new Set([...prev, conversationId]));
      } else {
        setPinnedConversations((prev) => {
          const newSet = new Set(prev);
          newSet.delete(conversationId);
          return newSet;
        });
      }

      setAlertDialog({
        isOpen: true,
        title: result.isPinned
          ? isGroup
            ? "Group Pinned"
            : "Chat Pinned"
          : isGroup
            ? "Group Unpinned"
            : "Chat Unpinned",
        message: result.isPinned
          ? isGroup
            ? "Group has been pinned to the top."
            : "Chat has been pinned to the top."
          : isGroup
            ? "Group has been unpinned successfully."
            : "Chat has been unpinned successfully.",
        type: "success",
      });
    } catch (err) {
      setAlertDialog({
        isOpen: true,
        title: "Error",
        message: err.message || "Failed to update pin status",
        type: "error",
      });
    }
  };

  const handleConversationDeleted = (userId) => {
    const conversationIdToRemove = lastMessages[userId]?.conversationId;
    if (conversationIdToRemove) {
      dispatch(
        deleteConversation({
          conversationId: conversationIdToRemove,
          otherUserId: userId,
        }),
      );
      setPinnedConversations((prev) => {
        const updated = new Set(prev);
        updated.delete(conversationIdToRemove);
        return updated;
      });
      setArchivedConversations((prev) => {
        const updated = new Set(prev);
        updated.delete(conversationIdToRemove);
        return updated;
      });
    }
    dispatch(setSelectedUserId(null));
  };

  const handleOpenStatusManager = (mode = "create") => {
    setStatusManagerMode(mode);
    setShowStatusManager(true);
  };

  const handleOpenStatusViewer = (userStatusOrIndex) => {
    if (!allStatuses || allStatuses.length === 0) {
      setAlertDialog({
        isOpen: true,
        title: "No Status Available",
        message: "This user's status is not available right now.",
        type: "info",
      });
      return;
    }
    let targetIndex = 0;
    if (typeof userStatusOrIndex === "object" && userStatusOrIndex?.user?._id) {
      targetIndex = allStatuses.findIndex(
        (status) => status.user._id === userStatusOrIndex.user._id,
      );
      if (targetIndex === -1) {
        setAlertDialog({
          isOpen: true,
          title: "Status Not Found",
          message: "Could not find this user's status.",
          type: "error",
        });
        return;
      }
    } else if (typeof userStatusOrIndex === "number") {
      targetIndex = userStatusOrIndex;
    } else {
      return;
    }
    if (targetIndex < 0 || targetIndex >= allStatuses.length) return;
    setStatusViewerIndex(targetIndex);
    setShowStatusViewer(true);
  };

  const handleStatusCreated = async () => {
    try {
      const data = await loadAllStatuses();
      setAllStatuses(data);
    } catch (err) {
      console.error("Reload statuses error:", err);
    }
  };

  // Auth guards
  if (!accessToken && !refreshToken) {
    return <Navigate to="/login" replace />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="text-xl font-semibold text-gray-700">Loading...</div>
          <div className="text-sm text-gray-500 mt-2">Please wait</div>
        </div>
      </div>
    );
  }

  if (!loading && !currentUser && fetchInitiated.current) {
    localStorage.clear();
    return <Navigate to="/login" replace />;
  }

  return (
    <>
      <div className="flex h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 overflow-hidden">
        {/* Mobile overlay */}
        {isMobileSidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
        )}

        <Sidebar
          selectedUserId={selectedUserId}
          onSelectUser={(user) => {
            dispatch(setSelectedUserId(user._id));
            navigate(`/conversation/${user._id}`);
            setIsMobileSidebarOpen(false);
          }}
          currentUsername={currentUser?.username || ""}
          currentUserId={currentUserId}
          onLogout={handleLogout}
          isMobileSidebarOpen={isMobileSidebarOpen}
          onCloseMobileSidebar={() => setIsMobileSidebarOpen(false)}
          onOpenProfileSettings={(view = "all") => {
            setProfileSettingsView(view);
            setShowProfileSettings(true);
          }}
          profileImageUrl={sharedProfileImage}
          pinnedConversations={pinnedConversations}
          onPinConversation={handlePinConversation}
          archivedConversations={archivedConversations}
          onArchiveConversation={handleArchiveConversation}
          showArchived={showArchived}
          onToggleArchived={(show) => setShowArchived(show)}
          onGroupUpdate={(updatedGroup) => dispatch(updateGroup(updatedGroup))}
          onConversationDeleted={handleConversationDeleted}
          onOpenStatusManager={handleOpenStatusManager}
          allStatuses={allStatuses}
          onOpenStatusViewer={handleOpenStatusViewer}
          onCreateStatus={() => {
            setStatusManagerMode("create");
            setShowStatusManager(true);
          }}
          onViewMyStatus={() => {
            setStatusManagerMode("myStatus");
            setShowStatusManager(true);
          }}
          currentUserForStatus={currentUser}
        />

        {/* Children (Conversation page) get sidebar open handler */}
        <div className="flex-1 flex flex-col min-w-0">
          {React.cloneElement(children, {
            onOpenMobileSidebar: () => setIsMobileSidebarOpen(true),
          })}
        </div>
      </div>

      {/* Profile Settings */}
      {showProfileSettings && (
        <ProfileSetting
          currentUser={currentUser}
          onClose={() => setShowProfileSettings(false)}
          onProfileImageUpdate={handleProfileImageUpdate}
          coverPhotoUrl={sharedCoverPhoto || currentUser?.coverPhoto}
          initialView={profileSettingsView}
        />
      )}

      {/* Status Manager */}
      {showStatusManager && (
        <StatusManager
          currentUser={currentUser}
          onClose={() => setShowStatusManager(false)}
          onStatusCreated={handleStatusCreated}
          mode={statusManagerMode}
        />
      )}

      {/* Status Viewer */}
      {showStatusViewer && allStatuses.length > 0 && (
        <StatusViewer
          statuses={allStatuses}
          currentUserId={currentUserId}
          onClose={() => setShowStatusViewer(false)}
          initialUserIndex={statusViewerIndex}
        />
      )}

      {/* Alert Dialog */}
      <AlertDialog
        isOpen={alertDialog.isOpen}
        onClose={() => setAlertDialog({ ...alertDialog, isOpen: false })}
        title={alertDialog.title}
        message={alertDialog.message}
        type={alertDialog.type}
      />
    </>
  );
}
