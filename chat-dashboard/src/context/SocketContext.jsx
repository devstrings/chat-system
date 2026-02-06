import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import API_BASE_URL from "../config/api";

const SocketContext = createContext();

const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const tokenRef = useRef(null);

  useEffect(() => {
    //  Use accessToken instead of token
    const accessToken = localStorage.getItem("accessToken");
    const refreshToken = localStorage.getItem("refreshToken");

    if (!accessToken && !refreshToken) {
      console.log(" No tokens found, skipping socket connection");
      return;
    }

    console.log(" Connecting socket with accessToken");

    const newSocket = io(API_BASE_URL, {
      auth: { token: accessToken },
      transports: ["websocket"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    setSocket(newSocket);
    tokenRef.current = accessToken;

    //  TOKEN MODIFICATION DETECTION
    const checkTokenModification = setInterval(() => {
      const currentToken = localStorage.getItem("accessToken");
      
      if (currentToken !== tokenRef.current) {
        console.error(" Token has been modified! Logging out...");
        localStorage.clear();
        window.location.href = "/login";
      }
    }, 1000); // Check every second

    newSocket.on("connect", () => {
      console.log(" Socket connected:", newSocket.id);
      setConnected(true);
    });

    newSocket.on("disconnect", (reason) => {
      console.warn("Socket disconnected:", reason);
      setConnected(false);
    });

    newSocket.on("connect_error", (err) => {
      console.error(" Socket connection error:", err.message);
      setConnected(false);
      
      // If socket fails due to auth error, logout
      if (err.message.includes("Authentication") || err.message.includes("token")) {
        console.error(" Socket auth failed, logging out");
        localStorage.clear();
        window.location.href = "/login";
      }
    });

    // ONLINE USERS EVENTS
    newSocket.on("onlineUsersList", (data) => {
      console.log(" Initial online users list:", data.onlineUsers?.length || 0);
      if (data.onlineUsers && Array.isArray(data.onlineUsers)) {
        const userIds = data.onlineUsers.map((u) => u._id);
        setOnlineUsers(new Set(userIds));
      }
    });

    newSocket.on("userOnline", (data) => {
      console.log(" User came online:", data.user?.username);
      setOnlineUsers((prev) => {
        const updated = new Set(prev);
        updated.add(data.userId);
        return updated;
      });
    });

    newSocket.on("userOffline", (data) => {
      console.log(" User went offline:", data.userId);
      setOnlineUsers((prev) => {
        const updated = new Set(prev);
        updated.delete(data.userId);
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

    // Status events
    newSocket.on("newStatus", (data) => {
      console.log(" New status:", data);
    });

    newSocket.on("statusDeleted", (data) => {
      console.log(" Status deleted:", data);
    });

    newSocket.on("statusViewed", (data) => {
      console.log("Status viewed:", data);
    });

    return () => {
      clearInterval(checkTokenModification);
      newSocket.removeAllListeners();
      newSocket.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, connected, onlineUsers }}>
      {children}
    </SocketContext.Provider>
  );
};

const useSocket = () => useContext(SocketContext);

export { SocketProvider, useSocket };