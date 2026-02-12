"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils/cn";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  iconLeft?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, iconLeft, id, type = "text", ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="ui-field">
        {label && (
          <label htmlFor={inputId} className="ui-label">
            {label}
          </label>
        )}
        <div className="ui-input-wrap">
          {iconLeft && <span className="ui-input-icon">{iconLeft}</span>}
          <input
            ref={ref}
            id={inputId}
            type={type}
            className={cn(
              "ui-input",
              error && "ui-input-error",
              className
            )}
            data-has-icon={iconLeft ? "true" : undefined}
            aria-invalid={error ? "true" : undefined}
            aria-describedby={error && inputId ? `${inputId}-error` : undefined}
            {...props}
          />
        </div>
        {error && (
          <span
            id={inputId ? `${inputId}-error` : undefined}
            className="ui-error-msg"
            role="alert"
          >
            {error}
          </span>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export { Input };
