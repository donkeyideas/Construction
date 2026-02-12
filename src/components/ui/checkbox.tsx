"use client";

import { forwardRef } from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check, Minus } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface CheckboxProps
  extends React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root> {
  label?: string;
}

const Checkbox = forwardRef<HTMLButtonElement, CheckboxProps>(
  ({ className, label, id, ...props }, ref) => {
    const checkboxId =
      id || (label ? `cb-${label.toLowerCase().replace(/\s+/g, "-")}` : undefined);

    return (
      <div className="ui-checkbox-wrap">
        <CheckboxPrimitive.Root
          ref={ref}
          id={checkboxId}
          className={cn("ui-checkbox", className)}
          {...props}
        >
          <CheckboxPrimitive.Indicator className="ui-checkbox-indicator">
            {props.checked === "indeterminate" ? (
              <Minus size={14} strokeWidth={3} />
            ) : (
              <Check size={14} strokeWidth={3} />
            )}
          </CheckboxPrimitive.Indicator>
        </CheckboxPrimitive.Root>
        {label && (
          <label htmlFor={checkboxId} className="ui-checkbox-label">
            {label}
          </label>
        )}
      </div>
    );
  }
);

Checkbox.displayName = "Checkbox";

export { Checkbox };
