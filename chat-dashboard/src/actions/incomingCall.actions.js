// Audio Actions
export const startRinging = (ringAudioRef) => {
  const audio = new Audio("/sounds/ringing.mp3");
  audio.loop = true;
  audio.play().catch((e) => console.log("Audio error:", e));
  ringAudioRef.current = audio;
};

export const stopRinging = (ringAudioRef) => {
  if (ringAudioRef.current) {
    ringAudioRef.current.pause();
    ringAudioRef.current.currentTime = 0;
    ringAudioRef.current = null;
  }
};

export const rejectCall = (socket, incomingCall) => {
  if (socket && incomingCall) {
    socket.emit("call:reject", {
      to: incomingCall.from,
      callId: incomingCall.callId,
    });
  }
};