import { Loader } from 'lucide-react';
import React from 'react';

import { cn } from '@/lib/utils';

const Button = ({
  onClick = () => { },
  type = 'button',
  variant = 'primary',
  rounded = false,
  icon: Icon,
  isIconHidden = false,
  children,
  disabled = false,
  loading = false,
  className,
  ...rest
}) => {
  const isDisabled = disabled || loading;
  return (
    <button
      onClick={onClick}
      type={type}
      disabled={isDisabled}
      className={cn(
        // // base layout
        // 'flex items-center justify-center gap-2 text-sm font-bold',
        // // default size (can be overridden)
        // 'h-12 w-full',
        // // variants
        // variant === 'primary' &&
        // 'bg-[var(--light-blue-1)] text-[var(--light-1)] dark:bg-[var(--dark-blue-1)] dark:text-[var(--light-1)]',
        // variant === 'secondary' &&
        // 'theme-light-gradient-bg theme-dark-gradient-bg border dark:border-[var(--black-4)]',
        // variant === 'ghost' &&
        // 'bg-transparent text-[var(--text-color-light)] dark:bg-transparent dark:text-[var(--text-color)]',
        // // shape
        // rounded ? 'rounded-full' : 'rounded-2xl',
        // // state
        // isDisabled && 'cursor-not-allowed opacity-50',
        className,
      )}
      {...rest}
    >
      {loading ? (
        <Loader className="animate-spin" />
      ) : (
        <>
          {Icon && !isIconHidden && (
            <Icon className={cn(children ? 'mr-2' : '', 'h-5 w-5')} />
          )}
          {children}
        </>
      )}
    </button>
  );
};

export default Button;
