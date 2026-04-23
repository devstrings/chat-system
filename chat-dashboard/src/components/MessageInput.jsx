import React, { useState, useRef, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { encryptMessage } from "@/utils/cryptoUtils";
import { sendMessage } from "@/store/slices/chatSlice";
import {
  uploadFile,
  uploadVoiceMessage,
  emitTyping,
  emitGroupTyping,
  stopAllTyping,
  isValidFileSize,
  getEmojisList,
  formatRecordingTime,
  setupMediaRecorder
} from "@/actions/messageInput.actions";
export default function MessageInput({
  conversationId,
  groupId,
  isGroup = false,
  selectedUser = null,
  replyTo = null,
  onCancelReply = () => { },
}) {
  const dispatch = useDispatch();
  const { sharedKeys } = useSelector((state) => state.chat);
  const currentUserId = useSelector((state) => state.auth.currentUserId);
  const selectedGroup = useSelector((state) => state.group.groups.find((g) => g._id === groupId));
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const socket = useSelector((state) => state.socket.socket);
  const connected = useSelector((state) => state.socket.connected);
  const onlineUsers = useSelector((state) => state.socket.onlineUsers);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const recordingTimeRef = useRef(0);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const recordingIntervalRef = useRef(null);
  const audioChunksRef = useRef([]);

 const emojis = getEmojisList();
  //  Handle typing for both group and individual
const handleTyping = (value) => {
  setText(value);
  if (!socket) return;
  
  if (isGroup && groupId) {
    emitGroupTyping(socket, groupId, true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      emitGroupTyping(socket, groupId, false);
    }, 2000);
  } else if (conversationId) {
    emitTyping(socket, conversationId, true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      emitTyping(socket, conversationId, false);
    }, 2000);
  }
};
  // Cleanup on unmount
