import React, { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";

const SocketContext = createContext();

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(new Set());

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      console.log("No token found, skipping socket connection.");
      return;
    }

    console.log(" Connecting socket with token");

    const newSocket = io("http://localhost:5000", {
      auth: { token },
      transports: ["websocket"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log(" Socket connected:", newSocket.id);
      setConnected(true);
    });

    newSocket.on("disconnect", (reason) => {
      console.warn(" Socket disconnected:", reason);
      setConnected(false);
    });

    newSocket.on("connect_error", (err) => {
      console.error(" Socket connection error:", err.message);
      setConnected(false);
    });

    //  ONLINE USERS EVENTS
    newSocket.on("onlineUsersList", (data) => {
      console.log(" Initial online users list:", data.onlineUsers);
      if (data.onlineUsers && Array.isArray(data.onlineUsers)) {
        const userIds = data.onlineUsers.map(u => u._id);
        setOnlineUsers(new Set(userIds));
        console.log(" Set online users:", userIds);
      }
    });

    newSocket.on("userOnline", (data) => {
      console.log(" User came online:", data.user?.username, data.userId);
      setOnlineUsers(prev => {
        const updated = new Set(prev);
        updated.add(data.userId);
        console.log(" Online count:", updated.size);
        return updated;
      });
    });

    newSocket.on("userOffline", (data) => {
      console.log(" User went offline:", data.userId);
      setOnlineUsers(prev => {
        const updated = new Set(prev);
        updated.delete(data.userId);
        console.log(" Online count:", updated.size);
        return updated;
      });
    });

    // DELETE MESSAGE EVENTS
    newSocket.on("messageDeleted", (data) => {
      console.log(" Message deleted:", data);
    });

    newSocket.on("messageDeletedForEveryone", (data) => {
      console.log(" Message deleted for everyone:", data);
    });

    newSocket.on("errorMessage", (data) => {
      console.error(" Socket error:", data);
      alert(data.message);
    });

    return () => {
      console.log(" Cleaning up socket...");
      newSocket.removeAllListeners();
      newSocket.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, connected, onlineUsers }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);
