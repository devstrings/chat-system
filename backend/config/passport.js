import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as FacebookStrategy } from "passport-facebook";
import User from "../models/userModel.js";

// Serialize user
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

//  GOOGLE STRATEGY
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:5000/api/auth/google/callback", 
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user already exists
        let user = await User.findOne({ email: profile.emails[0].value });

        if (user) {
          // Update Google ID if not set
          if (!user.googleId) {
            user.googleId = profile.id;
            user.provider = "google";
            user.profileImage = profile.photos[0]?.value || user.profileImage;
            await user.save();
          }
          return done(null, user);
        }

        // Create new user
        user = await User.create({
          googleId: profile.id,
          username: profile.displayName || profile.emails[0].value.split("@")[0],
          email: profile.emails[0].value,
          profileImage: profile.photos[0]?.value,
          provider: "google",
          password: "OAUTH_USER_NO_PASSWORD",
        });

        done(null, user);
      } catch (err) {
        done(err, null);
      }
    }
  )
);


//  FACEBOOK STRATEGY
passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.FACEBOOK_APP_ID,
      clientSecret: process.env.FACEBOOK_APP_SECRET,
      callbackURL: "http://localhost:5000/api/auth/facebook/callback", 
      profileFields: ["id", "displayName", "photos", "email"],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ email: profile.emails[0].value });

        if (user) {
          if (!user.facebookId) {
            user.facebookId = profile.id;
            user.provider = "facebook";
            user.profileImage = profile.photos[0]?.value || user.profileImage;
            await user.save();
          }
          return done(null, user);
        }

        user = await User.create({
          facebookId: profile.id,
          username: profile.displayName || profile.emails[0].value.split("@")[0],
          email: profile.emails[0].value,
          profileImage: profile.photos[0]?.value,
          provider: "facebook",
          password: "OAUTH_USER_NO_PASSWORD",
        });

        done(null, user);
      } catch (err) {
        done(err, null);
      }
    }
  )
);

export default passport;