import React, { useState, useEffect } from "react";
import { useSocket } from "../context/SocketContext";
import axios from "axios";

export default function Message({ message, isOwn, isSelectionMode, isSelected, onToggleSelect }) {
  const { socket } = useSocket();
  const [imageUrls, setImageUrls] = useState({});
  const [imageLoading, setImageLoading] = useState({});
  const [playingAudio, setPlayingAudio] = useState(null);
  const [audioDuration, setAudioDuration] = useState({});
  const [audioProgress, setAudioProgress] = useState({});
  const [showOptions, setShowOptions] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const audioRefs = React.useRef({});

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

  // Check if attachment is voice message
  const isVoiceMessage = (file) => {
    return file.fileType === 'audio/webm' || file.fileType === 'audio/mpeg' || 
           (file.filename || file.fileName || '').includes('voice_');
  };

  // Check if message was deleted
  const isDeletedForEveryone = message.deletedForEveryone || message.isDeletedForEveryone;
  const isDeletedForMe = message.deletedFor?.includes(message.sender._id) || message.isDeletedForMe;

  // 🆕 DELETE FUNCTIONS (✅ FIXED)
  const handleDeleteForMe = async () => {
    try {
      const token = localStorage.getItem("token");
      
      await axios.delete(
        `http://localhost:5000/api/messages/message/${message._id}/for-me`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log("✅ Message deleted for me");

      // ✅ Emit socket event with conversationId
      if (socket) {
        socket.emit("deleteMessageForMe", { 
          messageId: message._id,
          conversationId: message.conversationId 
        });
      }

      setShowDeleteModal(false);
      setShowOptions(false);
    } catch (err) {
      console.error("Delete for me error:", err);
      alert("Failed to delete message");
    }
  };

  const handleDeleteForEveryone = async () => {
    try {
      const token = localStorage.getItem("token");
      
      await axios.delete(
        `http://localhost:5000/api/messages/message/${message._id}/for-everyone`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log("✅ Message deleted for everyone");

      // ✅ Emit socket event with conversationId
      if (socket) {
        socket.emit("deleteMessageForEveryone", { 
          messageId: message._id,
          conversationId: message.conversationId 
        });
      }

      setShowDeleteModal(false);
      setShowOptions(false);
    } catch (err) {
      console.error("Delete for everyone error:", err);
      if (err.response?.status === 400) {
        alert("Cannot delete for everyone after 5 minutes");
      } else {
        alert("Failed to delete message");
      }
    }
  };

  // Check if message is less than 5 minutes old (for delete for everyone)
  const canDeleteForEveryone = () => {
    if (!isOwn) return false;
    const messageAge = Date.now() - new Date(message.createdAt).getTime();
    const fiveMinutes = 5 * 60 * 1000;
    return messageAge <= fiveMinutes;
  };

  // Play/Pause audio
  const toggleAudio = (index, audioUrl) => {
    const audio = audioRefs.current[index];
    
    if (!audio) {
      const newAudio = new Audio();
      const token = localStorage.getItem("token");
      
      fetch(`http://localhost:5000${audioUrl}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.blob())
      .then(blob => {
        const url = URL.createObjectURL(blob);
        newAudio.src = url;
        newAudio.play();
        
        newAudio.onloadedmetadata = () => {
          setAudioDuration(prev => ({ ...prev, [index]: newAudio.duration }));
        };
        
        newAudio.ontimeupdate = () => {
          setAudioProgress(prev => ({ 
            ...prev, 
            [index]: (newAudio.currentTime / newAudio.duration) * 100 
          }));
        };
        
        newAudio.onended = () => {
          setPlayingAudio(null);
          setAudioProgress(prev => ({ ...prev, [index]: 0 }));
        };
        
        audioRefs.current[index] = newAudio;
        setPlayingAudio(index);
      })
      .catch(err => console.error('Audio load error:', err));
      
      return;
    }
    
    if (playingAudio === index) {
      audio.pause();
      setPlayingAudio(null);
    } else {
      Object.values(audioRefs.current).forEach(a => a?.pause());
      audio.play();
      setPlayingAudio(index);
    }
  };

  // Format audio duration
  const formatAudioTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Fetch secure images with authentication
  useEffect(() => {
    const fetchSecureImages = async () => {
      if (!message.attachments || message.attachments.length === 0) return;

      const token = localStorage.getItem("token");
      if (!token) return;

      for (const [index, file] of message.attachments.entries()) {
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
      a.download = getFileName(file);
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

  // If deleted for everyone, show placeholder (✅ FIXED WIDTH)
  if (isDeletedForEveryone) {
    return (
      <div className={`flex mb-4 ${isOwn ? "justify-end" : "justify-start"}`}>
        <div className={`flex items-end gap-2 ${isOwn ? "flex-row-reverse max-w-md" : "flex-row max-w-md"}`}>
          {!isOwn && (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 shadow-md">
              {getSenderInitial()}
            </div>
          )}

          {/* ✅ FIXED: Added minWidth to prevent cutting */}
          <div 
            className={`relative px-4 py-2 rounded-2xl shadow-lg bg-gray-800 bg-opacity-50 border border-gray-700 ${
              isOwn ? "rounded-br-sm" : "rounded-bl-sm"
            }`}
            style={{ minWidth: "200px" }}
          >
            <p className="text-sm text-gray-500 italic flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              This message was deleted
            </p>
            <p className="text-xs text-gray-600 mt-1">{formatTime(message.createdAt)}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex mb-4 ${isOwn ? "justify-end" : "justify-start"}`}>
      <div className={`flex items-end gap-2 max-w-md ${isOwn ? "flex-row-reverse" : "flex-row"}`}>
        {/* 🆕 Selection Checkbox */}
        {isSelectionMode && (
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onToggleSelect(message._id)}
              className="w-5 h-5 rounded border-gray-600 text-blue-500 focus:ring-blue-500"
            />
          </div>
        )}

        {/* Avatar */}
        {!isOwn && (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 shadow-md">
            {getSenderInitial()}
          </div>
        )}

        {/* Message Bubble */}
        <div
          className={`relative px-4 py-2 rounded-2xl shadow-lg transition-all hover:shadow-xl group ${
            isOwn
              ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-br-sm"
              : "bg-gray-800 bg-opacity-80 text-gray-100 rounded-bl-sm border border-gray-700 border-opacity-50"
          }`}
        >
          {/* 🆕 Options Button (Three Dots) */}
          {!isSelectionMode && (
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => setShowOptions(!showOptions)}
                className={`p-1 rounded-lg hover:bg-opacity-20 ${
                  isOwn ? "hover:bg-white" : "hover:bg-gray-600"
                }`}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                </svg>
              </button>

              {/* Options Menu */}
              {showOptions && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowOptions(false)}
                  ></div>
                  
                  <div className="absolute right-0 mt-1 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-20 overflow-hidden">
                    <button
                      onClick={() => {
                        setShowDeleteModal(true);
                        setShowOptions(false);
                      }}
                      className="w-full px-4 py-2 text-left text-red-400 hover:bg-gray-700 transition-colors flex items-center gap-2 text-sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete Message
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

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
                
                // Voice Message
                if (isVoiceMessage(file)) {
                  const duration = file.duration || audioDuration[index] || 0;
                  const progress = audioProgress[index] || 0;
                  const isPlaying = playingAudio === index;
                  
                  return (
                    <div 
                      key={index} 
                      className={`flex items-center gap-2 p-3 rounded-lg ${
                        isOwn 
                          ? "bg-white bg-opacity-20" 
                          : "bg-gray-700"
                      }`}
                    >
                      <button
                        onClick={() => toggleAudio(index, file.url)}
                        className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition ${
                          isOwn
                            ? "bg-white bg-opacity-30 hover:bg-opacity-40"
                            : "bg-blue-500 hover:bg-blue-600"
                        }`}
                      >
                        {isPlaying ? (
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                          </svg>
                        ) : (
                          <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z"/>
                          </svg>
                        )}
                      </button>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex gap-0.5 items-center h-6 mb-1">
                          {[...Array(30)].map((_, i) => (
                            <div
                              key={i}
                              className={`w-0.5 rounded-full transition-all ${
                                isOwn ? "bg-white" : "bg-blue-400"
                              }`}
                              style={{
                                height: `${Math.random() * 80 + 20}%`,
                                opacity: progress > (i / 30) * 100 ? 1 : 0.3
                              }}
                            />
                          ))}
                        </div>
                        
                        <div className="flex items-center justify-between text-xs opacity-70">
                          <span>🎤 Voice message</span>
                          <span>{formatAudioTime(duration)}</span>
                        </div>
                      </div>
                    </div>
                  );
                }
                
                // Image
                if (file.fileType?.startsWith("image/")) {
                  return (
                    <div key={index} className="relative">
                      {imageLoading[index] ? (
                        <div className="flex items-center justify-center bg-gray-700 bg-opacity-50 rounded-lg h-48 w-64">
                          <svg className="w-8 h-8 text-gray-400 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        </div>
                      ) : imageUrls[index] ? (
                        <div>
                          <img 
                            src={imageUrls[index]} 
                            alt={fileName}
                            className="max-w-xs rounded-lg cursor-pointer hover:opacity-90 transition"
                            onClick={() => window.open(imageUrls[index], '_blank')}
                          />
                          <p className="text-xs mt-1 opacity-70 truncate">
                            {fileIcon} {fileName}
                          </p>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center bg-gray-700 bg-opacity-50 rounded-lg h-48 w-64">
                          <p className="text-gray-400 text-sm">Failed to load image</p>
                        </div>
                      )}
                    </div>
                  );
                }
                
                // Document/File
                return (
                  <button
                    key={index}
                    onClick={() => handleFileDownload(file)}
                    className={`flex items-center gap-2 p-3 rounded-lg transition w-full ${
                      isOwn 
                        ? "bg-white bg-opacity-20 hover:bg-opacity-30" 
                        : "bg-gray-700 hover:bg-gray-600"
                    }`}
                  >
                    <div className="text-2xl flex-shrink-0">{fileIcon}</div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-medium truncate">{fileName}</p>
                      <p className="text-xs opacity-70">
                        {file.fileSize ? `${(file.fileSize / 1024).toFixed(1)} KB` : 'Unknown size'} • Click to download
                      </p>
                    </div>
                    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </button>
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

      {/* 🆕 Delete Modal */}
      {showDeleteModal && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setShowDeleteModal(false)}
          ></div>
          
          <div className="fixed inset-0 flex items-center justify-center z-50">
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 max-w-sm w-full mx-4 shadow-2xl">
              <h3 className="text-lg font-semibold text-white mb-4">Delete Message?</h3>
              
              <div className="space-y-2">
                <button
                  onClick={handleDeleteForMe}
                  className="w-full px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-left flex items-center gap-3"
                >
                  <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <div>
                    <p className="font-medium">Delete for Me</p>
                    <p className="text-xs text-gray-400">Only you won't see this message</p>
                  </div>
                </button>

                {isOwn && canDeleteForEveryone() && (
                  <button
                    onClick={handleDeleteForEveryone}
                    className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-left flex items-center gap-3"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div>
                      <p className="font-medium">Delete for Everyone</p>
                      <p className="text-xs text-red-200">Everyone won't see this message</p>
                    </div>
                  </button>
                )}
              </div>

              <button
                onClick={() => setShowDeleteModal(false)}
                className="w-full mt-4 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}