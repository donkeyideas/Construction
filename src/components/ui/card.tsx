import { forwardRef } from "react";
import { cn } from "@/lib/utils/cn";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  noPadding?: boolean;
  title?: string;
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, noPadding = false, title, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "ui-card",
          noPadding && "ui-card-no-padding",
          className
        )}
        {...props}
      >
        {title && <h3 className="ui-card-title">{title}</h3>}
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";

export { Card };
