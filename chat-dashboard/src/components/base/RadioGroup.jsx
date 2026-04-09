// components/ui/radio-group.js
import { Indicator, Item, Root } from '@radix-ui/react-radio-group';

import { cn } from '@/lib/utils';

const RadioGroup = ({
  className,
  children,
  value, // For controlled
  defaultValue, // For uncontrolled
  onValueChange, // Change handler
  name, // For form submission
  disabled, // Disabled state
  ...props
}) => {
  return (
    <Root
      className={cn('w-full space-y-2', className)}
      value={value}
      defaultValue={defaultValue}
      onValueChange={onValueChange}
      name={name}
      disabled={disabled}
      {...props}
    >
      {children}
    </Root>
  );
};

const RadioGroupItem = ({
  className,
  children,
  id,
  label,
  Icon,
  labelClassName,
  containerClassName,
  indicatorClassName,
  disabled,
  ...props
}) => {
  return (
    <div
      className={cn(
        'flex h-10 items-center gap-3 rounded-[50px] bg-[var(--light-3)] px-4 py-3 dark:bg-[var(--black-2)]',
        disabled && 'cursor-not-allowed opacity-50',
        containerClassName,
      )}
    >
      <Item
        className={cn(
          'size-3 cursor-default rounded-full border border-[var(--black-4)] outline-none data-[state=checked]:border-transparent data-[state=checked]:bg-[var(--dark-blue-1)]',
          disabled && 'cursor-not-allowed',
          className,
        )}
        id={id}
        disabled={disabled}
        {...props}
      >
        <Indicator
          className={cn(
            'relative flex size-1.5 w-full items-center justify-center after:block after:size-1.5 after:rounded-full after:bg-white',
            indicatorClassName,
          )}
        />
      </Item>
      <div className="flex items-center gap-2">
        {Icon && Icon}
        {label && (
          <label
            htmlFor={id}
            className={cn(
              'cursor-pointer text-xs font-bold leading-5 text-[var(--text-color-light)] dark:text-[var(--text-color)]',
              disabled && 'cursor-not-allowed',
              labelClassName,
            )}
          >
            {label}
          </label>
        )}
      </div>
      {children}
    </div>
  );
};

export { RadioGroup, RadioGroupItem };
