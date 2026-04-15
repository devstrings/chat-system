import axios from "axios";
import API_BASE_URL from "@/config/api";
import { updateGroup } from "@/store/slices/groupSlice";

export const handleImageUpload = async (
  selectedImage,
  group,
  onGroupUpdate,
  setSelectedImage,
  setImagePreview,
  setAlertDialog,
  setUploading
) => {
  if (!selectedImage) return;
  setUploading(true);
  try {
    const formData = new FormData();
    formData.append("groupImage", selectedImage);
    const token = localStorage.getItem("accessToken");

    const response = await axios.put(
      `${API_BASE_URL}/api/groups/${group._id}/image`,
      formData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      }
    );

    const updatedGroup = {
      ...response.data,
      groupImage: response.data.groupImage
        ? `${response.data.groupImage}?t=${Date.now()}`
        : null,
    };

    onGroupUpdate(updatedGroup);
    setSelectedImage(null);
    setImagePreview(null);
    setAlertDialog({
      isOpen: true,
      title: "Success!",
      message: "Group picture updated successfully",
      type: "success",
    });
  } catch (err) {
    setAlertDialog({
      isOpen: true,
      title: "Error",
      message: err.response?.data?.message || "Failed to upload image",
      type: "error",
    });
  } finally {
    setUploading(false);
  }
};

