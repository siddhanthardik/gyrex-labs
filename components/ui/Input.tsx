import React from "react";
import type { LucideIcon } from "lucide-react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: LucideIcon;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ icon: Icon, error, helperText, className = "", ...props }, ref) => {
    return (
      <div className="w-full">
        <div className="relative">
          {Icon && (
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Icon className="h-4 w-4 text-slate-400" />
            </div>
          )}
          <input
            ref={ref}
            className={`w-full rounded-lg border bg-white px-3.5 py-2 text-xs sm:text-sm text-slate-900 placeholder-slate-400 transition focus:outline-none focus:ring-2 focus:ring-sky-100 ${
              Icon ? "pl-9" : ""
            } ${
              error
                ? "border-rose-300 focus:border-rose-500 focus:ring-rose-100"
                : "border-slate-300 focus:border-sky-500"
            } disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed ${className}`}
            {...props}
          />
        </div>
        {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
        {!error && helperText && <p className="mt-1 text-xs text-slate-500">{helperText}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
