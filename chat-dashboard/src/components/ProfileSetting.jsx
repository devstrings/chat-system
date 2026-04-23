import React, { useState, useRef, useEffect } from "react";
import { useSelector } from "react-redux";
import { useAuthImage } from "@/hooks/useAuthImage";
import AlertDialog from "@/components/base/AlertDialog";
import {
  checkLocalAuth,
  loadBlockedUsers,
  loadPendingRequests,
  uploadProfilePicture,
  uploadCoverPhoto,
  removeCoverPhoto,
  removeProfilePicture,
  setPassword,
  changePassword,
  unblockUser,
  acceptFriendRequest,
  rejectFriendRequest,
  get2FAStatus,
  startTOTPSetup,
  verifyTOTPSetup,
  startEmail2FASetup,
  verifyEmail2FASetup,
  disable2FA,
  listPersonalAccessTokens,
  createPersonalAccessToken,
  revokePersonalAccessToken,
  saveKeyBackupToCloud,
  fetchKeyBackupFromCloud,
  rotateEncryptionKeys,
} from "@/actions/profileSettings.actions";
import { refreshKeyPair, decryptSharedKey } from "@/utils/cryptoUtils";
import axiosInstance from "@/lib/axiosInstance";
import API_BASE_URL from "@/config/api";

function AuthImage({ imageUrl, username, className }) {
  const { imageSrc, loading } = useAuthImage(imageUrl);
  if (loading)
    return <div className={`${className} bg-gray-300 animate-pulse`} />;
  if (imageSrc)
    return <img src={imageSrc} alt={username} className={className} />;
  return (
    <div
      className={`${className} bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold`}
    >
      {username?.charAt(0)?.toUpperCase()}
    </div>
  );
}

export default function ProfileSettings({
  currentUser,
  onClose,
  onProfileImageUpdate,
  coverPhotoUrl,
  initialView = "all",
}) {
  const sharedKeys = useSelector((state) => state.chat.sharedKeys || {});
  const [showPhotoMenu, setShowPhotoMenu] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alertDialog, setAlertDialog] = useState({
    isOpen: false,
    title: "",
    message: "",
    type: "success",
  });
  const [coverPhotoPreview, setCoverPhotoPreview] = useState(null);
  const [coverPhotoLoading, setCoverPhotoLoading] = useState(false);
  const coverFileInputRef = useRef(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [hasLocalAuth, setHasLocalAuth] = useState(false);
  const [authProvider, setAuthProvider] = useState(null);
  const [hasPassword, setHasPassword] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [changePasswordLoading, setChangePasswordLoading] = useState(false);
  const [changePasswordError, setChangePasswordError] = useState("");
  const [changePasswordSuccess, setChangePasswordSuccess] = useState("");
  const [twoFactorStatus, setTwoFactorStatus] = useState({
    enabled: false,
    method: null,
  });
  const [totpSetup, setTotpSetup] = useState(null);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [securityError, setSecurityError] = useState("");
  const [securitySuccess, setSecuritySuccess] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState([]);
  const [patName, setPatName] = useState("MCP token");
  const [patExpiryDays, setPatExpiryDays] = useState("");
  const [patVerificationCode, setPatVerificationCode] = useState("");
  const [patList, setPatList] = useState([]);
  const [generatedPat, setGeneratedPat] = useState("");

  const { imageSrc: profilePreview, loading: imageLoading } = useAuthImage(
    currentUser?.profileImage,
  );

  const [blockedUsers, setBlockedUsers] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [notifications, setNotifications] = useState({
    messageNotifications: true,
    friendRequests: true,
    soundEnabled: true,
  });

  const { imageSrc: coverPreview, loading: coverImageLoading } = useAuthImage(
    coverPhotoPreview || coverPhotoUrl || currentUser?.coverPhoto,
  );

  const fileInputRef = useRef(null);
  const keyImportInputRef = useRef(null);
  const photoMenuRef = useRef(null);

  //Check if user has local auth
 useEffect(() => {
  checkLocalAuthHandler();  
}, []);

 const checkLocalAuthHandler = async () => {
  try {
    const data = await checkLocalAuth();
    setAuthProvider(data.authProvider);
    setHasPassword(data.hasPassword);
    setHasLocalAuth(data.hasLocalAuth);
  } catch (err) {
    console.error("Check auth error:", err);
  }
};
 useEffect(() => {
  loadBlockedUsersHandler();   
  loadPendingRequestsHandler(); 
  loadSecurityStatusHandler();
  loadPersonalTokensHandler();
}, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        photoMenuRef.current &&
        !photoMenuRef.current.contains(event.target)
      ) {
        setShowPhotoMenu(false);
      }
    };
    if (showPhotoMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showPhotoMenu]);

const loadBlockedUsersHandler = async () => {
  try {
    const data = await loadBlockedUsers();
    setBlockedUsers(data);
  } catch (err) { }
};

