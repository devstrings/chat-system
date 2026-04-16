import React, { useState, useRef } from "react";
import { useAuthImage } from "@/hooks/useAuthImage";
import { useDispatch } from "react-redux";
import {
  handleImageUpload,
  handleRemoveImage,
  handleUpdateGroupName,
  handleSearchUsers,
  handleAddMember,
  handleRemoveMember,
  handleMakeAdmin,
  handleRemoveAdmin,
  handleExitGroup,
  handleDeleteGroup,
} from "@/actions/groupProfile.actions";

// AlertDialog Component
function AlertDialog({ isOpen, onClose, title, message, type }) {
  if (!isOpen) return null;

  const bgColor =
    type === "error"
      ? "bg-red-50"
      : type === "info"
        ? "bg-blue-50"
        : "bg-green-50";
  const iconColor =
    type === "error"
      ? "text-red-600"
      : type === "info"
        ? "text-blue-600"
        : "text-green-600";

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[60] p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose}></div>
      <div
        className={`${bgColor} rounded-xl p-6 max-w-sm w-full shadow-2xl relative z-10`}
      >
        <div className="flex items-start gap-3">
          <div className={`${iconColor}`}>
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-gray-900 mb-1">{title}</h3>
            <p className="text-gray-700 text-sm">{message}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="mt-4 w-full py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-semibold transition-all"
        >
          Close
        </button>
      </div>
    </div>
  );
}

// ConfirmationDialog Component
function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  onCancel,
  title,
  message,
  type,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[60] p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose}></div>
      <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-2xl relative z-10">
        <h3 className="font-bold text-gray-900 mb-2 text-lg">{title}</h3>
        <p className="text-gray-700 text-sm mb-6">{message}</p>
        <div className="flex gap-2">
          <button
            onClick={() => {
              if (onCancel) {
                onCancel();
              }
              onClose();
            }}
            className="flex-1 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-semibold transition-all"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`flex-1 py-2.5 ${
              type === "danger"
                ? "bg-red-600 hover:bg-red-700"
                : "bg-emerald-600 hover:bg-emerald-700"
            } text-white rounded-lg font-semibold transition-all`}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

// MemberItem Component
function MemberItem({
  member,
  isAdmin,
  isCreator,
  canRemove,
  onRemove,
  onMakeAdmin,
  onRemoveAdmin,
  currentUserId,
  currentUserIsAdmin,
  currentUserIsCreator,
}) {
  const { imageSrc: memberImage } = useAuthImage(member.profileImage);
  const [showMemberMenu, setShowMemberMenu] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const dispatch = useDispatch();
  // Check if current user can manage this member
  const canManage =
    (currentUserIsAdmin || currentUserIsCreator) &&
    member._id !== currentUserId &&
    !isCreator;

  return (
    <div className="flex items-center justify-between p-3 bg-white rounded-lg hover:bg-gray-50 transition-colors shadow-sm">
      {/* Avatar */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-10 h-10 rounded-full overflow-hidden shadow-md flex-shrink-0">
          {memberImage ? (
            <img
              src={memberImage}
              alt={member.username}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500 text-white font-bold text-sm">
              {member.username?.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {/* Name and Role */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 truncate">
            {member.username}
          </p>
          <p className="text-xs text-gray-500">
            {isCreator ? "Creator" : isAdmin ? "Admin" : "Member"}
          </p>
        </div>
      </div>

      {/*  THREE DOTS MENU */}
      {canManage && (
        <div className="relative flex-shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMemberMenu(true);
            }}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <svg
              className="w-5 h-5 text-gray-600"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
            </svg>
          </button>

          {/* Dropdown Menu */}
          {showMemberMenu && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70]"
                onClick={() => setShowMemberMenu(false)}
              />

              {/* Modal */}
              <div className="fixed inset-0 flex items-center justify-center z-[80] p-4 pointer-events-none">
                <div
                  className="bg-white rounded-xl shadow-2xl w-[85vw] sm:w-full max-w-[220px] overflow-hidden animate-in zoom-in-95 duration-200 pointer-events-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Header */}
                  <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-3 py-2 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-white">
                      Options
                    </h3>
                    <button
                      onClick={() => setShowMemberMenu(false)}
                      className="p-1 hover:bg-white/20 rounded-full transition-colors"
                    >
                      <svg
                        className="w-3.5 h-3.5 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>

                  {/* Options List */}
                  <div className="p-1">
                    {/* Make Admin */}
                    {!isAdmin && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onMakeAdmin(member._id);
                          setShowMemberMenu(false);
                        }}
                        className="w-full px-2.5 py-1.5 text-left text-gray-900 hover:bg-emerald-50 rounded-lg transition-colors flex items-center gap-2 text-sm"
                      >
                        <svg
                          className="w-4 h-4 text-emerald-600 flex-shrink-0"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <span className="font-medium">Make Admin</span>
                      </button>
                    )}

                    {/* Demote Admin */}
                    {isAdmin && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveAdmin(member._id);
                          setShowMemberMenu(false);
                        }}
                        className="w-full px-2.5 py-1.5 text-left text-gray-900 hover:bg-yellow-50 rounded-lg transition-colors flex items-center gap-2 text-sm"
                      >
                        <svg
                          className="w-4 h-4 text-yellow-600 flex-shrink-0"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                        <span className="font-medium">Demote Admin</span>
                      </button>
                    )}

                    {/* Divider */}
                    {canRemove && (isAdmin || !isAdmin) && (
                      <div className="my-1 border-t border-gray-200" />
                    )}

                    {/* Remove Member */}
                    {canRemove && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemove();
                          setShowMemberMenu(false);
                        }}
                        className="w-full px-2.5 py-1.5 text-left text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2 text-sm"
                      >
                        <svg
                          className="w-4 h-4 flex-shrink-0"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                        <span className="font-medium">Remove Member</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
