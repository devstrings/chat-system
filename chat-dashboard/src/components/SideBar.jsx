import React, { useState } from "react";
import UserItem from "./UserItem";

export default function Sidebar({ 
  users = [], 
  selectedUserId, 
  onSelectUser, 
  onlineUsers = new Set(),
  currentUsername = "",
  currentUserId = "", // ✅ NEW
  onLogout,
  unreadCounts = {},
  lastMessages = {}
}) {
  const [searchQuery, setSearchQuery] = useState("");

  // Filter users based on search
  const filteredUsers = users.filter(user => 
    user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ✅ Sort users by last message time (most recent first)
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    const timeA = lastMessages[a._id]?.time ? new Date(lastMessages[a._id].time).getTime() : 0;
    const timeB = lastMessages[b._id]?.time ? new Date(lastMessages[b._id].time).getTime() : 0;
    return timeB - timeA; // Most recent first
  });

  // Count online users from sorted list
  const onlineCount = sortedUsers.filter(user => onlineUsers.has(user._id)).length;

  // Calculate total unread messages
  const totalUnread = Object.values(unreadCounts).reduce((sum, count) => sum + count, 0);

  return (
    <div className="w-96 bg-gray-800 border-r border-gray-700 flex flex-col">
      {/* Sidebar Header */}
      <div className="bg-gray-900 border-b border-gray-700 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg relative">
              {currentUsername.charAt(0).toUpperCase()}
              {/* Total unread badge on avatar */}
              {totalUnread > 0 && (
                <div className="absolute -top-1 -right-1 min-w-5 h-5 bg-red-500 rounded-full flex items-center justify-center px-1 border-2 border-gray-900">
                  <span className="text-white text-xs font-bold">
                    {totalUnread > 99 ? "99+" : totalUnread}
                  </span>
                </div>
              )}
            </div>
            <div>
              <h2 className="text-white font-semibold text-lg">Chats</h2>
              <p className="text-xs text-gray-400">{currentUsername}</p>
            </div>
          </div>
          
          <button
            onClick={onLogout}
            className="p-2 hover:bg-red-500 hover:bg-opacity-20 rounded-lg transition-colors text-red-400 hover:text-red-300"
            title="Logout"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
          <svg className="w-5 h-5 text-gray-500 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-200 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Users Count & Stats */}
      <div className="px-4 py-2 bg-gray-900 bg-opacity-30">
        <p className="text-xs text-gray-400 font-medium">
          {sortedUsers.length} {sortedUsers.length === 1 ? "contact" : "contacts"}
          {searchQuery && ` found`} • {onlineCount} online
          {totalUnread > 0 && (
            <span className="text-red-400 ml-2">
              • {totalUnread} unread
            </span>
          )}
        </p>
      </div>

      {/* Users List */}
      <div className="flex-1 overflow-y-auto">
        {sortedUsers.length === 0 ? (
          <div className="text-center py-12 px-4">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-700 bg-opacity-30 flex items-center justify-center">
              {searchQuery ? (
                <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              ) : (
                <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              )}
            </div>
            <p className="text-gray-400 text-sm">
              {searchQuery ? `No results for "${searchQuery}"` : "No contacts yet"}
            </p>
            {!searchQuery && (
              <p className="text-gray-500 text-xs mt-1">Start by adding some friends!</p>
            )}
          </div>
        ) : (
          <div className="py-2">
            {sortedUsers.map((user) => (
              <UserItem
                key={user._id}
                user={user}
                selected={user._id === selectedUserId}
                onClick={() => onSelectUser(user)}
                isOnline={onlineUsers.has(user._id)}
                unreadCount={unreadCounts[user._id] || 0}
                lastMessage={lastMessages[user._id]?.text || ""}
                lastMessageTime={lastMessages[user._id]?.time || null}
                lastMessageSender={lastMessages[user._id]?.sender || null}
                lastMessageStatus={lastMessages[user._id]?.status || "sent"} 
                currentUserId={currentUserId} 

              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}