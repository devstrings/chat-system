import React, { forwardRef } from 'react';

import Input from './Input';

const FormInput = ({ name, label, id, ...rest }, ref) => {
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
      <Input {...rest} ref={ref} />
    </div>
  );
};

export default forwardRef(FormInput);
