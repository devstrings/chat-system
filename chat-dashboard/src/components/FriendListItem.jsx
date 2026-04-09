import { useAuthImage } from "@/hooks/useAuthImage";

export default function AddFriendItem({ user, onSendRequest }) {
    const { imageSrc, loading } = useAuthImage(user.profileImage);

    return (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 hover:bg-gray-100 transition-colors">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                        {loading ? (
                            <div className="w-full h-full bg-gray-300 animate-pulse" />
                        ) : imageSrc ? (
                            <img
                                src={imageSrc}
                                alt={user.username}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                                {user.username?.charAt(0)?.toUpperCase() || "U"}
                            </div>
                        )}
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-gray-900">
                            {user.username}
                        </p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                </div>
                <button
                    onClick={() => onSendRequest(user._id)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg font-medium transition-colors"
                >
                    Add
                </button>
            </div>
        </div>
    );
}