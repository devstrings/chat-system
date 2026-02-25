import { useState, useRef, useCallback, useEffect } from "react";
import { useSelector } from "react-redux";

const iceServers = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export const useWebRTC = () => {
  const socket = useSelector((state) => state.socket.socket);

  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isCallActive, setIsCallActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [receiverOnline, setReceiverOnline] = useState(false);

  const peerConnection = useRef(null);
  const remoteUserIdRef = useRef(null);
  const iceCandidateQueue = useRef([]);
  const ringAudioRef = useRef(null);
  const callTimeoutRef = useRef(null);

  const startRinging = () => {
    const audio = new Audio("/sounds/ringing.mp3");
    audio.loop = true;
    audio.play().catch((e) => console.log("Audio error:", e));
    ringAudioRef.current = audio;
  };

  const stopRinging = () => {
    if (ringAudioRef.current) {
      ringAudioRef.current.pause();
      ringAudioRef.current.currentTime = 0;
      ringAudioRef.current = null;
    }
  };

  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection(iceServers);

    pc.onicecandidate = (event) => {
      if (event.candidate && socket && remoteUserIdRef.current) {
        socket.emit("ice:candidate", {
          to: remoteUserIdRef.current,
          candidate: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      console.log(" Remote track received");
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
      }
    };

    pc.onconnectionstatechange = () => {
      console.log(" Connection state:", pc.connectionState);
    };

    peerConnection.current = pc;
    return pc;
  }, [socket]);

  const endCall = useCallback(() => {
    stopRinging();

    if (callTimeoutRef.current) {
      clearTimeout(callTimeoutRef.current);
      callTimeoutRef.current = null;
    }

    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }

    if (socket && remoteUserIdRef.current) {
      socket.emit("call:end", { to: remoteUserIdRef.current });
    }

    setLocalStream((prev) => {
      prev?.getTracks().forEach((track) => track.stop());
      return null;
    });

    setRemoteStream(null);
    setIsCallActive(false);
    setIsMuted(false);
    setIsVideoOff(false);
    setReceiverOnline(false);
    remoteUserIdRef.current = null;
    iceCandidateQueue.current = [];
  }, [socket]);

  const startCall = async (remoteUserId, callType = "video") => {
    try {
      if (!socket) {
        alert("Connection error. Please refresh.");
        return;
      }

      remoteUserIdRef.current = remoteUserId;
      iceCandidateQueue.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({
        video: callType === "video",
        audio: true,
      });

      setLocalStream(stream);

      const pc = createPeerConnection();
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit("call:initiate", { to: remoteUserId, offer, callType });

      // Check receiver online status
      socket.once("call:receiver_status", ({ isOnline }) => {
        setReceiverOnline(isOnline);
        if (isOnline) {
          startRinging();
        }
      });

      // 30 sec timeout - auto cancel
      callTimeoutRef.current = setTimeout(() => {
        if (!remoteStream) {
          socket.emit("call:cancel", { to: remoteUserId });
          endCall();
        }
      }, 30000);

      setIsCallActive(true);
    } catch (error) {
      console.error("Start call error:", error);
      alert("Could not access camera/microphone");
    }
  };

  const answerCall = async (offer, remoteUserId, callType = "video") => {
    try {
      remoteUserIdRef.current = remoteUserId;
      iceCandidateQueue.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({
        video: callType === "video",
        audio: true,
      });

      setLocalStream(stream);

      const pc = createPeerConnection();
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      await pc.setRemoteDescription(new RTCSessionDescription(offer));

      for (const candidate of iceCandidateQueue.current) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
      iceCandidateQueue.current = [];

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit("call:answer", { to: remoteUserId, answer });
      setIsCallActive(true);
    } catch (error) {
      console.error("Answer call error:", error);
      alert("Could not access camera/microphone");
    }
  };

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsMuted((prev) => !prev);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff((prev) => !prev);
    }
  };

  useEffect(() => {
    if (!socket) return;

    socket.on("call:answered", async ({ answer }) => {
      stopRinging();
      if (callTimeoutRef.current) {
        clearTimeout(callTimeoutRef.current);
        callTimeoutRef.current = null;
      }
      if (peerConnection.current) {
        await peerConnection.current.setRemoteDescription(
          new RTCSessionDescription(answer),
        );
        for (const candidate of iceCandidateQueue.current) {
          await peerConnection.current.addIceCandidate(
            new RTCIceCandidate(candidate),
          );
        }
        iceCandidateQueue.current = [];
      }
    });

    socket.on("ice:candidate", async ({ candidate }) => {
      if (peerConnection.current?.remoteDescription) {
        await peerConnection.current.addIceCandidate(
          new RTCIceCandidate(candidate),
        );
      } else {
        iceCandidateQueue.current.push(candidate);
      }
    });

    socket.on("call:ended", () => {
      stopRinging();
      endCall();
    });
    socket.on("call:rejected", () => {
      stopRinging();
      if (callTimeoutRef.current) {
        clearTimeout(callTimeoutRef.current);
        callTimeoutRef.current = null;
      }
      setRemoteStream(null);
      setLocalStream((prev) => {
        prev?.getTracks().forEach((track) => track.stop());
        return null;
      });
      if (peerConnection.current) {
        peerConnection.current.close();
        peerConnection.current = null;
      }
      setIsCallActive(false);
      setIsMuted(false);
      setIsVideoOff(false);
      setReceiverOnline(false);
      remoteUserIdRef.current = null;
      iceCandidateQueue.current = [];
    });

    socket.on("call:cancelled", () => {
      stopRinging();
      endCall();
    });

    return () => {
      socket.off("call:answered");
      socket.off("ice:candidate");
      socket.off("call:ended");
      socket.off("call:rejected");
      socket.off("call:cancelled");
    };
  }, [socket, endCall]);

  return {
    localStream,
    remoteStream,
    isCallActive,
    isMuted,
    isVideoOff,
    receiverOnline,
    startCall,
    answerCall,
    endCall,
    toggleMute,
    toggleVideo,
  };
};
