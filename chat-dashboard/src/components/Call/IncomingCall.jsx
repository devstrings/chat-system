import { useEffect, useState, useRef } from "react";
import { useSelector } from "react-redux";

export default function IncomingCall({
  onCallAccepted,
  onCallEnded,
  answerCall,
}) {
  const socket = useSelector((state) => state.socket.socket);
  const [incomingCall, setIncomingCall] = useState(null);
  const ringAudioRef = useRef(null);

  //  Ringing start
  const startRinging = () => {
    const audio = new Audio("/sounds/ringing.mp3");
    audio.loop = true;
    audio.play().catch((e) => console.log("Audio error:", e));
    ringAudioRef.current = audio;
  };

  //  Ringing stop
  const stopRinging = () => {
    if (ringAudioRef.current) {
      ringAudioRef.current.pause();
      ringAudioRef.current.currentTime = 0;
      ringAudioRef.current = null;
    }
  };

  useEffect(() => {
    if (!socket) return;

    socket.on("call:incoming", (data) => {
      console.log(" Incoming call from:", data.callerUsername);
      setIncomingCall(data);
      startRinging();
    });

    socket.on("call:rejected", () => {
      stopRinging();
      setIncomingCall(null);
    });

    socket.on("call:ended", () => {
      stopRinging();
      setIncomingCall(null);
    });

    socket.on("call:cancelled", () => {
      stopRinging();
      setIncomingCall(null);
    });

    return () => {
      socket.off("call:incoming");
      socket.off("call:rejected");
      socket.off("call:ended");
      socket.off("call:cancelled");
    };
  }, [socket]);

  const handleAccept = async () => {
    stopRinging();
    if (incomingCall) {
      await answerCall(
        incomingCall.offer,
        incomingCall.from,
        incomingCall.callType,
      );
      onCallAccepted?.({
        remoteUserId: incomingCall.from,
        callType: incomingCall.callType,
        callerInfo: {
          _id: incomingCall.from,
          username: incomingCall.callerUsername,
        },
      });
      setIncomingCall(null);
    }
  };

  const handleReject = () => {
    stopRinging();
    if (socket && incomingCall) {
      socket.emit("call:reject", {
        to: incomingCall.from,
        callId: incomingCall.callId,
      });
    }
    setIncomingCall(null);
  };

  if (!incomingCall) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl p-8 max-w-sm w-full mx-4 shadow-2xl">
        <div className="text-center">
          <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            {incomingCall.callType === "video" ? (
              <svg
                className="w-12 h-12 text-white"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zm12.553 1.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
              </svg>
            ) : (
              <svg
                className="w-12 h-12 text-white"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
              </svg>
            )}
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">
            {incomingCall.callerUsername}
          </h3>
          <p className="text-gray-600 mb-6">
            {incomingCall.callType === "video" ? " Video" : " Voice"} calling...
          </p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={handleReject}
              className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 text-white transition-colors shadow-lg flex items-center justify-center"
            >
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                <path d="M16.707 3.293a1 1 0 010 1.414L15.414 6l1.293 1.293a1 1 0 01-1.414 1.414L14 7.414l-1.293 1.293a1 1 0 11-1.414-1.414L12.586 6l-1.293-1.293a1 1 0 011.414-1.414L14 4.586l1.293-1.293a1 1 0 011.414 0z" />
              </svg>
            </button>
            <button
              onClick={handleAccept}
              className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600 text-white transition-colors shadow-lg flex items-center justify-center animate-pulse"
            >
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
