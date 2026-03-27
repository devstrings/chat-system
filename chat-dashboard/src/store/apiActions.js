import axiosInstance from "@/utils/axiosInstance";
import API_BASE_URL from "@/config/api";

const fetchUser = async () => {
    try {
        const response = await axiosInstance.get(`${API_BASE_URL}/api/users/me`);
        return response.data;
    } catch (error) {
        console.error("Error fetching user:", error);
        throw error;
    }
};

const updateProfile = async (data) => {
    try {
        const response = await axiosInstance.put(`${API_BASE_URL}/api/users/profile`, data);
        return response.data;
    } catch (error) {
        console.error("Error updating profile:", error);
        throw error;
    }
};

const getFriendStatus = async (friendId) => {
    try {
        const response = await axiosInstance.get(`${API_BASE_URL}/api/friends/status/${friendId}`);
        return response.data;
    }

    catch (error) {
        console.error("Error fetching friend status:", error);
        throw error;
    }
}

export default {
    fetchUser,
    updateProfile,
    getFriendStatus
};
