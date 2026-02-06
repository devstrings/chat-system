import jwt from "jsonwebtoken";
import config from "../config/index.js";

export const verifyToken = (req, res, next) => {
  const authHeader = req.header("Authorization");
  const token = authHeader?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Access token required" });
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);

    if (!decoded.id) {
      return res.status(400).json({ message: "Invalid token structure" });
    }

    req.user = {
      id: decoded.id,
      userId: decoded.id,
      username: decoded.username,
    };

    next();
  } catch (err) {
    // Token expired ya invalid
    if (err.name === "TokenExpiredError") {
      return res.status(403).json({ message: "Token expired" });
    }
    return res.status(403).json({ message: "Invalid token" });
  }
};