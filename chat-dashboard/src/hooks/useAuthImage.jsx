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
        //  Extract filename and construct API URL
        const filename = imageUrl.split('/').pop();
        const fullUrl = `http://localhost:5000/api/file/profile/${filename}`;
        
        const token = localStorage.getItem('token');
        const response = await axios.get(fullUrl, {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob'
        });
        
        const blob = response.data;
        const objectUrl = URL.createObjectURL(blob);
        setImageSrc(objectUrl);
      } catch (err) {
        console.error('Failed to load image:', err);
        setImageSrc(null);
      } finally {
        setLoading(false);
      }
    };

    loadImage();

    return () => {
      if (imageSrc && imageSrc.startsWith('blob:')) {
        URL.revokeObjectURL(imageSrc);
      }
    };
  }, [imageUrl]);

  return { imageSrc, loading };
};