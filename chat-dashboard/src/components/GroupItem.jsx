import React, { useState } from "react";
import { useAuthImage } from "../hooks/useAuthImage";
import ConfirmationDialog, { AlertDialog } from "./ConfirmationDialog";
import axios from "axios";
import GroupProfile from "./GroupProfile";
export default function GroupItem({
  group,
  selected,
  onClick,
  onPinConversation,
  onArchiveConversation,
  isPinned,
  isArchived,
  conversationId,
  currentUserId,
  unreadCount = 0,
  lastMessage = "",
  lastMessageTime = null,
  lastMessageSender = null,
  lastMessageStatus = "sent",
  onGroupUpdate = () => {},
  onGroupDeleted = () => {},
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const { imageSrc: groupImage } = useAuthImage(group.groupImage, "group");

  // Dialog states
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: "",
    message: "",
    confirmText: "",
    onConfirm: null,
    icon: "warning",
    type: "danger",
  });

  const [alertDialog, setAlertDialog] = useState({
    isOpen: false,
    title: "",
    message: "",
    type: "success",
  });

  const formatTime = (date) => {
    if (!date) return "";
    const now = new Date();
    const msgDate = new Date(date);
    const diff = now - msgDate;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "now";
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days}d`;
    return msgDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const truncateMessage = (msg, length = 30) => {
    if (!msg || msg.trim() === "") return "";
    if (msg.length <= length) return msg;
    return msg.substring(0, length) + "...";
  };

  const displayMessage = truncateMessage(lastMessage);
  const isOwnMessage =
    lastMessageSender && currentUserId && lastMessageSender === currentUserId;

  const getMessageStatusIcon = () => {
    if (!isOwnMessage || !lastMessage) return null;

    if (lastMessageStatus === "read") {
      return (
        <svg
          className="w-3 h-3 text-blue-400 flex-shrink-0 mr-1"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M0.41,13.41L6,19L7.41,17.58L1.83,12M22.24,5.58L11.66,16.17L7.5,12L6.07,13.41L11.66,19L23.66,7M18,7L16.59,5.58L10.24,11.93L11.66,13.34L18,7Z" />
        </svg>
      );
    } else if (lastMessageStatus === "delivered") {
      return (
        <svg
          className="w-3 h-3 text-gray-400 flex-shrink-0 mr-1"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M0.41,13.41L6,19L7.41,17.58L1.83,12M22.24,5.58L11.66,16.17L7.5,12L6.07,13.41L11.66,19L23.66,7M18,7L16.59,5.58L10.24,11.93L11.66,13.34L18,7Z" />
        </svg>
      );
    } else {
      return (
        <svg
          className="w-3 h-3 text-gray-400 flex-shrink-0 mr-1"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z" />
        </svg>
      );
    }
  };

  const handlePinClick = (e) => {
    e.stopPropagation();
    onPinConversation(group._id, isPinned);
    setShowMenu(false);
  };

  const handleArchiveClick = (e) => {
    e.stopPropagation();
    onArchiveConversation(group._id, isArchived);
    setShowMenu(false);
  };

  const handleClearChat = () => {
    setConfirmDialog({
      isOpen: true,
      title: "Clear Group Chat?",
      message: `Clear all messages in ${group.name}? This action cannot be undone.`,
      confirmText: "Clear Chat",
      cancelText: "Cancel",
      highlightText: group.name,
      icon: "delete",
      type: "danger",
      onConfirm: async () => {
        try {
          const token = localStorage.getItem("token");
          await axios.delete(
            `http://localhost:5000/api/groups/${group._id}/clear`,
            { headers: { Authorization: `Bearer ${token}` } }
          );

          setAlertDialog({
            isOpen: true,
            title: "Chat Cleared!",
            message: "All group messages have been deleted successfully.",
            type: "success",
          });

          setTimeout(() => {
            window.location.reload();
          }, 1500);
        } catch (err) {
          setAlertDialog({
            isOpen: true,
            title: "Error",
            message: "Could not clear chat. Please try again.",
            type: "error",
          });
        }
      },
    });
    setShowMenu(false);
  };

  const handleLeaveGroup = () => {
    setConfirmDialog({
      isOpen: true,
      title: "Leave Group?",
      message: `Are you sure you want to leave ${group.name}? You won't be able to see group messages.`,
      confirmText: "Leave Group",
      cancelText: "Cancel",
      highlightText: group.name,
      icon: "warning",
      type: "danger",
      onConfirm: async () => {
        try {
          const token = localStorage.getItem("token");

          await axios.post(
            `http://localhost:5000/api/groups/${group._id}/leave`,
            {},
            { headers: { Authorization: `Bearer ${token}` } }
          );

          setAlertDialog({
            isOpen: true,
            title: "Left Group",
            message: `You have left ${group.name}`,
            type: "info",
          });

          setTimeout(() => {
            window.location.reload();
          }, 1500);
        } catch (err) {
          setAlertDialog({
            isOpen: true,
            title: "Error",
            message: err.response?.data?.message || "Failed to leave group",
            type: "error",
          });
        }
      },
    });
    setShowMenu(false);
  };

  const isAdmin = group.admins?.includes(currentUserId);

  return (
    <>
      <div
        className={`mx-2 mb-1 px-4 py-3 cursor-pointer rounded-xl transition-all duration-200 flex items-center gap-3 relative ${
          selected
            ? "bg-gradient-to-r from-[#2563EB] to-[#9333EA] shadow-lg"
            : "hover:bg-[#DBEAFE] hover:bg-opacity-50 active:scale-95"
        }`}
        onClick={onClick}
      >
        {/* Group Avatar */}
        <div className="relative">
          <div
            className={`w-12 h-12 rounded-full overflow-hidden shadow-md transition-transform duration-200 cursor-pointer hover:scale-110 ${
              selected ? "ring-2 ring-white ring-opacity-40" : ""
            }`}
            onClick={(e) => {
              e.stopPropagation();
              setShowProfile(true);
            }}
            title="View Group Profile"
          >
            {groupImage ? (
              <img
                src={groupImage}
                alt={group.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white">
                <svg
                  className="w-7 h-7"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                </svg>
              </div>
            )}
          </div>

          {/* Unread Badge */}
          {unreadCount > 0 && (
            <div className="absolute -top-1 -right-1 min-w-5 h-5 bg-red-500 rounded-full flex items-center justify-center px-1 border-2 border-gray-800">
              <span className="text-white text-xs font-bold">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            </div>
          )}
        </div>

        {/* Group Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            {/* Left: Group name + badges */}
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <h3
                className={`font-semibold truncate ${
                  selected
                    ? "text-white"
                    : unreadCount > 0
                    ? "text-gray-900"
                    : "text-gray-900"
                }`}
              >
                {group.name}
              </h3>

              {/* Admin Badge */}
              {/* {isAdmin && (
                <span className="px-1.5 py-0.5 bg-yellow-500 text-white text-[10px] font-bold rounded flex-shrink-0">
                  ADMIN
                </span>
              )}
               */}
              {/* Pin icon */}
              {isPinned && (
                <svg
                  className="w-3.5 h-3.5 text-blue-400 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  title="Pinned"
                >
                  <path d="M16,12V4H17V2H7V4H8V12L6,14V16H11.2V22H12.8V16H18V14L16,12Z" />
                </svg>
              )}
            </div>

            {/* Right: timestamp */}
            {lastMessageTime && (
              <span
                className={`text-xs flex-shrink-0 ml-2 ${
                  selected
                    ? "text-white text-opacity-90"
                    : unreadCount > 0
                    ? "text-blue-600 font-bold"
                    : "text-gray-700"
                }`}
              >
                {formatTime(lastMessageTime)}
              </span>
            )}
          </div>

          {/* Message preview or member count */}
          {displayMessage ? (
            <div className="flex items-center">
              {getMessageStatusIcon()}
              <p
                className={`text-xs truncate ${
                  selected
                    ? "text-white text-opacity-90"
                    : unreadCount > 0
                    ? "text-gray-900 font-semibold"
                    : "text-gray-600"
                }`}
              >
                {displayMessage}
              </p>
            </div>
          ) : (
            <p
              className={`text-xs truncate ${
                selected ? "text-white text-opacity-90" : "text-gray-600"
              }`}
            >
              {group.members?.length || 0} members
            </p>
          )}
        </div>

        {/* Three Dots Menu */}
        <div className="relative flex-shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <svg
              className="w-5 h-5 text-gray-700"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
            </svg>
          </button>

          {/* Dropdown Menu */}
          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              ></div>

              <div className="absolute right-0 mt-1 w-52 bg-white border border-gray-300 rounded-lg shadow-xl z-20 overflow-hidden">
                {/* Pin/Unpin */}
                {conversationId && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePinClick(e);
                    }}
                    className="w-full px-4 py-2.5 text-left text-gray-900 hover:bg-gray-100 transition-colors flex items-center gap-2 text-sm"
                  >
                    <svg
                      className="w-4 h-4 text-blue-600"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M16,12V4H17V2H7V4H8V12L6,14V16H11.2V22H12.8V16H18V14L16,12Z" />
                    </svg>
                    {isPinned ? "Unpin Group" : "Pin Group"}
                  </button>
                )}

                {/* Archive/Unarchive */}
                {conversationId && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleArchiveClick(e);
                    }}
                    className="w-full px-4 py-2.5 text-left text-gray-900 hover:bg-gray-100 transition-colors flex items-center gap-2 text-sm border-t border-gray-300"
                  >
                    <svg
                      className="w-4 h-4 text-purple-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                      />
                    </svg>
                    {isArchived ? "Unarchive Group" : "Archive Group"}
                  </button>
                )}

                {/* View Profile */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowProfile(true);
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2.5 text-left text-gray-900 hover:bg-gray-100 flex items-center gap-2 text-sm border-t border-gray-300"
                >
                  <svg
                    className="w-4 h-4 text-emerald-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  View Group Info
                </button>

                {/* Clear Chat */}
                {conversationId && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClearChat();
                    }}
                    className="w-full px-4 py-2.5 text-left text-orange-600 hover:bg-orange-50 transition-colors flex items-center gap-2 text-sm border-t border-gray-300"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                    Clear Chat
                  </button>
                )}

                {/* Leave Group */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLeaveGroup();
                  }}
                  className="w-full px-4 py-2.5 text-left text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2 text-sm border-t border-gray-300"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                  Leave Group
                </button>
              </div>
            </>
          )}
        </div>

        {/* Selected indicator arrow */}
        {selected && (
          <svg
            className="w-5 h-5 text-white text-opacity-70 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        )}
      </div>

      {/* Group Profile Modal */}
      {showProfile && (
        <GroupProfile
          group={group}
          currentUserId={currentUserId}
          onClose={() => setShowProfile(false)}
          onGroupUpdate={onGroupUpdate}
          onGroupDeleted={onGroupDeleted}
          onMemberRemoved={(memberId) => {
            onGroupUpdate({
              ...group,
              members: group.members.filter((m) => m._id !== memberId),
            });
          }}
        />
      )}

      {/* DIALOGS */}
      <ConfirmationDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText}
        cancelText={confirmDialog.cancelText || "Cancel"}
        highlightText={confirmDialog.highlightText}
        icon={confirmDialog.icon}
        type={confirmDialog.type}
      />

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
