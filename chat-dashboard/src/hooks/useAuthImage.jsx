import { useState, useEffect } from 'react';
import axios from 'axios';

export const useAuthImage = (imageUrl) => {
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
        // ✅ FIX: Extract only the filename from the full path
        let filename = imageUrl;
        
        // If full path is stored (e.g., "/uploads/profileImages/1234.jpg")
        if (imageUrl.includes('/')) {
          filename = imageUrl.split('/').pop();
        }
        
        // ✅ CORRECT API URL matching your backend route
        const fullUrl = `http://localhost:5000/api/file/profile/${filename}`;
        
        console.log('🔍 Loading image:', fullUrl);
        
        const token = localStorage.getItem('token');
        const response = await axios.get(fullUrl, {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob'
        });
        
        const blob = response.data;
        const objectUrl = URL.createObjectURL(blob);
        setImageSrc(objectUrl);
        console.log('✅ Image loaded successfully');
      } catch (err) {
        console.error('❌ Failed to load image:', err.response?.status, err.message);
        setImageSrc(null);
      } finally {
        setLoading(false);
      }
    };

    loadImage();

    // Cleanup blob URL when component unmounts
    return () => {
      if (imageSrc && imageSrc.startsWith('blob:')) {
        URL.revokeObjectURL(imageSrc);
      }
    };
  }, [imageUrl]);

  return { imageSrc, loading };
};