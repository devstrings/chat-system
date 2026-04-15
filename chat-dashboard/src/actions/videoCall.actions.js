export const endCall = (socket, remoteUserId) => {
  if (socket && remoteUserId) {
    socket.emit("call:cancel", { to: remoteUserId });
  }
};