export const handleRemoveImage = (group, onGroupUpdate, setConfirmDialog, setAlertDialog) => {
  setConfirmDialog({
    isOpen: true,
    title: "Remove Group Image?",
    message: "Are you sure you want to remove the group profile picture?",
    type: "danger",
    onConfirm: async () => {
      try {
        const token = localStorage.getItem("accessToken");
        const response = await axios.delete(
          `${API_BASE_URL}/api/groups/${group._id}/image`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        onGroupUpdate(response.data);
        setAlertDialog({
          isOpen: true,
          title: "Image Removed",
          message: "Group image has been removed successfully",
          type: "success",
        });
      } catch (err) {
        setAlertDialog({
          isOpen: true,
          title: "Error",
          message: err.response?.data?.message || "Failed to remove image",
          type: "error",
        });
      }
    },
  });
};

export const handleUpdateGroupName = async (
  groupName,
  group,
  onGroupUpdate,
  setIsEditingName,
  setAlertDialog
) => {
  if (!groupName.trim()) {
    setAlertDialog({
      isOpen: true,
      title: "Invalid Name",
      message: "Group name cannot be empty",
      type: "error",
    });
    return;
  }
  try {
    const token = localStorage.getItem("accessToken");
    const response = await axios.put(
      `${API_BASE_URL}/api/groups/${group._id}`,
      { name: groupName },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    onGroupUpdate(response.data);
    setIsEditingName(false);
    setAlertDialog({
      isOpen: true,
      title: "Success!",
      message: "Group name updated successfully",
      type: "success",
    });
  } catch (err) {
    setAlertDialog({
      isOpen: true,
      title: "Error",
      message: err.response?.data?.message || "Failed to update group name",
      type: "error",
    });
  }
};

export const handleSearchUsers = async (
  searchUsers,
  group,
  setSearchResults,
  setLoading
) => {
  if (!searchUsers.trim()) return;
  setLoading(true);
  try {
    const token = localStorage.getItem("accessToken");
    const res = await axios.get(
      `${API_BASE_URL}/api/users/search?q=${searchUsers}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const filtered = res.data.filter(
      (u) => !group.members.some((m) => m._id === u._id)
    );
    setSearchResults(filtered);
  } catch (err) {
    console.error("Search error:", err);
  } finally {
    setLoading(false);
  }
};

export const handleAddMember = async (
  userId,
  group,
  dispatch,
  onGroupUpdate,
  setSearchResults,
  setSearchUsers,
  setAlertDialog
) => {
  const isAlreadyMember = group.members.some((m) => m._id === userId);
  if (isAlreadyMember) {
    setAlertDialog({
      isOpen: true,
      title: "Already a Member",
      message: "This user is already a member of the group",
      type: "info",
    });
    return;
  }
  try {
    const token = localStorage.getItem("accessToken");
    const res = await axios.post(
      `${API_BASE_URL}/api/groups/${group._id}/add-members`,
      { memberIds: [userId] },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    dispatch(updateGroup(res.data));
    onGroupUpdate(res.data);
    setSearchResults([]);
    setSearchUsers("");
    setAlertDialog({
      isOpen: true,
      title: "Member Added!",
      message: "Member added to group successfully",
      type: "success",
    });
  } catch (err) {
    setAlertDialog({
      isOpen: true,
      title: "Error",
      message: err.response?.data?.message || "Failed to add member",
      type: "error",
    });
  }
};

export const handleRemoveMember = (
  memberId,
  group,
  dispatch,
  onMemberRemoved,
  setConfirmDialog,
  setAlertDialog
) => {
  setConfirmDialog({
    isOpen: true,
    title: "Remove Member?",
    message: "Are you sure you want to remove this member from the group?",
    type: "danger",
    onConfirm: async () => {
      try {
        const token = localStorage.getItem("accessToken");
        const res = await axios.delete(
          `${API_BASE_URL}/api/groups/${group._id}/remove/${memberId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        dispatch(updateGroup(res.data));
        onMemberRemoved(memberId);
        setAlertDialog({
          isOpen: true,
          title: "Member Removed",
          message: "Member removed from group successfully",
          type: "success",
        });
      } catch (err) {
        setAlertDialog({
          isOpen: true,
          title: "Error",
          message: err.response?.data?.message || "Failed to remove member",
          type: "error",
        });
      }
    },
  });
};

export const handleMakeAdmin = async (
  memberId,
  group,
  dispatch,
  onGroupUpdate,
  setAlertDialog
) => {
  try {
    const token = localStorage.getItem("accessToken");
    const res = await axios.post(
      `${API_BASE_URL}/api/groups/${group._id}/make-admin/${memberId}`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
    dispatch(updateGroup(res.data));
    onGroupUpdate(res.data);
    setAlertDialog({
      isOpen: true,
      title: "Admin Added!",
      message: "Member has been promoted to admin successfully.",
      type: "success",
    });
  } catch (err) {
    setAlertDialog({
      isOpen: true,
      title: "Error",
      message: err.response?.data?.message || "Failed to make admin",
      type: "error",
    });
  }
};

export const handleRemoveAdmin = (
  memberId,
  group,
  dispatch,
  onGroupUpdate,
  setConfirmDialog,
  setAlertDialog
) => {
  setConfirmDialog({
    isOpen: true,
    title: "Remove Admin Status?",
    message: "Are you sure you want to demote this admin to a regular member?",
    type: "danger",
    onConfirm: async () => {
      try {
        const token = localStorage.getItem("accessToken");
        const res = await axios.delete(
          `${API_BASE_URL}/api/groups/${group._id}/remove-admin/${memberId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        dispatch(updateGroup(res.data));
        onGroupUpdate(res.data);
        setAlertDialog({
          isOpen: true,
          title: "Admin Removed!",
          message: "Member has been demoted to regular member successfully.",
          type: "success",
        });
      } catch (err) {
        setAlertDialog({
          isOpen: true,
          title: "Error",
          message: err.response?.data?.message || "Failed to remove admin",
          type: "error",
        });
      }
    },
  });
};

export const handleExitGroup = (
  group,
  onGroupDeleted,
  onClose,
  setConfirmDialog,
  setAlertDialog
) => {
  setConfirmDialog({
    isOpen: true,
    title: "Leave Group?",
    message: `Are you sure you want to leave ${group.name}?`,
    type: "danger",
    onConfirm: async () => {
      try {
        const token = localStorage.getItem("accessToken");
        await axios.post(
          `${API_BASE_URL}/api/groups/${group._id}/leave`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setAlertDialog({
          isOpen: true,
          title: "Left Group",
          message: "You have left the group successfully",
          type: "info",
        });
        setTimeout(() => {
          onGroupDeleted();
          onClose();
        }, 1500);
      } catch (err) {
        setAlertDialog({
          isOpen: true,
          title: "Error",
          message: err.response?.data?.message || "Failed to exit group",
          type: "error",
        });
      }
    },
  });
};

export const handleDeleteGroup = (
  group,
  currentUserId,
  onGroupDeleted,
  onClose,
  setConfirmDialog,
  setAlertDialog,
  setShowAddMember
) => {
  const isOnlyAdmin =
    group.admins.length === 1 &&
    group.admins.some((a) => (a._id || a) === currentUserId);

  if (isOnlyAdmin && group.members.length > 1) {
    setConfirmDialog({
      isOpen: true,
      title: "You're the Only Admin!",
      message: `You are the only admin of "${group.name}". Choose an option:\n\n- Make another member admin first (recommended)\n- Delete group for everyone`,
      confirmText: "Show Members",
      cancelText: "Delete Anyway",
      type: "warning",
      onConfirm: () => {
        setShowAddMember(false);
        setAlertDialog({
          isOpen: true,
          title: "Make Someone Admin First",
          message: "Select a member from the list below to make them admin, then you can delete the group.",
          type: "info",
        });
      },
      onCancel: () => {
        setConfirmDialog({
          isOpen: true,
          title: "Delete Group for Everyone?",
          message: `Are you sure you want to delete "${group.name}"? This will remove the group for ALL members. This action cannot be undone.`,
          confirmText: "Delete Group",
          cancelText: "Cancel",
          type: "danger",
          onConfirm: async () => {
            try {
              const token = localStorage.getItem("accessToken");
              await axios.delete(`${API_BASE_URL}/api/groups/${group._id}`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              setAlertDialog({
                isOpen: true,
                title: "Group Deleted",
                message: "Group has been deleted successfully",
                type: "success",
              });
              setTimeout(() => {
                onGroupDeleted();
                onClose();
              }, 1500);
            } catch (err) {
              setAlertDialog({
                isOpen: true,
                title: "Error",
                message: err.response?.data?.message || "Failed to delete group",
                type: "error",
              });
            }
          },
        });
      },
    });
  } else {
    setConfirmDialog({
      isOpen: true,
      title: "Delete Group?",
      message: `Are you sure you want to delete "${group.name}"? This action cannot be undone.`,
      confirmText: "Delete Group",
      cancelText: "Cancel",
      type: "danger",
      onConfirm: async () => {
        try {
          const token = localStorage.getItem("accessToken");
          await axios.delete(`${API_BASE_URL}/api/groups/${group._id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          setAlertDialog({
            isOpen: true,
            title: "Group Deleted",
            message: "Group has been deleted successfully",
            type: "success",
          });
          setTimeout(() => {
            onGroupDeleted();
            onClose();
          }, 1500);
        } catch (err) {
          setAlertDialog({
            isOpen: true,
            title: "Error",
            message: err.response?.data?.message || "Failed to delete group",
            type: "error",
          });
        }
      },
    });
  }
};