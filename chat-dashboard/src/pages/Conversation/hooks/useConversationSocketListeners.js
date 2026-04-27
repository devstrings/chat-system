import { useEffect } from "react";
import { fetchFriendsList, fetchPendingRequests } from "@/store/slices/userSlice";
import { addMessage, deleteConversation  } from "@/store/slices/chatSlice";
import apiActions from "@/store/apiActions";
import { decryptMessageHelper } from "@/utils/cryptoUtils";
import { playNotificationSound } from "@/actions/dashboard.actions";

export default function useConversationSocketListeners({
  socket,
  currentUserId,
  dispatch,
  sharedKeys,
  showNotification,
  isGroupChat,
  selectedGroupId,
  selectedUserRef,
  lastMessagesRef,
}) {
  useEffect(() => {
    if (!socket || !currentUserId) return;

    const handleFriendRequest = (data) => {
      dispatch(fetchPendingRequests());
      playNotificationSound();
      showNotification(`${data.senderName} `, "Sent you a friend request!", {
        isFriendRequest: true,
      });
    };

    const handleFriendRequestAccepted = async () => {
      await Promise.all([
        dispatch(fetchFriendsList()),
        dispatch(fetchPendingRequests()),
      ]);
      showNotification("Friend request accepted", "Your friends list is updated.");
    };

    const handleSidebarMessage = async (msg) => {
      const senderId = msg.sender?._id?.toString() || msg.sender?.toString();
      if (!senderId || senderId === currentUserId) return;

      const selectedIdStr = selectedUserRef.current?._id?.toString();
      if (selectedIdStr === senderId) return;

      let previewText = msg.text || "📎 Attachment";
      if (msg.encryptionData && msg.conversationId) {
        try {
          const currentSharedKey = sharedKeys[msg.conversationId];
          previewText =
            (await decryptMessageHelper(msg, currentUserId, currentSharedKey)) ||
            "📎 Attachment";
        } catch {
          previewText = "New encrypted message";
        }
      }

      playNotificationSound();
      showNotification(msg.sender?.username || "New Message", previewText, {
        avatar: msg.sender?.profileImage || null,
        senderId: msg.sender?._id,
        senderObj: msg.sender,
        isGroup: false,
      });
    };

    const handleSidebarGroupMessage = async (msg) => {
      if (msg.sender?._id === currentUserId) return;
      const isCurrentGroupOpen =
        isGroupChat && selectedGroupId?.toString() === msg.groupId?.toString();
      if (isCurrentGroupOpen) return;

      let previewText = msg.text || "📎 Attachment";
      if (msg.encryptionData) {
        try {
          previewText =
            (await decryptMessageHelper(msg, currentUserId, null)) ||
            "📎 Attachment";
        } catch {
          previewText = "New encrypted message";
        }
      }

      playNotificationSound();
      showNotification(msg.sender?.username || "Unknown", previewText, {
        avatar: msg.sender?.profileImage || null,
        groupName: msg.groupName || "Group",
        groupId: msg.groupId,
        isGroup: true,
      });
    };

    const handleCallRecord = async ({ callMessage, otherUserId }) => {
      let convId = lastMessagesRef.current[otherUserId]?.conversationId;
      if (!convId) {
        try {
          const data = await apiActions.getConversation(otherUserId, true);
          convId = data?._id;
        } catch (err) {
          console.log("API fetch failed:", err);
          return;
        }
      }
      if (!convId) return;

      dispatch(
        addMessage({
          conversationId: convId,
          message: {
            ...callMessage,
            conversationId: convId,
            _updated: Date.now(),
          },
          userId: otherUserId,
          isGroup: false,
        }),
      );
    };

    const handleConversationDeleted = ({ conversationId, otherUserId }) => {
      dispatch(deleteConversation({ conversationId, otherUserId }));
    };

    socket.on("friendRequestReceived", handleFriendRequest);
    socket.on("friendRequestAccepted", handleFriendRequestAccepted);
    socket.on("receiveMessage", handleSidebarMessage);
    socket.on("receiveGroupMessage", handleSidebarGroupMessage);
    socket.on("call:record", handleCallRecord);
    socket.on("conversationDeleted", handleConversationDeleted);

    return () => {
      socket.off("receiveMessage", handleSidebarMessage);
      socket.off("receiveGroupMessage", handleSidebarGroupMessage);
      socket.off("call:record", handleCallRecord);
      socket.off("friendRequestReceived", handleFriendRequest);
      socket.off("friendRequestAccepted", handleFriendRequestAccepted);
      socket.off("conversationDeleted", handleConversationDeleted);
    };
  }, [
    socket,
    currentUserId,
    dispatch,
    sharedKeys,
    showNotification,
    isGroupChat,
    selectedGroupId,
    selectedUserRef,
    lastMessagesRef,
  ]);
}
