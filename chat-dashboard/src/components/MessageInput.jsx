import React, { useState, useRef, useEffect } from "react";
import { useSocket } from "../context/SocketContext";
import axios from "axios";

export default function MessageInput({ conversationId }) {
  const { socket } = useSocket();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Voice recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const recordingIntervalRef = useRef(null);
  const audioChunksRef = useRef([]);

  const emojis = [
    "😀", "😂", "🤣", "😊", "😍", "🥰", "😎", "🤔", "🤗", "🤩",
    "😭", "😅", "😇", "🙂", "😉", "😋", "😘", "🥳", "😏", "😌",
    "👍", "👎", "👏", "🙏", "💪", "✌️", "🤝", "👋", "🤙", "🤞",
    "❤️", "💙", "💚", "💛", "🧡", "💜", "🖤", "🤍", "💔", "💕",
    "🔥", "✨", "⭐", "🌟", "💫", "🎉", "🎊", "🎈", "🎁", "🏆",
    "🎯", "💯", "✅", "❌", "⚡", "💥", "🌈", "☀️", "🌙", "⛅"
  ];

  //  Typing indicator logic
  const handleTyping = (value) => {
    setText(value);

    if (!socket || !conversationId) return;

    // Send typing start
    socket.emit("typing", { conversationId, isTyping: true });

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Send typing stop after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("typing", { conversationId, isTyping: false });
    }, 2000);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      // Stop recording if active
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
        if (mediaRecorder.stream) {
          mediaRecorder.stream.getTracks().forEach(track => track.stop());
        }
      }
      // Stop typing when component unmounts
      if (socket && conversationId) {
        socket.emit("typing", { conversationId, isTyping: false });
      }
    };
  }, [socket, conversationId, mediaRecorder]);

  const sendMessage = (attachments = []) => {
    if (!socket || (!text.trim() && attachments.length === 0) || sending) return;

    setSending(true);
    
    // Stop typing indicator
    socket.emit("typing", { conversationId, isTyping: false });
    
    const messageData = {
      conversationId,
      text: text.trim(),
      attachments
    };

    socket.emit("sendMessage", messageData);
    setText("");
    setTimeout(() => setSending(false), 100);
  };

  const handleEmojiClick = (emoji) => {
    handleTyping(text + emoji);
    setShowEmojiPicker(false);
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileSize = (file.size / 1024 / 1024).toFixed(2);
    
    if (file.size > 10 * 1024 * 1024) {
      alert(" File too large! Maximum size is 10MB");
      e.target.value = "";
      return;
    }

    if (!conversationId) {
      alert(" Please select a conversation first");
      e.target.value = "";
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("conversationId", conversationId);

      const token = localStorage.getItem("token");
      
      console.log(" Uploading file:", file.name);

      const response = await axios.post(
        "http://localhost:5000/api/file/upload",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`,
          },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            console.log(` Upload progress: ${percentCompleted}%`);
          },
        }
      );

      console.log(" Upload successful:", response.data);
      sendMessage([response.data]);

    } catch (error) {
      console.error(" Upload error:", error);
      alert(` Upload failed!\n\n${error.response?.data?.message || error.message}`);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  // Voice recording functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      
      audioChunksRef.current = [];
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };
      
      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await uploadVoiceMessage(audioBlob, recordingTime);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };
      
      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordingTime(0);
      
      // Stop typing indicator during recording
      if (socket && conversationId) {
        socket.emit("typing", { conversationId, isTyping: false });
      }
      
      // Start timer
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
    } catch (err) {
      console.error(" Microphone error:", err);
      alert(" Please allow microphone access to record voice messages");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      setIsRecording(false);
      clearInterval(recordingIntervalRef.current);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      
      // Stop all tracks
      if (mediaRecorder.stream) {
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
      }
    }
    
    setIsRecording(false);
    clearInterval(recordingIntervalRef.current);
    setRecordingTime(0);
    setMediaRecorder(null);
    audioChunksRef.current = [];
  };

  const uploadVoiceMessage = async (audioBlob, duration) => {
    setUploading(true);
    
    try {
      const formData = new FormData();
      const audioFile = new File([audioBlob], `voice_${Date.now()}.webm`, {
        type: 'audio/webm'
      });
      
      formData.append("file", audioFile);
      formData.append("conversationId", conversationId);
      formData.append("isVoiceMessage", "true");
      formData.append("duration", duration.toString());
      
      const token = localStorage.getItem("token");
      
      console.log(" Uploading voice message...");
      
      const response = await axios.post(
        "http://localhost:5000/api/file/upload",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      
      console.log(" Voice upload successful:", response.data);
      
      // Send message with voice attachment
      sendMessage([{ ...response.data, duration }]);
      
    } catch (error) {
      console.error(" Voice upload error:", error);
      alert(` Voice upload failed!\n\n${error.response?.data?.message || error.message}`);
    } finally {
      setUploading(false);
      setRecordingTime(0);
      setMediaRecorder(null);
    }
  };

  const formatRecordingTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-gray-800 bg-opacity-80 border-t border-gray-700 border-opacity-50 p-4">
      <div className="max-w-4xl mx-auto flex items-end gap-3">
        {isRecording ? (
          /* Recording UI */
          <>
            <button 
              onClick={cancelRecording}
              className="p-3 hover:bg-red-600 bg-red-500 rounded-xl transition-colors flex-shrink-0 text-white"
              title="Cancel recording"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <div className="flex-1 flex items-center gap-3 bg-red-500 bg-opacity-20 border-2 border-red-500 rounded-2xl px-4 py-3">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-red-500 font-mono font-semibold">
                {formatRecordingTime(recordingTime)}
              </span>
              <div className="flex-1 flex gap-1 items-center ml-4">
                {[...Array(20)].map((_, i) => (
                  <div
                    key={i}
                    className="w-1 bg-red-400 rounded-full animate-pulse"
                    style={{
                      height: `${Math.random() * 20 + 10}px`,
                      animationDelay: `${i * 50}ms`
                    }}
                  />
                ))}
              </div>
            </div>
            
            <button
              onClick={stopRecording}
              className="p-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl transition-all shadow-lg hover:shadow-blue-500 flex-shrink-0 transform hover:scale-105"
              title="Send voice message"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </>
        ) : (
          /* Normal UI */
          <>
            {/* Attachment Button */}
            <div className="relative">
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className={`p-3 hover:bg-gray-700 hover:bg-opacity-50 rounded-xl transition-colors flex-shrink-0 ${
                  uploading 
                    ? "text-blue-400 cursor-wait" 
                    : "text-gray-400 hover:text-blue-400"
                }`}
                title={uploading ? "Uploading..." : "Attach file"}
              >
                {uploading ? (
                  <svg className="w-6 h-6 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                )}
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden"
                accept="image/*,video/*,.pdf,.doc,.docx,.txt"
                disabled={uploading}
              />
            </div>

            {/* Message Input */}
            <div className="flex-1 relative">
              <textarea
                value={text}
                onChange={(e) => handleTyping(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder={uploading ? "Uploading file..." : "Type a message..."}
                rows="1"
                disabled={sending || uploading}
                className="w-full px-4 py-3 pr-12 bg-gray-700 bg-opacity-50 border border-gray-600 border-opacity-50 rounded-2xl text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 focus:border-transparent transition-all resize-none overflow-hidden disabled:opacity-50"
                style={{ maxHeight: "120px" }}
                onInput={(e) => {
                  e.target.style.height = "auto";
                  e.target.style.height = e.target.scrollHeight + "px";
                }}
              />

              {/* Emoji Button */}
              <div className="absolute right-3 top-3">
                <button 
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  disabled={uploading}
                  className="p-1 hover:bg-gray-600 hover:bg-opacity-50 rounded-lg transition-colors text-gray-400 hover:text-yellow-400 disabled:opacity-50"
                  title="Add emoji"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>

                {showEmojiPicker && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setShowEmojiPicker(false)}
                    ></div>
                    
                    <div className="absolute bottom-full right-0 mb-2 bg-gray-800 border border-gray-700 rounded-lg p-3 shadow-xl z-20 w-80 max-h-64 overflow-y-auto">
                      <p className="text-xs text-gray-400 mb-2 font-medium">Select Emoji</p>
                      <div className="grid grid-cols-10 gap-1">
                        {emojis.map((emoji, index) => (
                          <button
                            key={index}
                            onClick={() => handleEmojiClick(emoji)}
                            className="text-2xl hover:bg-gray-700 rounded p-1 transition-colors"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Send Button OR Voice Button */}
            {text.trim() ? (
              <button
                onClick={() => sendMessage()}
                disabled={sending || uploading}
                className="p-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white rounded-xl font-medium transition-all shadow-lg hover:shadow-blue-500 hover:shadow-opacity-30 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex-shrink-0 transform hover:scale-105 active:scale-95"
                title="Send message"
              >
                {sending ? (
                  <svg className="w-6 h-6 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                )}
              </button>
            ) : (
              <button
                onClick={startRecording}
                disabled={uploading}
                className="p-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white rounded-xl transition-all shadow-lg hover:shadow-blue-500 flex-shrink-0 transform hover:scale-105 active:scale-95 disabled:opacity-50"
                title="Record voice message"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </button>
            )}
          </>
        )}
      </div>

      {/* Quick Info */}
      <div className="max-w-4xl mx-auto mt-2 px-1">
        <p className="text-xs text-gray-500">
          {uploading ? (
            <span className="text-blue-400"> Uploading voice message...</span>
          ) : isRecording ? (
            <span className="text-red-400"> Recording... Click send to finish</span>
          ) : (
            <>
              Press <kbd className="px-1.5 py-0.5 bg-gray-700 bg-opacity-50 rounded text-gray-400 font-mono">Enter</kbd> to send, <kbd className="px-1.5 py-0.5 bg-gray-700 bg-opacity-50 rounded text-gray-400 font-mono">Shift+Enter</kbd> for new line
            </>
          )}
        </p>
      </div>
    </div>
  );
}