const loadPendingRequestsHandler = async () => {
  try {
    const data = await loadPendingRequests();
    setPendingRequests(data);
  } catch (err) { }
};

  const handleUploadClick = () => {
    fileInputRef.current.click();
    setShowPhotoMenu(false);
  };

const handleFileChange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  setLoading(true);
  try {
    const imageUrl = await uploadProfilePicture(file);
    onProfileImageUpdate(imageUrl);
    setAlertDialog({
      isOpen: true,
      title: "Success!",
      message: "Profile picture uploaded successfully!",
      type: "success",
    });
  } catch (err) {
    console.error("Upload failed:", err);
    setAlertDialog({
      isOpen: true,
      title: "Error",
      message: "Failed to upload profile picture",
      type: "error",
    });
  } finally {
    setLoading(false);
  }
};

 const handleCoverPhotoChange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  setCoverPhotoLoading(true);
  try {
    const coverPhotoWithTimestamp = await uploadCoverPhoto(file);
    onProfileImageUpdate(coverPhotoWithTimestamp, true);
    setCoverPhotoPreview(coverPhotoWithTimestamp);

    setAlertDialog({
      isOpen: true,
      title: "Success!",
      message: "Cover photo uploaded successfully!",
      type: "success",
    });
  } catch (err) {
    console.error("Cover upload failed:", err);
    setAlertDialog({
      isOpen: true,
      title: "Error",
      message: "Failed to upload cover photo",
      type: "error",
    });
  } finally {
    setCoverPhotoLoading(false);
  }
};
 const handleRemoveCoverPhoto = async () => {
  setCoverPhotoLoading(true);
  try {
    await removeCoverPhoto();
    onProfileImageUpdate(null, true);
    setCoverPhotoPreview(null);

    setAlertDialog({
      isOpen: true,
      title: "Removed!",
      message: "Cover photo removed successfully",
      type: "success",
    });
  } catch (err) {
    console.error("Remove cover failed:", err);
    setAlertDialog({
      isOpen: true,
      title: "Error",
      message: "Failed to remove cover photo",
      type: "error",
    });
  } finally {
    setCoverPhotoLoading(false);
  }
};

const handleRemoveImage = async () => {
  setLoading(true);
  try {
    await removeProfilePicture();
    onProfileImageUpdate(null);
    setShowPhotoMenu(false);
    setAlertDialog({
      isOpen: true,
      title: "Removed!",
      message: "Profile picture removed successfully",
      type: "success",
    });
  } catch (err) {
    console.error("Remove failed:", err);
    setAlertDialog({
      isOpen: true,
      title: "Error",
      message: "Failed to remove profile picture",
      type: "error",
    });
  } finally {
    setLoading(false);
  }
};

  // Set Password Handler
 const handleSetPassword = async (e) => {
  e.preventDefault();
  setPasswordError("");
  setPasswordSuccess("");

  if (newPassword.length < 6) {
    setPasswordError("Password must be at least 6 characters");
    return;
  }

  if (newPassword !== confirmPassword) {
    setPasswordError("Passwords do not match");
    return;
  }

  setPasswordLoading(true);

  try {
    const response = await setPassword(newPassword);
    setPasswordSuccess(response.message);
    setNewPassword("");
    setConfirmPassword("");
    setHasPassword(true);

    await checkLocalAuthHandler();

    setTimeout(() => {
      setPasswordSuccess("Password set successfully! Refreshing...");
      window.location.reload();
    }, 1000);
  } catch (err) {
    console.error("Set Password Error:", err.response?.data);
    setPasswordError(err.response?.data?.message || "Failed to set password");
  } finally {
    setPasswordLoading(false);
  }
};
  // Add handler
const handleChangePassword = async (e) => {
  e.preventDefault();
  setChangePasswordError("");
  setChangePasswordSuccess("");

  if (!oldPassword) {
    setChangePasswordError("Current password is required");
    return;
  }

  if (newPassword.length < 6) {
    setChangePasswordError("New password must be at least 6 characters");
    return;
  }

  if (newPassword !== confirmPassword) {
    setChangePasswordError("Passwords do not match");
    return;
  }

  if (oldPassword === newPassword) {
    setChangePasswordError("New password must be different");
    return;
  }

  setChangePasswordLoading(true);

  try {
    const response = await changePassword(oldPassword, newPassword);
    setChangePasswordSuccess(response.message);
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");

    await checkLocalAuthHandler();

    setTimeout(() => {
      setChangePasswordSuccess("");
    }, 5000);
  } catch (err) {
    setChangePasswordError(
      err.response?.data?.message || "Failed to change password",
    );
  } finally {
    setChangePasswordLoading(false);
  }
};
const handleUnblockUser = async (userId) => {
  try {
    await unblockUser(userId);
    setBlockedUsers(blockedUsers.filter((b) => b.blocked._id !== userId));
    setAlertDialog({
      isOpen: true,
      title: "Success!",
      message: "User unblocked successfully!",
      type: "success",
    });
  } catch (err) {
    console.error("Unblock failed:", err);
    setAlertDialog({
      isOpen: true,
      title: "Error",
      message: "Failed to unblock user",
      type: "error",
    });
  }
};

