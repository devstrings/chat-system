import { useCallback, useState } from "react";

export default function useConversationNotifications({
  users,
  groups,
  setSelectedUser,
  setSelectedGroup,
  setIsGroupChat,
  setConversationId,
  navigate,
}) {
  const [toastNotifications, setToastNotifications] = useState([]);

  const showNotification = useCallback(
    (title, body, extra = {}) => {
      const id = Date.now() + Math.random();
      setToastNotifications((prev) => [
        ...prev,
        { id, name: title, message: body, ...extra },
      ]);

      if (
        Notification.permission === "granted" &&
        document.hidden &&
        !extra.isFriendRequest
      ) {
        const browserNotif = new Notification(title, {
          body,
          icon: "/favicon.ico",
          tag: extra.senderId || extra.groupId || "message",
          data: extra,
        });

        browserNotif.onclick = () => {
          window.focus();
          browserNotif.close();
          if (extra.isGroup) {
            const group = groups.find((g) => g._id === extra.groupId);
            if (group) {
              setSelectedGroup(group);
              setSelectedUser(null);
              setIsGroupChat(true);
              setConversationId(null);
              navigate(`/conversation/${group._id}`);
            }
          } else {
            const senderId = extra.senderId?._id || extra.senderId;
            const user = users.find((u) => u._id === senderId) || extra.senderObj;
            if (user) {
              setSelectedUser(user);
              setSelectedGroup(null);
              setIsGroupChat(false);
              navigate(`/conversation/${user._id}`);
            }
          }
        };
      }
    },
    [
      groups,
      users,
      setSelectedGroup,
      setSelectedUser,
      setIsGroupChat,
      setConversationId,
      navigate,
    ],
  );

  const handleToastSelect = useCallback(
    (notif) => {
      if (notif.isGroup) {
        const group = groups.find((g) => g._id === notif.groupId);
        if (group) {
          setSelectedGroup(group);
          setSelectedUser(null);
          setIsGroupChat(true);
          setConversationId(null);
          navigate(`/conversation/${group._id}`);
        }
      } else {
        const senderId = notif.senderId?._id || notif.senderId;
        const user = users.find((u) => u._id === senderId) || notif.senderObj;
        if (user) {
          setSelectedUser(user);
          setSelectedGroup(null);
          setIsGroupChat(false);
          navigate(`/conversation/${user._id}`);
        }
      }
    },
    [
      groups,
      users,
      setSelectedGroup,
      setSelectedUser,
      setIsGroupChat,
      setConversationId,
      navigate,
    ],
  );

  return {
    toastNotifications,
    setToastNotifications,
    showNotification,
    handleToastSelect,
  };
}
