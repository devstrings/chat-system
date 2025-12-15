import jwt from "jsonwebtoken";

export const verifyToken = (req, res, next) => {
  const token = req.header("Authorization")?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Access denied" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check for BOTH id and userId (for flexibility)
    if (!decoded.userId && !decoded.id) {
      return res.status(400).json({ message: "Token does not contain user ID" });
    }

    console.log("Decoded token:", decoded);

    // Set BOTH id and userId
    req.user = {
      id: decoded.userId || decoded.id,      
      userId: decoded.userId || decoded.id,
      username: decoded.username
    };
    
    next();
  } catch (err) {
    res.status(403).json({ message: "Invalid token" });
  }
};