const handleAcceptRequest = async (requestId) => {
  try {
    await acceptFriendRequest(requestId);
    setPendingRequests(pendingRequests.filter((r) => r._id !== requestId));
    setAlertDialog({
      isOpen: true,
      title: "Accepted!",
      message: "Friend request accepted!",
      type: "success",
    });
    setTimeout(() => window.location.reload(), 1500);
  } catch (err) {
    console.error("Accept failed:", err);
    setAlertDialog({
      isOpen: true,
      title: "Error",
      message: "Failed to accept request",
      type: "error",
    });
  }
};

const handleRejectRequest = async (requestId) => {
  try {
    await rejectFriendRequest(requestId);
    setPendingRequests(pendingRequests.filter((r) => r._id !== requestId));
    setAlertDialog({
      isOpen: true,
      title: "Rejected",
      message: "Friend request rejected",
      type: "info",
    });
  } catch (err) {
    console.error("Reject failed:", err);
    setAlertDialog({
      isOpen: true,
      title: "Error",
      message: "Failed to reject request",
      type: "error",
    });
  }
};

const handleRefreshE2EEKeys = async () => {
  try {
    const userId = currentUser._id || currentUser.id;
    const currentPrivateKey = localStorage.getItem(`chat_sk_${userId}`);

    const conversationKeysMap = new Map();
    Object.entries(sharedKeys || {}).forEach(([conversationId, sharedKey]) => {
      if (typeof sharedKey === "string" && sharedKey.length > 0) {
        conversationKeysMap.set(conversationId, sharedKey);
      }
    });

    if (currentPrivateKey) {
      try {
        const friendsRes = await axiosInstance.get(`${API_BASE_URL}/api/friends/list`);
        const friends = Array.isArray(friendsRes.data) ? friendsRes.data : [];
        for (const friend of friends) {
          try {
            const convRes = await axiosInstance.post(
              `${API_BASE_URL}/api/messages/conversation`,
              { otherUserId: friend._id, skipCreate: true },
            );
            const conv = convRes.data;
            if (!conv?._id || !conv?.sharedEncryptedKeys) continue;
            const encryptedForMe = conv.sharedEncryptedKeys[userId];
            if (!encryptedForMe) continue;
            const plainSharedKey = await decryptSharedKey(
              encryptedForMe,
              currentPrivateKey,
            );
            if (plainSharedKey) {
              conversationKeysMap.set(conv._id, plainSharedKey);
            }
          } catch (error) {
            // Ignore per-conversation lookup errors and continue.
          }
        }
      } catch (error) {
        // Keep using locally loaded keys if friends/conversations fetch fails.
      }
    }

    const newPubKey = await refreshKeyPair(userId);
    const conversationKeys = Array.from(conversationKeysMap.entries()).map(
      ([conversationId, sharedKey]) => ({
        conversationId,
        sharedKey,
      }),
    );
    await rotateEncryptionKeys({
      publicKey: newPubKey,
      conversationKeys,
    });
    setAlertDialog({
      isOpen: true,
      title: "Keys Refreshed",
      message:
        "New encryption keys are active and existing conversations were re-keyed. Please back up your new key now.",
      type: "info",
    });
  } catch (err) {
    console.error("Failed to refresh E2EE keys:", err);
    setAlertDialog({
      isOpen: true,
      title: "Error",
      message: "Failed to refresh E2EE keys.",
      type: "error",
    });
  }
};

