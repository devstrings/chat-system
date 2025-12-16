import express from "express";
import { register, login } from "../controllers/authController.js";
import passport from "../config/passport.js";
import jwt from "jsonwebtoken";

const router = express.Router();

// Existing routes
router.post("/register", register);
router.post("/login", login);

//  GOOGLE OAUTH ROUTES
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/google/callback",
  passport.authenticate("google", { session: false, failureRedirect: "/login" }),
  (req, res) => {
    const token = jwt.sign(
      { id: req.user._id, username: req.user.username },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // Redirect to frontend with token
    res.redirect(`http://localhost:5173/auth/callback?token=${token}&username=${req.user.username}&profileImage=${req.user.profileImage || ""}`);
  }
);

//  FACEBOOK OAUTH ROUTES
router.get(
  "/facebook",
  passport.authenticate("facebook", { scope: ["email"] })
);

router.get(
  "/facebook/callback",
  passport.authenticate("facebook", { session: false, failureRedirect: "/login" }),
  (req, res) => {
    const token = jwt.sign(
      { id: req.user._id, username: req.user.username },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.redirect(`http://localhost:5173/auth/callback?token=${token}&username=${req.user.username}&profileImage=${req.user.profileImage || ""}`);
  }
);

export default router;