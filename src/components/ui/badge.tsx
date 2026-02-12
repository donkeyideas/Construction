import { cn } from "@/lib/utils/cn";

type BadgeVariant = "blue" | "amber" | "green" | "red" | "gray";
type BadgeSize = "sm" | "md";

const variantClasses: Record<BadgeVariant, string> = {
  blue: "ui-badge-blue",
  amber: "ui-badge-amber",
  green: "ui-badge-green",
  red: "ui-badge-red",
  gray: "ui-badge-gray",
};

const sizeClasses: Record<BadgeSize, string> = {
  sm: "ui-badge-sm",
  md: "ui-badge-md",
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
}

function Badge({
  variant = "blue",
  size = "sm",
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "ui-badge",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

export { Badge };
