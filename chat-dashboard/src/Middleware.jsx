import React, { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { checkAuth, logout } from "@/store/slices/authSlice";
import { Navigate, useNavigate } from "react-router-dom";
import Sidebar from "@/components/SideBar";
import useCryptoInit from "@/hooks/useCryptoInit";
import { setSelectedUserId } from "@/store/slices/chatSlice";

export default function Middleware({ children }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  useCryptoInit();

  const { loading, currentUser, currentUserId } = useSelector(
    (state) => state.auth,
  );
  const selectedUserId = useSelector((state) => state.chat.selectedUserId);
  const { lastMessages } = useSelector((state) => state.chat);
  const fetchInitiated = useRef(false);

  const accessToken = localStorage.getItem("accessToken");
  const refreshToken = localStorage.getItem("refreshToken");

  // Sidebar state
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Auth check
  useEffect(() => {
    if (
      (accessToken || refreshToken) &&
      !currentUser &&
      !fetchInitiated.current
    ) {
      fetchInitiated.current = true;
      dispatch(checkAuth());
    }
  }, [dispatch, currentUser, accessToken, refreshToken]);

  const handleLogout = () => {
    localStorage.removeItem("selectedUserId");
    localStorage.removeItem("selectedGroupId");
    localStorage.removeItem("isGroupChat");
    dispatch(logout());
    navigate("/login", { replace: true });
  };

  // Auth guards
  if (!accessToken && !refreshToken) {
    return <Navigate to="/login" replace />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="text-xl font-semibold text-gray-700">Loading...</div>
          <div className="text-sm text-gray-500 mt-2">Please wait</div>
        </div>
      </div>
    );
  }

  if (!loading && !currentUser && fetchInitiated.current) {
    localStorage.clear();
    return <Navigate to="/login" replace />;
  }

  return (
    <>
      <div className="flex h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 overflow-hidden">
        {/* Mobile overlay */}
        {isMobileSidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
        )}
<Sidebar
          selectedUserId={selectedUserId}
          onSelectUser={(item) => {
            setIsMobileSidebarOpen(false);
            const targetId = item.isGroup
              ? item._id
              : lastMessages[item._id]?.conversationId || item._id;
            dispatch(setSelectedUserId(item._id));
            navigate(`/conversation/${targetId}`);
          }}
          currentUsername={currentUser?.username || ""}
          currentUserId={currentUserId}
          onLogout={handleLogout}
          lastMessages={lastMessages}
          isMobileSidebarOpen={isMobileSidebarOpen}
          onCloseMobileSidebar={() => setIsMobileSidebarOpen(false)}
          onCloseChat={() => {
            dispatch(setSelectedUserId(null));
            localStorage.removeItem("selectedUserId");
            localStorage.removeItem("selectedGroupId");
            localStorage.removeItem("isGroupChat");
            navigate("/conversation/home");
          }}
        />

        {/* Children (Conversation page) get sidebar open handler */}
        <div className="flex-1 flex flex-col min-w-0">
          {React.cloneElement(children, {
            onOpenMobileSidebar: () => setIsMobileSidebarOpen(true),
            onCloseChat: () => {
              dispatch(setSelectedUserId(null));
              localStorage.removeItem("selectedUserId");
              localStorage.removeItem("selectedGroupId");
              localStorage.removeItem("isGroupChat");
              navigate("/conversation/home");
            },
          })}
        </div>
      </div>
    </>
  );
}
