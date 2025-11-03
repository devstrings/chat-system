import React from "react";

export default function UserItem({ 
  user, 
  selected, 
  onClick, 
  isOnline = false, 
  unreadCount = 0,
  lastMessage = "",
  lastMessageTime = null
}) {
  
  // Format time - WhatsApp style
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
    
    // Show date for older messages
    return msgDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Truncate message - WhatsApp style
  const truncateMessage = (msg, length = 35) => {
    if (!msg || msg.trim() === "") return "";
    if (msg.length <= length) return msg;
    return msg.substring(0, length) + "...";
  };

  const displayMessage = truncateMessage(lastMessage);

  return (
    <div
      className={`mx-2 mb-1 px-4 py-3 cursor-pointer rounded-xl transition-all duration-200 flex items-center gap-3 ${
        selected 
          ? "bg-gradient-to-r from-blue-600 to-blue-500 shadow-lg" 
          : "hover:bg-gray-700 hover:bg-opacity-50 active:scale-95"
      }`}
      onClick={onClick}
    >
      {/* Avatar with Online Status */}
      <div className="relative flex-shrink-0">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold shadow-md transition-transform duration-200 ${
          selected 
            ? "bg-white bg-opacity-20" 
            : "bg-gradient-to-br from-purple-500 to-pink-500"
        }`}>
          {user.username.charAt(0).toUpperCase()}
        </div>
        
        {/* Online Status Indicator */}
        {isOnline && (
          <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-gray-800 animate-pulse"></div>
        )}

        {/* Unread Badge on Avatar */}
        {unreadCount > 0 && !selected && (
          <div className="absolute -top-1 -right-1 min-w-5 h-5 bg-red-500 rounded-full flex items-center justify-center px-1 border-2 border-gray-900">
            <span className="text-white text-xs font-bold">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          </div>
        )}
      </div>

      {/* User Info */}
      <div className="flex-1 min-w-0">
        {/* Top row: Username + Time */}
        <div className="flex items-center justify-between mb-1">
          <h3 className={`font-semibold truncate ${
            selected ? "text-white" : unreadCount > 0 ? "text-white" : "text-gray-200"
          }`}>
            {user.username}
          </h3>
          
          {/* Time (only show if message exists) */}
          {lastMessageTime && (
            <span className={`text-xs flex-shrink-0 ml-2 ${
              selected 
                ? "text-white text-opacity-70" 
                : unreadCount > 0 
                  ? "text-blue-400 font-semibold" 
                  : "text-gray-500"
            }`}>
              {formatTime(lastMessageTime)}
            </span>
          )}
        </div>
        
        {/* Bottom row: Last Message Preview (only show if exists) */}
        {displayMessage && (
          <div className="flex items-center justify-between">
            <p className={`text-xs truncate ${
              selected 
                ? "text-white text-opacity-70" 
                : unreadCount > 0 
                  ? "text-gray-200 font-medium" 
                  : "text-gray-400"
            }`}>
              {displayMessage}
            </p>
          </div>
        )}
      </div>

      {/* Chevron Icon (only when selected) */}
      {selected && (
        <svg className="w-5 h-5 text-white text-opacity-70 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      )}
    </div>
  );
}