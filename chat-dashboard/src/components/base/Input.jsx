import React, { forwardRef } from 'react';
import { PatternFormat } from 'react-number-format';

import { cn } from '@/lib/utils';

const Input = (
  {
    value,
    onChange,
    onBlur,
    name,
    error,
    placeholder,
    type = 'text',
    id,
    className,
    Icon,
    max,
    min,
    maxLength,
    minLength,
    format,
    maskChar = ' ',
    valueType = 'formatted',
    ...rest
  },
  ref,
) => {
  if (format) {
    return (
      <div className="flex w-full flex-col gap-1">
        <div className="relative w-full">
          <PatternFormat
            format={format}
            mask={maskChar}
            value={value || ''}
            onValueChange={({ formattedValue, value: rawValue }) => {
              if (onChange) {
                const event = {
                  target: {
                    name,
                    value: valueType === 'raw' ? rawValue : formattedValue,
                    rawValue,
                    formattedValue,
                  },
                };
                onChange(event);
              }
            }}
            onBlur={onBlur}
            name={name}
            id={id || name}
            placeholder={placeholder || 'Enter text'}
            className={cn(
              'h-12 w-full flex-shrink-0 rounded-xl bg-[var(--light-3)] px-5 py-3 text-sm text-[var(--text-color-light)] [-moz-appearance:textfield] placeholder:text-[var(--black-5)] placeholder:opacity-75 focus:outline-none dark:bg-[var(--black-2)] dark:text-[var(--text-color)] [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none',
              error ? 'border border-red-500' : '',
              className,
            )}
            getInputRef={ref}
          />
          {Icon && Icon}
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-1">
      <div className="relative w-full">
        <input
          ref={ref}
          id={id || name}
          name={name}
          max={max}
          min={min}
          maxLength={maxLength}
          minLength={minLength}
          value={value || ''}
          onChange={onChange}
          onBlur={onBlur}
          type={type}
          placeholder={placeholder || 'Enter text'}
          className={cn(
            'h-12 w-full flex-shrink-0 rounded-xl bg-[var(--light-3)] px-5 py-3 text-sm text-[var(--text-color-light)] [-moz-appearance:textfield] placeholder:text-[var(--black-5)] focus:outline-none dark:bg-[var(--black-2)] dark:text-[var(--text-color)] [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none',
            error ? 'border border-red-500' : '',
            className,
          )}
          {...rest}
        />
        {Icon && Icon}
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
};

export default forwardRef(Input);
