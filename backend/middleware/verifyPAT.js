import crypto from "crypto";
import PersonalAccessToken from "#models/PersonalAccessToken";
import User from "#models/User";

const hashPAT = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

export const verifyPAT = async (req, res, next) => {
  const authHeader = req.header("Authorization");
  const token = authHeader?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Personal access token required" });
  }

  if (!token.startsWith("dsc_pat_")) {
    return res.status(403).json({ message: "Invalid personal access token format" });
  }

  try {
    const tokenHash = hashPAT(token);
    const pat = await PersonalAccessToken.findOne({
      tokenHash,
      revokedAt: null,
      $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
    });

    if (!pat) {
      return res.status(403).json({ message: "Invalid personal access token" });
    }

    const user = await User.findById(pat.userId).select(
      "_id username twoFactorEnabled isSuspended",
    );
    if (!user || user.isSuspended) {
      return res.status(403).json({ message: "User is not allowed" });
    }
    if (!user.twoFactorEnabled) {
      return res.status(403).json({
        message: "2FA is required for personal access token authentication",
      });
    }

    pat.lastUsedAt = new Date();
    await pat.save();

    req.user = {
      id: user._id.toString(),
      userId: user._id.toString(),
      username: user.username,
      authType: "pat",
    };
    next();
  } catch (_err) {
    return res.status(403).json({ message: "Invalid personal access token" });
  }
};

export default verifyPAT;
