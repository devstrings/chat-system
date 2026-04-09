import React, { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { checkAuth } from "./store/slices/authSlice";
import Sidebar from "./components/SideBar";

export default function Middleware({ children }) {
    const dispatch = useDispatch();
    const { loading, currentUser } = useSelector((state) => state.auth);
    const fetchInitiated = useRef(false);

    const accessToken = localStorage.getItem("accessToken");
    const refreshToken = localStorage.getItem("refreshToken");

    useEffect(() => {
        if (
            (accessToken || refreshToken) &&
            !currentUser &&
            !fetchInitiated.current
        ) {
            fetchInitiated.current = true;
            dispatch(checkAuth());
        }
    }, [dispatch, currentUser]);

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

    return <>
        {/* <Sidebar
            selectedUserId={selectedUser?._id}
            onSelectUser={(user) => {
                        if (user.isGroup) {
                          setSelectedGroup(user);
                          setSelectedUser(null);
                          setIsGroupChat(true);
                          setConversationId(null);
                        } else {
                          setSelectedUser(user);
                          setSelectedGroup(null);
                          setIsGroupChat(false);
                        }
                        setIsMobileSidebarOpen(false);
                      }}
                      currentUsername={currentUser?.username || ""}
                      currentUserId={currentUserId}
                      onLogout={handleLogout}
                      isMobileSidebarOpen={isMobileSidebarOpen}
                      onCloseMobileSidebar={() => setIsMobileSidebarOpen(false)}
                      onOpenProfileSettings={(view = "all") => {
                        setProfileSettingsView(view);
                        setShowProfileSettings(true);
                      }}
                      profileImageUrl={sharedProfileImage}
                      pinnedConversations={pinnedConversations}
                      onPinConversation={handlePinConversation}
                      archivedConversations={archivedConversations}
                      onArchiveConversation={handleArchiveConversation}
                      showArchived={showArchived}
                      onToggleArchived={(show) => setShowArchived(show)}
                      onGroupUpdate={(updatedGroup) => {
                        dispatch(updateGroup(updatedGroup));
                      }}
                      onConversationDeleted={handleConversationDeleted}
                      onOpenStatusManager={handleOpenStatusManager}
                      allStatuses={allStatuses}
                      onOpenStatusViewer={handleOpenStatusViewer}
                      onCreateStatus={handleCreateStatus}
                      onViewMyStatus={handleViewMyStatus}
                      currentUserForStatus={currentUser}
        /> */}
        {children}
    </>;
}