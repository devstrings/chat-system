import { useState, useEffect } from "react";
import axios from "axios";

export const useAuthImage = (imageUrl, type = "profile") => {
  const [imageSrc, setImageSrc] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!imageUrl) {
      console.log("useAuthImage: No image URL provided");
      setImageSrc(null);
      setLoading(false);
      return;
    }

    const loadImage = async () => {
      try {
        console.log(" useAuthImage: Starting load for:", imageUrl);

        // Step 1: Clean the URL
        let cleanUrl = imageUrl.trim();

        // Remove duplicate localhost prefixes
        if (cleanUrl.includes("localhost:5000https://")) {
          cleanUrl = cleanUrl.split("localhost:5000")[1];
          console.log(" Cleaned duplicate prefix:", cleanUrl);
        } else if (cleanUrl.includes("localhost:5000http://")) {
          cleanUrl = cleanUrl.split("localhost:5000")[1];
          console.log(" Cleaned duplicate prefix:", cleanUrl);
        }

        // Step 2: Check if it's an external URL (Google/Facebook/etc)
        const isExternalHttps =
          cleanUrl.startsWith("https://") && !cleanUrl.includes("localhost");
        const isExternalHttp =
          cleanUrl.startsWith("http://") && !cleanUrl.includes("localhost");
        const isGoogleImage =
          cleanUrl.includes("googleusercontent.com") ||
          cleanUrl.includes("ggpht.com");
        const isFacebookImage =
          cleanUrl.includes("fbsbx.com") ||
          cleanUrl.includes("graph.facebook.com");

        console.log(" URL Analysis:", {
          isExternalHttps,
          isExternalHttp,
          isGoogleImage,
          isFacebookImage,
          cleanUrl,
        });

        // Step 3: If external URL, use it directly
        if (
          isExternalHttps ||
          isExternalHttp ||
          isGoogleImage ||
          isFacebookImage
        ) {
          console.log(" External URL detected - Loading directly:", cleanUrl);

          // ENHANCEMENT: Increase Google image quality
          if (isGoogleImage) {
            cleanUrl = cleanUrl.replace(/s\d+-c$/, "s400-c");
            console.log("🔧 Enhanced Google image size:", cleanUrl);
          }

          //  ENHANCEMENT: Increase Facebook image size
          if (isFacebookImage && cleanUrl.includes("type=")) {
            cleanUrl = cleanUrl.replace(/type=\w+/, "type=large");
            console.log("🔧 Enhanced Facebook image size:", cleanUrl);
          }

          setImageSrc(cleanUrl);
          setLoading(false);
          return;
        }

        // Step 4: Local image - fetch from backend
        console.log(" Local image detected - Fetching from backend");

        let filename = cleanUrl;

        // Extract filename
        if (filename.includes("/uploads/profileImages/")) {
          filename = filename.split("/uploads/profileImages/").pop();
        } else if (filename.includes("/uploads/groupImages/")) {
          filename = filename.split("/uploads/groupImages/").pop();
        } else if (filename.includes("/uploads/coverPhotos/")) {
          filename = filename.split("/uploads/coverPhotos/").pop();
        } else if (filename.includes("/")) {
          const parts = filename.split("/");
          filename = parts[parts.length - 1];
        }

        // Remove query string
        if (filename.includes("?")) {
          filename = filename.split("?")[0];
        }

        console.log(" Extracted filename:", filename);

        // Build API URL
        let apiUrl;
        if (type === "group") {
          apiUrl = `http://localhost:5000/api/file/group/${filename}?t=${Date.now()}`;
        } else if (type === "cover") {
          apiUrl = `http://localhost:5000/api/file/cover/${filename}?t=${Date.now()}`;
        } else {
          apiUrl = `http://localhost:5000/api/file/profile/${filename}?t=${Date.now()}`;
        }

        console.log(" Fetching from:", apiUrl);

        const token = localStorage.getItem("token");
        if (!token) {
          console.warn(" No auth token found");
          setImageSrc(null);
          setLoading(false);
          return;
        }

        const response = await axios.get(apiUrl, {
          headers: { Authorization: `Bearer ${token}` },
          responseType: "blob",
        });

        const blob = response.data;
        const objectUrl = URL.createObjectURL(blob);
        setImageSrc(objectUrl);
        console.log(" Local image loaded successfully");
      } catch (err) {
        console.error("useAuthImage error:", {
          message: err.message,
          status: err.response?.status,
          originalUrl: imageUrl,
        });
        setImageSrc(null);
      } finally {
        setLoading(false);
      }
    };

    loadImage();

    // Cleanup
    return () => {
      if (imageSrc && imageSrc.startsWith("blob:")) {
        URL.revokeObjectURL(imageSrc);
      }
    };
  }, [imageUrl, type]);

  return { imageSrc, loading };
};
