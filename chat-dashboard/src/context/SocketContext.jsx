import React, { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";

const SocketContext = createContext();

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");

    // ⚠️ Token na ho to skip
    if (!token) {
      console.log(" No token found, skipping socket connection.");
      return;
    }

    console.log(" Connecting socket with token:", token);

    // ocket connection
    const newSocket = io("http://localhost:5000", {
      auth: { token },
      transports: ["websocket"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    setSocket(newSocket);

    //  Connected
    newSocket.on("connect", () => {
      console.log(" Socket connected:", newSocket.id);
      setConnected(true);
    });

    //  Disconnected
    newSocket.on("disconnect", (reason) => {
      console.warn(" Socket disconnected:", reason);
      setConnected(false);
    });

    // Error during connection
    newSocket.on("connect_error", (err) => {
      console.error(" Socket connection error:", err.message);
      setConnected(false);
    });

    //  Online/offline events
    newSocket.on("userOnline", (data) => {
      console.log(" User came online:", data);
    });

    newSocket.on("userOffline", (data) => {
      console.log(" User went offline:", data);
    });

    // Cleanup
    return () => {
      console.log(" Cleaning up socket...");
      newSocket.removeAllListeners();
      newSocket.disconnect();
    };
  }, []); //  only runs once on mount (not every render)

  return (
    <SocketContext.Provider value={{ socket, connected }}>
      {children}
    </SocketContext.Provider>
  );
}

//  Custom hook
export const useSocket = () => useContext(SocketContext);
