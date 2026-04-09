import axiosInstance from "@/lib/axiosInstance";

const googleLogin = async (code) => {
    try {
        const response = await axiosInstance.post("/api/auth/google", { code });
        return response.data;
    } catch (err) {
        console.error("Google login error:", err);
        throw err;
    }
}

const facebookLogin = async (accessToken) => {
    try {
        const response = await axiosInstance.post("/api/auth/facebook", { accessToken });
        return response.data;
    } catch (err) {
        console.error("Facebook login error:", err);
        throw err;
    }
};

const getConversation = async (participantId, skipCreate = true) => { 
    try {
        const response = await axiosInstance.post(`/api/messages/conversation`, {
            otherUserId: participantId,
            skipCreate,
        });
        return response.data;
    } catch (error) {
        console.error("Error fetching conversation:", error);
        throw error;
    }
}

const getPaginatedConversationMessagesById = async (conversationId, page = 1, limit = 20) => {
    try {
        const response = await axiosInstance.get(`/api/messages/${conversationId}`, {
            // params: { page, limit },
        });
        return response.data;
    } catch (error) {
        console.error("Error fetching paginated messages:", error);
        throw error;
    }
}

const getConversationById = async (conversationId) => {
    try {
        const response = await axiosInstance.get(`/api/conversations/${conversationId}`);
        return response.data;
    } catch (error) {
        console.error("Error fetching conversation by ID:", error);
        throw error;
    }
};

const fetchUser = async () => {
    try {
        const response = await axiosInstance.get(`/api/users/me`);
        return response.data;
    } catch (error) {
        console.error("Error fetching user:", error);
        throw error;
    }
};

const updateProfile = async (data) => {
    try {
        const response = await axiosInstance.put(`/api/users/profile`, data);
        return response.data;
    } catch (error) {
        console.error("Error updating profile:", error);
        throw error;
    }
};

const getFriendStatus = async (friendId) => {
    try {
        const response = await axiosInstance.get(`/api/friends/status/${friendId}`);
        return response.data;
    }

    catch (error) {
        console.error("Error fetching friend status:", error);
        throw error;
    }
}

const sendFriendRequest = async (friendId) => {
    try {
        const response = await axiosInstance.post(`/api/friends/request/send`, { receiverId: friendId });
        return response.data;
    } catch (error) {
        console.error("Error sending friend request:", error);
        throw error;
    }
}

const unblockFriend = async (friendId) => {
    try {
        const response = await axiosInstance.delete(`/api/friends/unblock/${friendId}`);
        return response.data;
    } catch (error) {
        console.error("Error unblocking friend:", error);
        throw error;
    }
}



export default {
    googleLogin,
    facebookLogin,
    fetchUser,
    updateProfile,
    getFriendStatus,
    sendFriendRequest,
    unblockFriend,
    getConversation,
    getConversationById,
    getPaginatedConversationMessagesById
};
