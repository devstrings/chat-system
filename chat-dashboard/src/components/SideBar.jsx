import React, { useState, useMemo } from "react";
import UserItem from "./UserItem";
import axios from "axios";

export default function Sidebar({ 
  users = [], 
  selectedUserId, 
  onSelectUser, 
  onlineUsers = new Set(),
  currentUsername = "",
  currentUserId = "", 
  onLogout,
  unreadCounts = {},
  lastMessages = {}
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [searchUsers, setSearchUsers] = useState("");
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [showRequests, setShowRequests] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [showBlocked, setShowBlocked] = useState(false);

  //  CRITICAL: useMemo to ensure users re-render when lastMessages changes
  const memoizedUsers = useMemo(() => {
    console.log(" [SIDEBAR] Recalculating users with latest lastMessages");
    
    // Filter users based on search
    const filteredUsers = users.filter(user => 
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Sort users by last message time (most recent first)
    return [...filteredUsers].sort((a, b) => {
      const timeA = lastMessages[a._id]?.time ? new Date(lastMessages[a._id].time).getTime() : 0;
      const timeB = lastMessages[b._id]?.time ? new Date(lastMessages[b._id].time).getTime() : 0;
      return timeB - timeA;
    });
  }, [users, searchQuery, lastMessages]); //  Depends on lastMessages

  // Count online users from sorted list
  const onlineCount = memoizedUsers.filter(user => onlineUsers.has(user._id)).length;

  // Calculate total unread messages
  const totalUnread = Object.values(unreadCounts).reduce((sum, count) => sum + count, 0);

  // Format last message text
  const formatLastMessageText = (message) => {
    if (!message) return "";
    
    if (message.attachments && message.attachments.length > 0) {
      const attachment = message.attachments[0];
      const fileName = attachment.fileName || attachment.filename || "File";
      const fileType = attachment.fileType || attachment.type || "";
      let icon = "📄";
      
      if (fileType.startsWith("image/")) icon = "🖼️";
      else if (fileType.startsWith("video/")) icon = "🎥";
      else if (fileType === "application/pdf") icon = "📕";
      
      return `${icon} ${fileName}`;
    }
    
    return message.text || message.content || "";
  };

  // Search users function
  const handleSearchUsers = async () => {
    if (!searchUsers.trim()) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `http://localhost:5000/api/users/search?q=${searchUsers}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAllUsers(res.data);
    } catch (err) {
      console.error("Search error:", err);
      alert("Failed to search users");
    } finally {
      setLoading(false);
    }
  };

  // Send friend request
  const handleSendRequest = async (userId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        "http://localhost:5000/api/friends/request/send",
        { receiverId: userId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert(" Friend request sent!");
      setAllUsers(allUsers.filter(u => u._id !== userId));
    } catch (err) {
      alert(err.response?.data?.message || "Failed to send request");
    }
  };

  // Load pending requests
  const loadPendingRequests = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        "http://localhost:5000/api/friends/requests/pending",
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPendingRequests(res.data);
      setShowRequests(true);
    } catch (err) {
      console.error("Load requests error:", err);
    }
  };

  // Accept friend request
  const handleAcceptRequest = async (requestId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `http://localhost:5000/api/friends/request/${requestId}/accept`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert(" Friend request accepted!");
      setPendingRequests(pendingRequests.filter(r => r._id !== requestId));
      window.location.reload();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to accept request");
    }
  };

  // Reject friend request
  const handleRejectRequest = async (requestId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.delete(
        `http://localhost:5000/api/friends/request/${requestId}/reject`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert(" Friend request rejected");
      setPendingRequests(pendingRequests.filter(r => r._id !== requestId));
    } catch (err) {
      alert(err.response?.data?.message || "Failed to reject request");
    }
  };

  // Load blocked users
  const loadBlockedUsers = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        "http://localhost:5000/api/friends/blocked",
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setBlockedUsers(res.data);
      setShowBlocked(true);
    } catch (err) {
      console.error("Load blocked users error:", err);
      alert("Failed to load blocked users");
    }
  };

  // Unblock user
  const handleUnblockUser = async (userId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.delete(
        `http://localhost:5000/api/friends/unblock/${userId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert(" User unblocked!");
      setBlockedUsers(blockedUsers.filter(b => b.blocked._id !== userId));
    } catch (err) {
      alert(err.response?.data?.message || "Failed to unblock user");
    }
  };

  console.log("[SIDEBAR] Rendering with", memoizedUsers.length, "users");

  return (
    <div className="w-96 bg-gray-800 border-r border-gray-700 flex flex-col">
      {/* Sidebar Header */}
      <div className="bg-gray-900 border-b border-gray-700 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg relative">
              {currentUsername.charAt(0).toUpperCase()}
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
          
          <div className="flex items-center gap-2">
            {/* Blocked Users Button */}
            <button
              onClick={loadBlockedUsers}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors text-gray-400 hover:text-gray-200 relative"
              title="Blocked Users"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
              {blockedUsers.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-gray-600 rounded-full text-white text-xs flex items-center justify-center">
                  {blockedUsers.length}
                </span>
              )}
            </button>

            {/* Friend Requests Button */}
            <button
              onClick={loadPendingRequests}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors text-yellow-400 hover:text-yellow-300 relative"
              title="Friend Requests"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {pendingRequests.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white text-xs flex items-center justify-center">
                  {pendingRequests.length}
                </span>
              )}
            </button>

            {/* Add Friend Button */}
            <button
              onClick={() => setShowAddFriend(!showAddFriend)}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors text-blue-400 hover:text-blue-300"
              title="Add Friend"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </button>

            {/* Logout Button */}
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

      {/* Blocked Users Modal */}
      {showBlocked && (
        <div className="p-4 bg-gray-900 border-b border-gray-700 max-h-80 overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-semibold">Blocked Users</h3>
            <button
              onClick={() => setShowBlocked(false)}
              className="text-gray-400 hover:text-white"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {blockedUsers.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">No blocked users</p>
          ) : (
            <div className="space-y-2">
              {blockedUsers.map((block) => (
                <div key={block._id} className="bg-gray-800 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center text-white text-sm font-bold">
                        {block.blocked.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{block.blocked.username}</p>
                        <p className="text-xs text-gray-400">{block.blocked.email}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleUnblockUser(block.blocked._id)}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-md transition-colors"
                    >
                      Unblock
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Friend Requests Modal */}
      {showRequests && (
        <div className="p-4 bg-gray-900 border-b border-gray-700 max-h-80 overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-semibold">Friend Requests</h3>
            <button
              onClick={() => setShowRequests(false)}
              className="text-gray-400 hover:text-white"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {pendingRequests.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">No pending requests</p>
          ) : (
            <div className="space-y-2">
              {pendingRequests.map((request) => (
                <div key={request._id} className="bg-gray-800 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
                        {request.sender.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{request.sender.username}</p>
                        <p className="text-xs text-gray-400">{request.sender.email}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAcceptRequest(request._id)}
                      className="flex-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-md transition-colors"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleRejectRequest(request._id)}
                      className="flex-1 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded-md transition-colors"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Friend Modal */}
      {showAddFriend && (
        <div className="p-4 bg-gray-900 border-b border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-semibold">Add Friend</h3>
            <button
              onClick={() => {
                setShowAddFriend(false);
                setAllUsers([]);
                setSearchUsers("");
              }}
              className="text-gray-400 hover:text-white"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex items-center gap-2 mb-3">
            <input
              type="text"
              placeholder="Search users by username..."
              value={searchUsers}
              onChange={(e) => setSearchUsers(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearchUsers()}
              className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleSearchUsers}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {loading ? "..." : "Search"}
            </button>
          </div>

          <div className="max-h-64 overflow-y-auto space-y-2">
            {allUsers.length === 0 && !loading && searchUsers && (
              <p className="text-gray-500 text-sm text-center py-4">
                No users found
              </p>
            )}
            
            {allUsers.length === 0 && !loading && !searchUsers && (
              <p className="text-gray-500 text-sm text-center py-4">
                Search for users to add as friends
              </p>
            )}
            
            {allUsers.map((user) => (
              <div
                key={user._id}
                className="flex items-center justify-between p-2 bg-gray-800 rounded-lg hover:bg-gray-750"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{user.username}</p>
                    <p className="text-xs text-gray-400">{user.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleSendRequest(user._id)}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-md transition-colors"
                >
                  Add
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Users Count & Stats */}
      <div className="px-4 py-2 bg-gray-900 bg-opacity-30">
        <p className="text-xs text-gray-400 font-medium">
          {memoizedUsers.length} {memoizedUsers.length === 1 ? "contact" : "contacts"}
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
        {memoizedUsers.length === 0 ? (
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
            {memoizedUsers.map((user) => {
              const lastMsg = lastMessages[user._id];
              const formattedText = formatLastMessageText(lastMsg);
              
              return (
                <UserItem
                  key={user._id}
                  user={user}
                  selected={user._id === selectedUserId}
                  onClick={() => onSelectUser(user)}
                  isOnline={onlineUsers.has(user._id)}
                  unreadCount={unreadCounts[user._id] || 0}
                  lastMessage={formattedText}
                  lastMessageTime={lastMsg?.time || null}
                  lastMessageSender={lastMsg?.sender || null}
                  lastMessageStatus={lastMsg?.status || "sent"} 
                  currentUserId={currentUserId}
                  onRelationshipChange={() => window.location.reload()}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}