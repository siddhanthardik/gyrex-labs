import React from "react";
import type { LucideIcon } from "lucide-react";

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md";
  label: string;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon: Icon, variant = "ghost", size = "sm", label, className = "", ...props }, ref) => {
    const variantStyles = {
      primary: "bg-sky-500 text-white hover:bg-sky-600 shadow-xs",
      secondary: "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200",
      outline: "bg-white text-slate-700 hover:bg-slate-50 border border-slate-300 shadow-2xs",
      ghost: "text-slate-500 hover:bg-slate-100 hover:text-slate-700",
      danger: "text-rose-600 hover:bg-rose-50 hover:text-rose-700",
    }[variant];

    const sizeStyles = {
      sm: "p-1.5 rounded-md",
      md: "p-2 rounded-lg",
    }[size];

    return (
      <button
        ref={ref}
        type="button"
        aria-label={label}
        title={label}
        className={`inline-flex items-center justify-center transition focus:outline-none focus:ring-2 focus:ring-sky-100 disabled:opacity-50 disabled:cursor-not-allowed ${variantStyles} ${sizeStyles} ${className}`}
        {...props}
      >
        <Icon className="h-4 w-4" />
      </button>
    );
  }
);

IconButton.displayName = "IconButton";
