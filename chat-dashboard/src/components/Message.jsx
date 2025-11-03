import React from "react";

export default function Message({ message, isOwn }) {
  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    });
  };

  const getSenderInitial = () => {
    if (message.sender?.username) {
      return message.sender.username.charAt(0).toUpperCase();
    }
    return "U";
  };

  const getSenderName = () => {
    return message.sender?.username || "Unknown";
  };

  //  Get status icon - WhatsApp style
  const getStatusIcon = () => {
    const status = message.status || 'sent';
    
    console.log("Message status:", message._id, status); // Debug log
    
    if (status === 'read') {
      // Double tick - Blue (Read)
      return (
        <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
          <path d="M0.41,13.41L6,19L7.41,17.58L1.83,12M22.24,5.58L11.66,16.17L7.5,12L6.07,13.41L11.66,19L23.66,7M18,7L16.59,5.58L10.24,11.93L11.66,13.34L18,7Z"/>
        </svg>
      );
    } else if (status === 'delivered') {
      // Double tick - Gray (Delivered)
      return (
        <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
          <path d="M0.41,13.41L6,19L7.41,17.58L1.83,12M22.24,5.58L11.66,16.17L7.5,12L6.07,13.41L11.66,19L23.66,7M18,7L16.59,5.58L10.24,11.93L11.66,13.34L18,7Z"/>
        </svg>
      );
    } else {
      // Single tick - Gray (Sent)
      return (
        <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
          <path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z"/>
        </svg>
      );
    }
  };

  return (
    <div className={`flex mb-4 ${isOwn ? "justify-end" : "justify-start"}`}>
      <div className={`flex items-end gap-2 max-w-md ${isOwn ? "flex-row-reverse" : "flex-row"}`}>
        {/* Avatar */}
        {!isOwn && (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 shadow-md">
            {getSenderInitial()}
          </div>
        )}

        {/* Message Bubble */}
        <div
          className={`relative px-4 py-2 rounded-2xl shadow-lg transition-all hover:shadow-xl ${
            isOwn
              ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-br-sm"
              : "bg-gray-800 bg-opacity-80 text-gray-100 rounded-bl-sm border border-gray-700 border-opacity-50"
          }`}
        >
          {/* Sender name (only for received messages) */}
          {!isOwn && (
            <p className="text-xs font-semibold text-blue-400 mb-1">
              {getSenderName()}
            </p>
          )}

          {/* Attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="mb-2">
              {message.attachments.map((file, index) => (
                <div key={index} className="mb-2">
                  {file.fileType?.startsWith("image/") ? (
                    <a href={file.url} target="_blank" rel="noopener noreferrer">
                      <img 
                        src={file.url} 
                        alt={file.filename}
                        className="max-w-xs rounded-lg cursor-pointer hover:opacity-90 transition"
                      />
                    </a>
                  ) : (
                    <a 
                      href={file.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className={`flex items-center gap-2 p-2 rounded-lg transition ${
                        isOwn 
                          ? "bg-white bg-opacity-20 hover:bg-opacity-30" 
                          : "bg-gray-700 hover:bg-gray-600"
                      }`}
                    >
                      <span className="text-2xl"></span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{file.filename}</p>
                      </div>
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Message text */}
          {message.text && (
            <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">
              {message.text}
            </p>
          )}

          {/*  Timestamp + Status (only for own messages) */}
          <div className={`flex items-center gap-1 mt-1 ${
            isOwn ? "justify-end" : "justify-start"
          }`}>
            <p className={`text-xs ${
              isOwn ? "text-blue-100 text-opacity-70" : "text-gray-400"
            }`}>
              {formatTime(message.createdAt)}
            </p>

            {/*  Status ticks (ONLY for own messages) */}
            {isOwn && (
              <div className="flex-shrink-0">
                {getStatusIcon()}
              </div>
            )}
          </div>

          {/* Message tail */}
          <div className={`absolute bottom-0 ${
            isOwn ? "-right-1" : "-left-1"
          }`}>
            <div className={`w-0 h-0 ${
              isOwn 
                ? "border-l-8 border-l-blue-500 border-t-8 border-t-transparent"
                : "border-r-8 border-r-gray-800 border-t-8 border-t-transparent"
            }`}></div>
          </div>
        </div>
      </div>
    </div>
  );
}