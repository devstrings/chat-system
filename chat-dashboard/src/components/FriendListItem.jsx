import { useAuthImage } from "@/hooks/useAuthImage";

export default function FriendListItem({ friend, user, isSelected, onToggle, onSendRequest }) {
  const person = friend || user;
  const { imageSrc, loading } = useAuthImage(person?.profileImage);

  return (
    <div 
      className={`bg-gray-50 border rounded-lg p-3 transition-colors cursor-pointer ${
        isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-100'
      }`}
      onClick={() => onToggle && onToggle(person._id)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
            {loading ? (
              <div className="w-full h-full bg-gray-300 animate-pulse" />
            ) : imageSrc ? (
              <img src={imageSrc} alt={person?.username} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                {person?.username?.charAt(0)?.toUpperCase() || "U"}
              </div>
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">{person?.username}</p>
            <p className="text-xs text-gray-500">{person?.email}</p>
          </div>
        </div>

        {onToggle && (
          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
            isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
          }`}>
            {isSelected && (
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
        )}

        {onSendRequest && (
          <button
            onClick={(e) => { e.stopPropagation(); onSendRequest(person._id); }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg font-medium transition-colors"
          >
            Add
          </button>
        )}
      </div>
    </div>
  );
}