import React from "react";
import { useAuthImage } from "@/hooks/useAuthImage";
import BaseModal from "@/components/base/BaseModal";

export default function BlockedUsersModal({
    isOpen,
    onClose,
    blockedUsers = [],
    onUnblock,
}) {
    return (
        <BaseModal isOpen={isOpen} onClose={onClose} cssClass="max-w-md p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-[95vw] sm:w-full max-w-md overflow-hidden">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-gray-700 to-gray-900 px-6 py-4 flex items-center justify-between">
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
                                    d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                                />
                            </svg>
                            <h2 className="text-xl font-bold text-white">Blocked Users</h2>
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
                        {blockedUsers.length === 0 ? (
                            <div className="text-center py-12">
                                <svg
                                    className="w-16 h-16 mx-auto mb-4 text-gray-400"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                    />
                                </svg>
                                <p className="text-gray-600 font-medium">No blocked users</p>
                                <p className="text-gray-500 text-sm mt-1">
                                    You haven't blocked anyone
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {blockedUsers.map((block) => (
                                    <BlockedUserItem
                                        key={block._id}
                                        block={block}
                                        onUnblock={onUnblock}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
            </div>
        </BaseModal>
    );
}

function BlockedUserItem({ block, onUnblock }) {
    const { imageSrc, loading } = useAuthImage(block.blocked.profileImage);

    return (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 hover:bg-gray-100 transition-colors">
            <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                    {loading ? (
                        <div className="w-full h-full bg-gray-300 animate-pulse" />
                    ) : imageSrc ? (
                        <img
                            src={imageSrc}
                            alt={block.blocked.username}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-gray-500 to-gray-700 flex items-center justify-center text-white font-bold">
                            {block.blocked.username?.charAt(0)?.toUpperCase() || "U"}
                        </div>
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                        {block.blocked.username}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                        {block.blocked.email}
                    </p>
                </div>

                <button
                    onClick={() => onUnblock(block.blocked._id)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg font-medium transition-colors flex-shrink-0"
                >
                    Unblock
                </button>
            </div>
        </div>
    );
}
