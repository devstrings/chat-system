import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}


export function getSidebarLayout({
  isLegalPage,
  isGuestUser,
  isDesktop,
  guestBannerHeight,
}) {
  if (isLegalPage) {
    return {
      top: isGuestUser ? 84 + guestBannerHeight : 84,
      height: isGuestUser
        ? `calc(100dvh - ${104 + guestBannerHeight}px)`
        : 'calc(100dvh - 104px)',
    };
  }

  const top = isGuestUser
    ? isDesktop
      ? 100 + guestBannerHeight
      : 96 + guestBannerHeight
    : isDesktop
      ? 100
      : 96;

  const height = isGuestUser
    ? isDesktop
      ? `calc(100dvh - ${120 + guestBannerHeight}px)`
      : `calc(100dvh - ${116 + guestBannerHeight}px)`
    : isDesktop
      ? 'calc(100dvh - 120px)'
      : 'calc(100dvh - 116px)';

  return { top, height };
}

export const sleep = () => new Promise((resolve) => setTimeout(resolve, ms));
