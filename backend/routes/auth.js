import express from "express";
import passport from "../config/passport.js";
import { 
  register, 
  login, 
  googleCallback, 
  facebookCallback 
} from "../controllers/auth.js";
import config from "../config/index.js"; 

const router = express.Router();

// LOCAL AUTH ROUTES
router.post("/register", register);
router.post("/login", login);

// GOOGLE OAUTH ROUTES
router.get(
  "/google",
  passport.authenticate("google", { 
    scope: ["profile", "email"],
    session: false 
  })
);

router.get(
  "/google/callback",
  passport.authenticate("google", { 
    session: false, 
    failureRedirect: `${config.frontend.loginUrl}?error=google_auth_failed` 
  }),
  googleCallback
);

// FACEBOOK OAUTH ROUTES
router.get(
  "/facebook",
  passport.authenticate("facebook", { 
    scope: ["email"],
    session: false 
  })
);

router.get(
  "/facebook/callback",
  passport.authenticate("facebook", { 
    session: false, 
    failureRedirect: `${config.frontend.loginUrl}?error=facebook_auth_failed` 
  }),
  facebookCallback
);

// ERROR HANDLER
router.use((err, req, res, next) => {
  console.error(" OAuth error:", err.message);
  res.redirect(`${config.frontend.loginUrl}?error=${encodeURIComponent(err.message)}`); 
});

export default router;