'use client';

import { useTheme } from 'next-themes';
import React from 'react';

import Loader from '@/components/base/Loader';

const Loading = ({
  title = 'Just a moment!',
  message = 'We’re getting things ready for you.',
}) => {
  const theme = useTheme();
  const isDarkMode = theme.theme === 'dark';

  return (
    <div className="flex w-full max-w-[272px] items-center justify-center overflow-hidden rounded-3xl bg-[#FBFBFB] px-8 py-6 dark:bg-[#2D2D2D] md:max-w-[484px] md:rounded-[40px] md:p-10">
      <div>
        <Loader
          size="size-10"
          color={isDarkMode ? 'text-[var(--text-color)]' : 'text-black'}
        />
        <h1 className="mb-2 mt-5 text-center text-2xl font-bold text-[#2D2D2D] dark:text-[#FBFBFB] md:text-3xl">
          {title}
        </h1>
        <p className="text-center text-sm font-normal text-[#717171] dark:text-[#C6C6C6] md:text-base">
          {message}
        </p>
      </div>
    </div>
  );
};

export default Loading;
