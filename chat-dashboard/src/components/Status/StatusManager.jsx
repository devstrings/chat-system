//(Upload + Privacy + My Status)
import React, { useState, useRef, useEffect } from "react";
import API_BASE_URL from "../../config/api";
export default function StatusManager({
  currentUser,
  onClose,
  onStatusCreated,
  mode = "create",
}) {
  const [currentMode, setCurrentMode] = useState(mode);
  const [statusType, setStatusType] = useState("text");

  const [textContent, setTextContent] = useState("");
  const [caption, setCaption] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [loading, setLoading] = useState(false);

  const [bgColor, setBgColor] = useState("#1E3A8A");
  const [textColor, setTextColor] = useState("#FFFFFF");
  const [font, setFont] = useState("sans-serif");

  const [privacy, setPrivacy] = useState("contacts");
  const [hiddenFrom, setHiddenFrom] = useState([]);
  const [sharedWith, setSharedWith] = useState([]);

  const [myStatuses, setMyStatuses] = useState([]);
  const [statusViewers, setStatusViewers] = useState([]);
  const [showViewers, setShowViewers] = useState(false);

  const fileInputRef = useRef(null);
  const [alertDialog, setAlertDialog] = useState({
    isOpen: false,
    title: "",
    message: "",
    type: "success",
  });

  const bgColors = [
    "#1E3A8A",
    "#7C3AED",
    "#DC2626",
    "#059669",
    "#D97706",
    "#EC4899",
    "#0891B2",
    "#4F46E5",
    "#16A34A",
    "#CA8A04",
  ];

  const fonts = [
    { name: "Sans Serif", value: "sans-serif" },
    { name: "Serif", value: "serif" },
    { name: "Monospace", value: "monospace" },
    { name: "Cursive", value: "cursive" },
  ];

  useEffect(() => {
    if (mode === "myStatus" && currentUser?._id) {
      loadMyStatuses();
    }
  }, [mode, currentUser?._id]);
  useEffect(() => {
    setCurrentMode(mode);
  }, [mode]);

  const loadMyStatuses = async () => {
    console.log(" Loading my statuses for user:", currentUser._id);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${API_BASE_URL}/api/status/user/${currentUser._id}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      console.log(" Response status:", response.status);

      if (!response.ok) {
        throw new Error("Failed to load statuses");
      }

      const data = await response.json();
      console.log(" My statuses loaded:", data);
      console.log(" Total statuses:", data.length);

      setMyStatuses(data);
    } catch (err) {
      console.error(" Load my statuses error:", err);
      setMyStatuses([]);
    }
  };
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type.startsWith("image/")) {
      setStatusType("image");
    } else if (file.type.startsWith("video/")) {
      setStatusType("video");
    } else {
      alert("Only images and videos are supported");
      return;
    }

    setSelectedFile(file);

    const reader = new FileReader();
    reader.onloadend = () => {
      setFilePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleCreateStatus = async () => {
    if (statusType === "text" && !textContent.trim()) {
      alert("Please enter some text");
      return;
    }

    if ((statusType === "image" || statusType === "video") && !selectedFile) {
      alert("Please select a file");
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();

      formData.append("type", statusType);

      if (statusType === "text") {
        formData.append("content", textContent);
        formData.append("backgroundColor", bgColor);
        formData.append("textColor", textColor);
        formData.append("font", font);
      } else {
        formData.append("file", selectedFile);
      }

      if (caption) {
        formData.append("caption", caption);
      }

      formData.append("privacy", privacy);
      formData.append("hiddenFrom", JSON.stringify(hiddenFrom));
      formData.append("sharedWith", JSON.stringify(sharedWith));

      const response = await fetch(`${API_BASE_URL}/api/status`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) throw new Error("Failed to create status");

      const result = await response.json();

      if (onStatusCreated) {
        onStatusCreated(result.status);
      }

      //  Reset form
      setTextContent("");
      setCaption("");
      setSelectedFile(null);
      setFilePreview(null);
      setStatusType("text");

      //  Show success message (don't close modal)
      alert("Status added! You can add more or close when done.");

      //  Show success message (don't close modal)
      setAlertDialog({
        isOpen: true,
        title: " Status Added!",
        message:
          "Your status has been posted successfully. Add another or close when done.",
        type: "success",
      });

      if (onStatusCreated) {
        onStatusCreated(result.status);
      }
    } catch (err) {
      console.error("Create status error:", err);
      alert("Failed to create status");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStatus = async (statusId) => {
    if (!confirm("Delete this status?")) return;

    try {
      const token = localStorage.getItem("token");
      await fetch(`${API_BASE_URL}/api/status/${statusId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      setMyStatuses((prev) => prev.filter((s) => s._id !== statusId));
      alert("Status deleted successfully!");
    } catch (err) {
      console.error("Delete status error:", err);
      alert("Failed to delete status");
    }
  };

  const handleViewStatusViewers = async (statusId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${API_BASE_URL}/api/status/${statusId}/viewers`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const data = await response.json();
      setStatusViewers(data.viewers);
      setShowViewers(true);
    } catch (err) {
      console.error("Load viewers error:", err);
    }
  };

  const formatTime = (date) => {
    if (!date) return "";
    const now = new Date();
    const statusDate = new Date(date);
    const diff = now - statusDate;

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days}d ago`;

    return statusDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  // MY STATUS VIEW
  if (currentMode === "myStatus") {
    return (
      <>
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
          onClick={onClose}
        />
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <div
            className="bg-white rounded-2xl w-[95vw] sm:w-full max-w-lg max-h-[90vh] overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">My Status</h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
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

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              {myStatuses.length === 0 ? (
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
                      d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                  <p className="text-gray-600">No active status</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                  {myStatuses.map((status) => (
                    <div
                      key={status._id}
                      className="bg-white rounded-xl border-2 border-gray-200 hover:border-blue-400 transition-all overflow-hidden group"
                    >
                      {/* Thumbnail */}
                      <div className="aspect-square overflow-hidden bg-gray-100">
                        {status.type === "text" ? (
                          <div
                            className="w-full h-full flex items-center justify-center text-sm font-bold p-3 text-center"
                            style={{
                              backgroundColor: status.backgroundColor,
                              color: status.textColor,
                              fontFamily: status.font,
                            }}
                          >
                            {status.content.slice(0, 50)}...
                          </div>
                        ) : status.type === "image" ? (
                          <img
                            src={`${API_BASE_URL}${status.content}`}
                            alt="status"
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          />
                        ) : (
                          <video
                            src={`${API_BASE_URL}${status.content}`}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>

                      {/* Info */}
                      <div className="p-3 bg-gradient-to-br from-gray-50 to-white">
                        <div className="flex items-center justify-between mb-2">
                          {/*  CLICKABLE VIEW BUTTON */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewStatusViewers(status._id);
                            }}
                            className="flex items-center gap-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2 py-1 rounded-lg transition-colors"
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
                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                              />
                            </svg>
                            <span className="text-sm font-semibold">
                              {status.viewedBy?.length || 0}
                            </span>
                          </button>

                          <span className="text-xs text-gray-500">
                            {formatTime(status.createdAt)}
                          </span>
                        </div>

                        {status.caption && (
                          <p className="text-xs text-gray-600 truncate mb-2">
                            {status.caption}
                          </p>
                        )}

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteStatus(status._id);
                          }}
                          className="w-full py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1"
                        >
                          <svg
                            className="w-3 h-3"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                  <div
                    onClick={() => setCurrentMode("create")}
                    className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl border-2 border-dashed border-blue-300 hover:border-blue-400 transition-all overflow-hidden cursor-pointer group hover:scale-105"
                  >
                    <div className="aspect-square flex flex-col items-center justify-center p-6 text-white">
                      <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                        <svg
                          className="w-8 h-8"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M12 4v16m8-8H4"
                          />
                        </svg>
                      </div>
                      <p className="text-sm font-semibold text-center">
                        Tap to add
                      </p>
                      <p className="text-xs text-white/80 text-center">
                        more status
                      </p>
                    </div>
                    <div className="p-3 bg-white/10 backdrop-blur-sm">
                      <p className="text-xs text-white/90 text-center font-medium">
                        Create New
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {showViewers && (
          <div
            className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4"
            onClick={() => setShowViewers(false)}
          >
            <div
              className="bg-white rounded-2xl w-full max-w-md p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">
                  Viewed by {statusViewers.length}
                </h3>
                <button
                  onClick={() => setShowViewers(false)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <svg
                    className="w-5 h-5"
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

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {statusViewers.map((viewer) => (
                  <div
                    key={viewer._id}
                    className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                      {viewer.userId?.username?.charAt(0)?.toUpperCase() || "U"}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {viewer.userId?.username}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatTime(viewer.viewedAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // CREATE STATUS VIEW
  if (currentMode === "create") {
    return (
      <>
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
          onClick={onClose}
        />
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <div
            className="bg-white rounded-2xl w-[95vw] sm:w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Create Status</h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
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

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-160px)]">
              <div className="flex gap-2 mb-6">
                <button
                  onClick={() => setStatusType("text")}
                  className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${statusType === "text" ? "bg-blue-600 text-white shadow-lg" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                >
                  Text
                </button>
                <button
                  onClick={() => {
                    setStatusType("image");
                    fileInputRef.current?.click();
                  }}
                  className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${statusType === "image" ? "bg-blue-600 text-white shadow-lg" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                >
                  Photo
                </button>
                <button
                  onClick={() => {
                    setStatusType("video");
                    fileInputRef.current?.click();
                  }}
                  className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${statusType === "video" ? "bg-blue-600 text-white shadow-lg" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                >
                  Video
                </button>
              </div>

              {statusType === "text" && (
                <div className="space-y-4">
                  <div
                    className="w-full h-48 sm:h-64 rounded-xl flex items-center justify-center p-4 sm:p-8 text-center"
                    style={{
                      backgroundColor: bgColor,
                      color: textColor,
                      fontFamily: font,
                    }}
                  >
                    <p className="text-2xl font-bold break-words max-w-full">
                      {textContent || "Type your status..."}
                    </p>
                  </div>

                  <textarea
                    placeholder="What's on your mind?"
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    maxLength={200}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-gray-900"
                  />
                  <p className="text-xs text-gray-500 text-right">
                    {textContent.length}/200
                  </p>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Background Color
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {bgColors.map((color) => (
                        <button
                          key={color}
                          onClick={() => setBgColor(color)}
                          className={`w-10 h-10 rounded-full transition-transform ${bgColor === color ? "ring-4 ring-blue-500 scale-110" : "hover:scale-105"}`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Font Style
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {fonts.map((f) => (
                        <button
                          key={f.value}
                          onClick={() => setFont(f.value)}
                          className={`py-2 px-4 rounded-lg font-medium transition-all ${font === f.value ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                          style={{ fontFamily: f.value }}
                        >
                          {f.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {(statusType === "image" || statusType === "video") && (
                <div className="space-y-4">
                  {filePreview ? (
                    <div className="relative">
                      {statusType === "image" ? (
                        <img
                          src={filePreview}
                          alt="preview"
                          className="w-full h-64 object-cover rounded-xl"
                        />
                      ) : (
                        <video
                          src={filePreview}
                          controls
                          className="w-full h-64 object-cover rounded-xl"
                        />
                      )}
                      <button
                        onClick={() => {
                          setSelectedFile(null);
                          setFilePreview(null);
                        }}
                        className="absolute top-2 right-2 p-2 bg-red-600 hover:bg-red-700 text-white rounded-full"
                      >
                        <svg
                          className="w-5 h-5"
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
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full h-64 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors"
                    >
                      <svg
                        className="w-16 h-16 text-gray-400 mb-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 4v16m8-8H4"
                        />
                      </svg>
                      <p className="text-gray-600 font-medium">
                        Click to select {statusType}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        Max size: 50MB
                      </p>
                    </div>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={statusType === "image" ? "image/*" : "video/*"}
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
              )}

              {(statusType === "image" || statusType === "video") && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Caption (optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Add a caption..."
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    maxLength={200}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  />
                  <p className="text-xs text-gray-500 text-right mt-1">
                    {caption.length}/200
                  </p>
                </div>
              )}

              <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-900">
                    Privacy
                  </h3>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPrivacy("contacts")}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${privacy === "contacts" ? "bg-blue-600 text-white" : "bg-white text-gray-700 hover:bg-gray-100"}`}
                  >
                    All Contacts
                  </button>
                  <button
                    onClick={() => setPrivacy("except")}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${privacy === "except" ? "bg-blue-600 text-white" : "bg-white text-gray-700 hover:bg-gray-100"}`}
                  >
                    Except...
                  </button>
                  <button
                    onClick={() => setPrivacy("only")}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${privacy === "only" ? "bg-blue-600 text-white" : "bg-white text-gray-700 hover:bg-gray-100"}`}
                  >
                    Only...
                  </button>
                </div>
              </div>
            </div>
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg text-sm font-medium transition-colors"
              >
                Close
              </button>
              <button
                onClick={handleCreateStatus}
                disabled={loading}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Uploading...
                  </span>
                ) : (
                  " Add Status"
                )}
              </button>
            </div>

            {/* Alert Dialog */}
            <AlertDialog
              isOpen={alertDialog.isOpen}
              onClose={() => setAlertDialog({ ...alertDialog, isOpen: false })}
              title={alertDialog.title}
              message={alertDialog.message}
              type={alertDialog.type}
            />
          </div>
        </div>
      </>
    );

    function AlertDialog({ isOpen, onClose, title, message, type }) {
      if (!isOpen) return null;

      return (
        <div className="fixed inset-0 flex items-center justify-center z-[70] p-4">
          <div className="fixed inset-0 bg-black/50" onClick={onClose}></div>
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-2xl relative z-10">
            <div className="flex items-start gap-3">
              <div className="text-green-600">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-900 mb-1">{title}</h3>
                <p className="text-gray-700 text-sm">{message}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="mt-4 w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all"
            >
              Got it!
            </button>
          </div>
        </div>
      );
    }
  }
}
