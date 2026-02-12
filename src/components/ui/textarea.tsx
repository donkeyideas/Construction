"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils/cn";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const textareaId =
      id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="ui-field">
        {label && (
          <label htmlFor={textareaId} className="ui-label">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={cn(
            "ui-textarea",
            error && "ui-textarea-error",
            className
          )}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={
            error && textareaId ? `${textareaId}-error` : undefined
          }
          {...props}
        />
        {error && (
          <span
            id={textareaId ? `${textareaId}-error` : undefined}
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

Textarea.displayName = "Textarea";

export { Textarea };
