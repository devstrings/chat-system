import React, { useState, useEffect, memo } from "react";

const UserItem = memo(function UserItem({ 
  user, 
  selected, 
  onClick, 
  isOnline = false, 
  unreadCount = 0,
  lastMessage = "",
  lastMessageTime = null,
  lastMessageSender = null, 
  currentUserId = null,
  lastMessageStatus = "sent",
  onRelationshipChange
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [relationshipStatus, setRelationshipStatus] = useState("loading");
  const [requestId, setRequestId] = useState(null);

  // Fetch relationship status
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(
          `http://localhost:5000/api/friends/status/${user._id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await res.json();
        setRelationshipStatus(data.status);
        if (data.requestId) {
          setRequestId(data.requestId);
        }
      } catch (err) {
        console.error("Fetch status error:", err);
      }
    };

    if (user._id) {
      fetchStatus();
    }
  }, [user._id]);

  // Format time WhatsApp-style
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
    return msgDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Truncate message
  const truncateMessage = (msg, length = 30) => {
    if (!msg || msg.trim() === "") return "";
    if (msg.length <= length) return msg;
    return msg.substring(0, length) + "...";
  };

  const displayMessage = truncateMessage(lastMessage);
  const isOwnMessage = lastMessageSender && currentUserId && lastMessageSender === currentUserId;

  //  Memoize status icon to prevent re-calculation
  const getMessageStatusIcon = () => {
    if (!isOwnMessage || !lastMessage) return null;
    
    if (lastMessageStatus === 'read') {
      return (
        <svg className="w-3 h-3 text-blue-400 flex-shrink-0 mr-1" fill="currentColor" viewBox="0 0 24 24">
          <path d="M0.41,13.41L6,19L7.41,17.58L1.83,12M22.24,5.58L11.66,16.17L7.5,12L6.07,13.41L11.66,19L23.66,7M18,7L16.59,5.58L10.24,11.93L11.66,13.34L18,7Z"/>
        </svg>
      );
    } else if (lastMessageStatus === 'delivered') {
      return (
        <svg className="w-3 h-3 text-gray-400 flex-shrink-0 mr-1" fill="currentColor" viewBox="0 0 24 24">
          <path d="M0.41,13.41L6,19L7.41,17.58L1.83,12M22.24,5.58L11.66,16.17L7.5,12L6.07,13.41L11.66,19L23.66,7M18,7L16.59,5.58L10.24,11.93L11.66,13.34L18,7Z"/>
        </svg>
      );
    } else {
      return (
        <svg className="w-3 h-3 text-gray-400 flex-shrink-0 mr-1" fill="currentColor" viewBox="0 0 24 24">
          <path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z"/>
        </svg>
      );
    }
  };

  // Handle actions
  const handleSendRequest = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        "http://localhost:5000/api/friends/request/send",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ receiverId: user._id })
        }
      );
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message);
      }
      
      setRelationshipStatus("request_sent");
      alert("Friend request sent!");
      if (onRelationshipChange) onRelationshipChange();
    } catch (err) {
      alert(err.message || "Failed to send request");
    }
    setShowMenu(false);
  };

  const handleAcceptRequest = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `http://localhost:5000/api/friends/request/${requestId}/accept`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message);
      }
      
      setRelationshipStatus("friends");
      alert("Friend request accepted!");
      if (onRelationshipChange) onRelationshipChange();
    } catch (err) {
      alert(err.message || "Failed to accept request");
    }
    setShowMenu(false);
  };

  const handleRejectRequest = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `http://localhost:5000/api/friends/request/${requestId}/reject`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message);
      }
      
      setRelationshipStatus("none");
      alert("Friend request rejected!");
      if (onRelationshipChange) onRelationshipChange();
    } catch (err) {
      alert(err.message || "Failed to reject request");
    }
    setShowMenu(false);
  };

  const handleUnfriend = async () => {
    if (!window.confirm(`Unfriend ${user.username}?`)) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `http://localhost:5000/api/friends/unfriend/${user._id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message);
      }
      
      setRelationshipStatus("none");
      alert("Unfriended successfully!");
      if (onRelationshipChange) onRelationshipChange();
    } catch (err) {
      alert(err.message || "Failed to unfriend");
    }
    setShowMenu(false);
  };

  const handleBlock = async () => {
    if (!window.confirm(`Block ${user.username}?`)) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        "http://localhost:5000/api/friends/block",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ userId: user._id })
        }
      );
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message);
      }
      
      setRelationshipStatus("blocked");
      alert("User blocked successfully!");
      if (onRelationshipChange) onRelationshipChange();
    } catch (err) {
      alert(err.message || "Failed to block user");
    }
    setShowMenu(false);
  };

  const handleUnblock = async () => {
    if (!window.confirm(`Unblock ${user.username}?`)) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `http://localhost:5000/api/friends/unblock/${user._id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message);
      }
      
      setRelationshipStatus("none");
      alert("User unblocked successfully!");
      if (onRelationshipChange) onRelationshipChange();
    } catch (err) {
      alert(err.message || "Failed to unblock user");
    }
    setShowMenu(false);
  };

  // Get status badge
  const getStatusBadge = () => {
    if (relationshipStatus === "request_sent") {
      return <span className="text-xs text-yellow-400">Request Sent</span>;
    }
    if (relationshipStatus === "request_received") {
      return <span className="text-xs text-green-400"> Pending Request</span>;
    }
    if (relationshipStatus === "blocked") {
      return <span className="text-xs text-red-400">Blocked</span>;
    }
    if (relationshipStatus === "blocked_by") {
      return <span className="text-xs text-gray-500"> Unavailable</span>;
    }
    return null;
  };

  return (
    <div
      className={`mx-2 mb-1 px-4 py-3 cursor-pointer rounded-xl transition-all duration-200 flex items-center gap-3 relative ${
        selected 
          ? "bg-gradient-to-r from-blue-600 to-blue-500 shadow-lg" 
          : "hover:bg-gray-700 hover:bg-opacity-50 active:scale-95"
      }`}
      onClick={(e) => {
        if (relationshipStatus === "friends") {
          onClick();
        } else {
          e.stopPropagation();
          alert("You must be friends to chat!");
        }
      }}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold shadow-md transition-transform duration-200 ${
          selected ? "bg-white bg-opacity-20" : "bg-gradient-to-br from-purple-500 to-pink-500"
        }`}>
          {user.username.charAt(0).toUpperCase()}
        </div>

        {/* Online status */}
        {isOnline && (
          <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-gray-800 animate-pulse"></div>
        )}

        {/* Unread badge */}
        {unreadCount > 0 && !selected && (
          <div className="absolute -top-1 -right-1 min-w-5 h-5 bg-red-500 rounded-full flex items-center justify-center px-1 border-2 border-gray-900">
            <span className="text-white text-xs font-bold">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          </div>
        )}
      </div>

      {/* User info */}
      <div className="flex-1 min-w-0">
        {/* Username + Time */}
        <div className="flex items-center justify-between mb-1">
          <h3 className={`font-semibold truncate ${
            selected ? "text-white" : unreadCount > 0 ? "text-white" : "text-gray-200"
          }`}>
            {user.username}
          </h3>
          {lastMessageTime && relationshipStatus === "friends" && (
            <span className={`text-xs flex-shrink-0 ml-2 ${
              selected ? "text-white text-opacity-70" : unreadCount > 0 ? "text-blue-400 font-semibold" : "text-gray-500"
            }`}>
              {formatTime(lastMessageTime)}
            </span>
          )}
        </div>

        {/* Last message OR Status badge */}
        {relationshipStatus === "friends" && displayMessage ? (
          <div className="flex items-center">
            {getMessageStatusIcon()}
            <p className={`text-xs truncate ${
              selected ? "text-white text-opacity-70" : unreadCount > 0 ? "text-gray-200 font-medium" : "text-gray-400"
            }`}>
              {displayMessage}
            </p>
          </div>
        ) : (
          getStatusBadge()
        )}
      </div>

      {/* Action Button (Three Dots) */}
      <div className="relative">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
          className="p-2 hover:bg-gray-600 hover:bg-opacity-50 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
          </svg>
        </button>

        {/* Dropdown Menu */}
        {showMenu && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowMenu(false)}
            ></div>
            
            <div className="absolute right-0 mt-1 w-52 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-20 overflow-hidden">
              {relationshipStatus === "none" && (
                <button
                  onClick={handleSendRequest}
                  className="w-full px-4 py-2.5 text-left text-blue-400 hover:bg-gray-700 transition-colors flex items-center gap-2 text-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                  Send Friend Request
                </button>
              )}

              {relationshipStatus === "request_received" && (
                <>
                  <button
                    onClick={handleAcceptRequest}
                    className="w-full px-4 py-2.5 text-left text-green-400 hover:bg-gray-700 transition-colors flex items-center gap-2 text-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Accept Request
                  </button>
                  <button
                    onClick={handleRejectRequest}
                    className="w-full px-4 py-2.5 text-left text-red-400 hover:bg-gray-700 transition-colors flex items-center gap-2 text-sm border-t border-gray-700"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Reject Request
                  </button>
                </>
              )}

              {relationshipStatus === "friends" && (
                <button
                  onClick={handleUnfriend}
                  className="w-full px-4 py-2.5 text-left text-yellow-400 hover:bg-gray-700 transition-colors flex items-center gap-2 text-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" />
                  </svg>
                  Unfriend
                </button>
              )}

              {relationshipStatus !== "blocked" && relationshipStatus !== "blocked_by" && (
                <button
                  onClick={handleBlock}
                  className="w-full px-4 py-2.5 text-left text-red-400 hover:bg-gray-700 transition-colors flex items-center gap-2 text-sm border-t border-gray-700"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                  Block User
                </button>
              )}

              {relationshipStatus === "blocked" && (
                <button
                  onClick={handleUnblock}
                  className="w-full px-4 py-2.5 text-left text-green-400 hover:bg-gray-700 transition-colors flex items-center gap-2 text-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                  </svg>
                  Unblock User
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* Chevron (only for friends) */}
      {selected && relationshipStatus === "friends" && (
        <svg className="w-5 h-5 text-white text-opacity-70 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      )}
    </div>
  );
});

export default UserItem;