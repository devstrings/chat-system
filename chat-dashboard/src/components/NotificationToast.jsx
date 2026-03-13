import { useEffect, useState } from "react";
import API_BASE_URL from "../config/api";
export default function NotificationToast({ notifications, onClose, onSelect }) {
  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2">
      {notifications.map((notif) => (
        <ToastItem
          key={notif.id}
          notif={notif}
          onClose={onClose}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

function ToastItem({ notif, onClose, onSelect }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Slide in
    setTimeout(() => setVisible(true), 10);

    // Auto close after 4 seconds
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onClose(notif.id), 300);
    }, 4000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      onClick={() => {
        onSelect(notif);
        onClose(notif.id);
      }}
      className={`cursor-pointer w-80 bg-white rounded-xl shadow-2xl border border-gray-100 p-3 flex items-center gap-3 transition-all duration-300 ${
        visible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
      }`}
    >
      {/* Avatar */}
      <div className="w-10 h-10 rounded-full flex-shrink-0 overflow-hidden">
     {notif.avatar ? (
  <img
    src={notif.avatar.startsWith('http') 
      ? notif.avatar 
      : `${API_BASE_URL}${notif.avatar}`}   
    className="w-full h-full object-cover"
    crossOrigin="anonymous"
    onError={(e) => { e.target.style.display = 'none'; }}  
  />
) : (
          <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white font-bold text-sm">
            {notif.name?.charAt(0)?.toUpperCase()}
          </div>
        )}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">
          {notif.isGroup ? `${notif.groupName}` : notif.name}
        </p>
        <p className="text-xs text-gray-500 truncate">
          {notif.isGroup ? `${notif.name}: ${notif.message}` : notif.message}
        </p>
      </div>

      {/* Close button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose(notif.id);
        }}
        className="text-gray-400 hover:text-gray-600 flex-shrink-0"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}