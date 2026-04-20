import jwt from "jsonwebtoken";
import config from "#config/index";

const webSocketProvider = (socket, next) => {
  const token = socket.handshake.auth?.token;

  if (!token) {
    return next(new Error("auth error: token missing"));
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret);
    socket.user = { id: payload.id, username: payload.username };
    next();
  } catch (err) {
    next(new Error("auth error: invalid token"));
  }
};

export default webSocketProvider;
