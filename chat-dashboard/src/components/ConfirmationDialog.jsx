import React from 'react';


const DIALOG_THEME = {
  // Overlay (background blur)
  overlay: 'bg-black bg-opacity-60 backdrop-blur-sm',
  
  // Dialog box
  dialogBg: 'bg-gradient-to-br from-gray-800 to-gray-900',
  border: 'border-2 border-gray-700',
  
  // Icon background
  iconBg: 'bg-red-500 bg-opacity-20',
  iconColor: 'text-red-400',
  
  // Text colors
  titleColor: 'text-white',
  messageColor: 'text-gray-300',
  highlightColor: 'text-blue-400',
  
  // Buttons
  cancelBtn: 'bg-gray-700 hover:bg-gray-600 text-white',
  confirmBtn: 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/30',
  
  // Animation
  animation: 'transform transition-all duration-200 hover:scale-105',
};


export default function ConfirmationDialog({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = "Confirm Action",
  message = "Are you sure you want to proceed?",
  confirmText = "Confirm",
  cancelText = "Cancel",
  highlightText = null, 
  icon = "warning", 
  type = "danger" 
}) {
  if (!isOpen) return null;

  // Icon selection
  const renderIcon = () => {
    if (icon === "block") {
      return (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
        </svg>
      );
    } else if (icon === "delete") {
      return (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      );
    } else if (icon === "success") {
      return (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    } else if (icon === "unfriend") {
      return (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" />
        </svg>
      );
    } else {
      // Default warning icon
      return (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      );
    }
  };

  // Button color based on type
  const getConfirmButtonClass = () => {
    if (type === "success") {
      return 'bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-500/30';
    } else if (type === "info") {
      return 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/30';
    }
    return DIALOG_THEME.confirmBtn;
  };

  // Icon color based on type
  const getIconBgClass = () => {
    if (type === "success") {
      return 'bg-green-500 bg-opacity-20';
    } else if (type === "info") {
      return 'bg-blue-500 bg-opacity-20';
    }
    return DIALOG_THEME.iconBg;
  };

  const getIconColorClass = () => {
    if (type === "success") {
      return 'text-green-400';
    } else if (type === "info") {
      return 'text-blue-400';
    }
    return DIALOG_THEME.iconColor;
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
          <div className={`${getIconBgClass()} ${getIconColorClass()} rounded-full p-4`}>
            {renderIcon()}
          </div>
        </div>

        {/* Title */}
        <h2 className={`text-2xl font-bold ${DIALOG_THEME.titleColor} text-center mb-3`}>
          {title}
        </h2>

        {/* Message */}
        <p className={`${DIALOG_THEME.messageColor} text-center mb-8 leading-relaxed`}>
          {highlightText ? (
            <>
              {message.split(highlightText)[0]}
              <span className={`font-semibold ${DIALOG_THEME.highlightColor}`}>
                {highlightText}
              </span>
              {message.split(highlightText)[1]}
            </>
          ) : (
            message
          )}
        </p>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className={`flex-1 px-6 py-3 ${DIALOG_THEME.cancelBtn} rounded-lg font-medium ${DIALOG_THEME.animation}`}
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`flex-1 px-6 py-3 ${getConfirmButtonClass()} rounded-lg font-medium ${DIALOG_THEME.animation}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}


export function AlertDialog({ 
  isOpen, 
  onClose, 
  title = "Success",
  message = "Operation completed successfully!",
  buttonText = "OK",
  icon = "success",
  type = "success"
}) {
  if (!isOpen) return null;

  const renderIcon = () => {
    if (icon === "success") {
      return (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    } else if (icon === "error") {
      return (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    } else {
      return (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    }
  };

  const getIconBgClass = () => {
    if (type === "error") return 'bg-red-500 bg-opacity-20';
    if (type === "info") return 'bg-blue-500 bg-opacity-20';
    return 'bg-green-500 bg-opacity-20';
  };

  const getIconColorClass = () => {
    if (type === "error") return 'text-red-400';
    if (type === "info") return 'text-blue-400';
    return 'text-green-400';
  };

  const getButtonClass = () => {
    if (type === "error") return 'bg-red-600 hover:bg-red-700';
    if (type === "info") return 'bg-blue-600 hover:bg-blue-700';
    return 'bg-green-600 hover:bg-green-700';
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
          <div className={`${getIconBgClass()} ${getIconColorClass()} rounded-full p-4`}>
            {renderIcon()}
          </div>
        </div>

        {/* Title */}
        <h2 className={`text-2xl font-bold ${DIALOG_THEME.titleColor} text-center mb-3`}>
          {title}
        </h2>

        {/* Message */}
        <p className={`${DIALOG_THEME.messageColor} text-center mb-8 leading-relaxed`}>
          {message}
        </p>

        {/* Single Button */}
        <button
          onClick={onClose}
          className={`w-full px-6 py-3 ${getButtonClass()} text-white rounded-lg font-medium ${DIALOG_THEME.animation}`}
        >
          {buttonText}
        </button>
      </div>
    </div>
  );
}