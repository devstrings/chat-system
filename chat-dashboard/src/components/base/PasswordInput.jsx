import React, { forwardRef, useState } from 'react';

import Svgs from '@/components/icons/Svgs';

const PasswordInput = (
  { value, onChange, onBlur, name, error, placeholder, label, id },
  ref,
) => {
  const [isPasswordVisible, setPasswordVisible] = useState(false);

  const togglePasswordVisibility = () => {
    setPasswordVisible((prevState) => !prevState);
  };

  return (
    <div className="mb-3">
      {label && (
        <label
          htmlFor={id || name}
          className="mb-1 block text-base font-semibold text-[var(--text-color)]"
        >
          {label}
        </label>
      )}
      <div className="relative">
        <input
          ref={ref}
          id={id || name}
          name={name}
          value={value || ''}
          onChange={onChange}
          onBlur={onBlur}
          type={isPasswordVisible ? 'text' : 'password'}
          placeholder={placeholder || 'Enter Your Password'}
          className={`w-full rounded-xl border border-[#ECECEC] bg-transparent p-4 text-sm text-[#2D2D2D] placeholder:text-[#717171] focus:outline-none dark:border-[#434343] dark:text-[var(--text-color)] ${
            error ? 'border-red-500' : ''
          }`}
        />
        {isPasswordVisible ? (
          <Svgs.Eye
            onClick={togglePasswordVisibility}
            className="absolute bottom-[17px] right-3 size-5 cursor-pointer object-contain text-[#C6C6C6] dark:text-[#717171]"
          />
        ) : (
          <Svgs.EyeSlash
            onClick={togglePasswordVisibility}
            className="absolute bottom-[17px] right-3 size-5 cursor-pointer object-contain text-[#C6C6C6] dark:text-[#717171]"
          />
        )}
      </div>
      {error && <p className="mt-1 text-red-500">{error}</p>}
    </div>
  );
};

export default forwardRef(PasswordInput);
