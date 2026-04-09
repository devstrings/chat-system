import React, { forwardRef } from 'react';

import { cn } from '@/lib/utils';

const FormTextarea = (
  {
    value,
    onChange,
    onBlur,
    name,
    error,
    placeholder,
    label,
    rows = 3,
    cols = 3,
    id,
    className,
  },
  ref,
) => {
  return (
    <div className="flex w-full flex-col items-start gap-2">
      {label && (
        <label
          htmlFor={id || name}
          className="block text-sm font-bold text-[var(--text-color-light)] dark:text-[var(--text-color)]"
        >
          {label}
        </label>
      )}
      <div className="flex w-full flex-col gap-1">
        <textarea
          rows={rows}
          cols={cols}
          ref={ref}
          id={id || name}
          name={name}
          value={value || ''}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder || 'Enter text'}
          className={cn(
            'h-[200px] w-full flex-shrink-0 rounded-xl bg-[var(--light-3)] p-4 px-5 py-3 text-sm text-[var(--text-color-light)] placeholder:text-[var(--black-5)] focus:outline-none dark:bg-[var(--black-2)] dark:text-[var(--text-color)]',
            error ? 'border border-red-500' : '',
            className,
          )}
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    </div>
  );
};

export default forwardRef(FormTextarea);
