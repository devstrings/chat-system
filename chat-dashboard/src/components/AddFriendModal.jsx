import React, { useEffect, useRef } from "react";
import FriendListItem from "@/components/FriendListItem";

export default function AddFriendModal({
    isOpen,
    onClose,
    searchUsers,
    setSearchUsers,
    allUsers,
    loading,
    onSearch,
    onSendRequest,
}) {
    const debounceRef = useRef(null);

    // useEffect(() => {

    // }, []);

    useEffect(() => {
        if (!searchUsers.trim()) return;
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            onSearch();
        }, 500);
        return () => clearTimeout(debounceRef.current);
    }, [searchUsers]);

    if (!isOpen) return null;

    return (
        <>
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                onClick={onClose}
            />

            <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
                <div
                    className="bg-white rounded-2xl shadow-2xl w-[95vw] sm:w-full max-w-md overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-3 flex items-center justify-between">
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
                                    d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                                />
                            </svg>
                            <h2 className="text-xl font-bold text-white">Add Friend</h2>
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
                    <div className="p-6">
                        {/* Search Box */}
                        <div className="flex gap-2 mb-4">
                            <input
                                type="text"
                                placeholder="Search users by username..."
                                value={searchUsers}
                                onChange={(e) => setSearchUsers(e.target.value)}
                                onKeyPress={(e) => e.key === "Enter" && onSearch()}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 text-sm"
                            />
                            <Button
                                onClick={onSearch}
                                disabled={loading}
                                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                            >
                                {loading ? "..." : "Search"}
                            </Button>
                        </div>

                        {/* Results */}
                        <div className="max-h-96 overflow-y-auto">
                            {allUsers.length === 0 && !loading && searchUsers && (
                                <p className="text-gray-500 text-sm text-center py-8">
                                    No users found
                                </p>
                            )}

                            {allUsers.length === 0 && !loading && !searchUsers && (
                                <p className="text-gray-500 text-sm text-center py-8">
                                    Search for users to add as friends
                                </p>
                            )}

                            <div className="space-y-2">
                                {allUsers.map((user) => (
                                    <FriendListItem
                                        key={user._id}
                                        user={user}
                                        onSendRequest={onSendRequest}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

