import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MoreHorizontalIcon,
} from 'lucide-react';

import { useWebsite } from '@/hooks/useWebsite';
import { cn } from '@/lib/utils';

export function Pagination({ className, ...props }) {
  return (
    <nav
      role="navigation"
      aria-label="pagination"
      data-slot="pagination"
      className={cn('mx-auto flex w-full justify-center', className)}
      {...props}
    />
  );
}

export function PaginationContent({ className, ...props }) {
  return (
    <ul
      data-slot="pagination-content"
      className={cn('flex flex-row items-center gap-1', className)}
      {...props}
    />
  );
}

export function PaginationItem({ className, ...props }) {
  return (
    <li
      data-slot="pagination-item"
      className={cn('first:ml-0 last:mr-0', className)}
      {...props}
    />
  );
}

export function PaginationLink({ className, isActive, ...props }) {
  const { getWebsiteData } = useWebsite();
  const currentVariant = getWebsiteData('theme');
  const activeVariants = {
    skillGames:
      'border-[var(--light-blue-1)] font-semibold text-[var(--light-blue-1)] dark:border-[var(--dark-blue-1)] dark:text-[var(--dark-blue-1)]',
    skillGames2:
      'border-[var(--purple-1)] font-semibold text-[var(--purple-1)] dark:border-[var(--purple-1)] dark:text-[var(--purple-1)]',
    skillGames3:
      'border-[var(--golden-2)] font-semibold text-[var(--golden-2)] dark:border-[var(--golden-2)] dark:text-[var(--golden-2)]',
  };

  return (
    <button
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'flex h-9 w-9 items-center justify-center rounded-md border transition-colors',
        'bg-transparent text-[var(--text-color-light)] dark:text-[var(--text-color)]',
        'border-[var(--light-3)] dark:border-[var(--black-3)]',
        'hover:bg-[var(--light-3)] dark:hover:bg-[var(--black-3)]',
        className,
        isActive && activeVariants[currentVariant],
      )}
      {...props}
    />
  );
}

export function PaginationPrevious({ className, ...props }) {
  return (
    <button
      aria-label="Go to previous page"
      className={cn(
        'flex h-9 items-center gap-1 rounded-md border px-2.5',
        'bg-transparent text-[var(--text-color-light)] dark:text-[var(--text-color)]',
        'border-[var(--light-3)] dark:border-[var(--black-3)]',
        'hover:bg-[var(--light-3)] dark:hover:bg-[var(--black-3)]',
        'disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent dark:disabled:hover:bg-transparent',
        className,
      )}
      {...props}
    >
      <ChevronLeftIcon className="h-4 w-4" />
      <span className="hidden sm:block">Previous</span>
    </button>
  );
}

export function PaginationNext({ className, ...props }) {
  return (
    <button
      aria-label="Go to next page"
      className={cn(
        'flex h-9 items-center gap-1 rounded-md border px-2.5',
        'bg-transparent text-[var(--text-color-light)] dark:text-[var(--text-color)]',
        'border-[var(--light-3)] dark:border-[var(--black-3)]',
        'hover:bg-[var(--light-3)] dark:hover:bg-[var(--black-3)]',
        'disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent dark:disabled:hover:bg-transparent',
        className,
      )}
      {...props}
    >
      <span className="hidden sm:block">Next</span>
      <ChevronRightIcon className="h-4 w-4" />
    </button>
  );
}

export function PaginationEllipsis({ className }) {
  return (
    <span
      aria-hidden
      className={cn(
        'flex h-9 w-9 items-center justify-center rounded-md border',
        'border-[var(--light-3)] dark:border-[var(--black-3)]',
        'text-[var(--text-color-light)] dark:text-[var(--text-color)]',
        className,
      )}
    >
      <MoreHorizontalIcon className="h-4 w-4" />
      <span className="sr-only">More pages</span>
    </span>
  );
}
