import { useSelector } from 'react-redux';

export const useReduxSocket = () => {
  const socket = useSelector((state) => state.socket.socket);
  const connected = useSelector((state) => state.socket.connected);
  const onlineUsers = useSelector((state) => state.socket.onlineUsers);

  return { socket, connected, onlineUsers };
};

export default useReduxSocket;
