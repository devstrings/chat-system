import React, { useState, useEffect } from "react";

export default function Message({ message, isOwn }) {
  const [imageUrls, setImageUrls] = useState({});
  const [imageLoading, setImageLoading] = useState({});

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

  // Get file icon based on type
  const getFileIcon = (fileType) => {
    if (fileType?.startsWith("image/")) return "🖼️";
    if (fileType?.startsWith("video/")) return "🎥";
    if (fileType === "application/pdf") return "📕";
    if (fileType?.includes("word")) return "📄";
    if (fileType === "text/plain") return "📝";
    return "📎";
  };

  // Get file name (supports multiple field names from backend)
  const getFileName = (file) => {
    return file.filename || file.fileName || file.originalName || "Unknown file";
  };

  // Fetch secure images with authentication
  useEffect(() => {
    const fetchSecureImages = async () => {
      if (!message.attachments || message.attachments.length === 0) return;

      const token = localStorage.getItem("token");
      if (!token) return;

      for (const [index, file] of message.attachments.entries()) {
        // Only fetch images
        if (file.fileType?.startsWith("image/")) {
          setImageLoading(prev => ({ ...prev, [index]: true }));

          try {
            const response = await fetch(`http://localhost:5000${file.url}`, {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });

            if (!response.ok) {
              throw new Error('Failed to load image');
            }

            const blob = await response.blob();
            const imageUrl = URL.createObjectURL(blob);

            setImageUrls(prev => ({ ...prev, [index]: imageUrl }));
          } catch (error) {
            console.error('Error loading image:', error);
          } finally {
            setImageLoading(prev => ({ ...prev, [index]: false }));
          }
        }
      }
    };

    fetchSecureImages();

    // Cleanup blob URLs on unmount
    return () => {
      Object.values(imageUrls).forEach(url => {
        if (url) URL.revokeObjectURL(url);
      });
    };
  }, [message.attachments]);

  // Download file with authentication
  const handleFileDownload = async (file) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        alert("Please login to download files");
        return;
      }

      const response = await fetch(`http://localhost:5000${file.url}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Download failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = getFileName(file); // Use the helper function
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download file');
    }
  };

  // Get status icon - WhatsApp style
  const getStatusIcon = () => {
    const status = message.status || 'sent';
    
    if (isOwn) {
      console.log(`Message ${message._id} status:`, status, message);
    }
    
    if (status === 'read') {
      return (
        <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
          <path d="M0.41,13.41L6,19L7.41,17.58L1.83,12M22.24,5.58L11.66,16.17L7.5,12L6.07,13.41L11.66,19L23.66,7M18,7L16.59,5.58L10.24,11.93L11.66,13.34L18,7Z"/>
        </svg>
      );
    } else if (status === 'delivered') {
      return (
        <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
          <path d="M0.41,13.41L6,19L7.41,17.58L1.83,12M22.24,5.58L11.66,16.17L7.5,12L6.07,13.41L11.66,19L23.66,7M18,7L16.59,5.58L10.24,11.93L11.66,13.34L18,7Z"/>
        </svg>
      );
    } else {
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
              {message.attachments.map((file, index) => {
                const fileName = getFileName(file);
                const fileIcon = getFileIcon(file.fileType);
                
                return (
                  <div key={index} className="mb-2">
                    {file.fileType?.startsWith("image/") ? (
                      <div className="relative">
                        {imageLoading[index] ? (
                          // Loading spinner for images
                          <div className="flex items-center justify-center bg-gray-700 bg-opacity-50 rounded-lg h-48 w-64">
                            <svg className="w-8 h-8 text-gray-400 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                          </div>
                        ) : imageUrls[index] ? (
                          <div>
                            {/* Display secure image */}
                            <img 
                              src={imageUrls[index]} 
                              alt={fileName}
                              className="max-w-xs rounded-lg cursor-pointer hover:opacity-90 transition"
                              onClick={() => window.open(imageUrls[index], '_blank')}
                            />
                            {/* Image filename below */}
                            <p className="text-xs mt-1 opacity-70 truncate">
                              {fileIcon} {fileName}
                            </p>
                          </div>
                        ) : (
                          // Error fallback
                          <div className="flex items-center justify-center bg-gray-700 bg-opacity-50 rounded-lg h-48 w-64">
                            <p className="text-gray-400 text-sm">Failed to load image</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      // Document/File download button
                      <button
                        onClick={() => handleFileDownload(file)}
                        className={`flex items-center gap-2 p-3 rounded-lg transition w-full ${
                          isOwn 
                            ? "bg-white bg-opacity-20 hover:bg-opacity-30" 
                            : "bg-gray-700 hover:bg-gray-600"
                        }`}
                      >
                        {/* File icon */}
                        <div className="text-2xl flex-shrink-0">
                          {fileIcon}
                        </div>
                        
                        {/* File info */}
                        <div className="flex-1 min-w-0 text-left">
                          <p className="text-sm font-medium truncate">{fileName}</p>
                          <p className="text-xs opacity-70">
                            {file.fileSize ? `${(file.fileSize / 1024).toFixed(1)} KB` : 'Unknown size'} • Click to download
                          </p>
                        </div>
                        
                        {/* Download icon */}
                        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Message text */}
          {message.text && (
            <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">
              {message.text}
            </p>
          )}

          {/* Timestamp + Status (only for own messages) */}
          <div className={`flex items-center gap-1 mt-1 ${
            isOwn ? "justify-end" : "justify-start"
          }`}>
            <p className={`text-xs ${
              isOwn ? "text-blue-100 text-opacity-70" : "text-gray-400"
            }`}>
              {formatTime(message.createdAt)}
            </p>

            {/* Status ticks (ONLY for own messages) */}
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