useEffect(() => {
  return () => {
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
      if (mediaRecorder.stream) {
        mediaRecorder.stream.getTracks().forEach((track) => track.stop());
      }
    }
    
    //  Using action
    stopAllTyping(socket, isGroup, groupId, conversationId);
  };
}, [socket, conversationId, groupId, isGroup, mediaRecorder]);
  useEffect(() => {
    if (!isRecording) return;

    recordingTimeRef.current = 0;
    setRecordingTime(0);

    const interval = setInterval(() => {
      recordingTimeRef.current += 1;
      setRecordingTime((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isRecording]);
const handleSendMessage = async (attachments = []) => {
  if (!socket || (!text.trim() && attachments.length === 0) || sending) return;
  
  if (!isGroup && !conversationId) {
    alert("Conversation not ready yet. Please wait a moment.");
    return;
  }
  if (isGroup && !groupId) {
    alert("Group not found.");
    return;
  }

  setSending(true);
  
  stopAllTyping(socket, isGroup, groupId, conversationId);

  let cipherText = text.trim();
  let encryptionData = null;

  try {
    const textToEncrypt = text.trim() || (attachments.length > 0 ? "📎 Attachment" : "");
    if (textToEncrypt) {
      const publicKeysObj = {};
      publicKeysObj[currentUserId] = localStorage.getItem(`chat_pk_${currentUserId}`);

      if (!isGroup && selectedUser && selectedUser.publicKey) {
        publicKeysObj[selectedUser._id] = selectedUser.publicKey;
      } else if (isGroup && selectedGroup && selectedGroup.members) {
        selectedGroup.members.forEach(member => {
          if (member.publicKey) {
            publicKeysObj[member._id] = member.publicKey;
          }
        });
      }

      const sharedKey = sharedKeys[conversationId];
      const encrypted = await encryptMessage(textToEncrypt, publicKeysObj, sharedKey);
      cipherText = encrypted.cipherText;
      encryptionData = encrypted.encryptionData;
    }
  } catch (err) {
    console.error("Encryption failed before sending:", err);
  }
  
  try {
    await dispatch(sendMessage({
      conversationId: !isGroup ? conversationId : undefined,
      groupId: isGroup ? groupId : undefined,
      isGroup,
      text: cipherText,
      attachments,
      encryptionData,
      replyTo: replyTo ? {
        _id: replyTo._id,
        text: replyTo.text,
        sender: {
          _id: replyTo.sender?._id || replyTo.sender,
          username: replyTo.sender?.username || "Unknown",
        },
      } : null,
    })).unwrap();

    setText("");
    onCancelReply();
  } catch (err) {
    console.error("Failed to send message:", err);
    alert("Message failed to send. Please check your connection.");
  } finally {
    setSending(false);
  }
};

  const handleEmojiClick = (emoji) => {
    handleTyping(text + emoji);
    setShowEmojiPicker(false);
  };

  //  File upload with group support
 const handleFileSelect = async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  
  //  Using action for validation
  if (!isValidFileSize(file, 10)) {
    alert("File too large! Maximum size is 10MB");
    e.target.value = "";
    return;
  }
  
  if (!conversationId && !groupId) {
    alert(isGroup ? "Please select a group first" : "Please select a conversation first");
    e.target.value = "";
    return;
  }
  
  setUploading(true);
  
  try {
    //  Using action for upload
    const uploadId = isGroup ? groupId : conversationId;
    const uploadedFile = await uploadFile(file, uploadId, isGroup);
    handleSendMessage([uploadedFile]);
  } catch (error) {
    console.error("Upload error:", error);
    alert(`Upload failed!\n\n${error.response?.data?.message || error.message}`);
  } finally {
    setUploading(false);
    e.target.value = "";
  }
};

const startRecording = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    const { recorder } = setupMediaRecorder(
      stream,
      (chunks) => { audioChunksRef.current = chunks; },
      async (audioBlob) => {
        await handleVoiceUpload(audioBlob, recordingTimeRef.current);
      }
    );
    
    recorder.start();
    setMediaRecorder(recorder);
    setIsRecording(true);
    setRecordingTime(0);
    recordingTimeRef.current = 0;
    
    stopAllTyping(socket, isGroup, groupId, conversationId);
  } catch (err) {
    console.error("Microphone error:", err);
    alert("Please allow microphone access to record voice messages");
  }
};
  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
      setIsRecording(false);
      clearInterval(recordingIntervalRef.current);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.onstop = null;
      mediaRecorder.stop();

      if (mediaRecorder.stream) {
        mediaRecorder.stream.getTracks().forEach((track) => track.stop());
      }
    }

    setIsRecording(false);
    clearInterval(recordingIntervalRef.current);
    setRecordingTime(0);
    setMediaRecorder(null);
    audioChunksRef.current = [];
  };

  //  Voice message upload with group support
 const handleVoiceUpload = async (audioBlob, duration) => {
  setUploading(true);
  try {
    //  Using action for voice upload
    const uploadId = isGroup ? groupId : conversationId;
    const voiceMessage = await uploadVoiceMessage(audioBlob, duration, uploadId, isGroup);
    handleSendMessage([voiceMessage]);
  } catch (error) {
    console.error("Voice upload error:", error);
    alert(`Voice upload failed!\n\n${error.response?.data?.message || error.message}`);
  } finally {
    setUploading(false);
    setRecordingTime(0);
    setMediaRecorder(null);
  }
};

 

  return (
    <div className="bg-white border-t border-gray-200 p-3 md:p-4">
      {replyTo && (
        <div className="flex items-center gap-2 bg-blue-50 border-l-4 border-blue-500 rounded-lg px-3 py-2 mb-2 max-w-4xl mx-auto">
          <svg
            className="w-4 h-4 text-blue-500 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
            />
          </svg>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-blue-600">
              {replyTo.sender?.username || "Unknown"}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {replyTo.text || "📎 Attachment"}
            </p>
          </div>
          <button
            onClick={onCancelReply}
            className="text-gray-400 hover:text-gray-600 flex-shrink-0"
          >
            <svg
              className="w-4 h-4"
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
      )}
      <div className="max-w-4xl mx-auto flex items-end gap-2 md:gap-3">
        {isRecording ? (
          <div className="flex items-end w-full">
            <div className="w-full bg-white border-t border-gray-200 p-3 md:p-4">
              <div className="max-w-4xl mx-auto flex items-end gap-2 md:gap-3">
                <button
                  onClick={cancelRecording}
                  className="p-2 md:p-3 hover:bg-red-600 bg-red-500 rounded-xl transition-colors flex-shrink-0 text-white"
                  title="Cancel recording"
                >
                  <svg
                    className="w-5 h-5 md:w-6 md:h-6"
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

                <div className="flex-1 flex items-center gap-2 md:gap-3 bg-red-500 bg-opacity-20 border-2 border-red-500 rounded-xl md:rounded-2xl px-3 md:px-4 py-2 md:py-3">
                  <div className="w-2 h-2 md:w-3 md:h-3 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-red-500 font-mono font-semibold text-sm md:text-base">
                    {formatRecordingTime(recordingTime)}
                  </span>
                  <div className="flex-1 flex gap-0.5 md:gap-1 items-center ml-2 md:ml-4">
                    {[...Array(15)].map((_, i) => (
                      <div
                        key={i}
                        className="w-0.5 md:w-1 bg-red-400 rounded-full animate-pulse"
                        style={{
                          height: `${Math.random() * 15 + 8}px`,
                          animationDelay: `${i * 50}ms`,
                        }}
                      />
                    ))}
                  </div>
                </div>

                <button
                  onClick={stopRecording}
                  className="p-2 md:p-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl transition-all shadow-lg hover:shadow-blue-500 flex-shrink-0 transform hover:scale-105"
                  title="Send voice message"
                >
                  <svg
                    className="w-5 h-5 md:w-6 md:h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                    />
                  </svg>
                </button>
              </div>

              <div className="max-w-4xl mx-auto mt-2 px-1">
                <p className="text-xs text-red-400">
                  Recording... Click send to finish
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="relative">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className={`p-2 md:p-3 hover:bg-gray-100 hover:bg-opacity-50 rounded-xl transition-colors flex-shrink-0 ${uploading
                    ? "text-blue-400 cursor-wait"
                    : "text-gray-400 hover:text-blue-400"
                  }`}
                title={uploading ? "Uploading..." : "Attach file"}
              >
                {uploading ? (
                  <svg
                    className="w-5 h-5 md:w-6 md:h-6 animate-spin"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-5 h-5 md:w-6 md:h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                    />
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

            <div className="flex-1 relative">
              <textarea
                value={text}
                onChange={(e) => handleTyping(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder={
                  uploading ? "Uploading file..." : "Type a message..."
                }
                rows="1"
                disabled={sending || uploading}
                className="w-full px-3 md:px-4 py-2 md:py-3 pr-10 md:pr-12 bg-gray-50 border border-gray-300 rounded-xl md:rounded-2xl text-gray-900 text-sm md:text-base placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 focus:border-transparent transition-all resize-none overflow-hidden disabled:opacity-50"
                style={{ maxHeight: "100px" }}
                onInput={(e) => {
                  e.target.style.height = "auto";
                  e.target.style.height = e.target.scrollHeight + "px";
                }}
              />

              <div className="absolute right-2 md:right-3 top-2 md:top-3">
                <button
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  disabled={uploading}
                  className="p-1 hover:bg-gray-600 hover:bg-opacity-50 rounded-lg transition-colors text-gray-400 hover:text-yellow-400 disabled:opacity-50"
                  title="Add emoji"
                >
                  <svg
                    className="w-4 h-4 md:w-5 md:h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </button>

                {showEmojiPicker && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowEmojiPicker(false)}
                    ></div>

                    <div className="absolute bottom-full right-0 mb-2 bg-white border border-gray-300 rounded-lg p-2 md:p-3 shadow-xl z-20 w-64 md:w-80 max-h-48 md:max-h-64 overflow-y-auto">
                      <p className="text-xs text-gray-600 mb-2 font-medium">
                        Select Emoji
                      </p>
                      <div className="grid grid-cols-8 md:grid-cols-10 gap-1">
                        {emojis.map((emoji, index) => (
                          <button
                            key={index}
                            onClick={() => handleEmojiClick(emoji)}
                            className="text-xl md:text-2xl hover:bg-gray-100 rounded p-1 transition-colors"
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

            {text.trim() ? (
              <button
                onClick={() => handleSendMessage()}
                disabled={sending || uploading}
                className="p-2 md:p-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white rounded-xl font-medium transition-all shadow-lg hover:shadow-blue-500 hover:shadow-opacity-30 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex-shrink-0 transform hover:scale-105 active:scale-95"
                title="Send message"
              >
                {sending ? (
                  <svg
                    className="w-5 h-5 md:w-6 md:h-6 animate-spin"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-5 h-5 md:w-6 md:h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                    />
                  </svg>
                )}
              </button>
            ) : (
              <button
                onClick={startRecording}
                disabled={uploading}
                className="p-2 md:p-3 bg-gradient-to-r from-[#2563EB] to-[#9333EA] hover:from-blue-700 hover:to-blue-600 text-white rounded-xl transition-all shadow-lg hover:shadow-blue-500 flex-shrink-0 transform hover:scale-105 active:scale-95 disabled:opacity-50"
                title="Record voice message"
              >
                <svg
                  className="w-5 h-5 md:w-6 md:h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                  />
                </svg>
              </button>
            )}
          </>
        )}
      </div>

      <div className="max-w-4xl mx-auto mt-2 px-1">
        <p className="text-xs text-gray-500">
          {uploading ? (
            <span className="text-blue-400">Uploading...</span>
          ) : isRecording ? (
            <span></span>
          ) : (
            <span className="hidden md:inline">
              Press{" "}
              <kbd className="px-1.5 py-0.5 bg-gradient-to-r from-purple-600 to-blue-600 rounded text-white font-mono shadow-sm">
                Enter
              </kbd>{" "}
              to send,{" "}
              <kbd className="px-1.5 py-0.5 bg-gradient-to-r from-purple-600 to-blue-600 rounded text-white font-mono shadow-sm">
                Shift+Enter
              </kbd>{" "}
              for new line
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
