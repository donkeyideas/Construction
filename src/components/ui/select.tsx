"use client";

import { forwardRef } from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  label?: string;
  placeholder?: string;
  options: SelectOption[];
  value?: string;
  onValueChange?: (value: string) => void;
  defaultValue?: string;
  error?: string;
  disabled?: boolean;
  name?: string;
  required?: boolean;
  className?: string;
}

const Select = forwardRef<HTMLButtonElement, SelectProps>(
  (
    {
      label,
      placeholder = "Select an option",
      options,
      value,
      onValueChange,
      defaultValue,
      error,
      disabled,
      name,
      required,
      className,
    },
    ref
  ) => {
    const fieldId = label
      ? label.toLowerCase().replace(/\s+/g, "-")
      : undefined;

    return (
      <div className="ui-field">
        {label && (
          <label htmlFor={fieldId} className="ui-label">
            {label}
          </label>
        )}
        <SelectPrimitive.Root
          value={value}
          onValueChange={onValueChange}
          defaultValue={defaultValue}
          disabled={disabled}
          name={name}
          required={required}
        >
          <SelectPrimitive.Trigger
            ref={ref}
            id={fieldId}
            className={cn(
              "ui-select-trigger",
              error && "ui-select-trigger-error",
              className
            )}
            aria-invalid={error ? "true" : undefined}
          >
            <SelectPrimitive.Value placeholder={placeholder} />
            <SelectPrimitive.Icon className="ui-select-icon">
              <ChevronDown size={16} />
            </SelectPrimitive.Icon>
          </SelectPrimitive.Trigger>

          <SelectPrimitive.Portal>
            <SelectPrimitive.Content
              className="ui-select-content"
              position="popper"
              sideOffset={4}
            >
              <SelectPrimitive.Viewport className="ui-select-viewport">
                {options.map((option) => (
                  <SelectPrimitive.Item
                    key={option.value}
                    value={option.value}
                    className="ui-select-item"
                  >
                    <SelectPrimitive.ItemIndicator className="ui-select-item-indicator">
                      <Check size={14} />
                    </SelectPrimitive.ItemIndicator>
                    <SelectPrimitive.ItemText>
                      {option.label}
                    </SelectPrimitive.ItemText>
                  </SelectPrimitive.Item>
                ))}
              </SelectPrimitive.Viewport>
            </SelectPrimitive.Content>
          </SelectPrimitive.Portal>
        </SelectPrimitive.Root>
        {error && (
          <span
            id={fieldId ? `${fieldId}-error` : undefined}
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

Select.displayName = "Select";

export { Select };
