'use client';

import { Cross2Icon } from '@radix-ui/react-icons';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';

import { cn } from '@/lib/utils';

const Popover = ({
  trigger,
  children,
  align = 'center',
  side = 'bottom',
  sideOffset = 5,
  closeButton = false,
  className = '',
  contentClassName = '',
  arrowClassName = '',
  arrow = true,
  open: controlledOpen,
  onOpenChange: controlledOnChange,
}) => {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const setOpen = isControlled ? controlledOnChange : setUncontrolledOpen;

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild className={className}>
        {typeof trigger === 'function' ? trigger({ state: { open } }) : trigger}
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal forceMount>
        <AnimatePresence>
          {open && (
            <PopoverPrimitive.Content
              align={align}
              side={side}
              sideOffset={sideOffset}
              asChild
              forceMount
              onInteractOutside={
                isControlled ? undefined : () => setOpen(false)
              }
              onEscapeKeyDown={isControlled ? undefined : () => setOpen(false)}
              onPointerDownOutside={
                isControlled ? undefined : () => setOpen(false)
              }
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 5 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 5 }}
                transition={{
                  type: 'spring',
                  damping: 25,
                  stiffness: 400,
                  bounce: 0.5,
                }}
                className={cn(
                  'item-center z-20 flex flex-col gap-4 rounded-[20px] bg-[var(--light-3)] p-2 dark:bg-[var(--black-3)]',
                  contentClassName,
                )}
              >
                {children}
                {closeButton && (
                  <PopoverPrimitive.Close
                    className="absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-full opacity-70 transition-opacity hover:opacity-100 focus:outline-none"
                    aria-label="Close"
                    onClick={() => setIsOpen(false)}
                  >
                    <Cross2Icon className="h-4 w-4" />
                  </PopoverPrimitive.Close>
                )}
                {arrow && (
                  <PopoverPrimitive.Arrow
                    className={cn(
                      'fill-[var(--light-3)] dark:fill-[var(--black-3)]',
                      arrowClassName,
                    )}
                  />
                )}
              </motion.div>
            </PopoverPrimitive.Content>
          )}
        </AnimatePresence>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
};

export default Popover;
