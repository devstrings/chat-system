'use client';

import { Loader as Loading } from 'lucide-react';

import { useWebsite } from '@/hooks/useWebsite';
import { cn } from '@/lib/utils';

const Loader = ({ contentClassName, className }) => {
  const { getWebsiteData } = useWebsite();
  const currentVariant = getWebsiteData('theme');

  return (
    <div
      className={cn(
        'flex h-full w-full items-center justify-center bg-[var(--light-3)] dark:bg-[var(--black-1)]',
        currentVariant === 'skillGames2' &&
          'bg-[var(--text-1)] dark:bg-[var(--dark-1)]',
        contentClassName,
      )}
    >
      <Loading
        style={{
          animationDuration: '1.5s',
        }}
        className={cn(
          'size-8 animate-spin text-[var(--text-color-light)] dark:text-[var(--text-color)]',
          currentVariant === 'skillGames2' &&
            'text-[var(--dark-1)] dark:text-[var(--text-1)]',
          className,
        )}
      />
    </div>
  );
};

export default Loader;
