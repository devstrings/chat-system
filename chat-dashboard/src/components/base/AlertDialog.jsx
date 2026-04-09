
import React from "react";
import Button from "@/components/base/Button";



const DIALOG_THEME = {
  // Overlay (background blur)
  overlay: "bg-black bg-opacity-50 backdrop-blur-sm",

  // Dialog box - WHITE THEME
  dialogBg: "bg-white",
  border: "border border-gray-200",

  // Icon background
  iconBg: "bg-red-50",
  iconColor: "text-red-500",

  // Text colors - DARK for readability
  titleColor: "text-gray-900",
  messageColor: "text-gray-600",
  highlightColor: "text-blue-600",

  // Buttons - Modern clean style
  cancelBtn: "bg-gray-100 hover:bg-gray-200 text-gray-900",
  confirmBtn: "bg-red-600 hover:bg-red-700 text-white",

  // Animation
  animation: "transform transition-all duration-200 hover:scale-105",
};

export default function AlertDialog({
  isOpen,
  onClose,
  title = "Success",
  message = "Operation completed successfully!",
  buttonText = "OK",
  icon = "success",
  type = "success",
}) {
  if (!isOpen) return null;

  const renderIcon = () => {
    if (icon === "success") {
      return (
        <svg
          className="w-12 h-12"
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
      );
    } else if (icon === "error") {
      return (
        <svg
          className="w-12 h-12"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      );
    } else {
      return (
        <svg
          className="w-12 h-12"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      );
    }
  };

  const getIconBgClass = () => {
    if (type === "error") return "bg-red-50";
    if (type === "info") return "bg-blue-50";
    return "bg-green-50";
  };

  const getIconColorClass = () => {
    if (type === "error") return "text-red-500";
    if (type === "info") return "text-blue-500";
    return "text-green-500";
  };

  const getButtonClass = () => {
    if (type === "error") return "bg-red-600 hover:bg-red-700";
    if (type === "info") return "bg-blue-600 hover:bg-blue-700";
    return "bg-green-600 hover:bg-green-700";
  };

  return (
    <div
      className={`fixed inset-0 ${DIALOG_THEME.overlay} flex items-center justify-center z-50`}
      onClick={onClose}
    >
      <div
        className={`${DIALOG_THEME.dialogBg} ${DIALOG_THEME.border} rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 animate-fadeIn`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div
            className={`${getIconBgClass()} ${getIconColorClass()} rounded-full p-4`}
          >
            {renderIcon()}
          </div>
        </div>

        {/* Title */}
        <h2
          className={`text-2xl font-bold ${DIALOG_THEME.titleColor} text-center mb-3`}
        >
          {title}
        </h2>

        {/* Message */}
        <p
          className={`${DIALOG_THEME.messageColor} text-center mb-8 leading-relaxed`}
        >
          {message}
        </p>

        {/* Single Button */}
        <Button
          onClick={onClose}
          className={`w-full px-6 py-3 ${getButtonClass()} text-white rounded-lg font-medium ${DIALOG_THEME.animation
            }`}
        >
          {buttonText}
        </Button>
      </div>
    </div>
  );
}