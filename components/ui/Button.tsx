import React from "react";
import type { LucideIcon } from "lucide-react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  icon?: LucideIcon;
  iconPosition?: "left" | "right";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      icon: Icon,
      iconPosition = "left",
      isLoading = false,
      children,
      className = "",
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-semibold transition rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-100 disabled:opacity-50 disabled:cursor-not-allowed select-none";

    const variantStyles = {
      primary: "bg-sky-500 text-white hover:bg-sky-600 shadow-xs border border-transparent",
      secondary: "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200",
      outline: "bg-white text-slate-700 hover:bg-slate-50 border border-slate-300 shadow-2xs",
      ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-transparent",
      danger: "bg-rose-600 text-white hover:bg-rose-700 shadow-xs border border-transparent",
    }[variant];

    const sizeStyles = {
      sm: "text-xs px-2.5 py-1.5 gap-1.5",
      md: "text-xs sm:text-sm px-3.5 py-2 gap-2",
      lg: "text-sm sm:text-base px-4 py-2.5 gap-2.5",
    }[size];

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${baseStyles} ${variantStyles} ${sizeStyles} ${className}`}
        {...props}
      >
        {isLoading ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : Icon && iconPosition === "left" ? (
          <Icon className="h-4 w-4 shrink-0" />
        ) : null}
        {children}
        {!isLoading && Icon && iconPosition === "right" ? (
          <Icon className="h-4 w-4 shrink-0" />
        ) : null}
      </button>
    );
  }
);

Button.displayName = "Button";
