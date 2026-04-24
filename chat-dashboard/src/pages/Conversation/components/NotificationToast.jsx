import { useEffect, useState } from "react";
import API_BASE_URL from "@/config/api";

export default function NotificationToast({
  notifications,
  onClose,
  onSelect,
}) {
  return (
    <div
      style={{
        position: "fixed",
        top: "16px",
        right: "16px",
        zIndex: 999999,
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        pointerEvents: "auto",
      }}
    >
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
    const showTimer = setTimeout(() => setVisible(true), 10);
    const hideTimer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onClose(notif.id), 300);
    }, 8000);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onSelect(notif);
    onClose(notif.id);
  };
  return (
    <div
      onClick={handleClick}
      style={{
        pointerEvents: "auto",
        cursor: "pointer",
        transform: visible ? "translateX(0)" : "translateX(100%)",
        opacity: visible ? 1 : 0,
        transition: "all 300ms ease",
        width: "320px",
        backgroundColor: "white",
        borderRadius: "12px",
        boxShadow: "0 10px 40px rgba(0,0,0,0.15)",
        border: "1px solid #f0f0f0",
        padding: "12px",
        display: "flex",
        alignItems: "center",
        gap: "12px",
      }}
    >
      <div
        style={{
          width: "40px",
          height: "40px",
          borderRadius: "50%",
          flexShrink: 0,
          overflow: "hidden",
        }}
      >
        {notif.avatar ? (
          <img
            src={
              notif.avatar.startsWith("http")
                ? notif.avatar
                : `${API_BASE_URL}${notif.avatar}`
            }
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            crossOrigin="anonymous"
            onError={(e) => {
              e.target.style.display = "none";
            }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              background: "linear-gradient(135deg, #8b5cf6, #ec4899)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontWeight: "bold",
              fontSize: "14px",
            }}
          >
            {notif.name?.charAt(0)?.toUpperCase()}
          </div>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontSize: "14px",
            fontWeight: "600",
            color: "#111",
            margin: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {notif.isGroup ? notif.groupName : notif.name}
        </p>
        <p
          style={{
            fontSize: "12px",
            color: "#666",
            margin: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {notif.isGroup ? `${notif.name}: ${notif.message}` : notif.message}
        </p>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          onClose(notif.id);
        }}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "#999",
          flexShrink: 0,
          padding: "4px",
          pointerEvents: "auto",
        }}
      >
        <svg
          width="16"
          height="16"
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
  );
}
