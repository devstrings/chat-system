import React from "react";
import { useAuthImage } from "@/hooks/useAuthImage";
import BaseModal from "@/components/base/BaseModal";


export default function FriendRequestModal({
  isOpen,
  onClose,
  pendingRequests = [],
  onAccept,
  onReject,
}) {
  return (
    <BaseModal isOpen={isOpen} onClose={onClose} cssClass="max-w-md p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-[95vw] sm:w-full max-w-md overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-yellow-500 to-orange-500 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
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
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
              <h2 className="text-xl font-bold text-white">Friend Requests</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-white/20 rounded-full transition-colors"
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

          {/* Body */}
          <div className="p-6 max-h-[60vh] overflow-y-auto">
            {pendingRequests.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600 font-medium">No pending requests</p>
                <p className="text-gray-500 text-sm mt-1">
                  You're all caught up!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingRequests.map((request) => (
                  <FriendRequestItem
                    key={request._id}
                    request={request}
                    onAccept={onAccept}
                    onReject={onReject}
                  />
                ))}
              </div>
            )}
          </div>
      </div>
    </BaseModal>
  );
}

function FriendRequestItem({ request, onAccept, onReject }) {
  const { imageSrc, loading } = useAuthImage(request.sender.profileImage);

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 hover:bg-gray-100 transition-colors">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
          {loading ? (
            <div className="w-full h-full bg-gray-300 animate-pulse" />
          ) : imageSrc ? (
            <img
              src={imageSrc}
              alt={request.sender.username}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
              {request.sender.username?.charAt(0)?.toUpperCase() || "U"}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">
            {request.sender.username}
          </p>
          <p className="text-xs text-gray-500 truncate">
            {request.sender.email}
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => onAccept(request._id)}
          className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg font-medium transition-colors"
        >
          Accept
        </button>
        <button
          onClick={() => onReject(request._id)}
          className="flex-1 px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-900 text-sm rounded-lg font-medium transition-colors"
        >
          Reject
        </button>
      </div>
    </div>
  );
}