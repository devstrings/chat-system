import React, { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useAuthImage } from "@/hooks/useAuthImage";
import { sendMessage, fetchConversation } from "@/store/slices/chatSlice";
function ContactItem({ item, isSelected, onToggle }) {
  const { imageSrc } = useAuthImage(
    item.isGroup ? item.groupImage : item.profileImage,
    item.isGroup ? "group" : null,
  );

  return (
    <div
      onClick={() => onToggle(item._id)}
      className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
        isSelected ? "bg-blue-50" : "hover:bg-gray-50"
      }`}
    >
      <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
        {imageSrc ? (
          <img
            src={imageSrc}
            alt={item.name || item.username}
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className={`w-full h-full flex items-center justify-center text-white font-bold text-sm ${
              item.isGroup
                ? "bg-gradient-to-br from-emerald-500 to-teal-600"
                : "bg-gradient-to-br from-purple-500 to-pink-500"
            }`}
          >
            {(item.name || item.username)?.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 truncate text-sm">
          {item.name || item.username}
        </p>
        <p className="text-xs text-gray-500">
          {item.isGroup ? "Group" : "Contact"}
        </p>
      </div>

      <div
        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
          isSelected ? "bg-blue-600 border-blue-600" : "border-gray-300"
        }`}
      >
        {isSelected && (
          <svg
            className="w-3 h-3 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M5 13l4 4L19 7"
            />
          </svg>
        )}
      </div>
    </div>
  );
}

export default function ForwardModal({ message, onClose }) {
  const dispatch = useDispatch();
  const { friends } = useSelector((state) => state.user);
  const { groups } = useSelector((state) => state.group);
  const { currentUserId } = useSelector((state) => state.auth);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const allItems = [
    ...groups.map((g) => ({ ...g, isGroup: true })),
    ...friends.map((f) => ({ ...f, isGroup: false })),
  ];

  const filtered = allItems.filter((item) =>
    (item.name || item.username)
      ?.toLowerCase()
      .includes(searchQuery.toLowerCase()),
  );

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const handleSend = async () => {
    if (selectedIds.size === 0) return;
    setSending(true);

    try {
      for (const id of selectedIds) {
        const item = allItems.find((i) => i._id === id);
        if (!item) continue;
        if (item.isGroup) {
          await dispatch(
            sendMessage({
              groupId: id,
              isGroup: true,
              text: message.text || "",
              attachments: message.attachments || [],
              encryptionData: null,
              replyTo: null,
              isForwarded: true,
            }),
          ).unwrap();
        } else {
          const convResult = await dispatch(
            fetchConversation({ otherUserId: id }),
          ).unwrap();

          await dispatch(
            sendMessage({
              conversationId: convResult._id,
              isGroup: false,
              text: message.text || "",
              attachments: message.attachments || [],
              encryptionData: null,
              replyTo: null,
              otherUserId: id,
              isForwarded: true,
            }),
          ).unwrap();
        }
      }

      setSent(true);
      setTimeout(() => onClose(), 1000);
    } catch (err) {
      console.error("Forward error:", err);
      setSending(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200]"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-[201] p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-3 flex items-center justify-between">
            <h3 className="text-white font-semibold text-base">
              Forward Message
            </h3>
            <button
              onClick={onClose}
              className="p-1 hover:bg-white/20 rounded-full transition-colors"
            >
              <svg
                className="w-4 h-4 text-white"
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

          {/* Message Preview */}
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
            <p className="text-xs text-gray-500 mb-1">Forwarding:</p>
            <p className="text-sm text-gray-700 truncate">
              {message.text ||
                (message.attachments?.length > 0 ? "📎 Attachment" : "Message")}
            </p>
          </div>

          {/* Search */}
          <div className="px-4 py-2 border-b border-gray-200">
            <input
              type="text"
              placeholder="Search contacts or groups..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>

          {/* List */}
          <div className="max-h-64 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-6">
                No contacts found
              </p>
            ) : (
              filtered.map((item) => (
                <ContactItem
                  key={item._id}
                  item={item}
                  isSelected={selectedIds.has(item._id)}
                  onToggle={toggleSelect}
                />
              ))
            )}
          </div>

          {/* Send Button */}
          <div className="px-4 py-3 border-t border-gray-200">
            <button
              onClick={handleSend}
              disabled={selectedIds.size === 0 || sending || sent}
              className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {sent ? (
                <>
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
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  Forwarded!
                </>
              ) : sending ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
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
                      d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Forward {selectedIds.size > 0 ? `(${selectedIds.size})` : ""}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
