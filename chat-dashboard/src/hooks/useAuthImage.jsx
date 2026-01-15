import { useState, useEffect } from "react";
import axios from "axios";

export const useAuthImage = (imageUrl, type = "profile") => {
  const [imageSrc, setImageSrc] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!imageUrl) {
      setImageSrc(null);
      setLoading(false);
      return;
    }

    const loadImage = async () => {
      try {
        console.log(" Loading image:", imageUrl);

        // Remove localhost prefix if exists
        let cleanUrl = imageUrl;
        if (imageUrl.includes("localhost:5000https://")) {
          cleanUrl = imageUrl.split("localhost:5000")[1];
          console.log(" Cleaned URL:", cleanUrl);
        } else if (imageUrl.includes("localhost:5000http://")) {
          cleanUrl = imageUrl.split("localhost:5000")[1];
          console.log(" Cleaned URL:", cleanUrl);
        }

        // PRIORITY 1: Check for external OAuth URLs FIRST
        const isGoogleUrl = cleanUrl.includes("googleusercontent.com");
        const isFacebookUrl =
          cleanUrl.includes("fbsbx.com") ||
          cleanUrl.includes("graph.facebook.com");
        const isExternalHttps =
          (cleanUrl.startsWith("https://") || cleanUrl.startsWith("http://")) &&
          !cleanUrl.includes("localhost");

        if (isGoogleUrl || isFacebookUrl || isExternalHttps) {
          console.log(" External URL (Google/Facebook):", cleanUrl);
          setImageSrc(cleanUrl);
          setLoading(false);
          return;
        }

        // PRIORITY 2: Local backend images
        console.log(" Local image detected");

        let filename = cleanUrl;

        // Extract filename from various formats
        if (filename.includes("/uploads/profileImages/")) {
          filename = filename.split("/uploads/profileImages/").pop();
        } else if (filename.includes("/uploads/groupImages/")) {
          filename = filename.split("/uploads/groupImages/").pop();
        } else if (filename.includes("/")) {
          filename = filename.split("/").pop();
        }

        // Remove query string (timestamp cache-busting ke liye)
        if (filename.includes("?")) {
          filename = filename.split("?")[0];
        }

        console.log("Extracted filename:", filename);

        // ✅ WITH CACHE BUSTING
        let fullUrl;
        if (type === "group") {
          fullUrl = `http://localhost:5000/api/file/group/${filename}?t=${Date.now()}`;
        } else {
          fullUrl = `http://localhost:5000/api/file/profile/${filename}?t=${Date.now()}`;
        }
        console.log(" Full URL:", fullUrl);

        const token = localStorage.getItem("token");

        if (!token) {
          console.warn(" No token found");
          setImageSrc(null);
          setLoading(false);
          return;
        }

        const response = await axios.get(fullUrl, {
          headers: { Authorization: `Bearer ${token}` },
          responseType: "blob",
        });

        const blob = response.data;
        const objectUrl = URL.createObjectURL(blob);
        setImageSrc(objectUrl);
        console.log(" Local image loaded");
      } catch (err) {
        console.error(" Image load error:", {
          status: err.response?.status,
          message: err.message,
          url: imageUrl,
        });
        setImageSrc(null);
      } finally {
        setLoading(false);
      }
    };

    loadImage();

    return () => {
      if (imageSrc && imageSrc.startsWith("blob:")) {
        URL.revokeObjectURL(imageSrc);
      }
    };
  }, [imageUrl, type]);

  return { imageSrc, loading };
};