import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import {
  CheckIcon,
  ChevronRightIcon,
  DotFilledIcon,
} from '@radix-ui/react-icons';
import * as React from 'react';

import { cn } from '@/lib/utils';

// Root Dropdown Component
export const Dropdown = DropdownMenu.Root;

// Dropdown Trigger
export const DropdownTrigger = React.forwardRef(
  ({ className, children, ...props }, ref) => (
    <DropdownMenu.Trigger
      ref={ref}
      className={cn(
        'inline-flex cursor-pointer items-center justify-center rounded-md bg-transparent transition-colors focus:outline-none disabled:pointer-events-none disabled:opacity-50 [&[data-state=open]>svg]:rotate-180',
        className,
      )}
      {...props}
    >
      {children}
    </DropdownMenu.Trigger>
  ),
);
DropdownTrigger.displayName = 'DropdownTrigger';

// Dropdown Content
export const DropdownContent = React.forwardRef(
  ({ className, sideOffset = 8, ...props }, ref) => (
    <DropdownMenu.Content
      align="start"
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        'bg-popover z-30 w-full rounded-xl bg-[var(--light-4)] p-1.5 animate-in data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 dark:bg-[var(--black-4)]',
        className,
      )}
      {...props}
    />
  ),
);
DropdownContent.displayName = 'DropdownContent';

// Dropdown Item
export const DropdownItem = React.forwardRef(
  ({ className, inset, icon, children, selected = false, ...props }, ref) => (
    <DropdownMenu.Item
      ref={ref}
      className={cn(
        'relative flex cursor-default items-center justify-between rounded-md px-2 py-1.5 text-sm outline-none transition-colors hover:bg-[var(--black-5)]',
        'cursor-pointer data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        inset && 'pl-8',
        className,
      )}
      {...props}
    >
      <div className="flex w-full items-center gap-2">
        {icon && <span className="mr-2">{icon}</span>}
        {children}
      </div>
      {selected && (
        <CheckIcon className="h-5 w-5 text-[var(--text-color-light)] dark:text-[var(--text-color)]" />
      )}
    </DropdownMenu.Item>
  ),
);
DropdownItem.displayName = 'DropdownItem';

// Dropdown Sub (for nested menus)
export const DropdownSub = DropdownMenu.Sub;

// Dropdown Sub Trigger
export const DropdownSubTrigger = React.forwardRef(
  ({ className, inset, children, ...props }, ref) => (
    <DropdownMenu.SubTrigger
      ref={ref}
      className={cn(
        'flex cursor-default items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors',
        'focus:bg-accent focus:text-accent-foreground',
        'data-[state=open]:bg-accent/50',
        inset && 'pl-8',
        className,
      )}
      {...props}
    >
      {children}
      <ChevronRightIcon className="ml-auto h-4 w-4" />
    </DropdownMenu.SubTrigger>
  ),
);
DropdownSubTrigger.displayName = 'DropdownSubTrigger';

// Dropdown Sub Content
export const DropdownSubContent = React.forwardRef(
  ({ className, ...props }, ref) => (
    <DropdownMenu.SubContent
      ref={ref}
      className={cn(
        'bg-popover z-50 min-w-[220px] rounded-md p-1 shadow-lg animate-in slide-in-from-left-1',
        className,
      )}
      {...props}
    />
  ),
);
DropdownSubContent.displayName = 'DropdownSubContent';

// Dropdown Separator
export const DropdownSeparator = React.forwardRef(
  ({ className, ...props }, ref) => (
    <DropdownMenu.Separator
      ref={ref}
      className={cn('my-1 h-px bg-[var(--black-5)]', className)}
      {...props}
    />
  ),
);
DropdownSeparator.displayName = 'DropdownSeparator';

// Dropdown Checkbox Item
export const DropdownCheckboxItem = React.forwardRef(
  ({ className, children, checked, ...props }, ref) => (
    <DropdownMenu.CheckboxItem
      ref={ref}
      className={cn(
        'relative flex cursor-default items-center rounded-sm py-1.5 pl-6 pr-2 text-sm outline-none transition-colors',
        'focus:bg-accent focus:text-accent-foreground',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className,
      )}
      checked={checked}
      {...props}
    >
      <DropdownMenu.ItemIndicator className="absolute left-1.5 inline-flex items-center">
        <CheckIcon className="h-4 w-4" />
      </DropdownMenu.ItemIndicator>
      {children}
    </DropdownMenu.CheckboxItem>
  ),
);
DropdownCheckboxItem.displayName = 'DropdownCheckboxItem';

// Dropdown Radio Group
export const DropdownRadioGroup = DropdownMenu.RadioGroup;

// Dropdown Radio Item
export const DropdownRadioItem = React.forwardRef(
  ({ className, children, ...props }, ref) => (
    <DropdownMenu.RadioItem
      ref={ref}
      className={cn(
        'relative flex cursor-default items-center rounded-sm py-1.5 pl-6 pr-2 text-sm outline-none transition-colors',
        'focus:bg-accent focus:text-accent-foreground',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className,
      )}
      {...props}
    >
      <DropdownMenu.ItemIndicator className="absolute left-1.5 inline-flex items-center">
        <DotFilledIcon className="h-4 w-4" />
      </DropdownMenu.ItemIndicator>
      {children}
    </DropdownMenu.RadioItem>
  ),
);
DropdownRadioItem.displayName = 'DropdownRadioItem';

// Dropdown Label
export const DropdownLabel = React.forwardRef(
  ({ className, inset, ...props }, ref) => (
    <DropdownMenu.Label
      ref={ref}
      className={cn(
        'px-2 py-1.5 text-sm font-semibold',
        inset && 'pl-8',
        className,
      )}
      {...props}
    />
  ),
);
DropdownLabel.displayName = 'DropdownLabel';

// Dropdown Shortcut
export const DropdownShortcut = React.forwardRef(
  ({ className, ...props }, ref) => (
    <span
      ref={ref}
      className={cn('ml-auto text-xs tracking-widest opacity-60', className)}
      {...props}
    />
  ),
);
DropdownShortcut.displayName = 'DropdownShortcut';