// Main GroupProfile Component
export default function GroupProfile({
  group,
  currentUserId,
  onClose,
  onGroupUpdate,
  onGroupDeleted,
  onMemberRemoved,
}) {
  const dispatch = useDispatch();
  const [uploading, setUploading] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [searchUsers, setSearchUsers] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [groupName, setGroupName] = useState(group.name);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);

  const { imageSrc: groupImage } = useAuthImage(group.groupImage, "group");

  const [alertDialog, setAlertDialog] = useState({
    isOpen: false,
    title: "",
    message: "",
    type: "success",
  });

  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: null,
    type: "danger",
  });

  const isAdmin =
    group.admins?.some((a) => {
      const adminId = a._id || a;
      return adminId.toString() === currentUserId.toString();
    }) || false;

  const isCreator = (() => {
    const creatorId = group.creator?._id || group.creator;
    return creatorId?.toString() === currentUserId?.toString();
  })();

  // Handle image selection
  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setAlertDialog({
        isOpen: true,
        title: "Invalid File",
        message: "Please select an image file",
        type: "error",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setAlertDialog({
        isOpen: true,
        title: "File Too Large",
        message: "Image size should be less than 5MB",
        type: "error",
      });
      return;
    }

    setSelectedImage(file);

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // Upload group image
const onImageUpload = () =>
    handleImageUpload(selectedImage, group, onGroupUpdate, setSelectedImage, setImagePreview, setAlertDialog, setUploading);

  // Remove group image
 const onRemoveImage = () =>
    handleRemoveImage(group, onGroupUpdate, setConfirmDialog, setAlertDialog);

  // Update group name
const onUpdateGroupName = () =>
    handleUpdateGroupName(groupName, group, onGroupUpdate, setIsEditingName, setAlertDialog);

  // Search users
 const onSearchUsers = () =>
    handleSearchUsers(searchUsers, group, setSearchResults, setLoading);

  //  Add member
  const onAddMember = (userId) =>
    handleAddMember(userId, group, dispatch, onGroupUpdate, setSearchResults, setSearchUsers, setAlertDialog);
  // Remove member
const onRemoveMember = (memberId) =>
    handleRemoveMember(memberId, group, dispatch, onMemberRemoved, setConfirmDialog, setAlertDialog);
  //  make ADMIN FUNCTION
const onMakeAdmin = (memberId) =>
    handleMakeAdmin(memberId, group, dispatch, onGroupUpdate, setAlertDialog);
  // Remove Admin Function
 const onRemoveAdmin = (memberId) =>
    handleRemoveAdmin(memberId, group, dispatch, onGroupUpdate, setConfirmDialog, setAlertDialog);
  // Exit group
 const onExitGroup = () =>
    handleExitGroup(group, onGroupDeleted, onClose, setConfirmDialog, setAlertDialog);
  // Delete group
const onDeleteGroup = () =>
    handleDeleteGroup(group, currentUserId, onGroupDeleted, onClose, setConfirmDialog, setAlertDialog, setShowAddMember);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
        onClick={onClose}
      />

      {/*  CLOSE BUTTON */}
      <button
        onClick={onClose}
        className="fixed top-3 right-3 z-[60] p-1.5 bg-white/90 hover:bg-white rounded-full shadow-lg transition-all"
      >
        <svg
          className="w-4 h-4 text-gray-700"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>

      {/* Modal Container */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none">
        <div className="bg-white rounded-2xl w-[95vw] sm:w-full max-w-2xl max-h-[90vh] shadow-2xl relative pointer-events-auto overflow-hidden">
          {/* CONTENT  */}
          <div className="pt-8 pb-6 px-6 overflow-y-auto max-h-[90vh]">
            <div className="relative w-24 sm:w-32 h-24 sm:h-32 mx-auto mb-4">
              {/* Animated gradient ring */}
              <div
                className="absolute inset-0 bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 rounded-full animate-spin"
                style={{ animationDuration: "3s" }}
              ></div>

              {/* White ring */}
              <div className="absolute inset-1 bg-white rounded-full"></div>

              {/* Group image */}
              <div className="absolute inset-2 rounded-full overflow-hidden shadow-xl">
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                ) : groupImage ? (
                  <img
                    src={groupImage}
                    alt={group.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500">
                    <svg
                      className="w-16 h-16 text-white"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Admin buttons */}
              {isAdmin && (
                <>
                  <label
                    htmlFor="group-image-upload"
                    className="absolute bottom-0 right-0 p-2.5 bg-blue-500 hover:bg-blue-600 rounded-full shadow-lg border-2 border-white cursor-pointer transition-all transform hover:scale-110"
                  >
                    <svg
                      className="w-5 h-5 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  </label>
                  <input
                    ref={fileInputRef}
                    id="group-image-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />

                  {(groupImage || imagePreview) && (
                    <button
onClick={onRemoveImage}
                      className="absolute bottom-0 left-0 p-2.5 bg-red-500 hover:bg-red-600 rounded-full shadow-lg border-2 border-white transition-all transform hover:scale-110"
                    >
                      <svg
                        className="w-5 h-5 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Upload/Cancel buttons */}
            {selectedImage && isAdmin && (
              <div className="flex gap-2 mb-4">
                <button
onClick={onImageUpload}
                  disabled={uploading}
                  className="flex-1 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-lg font-semibold transition-all disabled:opacity-50"
                >
                  {uploading ? "Uploading..." : "Upload Image"}
                </button>
                <button
                  onClick={() => {
                    setSelectedImage(null);
                    setImagePreview(null);
                  }}
                  className="px-6 py-2.5 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg font-semibold transition-all"
                >
                  Cancel
                </button>
              </div>
            )}

            {/* Group name with edit */}
            {isEditingName && isAdmin ? (
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-center text-xl font-bold"
                />
                <button
onClick={onUpdateGroupName}
                  className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 font-semibold"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setIsEditingName(false);
                    setGroupName(group.name);
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 font-semibold"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 mb-2">
                <h2 className="text-2xl sm:text-3xl font-bold text-center bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent">
                  {groupName}
                </h2>
                {isAdmin && (
                  <button
                    onClick={() => setIsEditingName(true)}
                    className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    <svg
                      className="w-5 h-5 text-gray-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                      />
                    </svg>
                  </button>
                )}
              </div>
            )}

            <p className="text-center text-sm text-gray-600 mb-2">
              {group.description || "No description"}
            </p>
            <p className="text-center text-sm text-gray-600 mb-6">
              {group.members?.length} members
            </p>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-emerald-600 mb-1">
                  {group.members?.length || 0}
                </div>
                <div className="text-xs text-gray-600 font-medium uppercase tracking-wide">
                  Members
                </div>
              </div>
              <div className="bg-gradient-to-br from-teal-50 to-cyan-50 border border-teal-200 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-teal-600 mb-1">
                  {isCreator ? "Creator" : isAdmin ? "Admin" : "Member"}
                </div>
                <div className="text-xs text-gray-600 font-medium uppercase tracking-wide">
                  Your Role
                </div>
              </div>
            </div>

            {/* Add Member Button (Admin only) */}
            {isAdmin && (
              <div className="mb-6">
                <button
                  onClick={() => setShowAddMember(!showAddMember)}
                  className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl font-semibold flex items-center justify-center gap-2 shadow-lg transition-all"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                    />
                  </svg>
                  {showAddMember ? "Hide" : "Add Member"}
                </button>

                {showAddMember && (
                  <div className="mt-3 p-4 bg-gray-50 rounded-xl">
                    <div className="flex gap-2 mb-3">
                      <input
                        type="text"
                        placeholder="Search users..."
                        value={searchUsers}
                        onChange={(e) => setSearchUsers(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && onSearchUsers()}
                        className="flex-1 px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <button
  onClick={onSearchUsers}
                          disabled={loading}
                        className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold disabled:opacity-50"
                      >
                        {loading ? "..." : "Search"}
                      </button>
                    </div>

                    {searchResults.length > 0 && (
                      <div className="space-y-2">
                        {searchResults.map((user) => (
                          <div
                            key={user._id}
                            className="flex items-center justify-between p-3 bg-white rounded-lg"
                          >
                            <span className="font-medium">{user.username}</span>
                            <button
onClick={() => onAddMember(user._id)}
                              className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-sm font-semibold"
                            >
                              Add
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Members List */}
            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide flex items-center justify-between">
                <span>Members ({group.members?.length})</span>
                {group.members?.length > 5 && (
                  <span className="text-xs text-gray-500 font-normal">
                    Scroll to see all
                  </span>
                )}
              </h3>
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {group.members?.map((member) => {
                  const memberIsAdmin = group.admins?.some(
                    (a) => (a._id || a) === (member._id || member),
                  );
                  const memberIsCreator =
                    group.creator === member._id ||
                    group.creator?._id === member._id;
                  const canRemove =
                    isAdmin && !memberIsCreator && member._id !== currentUserId;

                  return (
                    <MemberItem
                      key={member._id}
                      member={member}
                      isAdmin={memberIsAdmin}
                      isCreator={memberIsCreator}
                      canRemove={canRemove}
                      currentUserId={currentUserId}
                      currentUserIsAdmin={isAdmin}
                      currentUserIsCreator={isCreator}
                   onRemove={() => onRemoveMember(member._id)}
onMakeAdmin={onMakeAdmin}
onRemoveAdmin={onRemoveAdmin}
                    />
                  );
                })}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              {isCreator ? (
                <button
onClick={onDeleteGroup}
                  className="w-full py-3 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white rounded-xl font-semibold shadow-lg transition-all transform hover:scale-105 flex items-center justify-center gap-2"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                  Delete Group
                </button>
              ) : (
                <button
onClick={onExitGroup}                  className="w-full py-3 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white rounded-xl font-semibold shadow-lg transition-all transform hover:scale-105 flex items-center justify-center gap-2"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                  Exit Group
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <ConfirmationDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
        onConfirm={confirmDialog.onConfirm}
        onCancel={confirmDialog.onCancel}
        title={confirmDialog.title}
        message={confirmDialog.message}
        type={confirmDialog.type}
      />

      <AlertDialog
        isOpen={alertDialog.isOpen}
        onClose={() => setAlertDialog({ ...alertDialog, isOpen: false })}
        title={alertDialog.title}
        message={alertDialog.message}
        type={alertDialog.type}
      />
    </>
  );
}
