import * as React from "react";

import { cn } from "@/lib/utils";

type ButtonVariant = "default" | "ghost" | "console" | "consoleOutline";
type ButtonSize = "default" | "sm";

const baseClasses =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0";

const variantClasses: Record<ButtonVariant, string> = {
  default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
  ghost: "hover:bg-accent hover:text-accent-foreground",
  console: "bg-primary text-primary-foreground font-display font-bold uppercase hover:bg-accent",
  consoleOutline: "border border-border bg-transparent text-muted-foreground hover:border-muted-foreground hover:text-foreground",
};

const sizeClasses: Record<ButtonSize, string> = {
  default: "h-9 px-4 py-2",
  sm: "h-8 rounded-md px-3 text-xs",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(baseClasses, variantClasses[variant], sizeClasses[size], className)}
      {...props}
    />
  ),
);
Button.displayName = "Button";