const handleDownloadKeyBackup = () => {
  try {
    const userId = currentUser?._id || currentUser?.id;
    const publicKey = localStorage.getItem(`chat_pk_${userId}`);
    const privateKey = localStorage.getItem(`chat_sk_${userId}`);
    if (!publicKey || !privateKey) {
      setAlertDialog({
        isOpen: true,
        title: "No keys found",
        message: "No local keypair found to download.",
        type: "error",
      });
      return;
    }

    const payload = {
      version: 1,
      userId,
      exportedAt: new Date().toISOString(),
      publicKey,
      privateKey,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `chat-e2ee-key-backup-${userId}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  } catch (error) {
    console.error("Download key backup failed:", error);
  }
};

const handleBackupToCloud = async () => {
  try {
    const userId = currentUser?._id || currentUser?.id;
    const publicKey = localStorage.getItem(`chat_pk_${userId}`);
    const privateKey = localStorage.getItem(`chat_sk_${userId}`);
    if (!publicKey || !privateKey) {
      throw new Error("No local keypair found");
    }
    await saveKeyBackupToCloud({ publicKey, privateKey });
    setAlertDialog({
      isOpen: true,
      title: "Backup saved",
      message: "Your encryption keypair is backed up to cloud.",
      type: "success",
    });
  } catch (err) {
    setAlertDialog({
      isOpen: true,
      title: "Backup failed",
      message: err.message || "Unable to save key backup to cloud.",
      type: "error",
    });
  }
};

const handleRestoreFromCloud = async () => {
  try {
    const userId = currentUser?._id || currentUser?.id;
    const keyBackup = await fetchKeyBackupFromCloud();
    if (!keyBackup?.publicKey || !keyBackup?.privateKey) {
      throw new Error("No cloud backup found");
    }
    localStorage.setItem(`chat_pk_${userId}`, keyBackup.publicKey);
    localStorage.setItem(`chat_sk_${userId}`, keyBackup.privateKey);
    await axiosInstance.post(`${API_BASE_URL}/api/auth/public-key`, {
      publicKey: keyBackup.publicKey,
    });
    setAlertDialog({
      isOpen: true,
      title: "Backup restored",
      message: "Encryption keypair restored from cloud.",
      type: "success",
    });
  } catch (err) {
    setAlertDialog({
      isOpen: true,
      title: "Restore failed",
      message: err.message || "Unable to restore key backup from cloud.",
      type: "error",
    });
  }
};

const handleImportKeyFile = async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const userId = currentUser?._id || currentUser?.id;
    const text = await file.text();
    const parsed = JSON.parse(text);
    if (!parsed?.publicKey || !parsed?.privateKey) {
      throw new Error("Invalid key backup file");
    }
    localStorage.setItem(`chat_pk_${userId}`, parsed.publicKey);
    localStorage.setItem(`chat_sk_${userId}`, parsed.privateKey);
    await axiosInstance.post(`${API_BASE_URL}/api/auth/public-key`, {
      publicKey: parsed.publicKey,
    });
    setAlertDialog({
      isOpen: true,
      title: "Key imported",
      message: "Encryption keypair imported successfully.",
      type: "success",
    });
  } catch (err) {
    setAlertDialog({
      isOpen: true,
      title: "Import failed",
      message: err.message || "Unable to import key file.",
      type: "error",
    });
  } finally {
    event.target.value = "";
  }
};

const loadSecurityStatusHandler = async () => {
  try {
    const data = await get2FAStatus();
    setTwoFactorStatus({
      enabled: data.enabled,
      method: data.method,
    });
  } catch (err) {
    console.error("Failed to load 2FA status:", err);
  }
};

const loadPersonalTokensHandler = async () => {
  try {
    const data = await listPersonalAccessTokens();
    setPatList(Array.isArray(data) ? data : []);
  } catch (err) {
    console.error("Failed to load personal access tokens:", err);
  }
};

const handleStartTOTPSetup = async () => {
  setSecurityError("");
  setSecuritySuccess("");
  try {
    const data = await startTOTPSetup();
    setTotpSetup(data);
    setSecuritySuccess("Scan QR with Authenticator app and verify your code.");
  } catch (err) {
    setSecurityError(err.response?.data?.message || "Failed to start TOTP setup");
  }
};

const handleVerifyTOTPSetup = async () => {
  setSecurityError("");
  setSecuritySuccess("");
  try {
    const data = await verifyTOTPSetup(twoFactorCode);
    setRecoveryCodes(data.recoveryCodes || []);
    setTwoFactorCode("");
    setTotpSetup(null);
    await loadSecurityStatusHandler();
    setSecuritySuccess(data.message || "TOTP enabled successfully");
    await loadPersonalTokensHandler();
  } catch (err) {
    setSecurityError(err.response?.data?.message || "Failed to verify TOTP setup");
  }
};

const handleEnableEmail2FA = async () => {
  setSecurityError("");
  setSecuritySuccess("");
  try {
    await startEmail2FASetup();
    setSecuritySuccess("Email verification code sent. Enter it below to enable 2FA.");
  } catch (err) {
    setSecurityError(err.response?.data?.message || "Failed to start email 2FA");
  }
};

const handleVerifyEmail2FA = async () => {
  setSecurityError("");
  setSecuritySuccess("");
  try {
    const data = await verifyEmail2FASetup(twoFactorCode);
    setRecoveryCodes(data.recoveryCodes || []);
    setTwoFactorCode("");
    await loadSecurityStatusHandler();
    setSecuritySuccess(data.message || "Email 2FA enabled successfully");
    await loadPersonalTokensHandler();
  } catch (err) {
    setSecurityError(err.response?.data?.message || "Failed to verify email 2FA");
  }
};

const handleDisable2FA = async () => {
  setSecurityError("");
  setSecuritySuccess("");
  try {
    const data = await disable2FA({ code: twoFactorCode });
    setTwoFactorCode("");
    setRecoveryCodes([]);
    setTotpSetup(null);
    setGeneratedPat("");
    setPatList([]);
    await loadSecurityStatusHandler();
    setSecuritySuccess(data.message || "2FA disabled");
  } catch (err) {
    setSecurityError(err.response?.data?.message || "Failed to disable 2FA");
  }
};

const handleCreatePAT = async () => {
  setSecurityError("");
  setSecuritySuccess("");
  setGeneratedPat("");
  if (!patVerificationCode) {
    setSecurityError("2FA code is required to create a personal access token");
    return;
  }
  try {
    const data = await createPersonalAccessToken({
      name: patName,
      expiresInDays: patExpiryDays ? Number(patExpiryDays) : undefined,
      code: patVerificationCode,
    });
    setGeneratedPat(data.token);
    setSecuritySuccess("Personal access token created. Copy it now; it will only be shown once.");
    setPatExpiryDays("");
    setPatVerificationCode("");
    await loadPersonalTokensHandler();
  } catch (err) {
    setSecurityError(err.response?.data?.message || "Failed to create personal access token");
  }
};

const handleRevokePAT = async (tokenId) => {
  try {
    await revokePersonalAccessToken(tokenId);
    await loadPersonalTokensHandler();
  } catch (err) {
    setSecurityError(err.response?.data?.message || "Failed to revoke token");
  }
};

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-0 md:p-4">
      <div className="bg-white rounded-none md:rounded-lg shadow-2xl w-full h-full md:h-auto md:max-w-2xl md:max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-white px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Profile</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-900"
          >
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Profile Section with Cover Photo */}
          {(initialView === "all" ||
            initialView === "profile" ||
            initialView === "settings") && (
              <div className="bg-gray-50 rounded-lg overflow-hidden border border-gray-200">
                {/* Cover Photo Section */}
                <div className="relative h-24 sm:h-32 bg-gradient-to-r from-blue-500 to-purple-600">
                  {coverImageLoading ? (
                    <div className="w-full h-full bg-gray-700 animate-pulse" />
                  ) : coverPreview ? (
                    <img
                      src={coverPreview}
                      alt="cover"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-r from-blue-500 to-purple-600" />
                  )}

                  <button
                    onClick={() => coverFileInputRef.current.click()}
                    className="absolute top-2 right-2 p-2 bg-gray-800 bg-opacity-70 hover:bg-opacity-90 rounded-full transition-colors"
                    title="Change cover photo"
                  >
                    <svg
                      className="w-4 h-4 text-white"
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
                  </button>

                  {currentUser?.coverPhoto && (
                    <button
                      onClick={handleRemoveCoverPhoto}
                      className="absolute top-2 right-12 p-2 bg-red-600 bg-opacity-70 hover:bg-opacity-90 rounded-full transition-colors"
                      title="Remove cover photo"
                    >
                      <svg
                        className="w-4 h-4 text-white"
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
                </div>

                {/* Profile Info */}
                <div className="px-6 pb-6">
                  <div className="flex items-end gap-4 -mt-6 pt-2">
                    <div className="relative flex-shrink-0">
                      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-4 border-white shadow-lg">
                        {imageLoading ? (
                          <div className="w-full h-full bg-gray-300 animate-pulse" />
                        ) : profilePreview ? (
                          <img
                            src={profilePreview}
                            alt="profile"
                            className="w-full h-full object-cover"
                            crossOrigin="anonymous"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-3xl font-semibold">
                            {currentUser?.username?.charAt(0)?.toUpperCase() ||
                              "U"}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex-1 pt-4">
                      <p className="text-gray-900 font-semibold text-lg mb-1">
                        {currentUser?.username || "User"}
                      </p>
                      <p className="text-gray-600 text-sm mb-3">
                        {currentUser?.email || "email@example.com"}
                      </p>

                      <div className="relative" ref={photoMenuRef}>
                        <button
                          onClick={() => setShowPhotoMenu(!showPhotoMenu)}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                            />
                          </svg>
                          Manage Photo
                        </button>

                        {showPhotoMenu && (
                          <>
                            <div
                              className="fixed inset-0 z-40"
                              onClick={() => setShowPhotoMenu(false)}
                            />

                            <div className="absolute left-0 bottom-full mb-2 w-48 bg-white border border-gray-200 rounded-lg shadow-2xl z-50 overflow-hidden">
                              <button
                                onClick={handleUploadClick}
                                className="w-full px-4 py-3 text-left text-gray-900 hover:bg-gray-100 transition-colors flex items-center gap-3 text-sm"
                              >
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                  />
                                </svg>
                                {currentUser?.profileImage
                                  ? "Change Photo"
                                  : "Upload Photo"}
                              </button>

                              {currentUser?.profileImage && (
                                <button
                                  onClick={handleRemoveImage}
                                  className="w-full px-4 py-3 text-left text-red-600 hover:bg-red-50 transition-colors flex items-center gap-3 text-sm border-t border-gray-200"
                                >
                                  <svg
                                    className="w-4 h-4"
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
                                  Remove Profile
                                </button>
                              )}
                            </div>
                          </>
                        )}

                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleFileChange}
                        />
                      </div>
                    </div>
                  </div>

                  <input
                    ref={coverFileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleCoverPhotoChange}
                  />
                </div>
              </div>
            )}
          {/* Debug logs */}
          {console.log(" Render Check:", {
            authProvider,
            hasPassword,
            condition1: authProvider && authProvider !== "local",
            condition2: !hasPassword,
            finalCondition:
              authProvider && authProvider !== "local" && !hasPassword,
          })}
          {/* Set Password Section (Only for SSO users) */}

          {initialView === "password" &&
            authProvider &&
            authProvider !== "local" &&
            !hasPassword && (
              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <h3 className="text-gray-900 font-semibold mb-2 text-lg flex items-center gap-2">
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
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                  Set Password
                </h3>
                <p className="text-gray-600 text-sm mb-4">
                  You signed up with{" "}
                  {authProvider === "google" ? "Google" : "Facebook"}. Set a
                  password to enable email login.
                </p>

                {passwordError && (
                  <div className="bg-red-500/20 border border-red-500 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
                    {passwordError}
                  </div>
                )}

                {passwordSuccess && (
                  <div className="bg-green-500/20 border border-green-500 text-green-700 px-4 py-3 rounded-lg mb-4 text-sm">
                    {passwordSuccess}
                  </div>
                )}

                <form onSubmit={handleSetPassword} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter new password (min 6 characters)"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        minLength={6}
                        className="w-full p-3 pr-12 rounded-lg bg-white border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? (
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
                              d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                            />
                          </svg>
                        ) : (
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
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Confirm Password
                    </label>
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={6}
                      className="w-full p-2.5 sm:p-3 rounded-lg bg-white border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900 text-sm"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={passwordLoading}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-3 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                  >
                    {passwordLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white"></div>
                        Setting Password...
                      </span>
                    ) : (
                      "Set Password"
                    )}
                  </button>
                </form>
              </div>
            )}

          {/*  CHANGE PASSWORD SECTION  */}
          {initialView === "password" && hasPassword && (
            <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
              <h3 className="text-gray-900 font-semibold mb-2 text-lg flex items-center gap-2">
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
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Change Password
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                Update your current password
              </p>

              {changePasswordError && (
                <div className="bg-red-500/20 border border-red-500 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
                  {changePasswordError}
                </div>
              )}

              {changePasswordSuccess && (
                <div className="bg-green-500/20 border border-green-500 text-green-700 px-4 py-3 rounded-lg mb-4 text-sm">
                  {changePasswordSuccess}
                </div>
              )}

              <form onSubmit={handleChangePassword} className="space-y-4">
                {/* Current Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Current Password
                  </label>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter current password"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    required
                    className="w-full p-3 rounded-lg bg-white border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900"
                  />
                </div>

                {/* New Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter new password (min 6 characters)"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={6}
                      className="w-full p-3 pr-12 rounded-lg bg-white border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? (
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
                            d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                          />
                        </svg>
                      ) : (
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
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* Confirm New Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm New Password
                  </label>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full p-3 rounded-lg bg-white border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900"
                  />
                </div>

                <button
                  type="submit"
                  disabled={changePasswordLoading}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-3 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-wait shadow-lg hover:shadow-xl"
                >
                  {changePasswordLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white"></div>
                      Changing Password...
                    </span>
                  ) : (
                    "Change Password"
                  )}
                </button>
              </form>
            </div>
          )}
          {(initialView === "all" || initialView === "settings") && (
            <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
              <h3 className="text-gray-900 font-semibold mb-3 text-lg">
                Security: 2FA and Personal Access Tokens
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                Personal access token generation is available only when 2FA is enabled.
              </p>
              <p className="text-sm text-gray-800 mb-4">
                2FA Status:{" "}
                <span className="font-semibold">
                  {twoFactorStatus.enabled
                    ? `Enabled (${twoFactorStatus.method?.toUpperCase()})`
                    : "Disabled"}
                </span>
              </p>

              {securityError && (
                <div className="bg-red-500/20 border border-red-500 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
                  {securityError}
                </div>
              )}
              {securitySuccess && (
                <div className="bg-green-500/20 border border-green-500 text-green-700 px-4 py-3 rounded-lg mb-4 text-sm">
                  {securitySuccess}
                </div>
              )}

              {!twoFactorStatus.enabled ? (
                <div className="space-y-3 mb-4">
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={handleStartTOTPSetup}
                      className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md"
                    >
                      Enable TOTP
                    </button>
                    <button
                      onClick={handleEnableEmail2FA}
                      className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-md"
                    >
                      Enable Email 2FA
                    </button>
                  </div>

                  {totpSetup?.qrCodeDataUrl && (
                    <div className="bg-white rounded-lg p-3 border border-gray-200">
                      <img src={totpSetup.qrCodeDataUrl} alt="TOTP QR" className="w-40 h-40" />
                      <p className="text-xs text-gray-600 mt-2 break-all">
                        Secret: {totpSetup.base32}
                      </p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={twoFactorCode}
                      onChange={(e) => setTwoFactorCode(e.target.value)}
                      placeholder="Enter 2FA code"
                      className="flex-1 p-2 rounded-lg bg-white border border-gray-300 text-gray-900"
                    />
                    {totpSetup ? (
                      <button
                        onClick={handleVerifyTOTPSetup}
                        className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-md"
                      >
                        Verify TOTP
                      </button>
                    ) : (
                      <button
                        onClick={handleVerifyEmail2FA}
                        className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-md"
                      >
                        Verify Email
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="mb-4">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={twoFactorCode}
                      onChange={(e) => setTwoFactorCode(e.target.value)}
                      placeholder="Optional: enter current 2FA code"
                      className="flex-1 p-2 rounded-lg bg-white border border-gray-300 text-gray-900"
                    />
                    <button
                      onClick={handleDisable2FA}
                      className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-md"
                    >
                      Disable 2FA
                    </button>
                  </div>
                </div>
              )}

              {recoveryCodes.length > 0 && (
                <div className="bg-white rounded-lg p-3 border border-gray-200 mb-4">
                  <p className="text-sm text-gray-900 font-semibold mb-2">Recovery Codes</p>
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-700">
                    {recoveryCodes.map((item) => (
                      <span key={item} className="bg-gray-100 px-2 py-1 rounded">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-white rounded-lg p-3 border border-gray-200 mb-4">
                <p className="text-sm text-gray-900 font-semibold mb-2">
                  Create Personal Access Token
                </p>
                {!twoFactorStatus.enabled ? (
                  <p className="text-sm text-gray-600">
                    Enable 2FA first to create personal access tokens.
                  </p>
                ) : (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={patName}
                      onChange={(e) => setPatName(e.target.value)}
                      placeholder="Token name"
                      className="w-full p-2 rounded-lg bg-white border border-gray-300 text-gray-900"
                    />
                    <input
                      type="number"
                      min={1}
                      max={365}
                      value={patExpiryDays}
                      onChange={(e) => setPatExpiryDays(e.target.value)}
                      placeholder="Expiry days (optional)"
                      className="w-full p-2 rounded-lg bg-white border border-gray-300 text-gray-900"
                    />
                    <input
                      type="text"
                      value={patVerificationCode}
                      onChange={(e) => setPatVerificationCode(e.target.value)}
                      placeholder="Enter current 2FA code"
                      className="w-full p-2 rounded-lg bg-white border border-gray-300 text-gray-900"
                    />
                    {twoFactorStatus.method === "email" && (
                      <button
                        onClick={handleEnableEmail2FA}
                        className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-md"
                      >
                        Send Email 2FA Code
                      </button>
                    )}
                    <button
                      onClick={handleCreatePAT}
                      className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-md"
                    >
                      Generate Token
                    </button>
                  </div>
                )}
                {generatedPat && (
                  <div className="mt-3 bg-yellow-100 border border-yellow-400 rounded p-2">
                    <p className="text-xs text-yellow-800 mb-1">
                      Copy this token now. It will not be shown again.
                    </p>
                    <code className="text-xs break-all text-gray-800">{generatedPat}</code>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-lg p-3 border border-gray-200">
                <p className="text-sm text-gray-900 font-semibold mb-2">Existing Tokens</p>
                {patList.length === 0 ? (
                  <p className="text-sm text-gray-600">No personal access tokens found.</p>
                ) : (
                  <div className="space-y-2">
                    {patList.map((token) => (
                      <div
                        key={token._id}
                        className="flex items-center justify-between bg-gray-50 rounded p-2"
                      >
                        <div>
                          <p className="text-sm text-gray-900">{token.name}</p>
                          <p className="text-xs text-gray-600">
                            {token.tokenPrefix}... {token.lastUsedAt ? "used" : "unused"}
                          </p>
                        </div>
                        <button
                          onClick={() => handleRevokePAT(token._id)}
                          className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded"
                        >
                          Revoke
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          {(initialView === "all" || initialView === "settings") && (
            <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
              <h3 className="text-gray-900 font-semibold mb-4 text-lg flex items-center gap-2">
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
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
                Notifications
              </h3>
              <div className="space-y-3">
                <label className="flex items-center justify-between p-3 bg-white rounded-lg cursor-pointer hover:bg-gray-100 transition-colors border border-gray-200">
                  <span className="text-gray-900 text-sm">
                    Message Notifications
                  </span>
                  <input
                    type="checkbox"
                    checked={notifications.messageNotifications}
                    onChange={(e) =>
                      setNotifications({
                        ...notifications,
                        messageNotifications: e.target.checked,
                      })
                    }
                    className="w-5 h-5 text-blue-600 rounded"
                  />
                </label>
                <label className="flex items-center justify-between p-3 bg-white rounded-lg cursor-pointer hover:bg-gray-100 transition-colors border border-gray-200">
                  <span className="text-gray-900 text-sm">Friend Requests</span>
                  <input
                    type="checkbox"
                    checked={notifications.friendRequests}
                    onChange={(e) =>
                      setNotifications({
                        ...notifications,
                        friendRequests: e.target.checked,
                      })
                    }
                    className="w-5 h-5 text-blue-600 rounded"
                  />
                </label>
                <label className="flex items-center justify-between p-3 bg-white rounded-lg cursor-pointer hover:bg-gray-100 transition-colors border border-gray-200">
                  <span className="text-gray-900 text-sm">Sound Enabled</span>
                  <input
                    type="checkbox"
                    checked={notifications.soundEnabled}
                    onChange={(e) =>
                      setNotifications({
                        ...notifications,
                        soundEnabled: e.target.checked,
                      })
                    }
                    className="w-5 h-5 text-blue-600 rounded"
                  />
                </label>
              </div>
            </div>
          )}

          {/* E2EE Security Section */}
          {(initialView === "all" || initialView === "settings") && (
            <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
              <h3 className="text-gray-900 font-semibold mb-2 text-lg flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                End-to-End Encryption
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                Your messages are secured with End-to-End Encryption. You can refresh your encryption keys here. Old messages will remain readable on this device.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleRefreshE2EEKeys}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Refresh Keys
                </button>
                <button
                  onClick={handleDownloadKeyBackup}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Download Key Backup
                </button>
                <button
                  onClick={() => keyImportInputRef.current?.click()}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-800 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Import Key File
                </button>
                <button
                  onClick={handleBackupToCloud}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Backup to Cloud
                </button>
                <button
                  onClick={handleRestoreFromCloud}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Restore from Cloud
                </button>
              </div>
              <input
                ref={keyImportInputRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={handleImportKeyFile}
              />
            </div>
          )}

          {/* Friend Requests Section */}
          {(initialView === "all" || initialView === "settings") && (
            <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
              <h3 className="text-gray-900 font-semibold mb-4 text-lg flex items-center gap-2">
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
                Friend Requests
                {pendingRequests.length > 0 && (
                  <span className="px-2 py-1 bg-yellow-600 text-white text-xs rounded-full">
                    {pendingRequests.length}
                  </span>
                )}
              </h3>

              {pendingRequests.length === 0 ? (
                <p className="text-gray-600 text-sm text-center py-4">
                  No pending requests
                </p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {pendingRequests.map((request) => (
                    <div
                      key={request._id}
                      className="bg-white rounded-lg p-3 border border-gray-200"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-10 rounded-full overflow-hidden">
                            <AuthImage
                              imageUrl={request.sender.profileImage}
                              username={request.sender.username}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {request.sender.username}
                            </p>
                            <p className="text-xs text-gray-600">
                              {request.sender.email}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAcceptRequest(request._id)}
                          className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md transition-colors"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleRejectRequest(request._id)}
                          className="flex-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-md transition-colors"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {/* Blocked Users Section */}
          {(initialView === "all" || initialView === "settings") && (
            <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
              <h3 className="text-gray-900 font-semibold mb-4 text-lg flex items-center gap-2">
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
                    d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                  />
                </svg>
                Blocked Users
                {blockedUsers.length > 0 && (
                  <span className="px-2 py-1 bg-red-600 text-white text-xs rounded-full">
                    {blockedUsers.length}
                  </span>
                )}
              </h3>

              {blockedUsers.length === 0 ? (
                <p className="text-gray-600 text-sm text-center py-4">
                  No blocked users
                </p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {blockedUsers.map((block) => (
                    <div
                      key={block._id}
                      className="bg-white rounded-lg p-3 border border-gray-200"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-10 rounded-full overflow-hidden">
                            <AuthImage
                              imageUrl={block.blocked.profileImage}
                              username={block.blocked.username}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {block.blocked.username}
                            </p>
                            <p className="text-xs text-gray-600">
                              {block.blocked.email}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleUnblockUser(block.blocked._id)}
                          className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md transition-colors"
                        >
                          Unblock
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          <AlertDialog
            isOpen={alertDialog.isOpen}
            onClose={() => setAlertDialog({ ...alertDialog, isOpen: false })}
            title={alertDialog.title}
            message={alertDialog.message}
            type={alertDialog.type}
          />
        </div>
      </div>
    </div>
  );
}
