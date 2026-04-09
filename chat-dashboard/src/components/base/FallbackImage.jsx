'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

import { cn } from '@/lib/utils';

const FallbackImage = ({
  src,
  alt,
  placeholderImg = '/placeholder.svg',
  ...props
}) => {
  const [imgSrc, setImgSrc] = useState(placeholderImg);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (src) {
      setLoaded(false);
      setImgSrc(src);
    }
  }, [src]);

  const handleLoad = () => {
    setLoaded(true);
  };

  const handleError = () => {
    setImgSrc(placeholderImg);
    setLoaded(true);
  };

  return (
    <Image
      src={imgSrc}
      alt={alt}
      onLoad={handleLoad}
      onError={handleError}
      className={cn(
        'opacity-0 transition-opacity duration-700 ease-in-out',
        loaded && 'opacity-100',
      )}
      {...props}
    />
  );
};

export default FallbackImage;
