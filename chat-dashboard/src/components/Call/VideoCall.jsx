import { useState, useEffect, useRef } from "react";
import { useSelector } from "react-redux";

export default function VideoCall({
  remoteUser,
  callType,
  onClose,
  localStream,
  remoteStream,
  isMuted,
  isVideoOff,
  onEndCall,
  onToggleMute,
  onToggleVideo,
  receiverOnline,
}) {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const socket = useSelector((state) => state.socket.socket);
  const [callRejected, setCallRejected] = useState(false);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.play().catch((e) => console.log("Play error:", e));
    }
  }, [remoteStream]);

  useEffect(() => {
    if (remoteAudioRef.current && remoteStream && callType === "audio") {
      remoteAudioRef.current.srcObject = remoteStream;
      remoteAudioRef.current
        .play()
        .catch((e) => console.log("Audio play error:", e));
    }
  }, [remoteStream, callType]);

  useEffect(() => {
    if (!socket) return;

    socket.on("call:rejected", () => {
      setCallRejected(true);
      setTimeout(() => {
        onEndCall?.();
        onClose?.();
      }, 2000);
    });

    socket.on("call:ended", () => {
      onEndCall?.();
      onClose?.();
    });

    return () => {
      socket.off("call:rejected");
      socket.off("call:ended");
    };
  }, [socket]);

  const handleEndCall = () => {
    onEndCall?.();
    onClose?.();
  };

  return (
    <div className="fixed inset-0 bg-gray-900 z-50 flex flex-col">
      {/* STATUS BAR */}
      <div className="bg-gray-800 px-6 py-2 text-center">
        <p className="text-gray-400 text-sm">
          {callRejected
            ? " Call Rejected"
            : remoteStream
              ? " Connected"
              : receiverOnline
                ? " Ringing..."
                : " Calling..."}
        </p>
      </div>

      <div className="flex-1 relative bg-black" style={{ zIndex: 1 }}>
        {callType === "video" ? (
          <>
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
              style={{ zIndex: 1 }}
            />

            {/* Overlay  */}
            {(!remoteStream || callRejected) && (
              <div
                className="absolute inset-0 bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center"
                style={{ zIndex: 3 }}
              >
                <div className="text-center">
                  <div className="w-28 h-28 mx-auto mb-4 rounded-full bg-white bg-opacity-20 flex items-center justify-center">
                    <svg
                      className="w-14 h-14 text-white"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zm12.553 1.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                    </svg>
                  </div>
                  <p className="text-white text-xl font-semibold">
                    {remoteUser?.username}
                  </p>

                  {callRejected ? (
                    <p className="text-red-300 text-lg mt-2 font-semibold">
                      Call Rejected
                    </p>
                  ) : receiverOnline ? (
                    <p className="text-white text-opacity-80 mt-2 animate-pulse">
                      Ringing...
                    </p>
                  ) : (
                    <p className="text-white text-opacity-60 mt-2">
                      Calling... (User is offline)
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Local video - corner */}
            <div
              className="absolute top-4 right-4 w-32 h-40 rounded-lg overflow-hidden shadow-2xl border-2 border-white"
              style={{ zIndex: 4 }}
            >
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {isVideoOff && (
                <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                  <span className="text-white text-2xl">📷</span>
                </div>
              )}
            </div>
          </>
        ) : (
          
          // Audio call UI
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
            <audio ref={remoteAudioRef} autoPlay playsInline />
            <div className="text-center">
              <div className="w-32 h-32 mx-auto mb-4 rounded-full bg-white bg-opacity-20 flex items-center justify-center">
                <svg
                  className="w-16 h-16 text-white"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                </svg>
              </div>
              <p className="text-white text-xl">{remoteUser?.username}</p>
              {callRejected ? (
                <p className="text-red-300 text-lg mt-2 font-semibold">
                  Call Rejected
                </p>
              ) : remoteStream ? (
                <p className="text-white text-opacity-80 mt-2"> Connected</p>
              ) : receiverOnline ? (
                <p className="text-white text-opacity-80 mt-2 animate-pulse">
                  Ringing...
                </p>
              ) : (
                <p className="text-white text-opacity-60 mt-2"> Calling...</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* BUTTONS - fixed bottom */}
      <div
        className="bg-gray-800 px-6 py-4"
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 99999,
        }}
      >
        <div className="flex items-center justify-center gap-4">
          {/* Mute button */}
          {/* <button
            onClick={onToggleMute}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors shadow-lg ${
              isMuted
                ? "bg-red-500 hover:bg-red-600"
                : "bg-gray-700 hover:bg-gray-600"
            }`}
          >
            <svg
              className="w-6 h-6 text-white"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              {isMuted ? (
                <path
                  fillRule="evenodd"
                  d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z"
                  clipRule="evenodd"
                />
              ) : (
                <path
                  fillRule="evenodd"
                  d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
                  clipRule="evenodd"
                />
              )}
            </svg>
          </button> */}

          {/* End call button */}
          <button
            onClick={handleEndCall}
            className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 text-white transition-colors shadow-lg flex items-center justify-center"
          >
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
              <path d="M16.707 3.293a1 1 0 010 1.414L15.414 6l1.293 1.293a1 1 0 01-1.414 1.414L14 7.414l-1.293 1.293a1 1 0 11-1.414-1.414L12.586 6l-1.293-1.293a1 1 0 011.414-1.414L14 4.586l1.293-1.293a1 1 0 011.414 0z" />
            </svg>
          </button>

          {/* Video toggle  */}
          {callType === "video" && (
            <button
              onClick={onToggleVideo}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors shadow-lg ${
                isVideoOff
                  ? "bg-red-500 hover:bg-red-600"
                  : "bg-gray-700 hover:bg-gray-600"
              }`}
            >
              <svg
                className="w-6 h-6 text-white"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
