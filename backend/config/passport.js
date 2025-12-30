import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as FacebookStrategy } from "passport-facebook";
import User from "../models/user.js";
import AuthProvider from "../models/AuthProvider.js";
import config from "./index.js"; 

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

// GOOGLE STRATEGY 
passport.use(
  new GoogleStrategy(
    {
      clientID: config.google.clientId,
      clientSecret: config.google.clientSecret,
      callbackURL: config.google.callbackUrl,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails[0].value;
        const googleId = profile.id;
        const name = profile.displayName;
        const picture = profile.photos[0]?.value;

        console.log(" Google login attempt:", email);

        let user = await User.findOne({ email });

        if (user) {
          console.log(" Existing user found");

          const googleProvider = await AuthProvider.findOne({
            userId: user._id,
            provider: "google"
          });

          if (!googleProvider) {
            console.log(" Linking Google to existing account");

            await AuthProvider.create({
              userId: user._id,
              provider: "google",
              providerId: googleId,
              providerData: { name, picture }
            });

            if (!user.profileImage && picture) {
              user.profileImage = picture;
              await user.save();
            }
          }
        } else {
          console.log(" Creating new user");

          // Generate unique username
          let username = name || `user_${Date.now()}`;
          
          // Check if username exists
          const existingUsername = await User.findOne({ username });
          if (existingUsername) {
            username = `${username}_${Date.now()}`;
          }
          
          user = await User.create({
            email,
            username,
            profileImage: picture
          });

          await AuthProvider.create({
            userId: user._id,
            provider: "google",
            providerId: googleId,
            providerData: { name, picture }
          });
        }

        return done(null, user);
      } catch (err) {
        console.error(" Google strategy error:", err);
        return done(err, null);
      }
    }
  )
);

//FACEBOOK STRATEGY 
passport.use(
  new FacebookStrategy(
    {
      clientID: config.facebook.appId,
      clientSecret: config.facebook.appSecret,
      callbackURL: config.facebook.callbackUrl,
      profileFields: ["id", "displayName", "photos", "email"],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;

        if (!email) {
          console.error(" Facebook email not provided");
          return done(new Error("Email not provided by Facebook"), null);
        }

        const facebookId = profile.id;
        const name = profile.displayName;
        const picture = profile.photos?.[0]?.value;

        console.log(" Facebook login attempt:", email);

        let user = await User.findOne({ email });

        if (user) {
          console.log(" Existing user found");

          const facebookProvider = await AuthProvider.findOne({
            userId: user._id,
            provider: "facebook"
          });

          if (!facebookProvider) {
            console.log(" Linking Facebook to existing account");

            await AuthProvider.create({
              userId: user._id,
              provider: "facebook",
              providerId: facebookId,
              providerData: { name, picture }
            });

            if (!user.profileImage && picture) {
              user.profileImage = picture;
              await user.save();
            }
          }
        } else {
          console.log(" Creating new user");

          //  Generate unique username
          let username = name || `user_${Date.now()}`;
          
          // Check if username exists
          const existingUsername = await User.findOne({ username });
          if (existingUsername) {
            username = `${username}_${Date.now()}`;
          }
          
          user = await User.create({
            email,
            username,
            profileImage: picture
          });

          await AuthProvider.create({
            userId: user._id,
            provider: "facebook",
            providerId: facebookId,
            providerData: { name, picture }
          });
        }

        return done(null, user);
      } catch (err) {
        console.error(" Facebook strategy error:", err);
        return done(err, null);
      }
    }
  )
);

export default passport;