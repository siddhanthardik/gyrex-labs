import React from "react";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: string;
  helperText?: string;
  options?: Array<{ label: string; value: string | number; disabled?: boolean }>;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ error, helperText, options, children, className = "", ...props }, ref) => {
    return (
      <div className="w-full">
        <select
          ref={ref}
          className={`w-full rounded-lg border bg-white px-3 py-2 text-xs sm:text-sm text-slate-700 transition focus:outline-none focus:ring-2 focus:ring-sky-100 ${
            error
              ? "border-rose-300 focus:border-rose-500 focus:ring-rose-100"
              : "border-slate-300 focus:border-sky-500"
          } disabled:bg-slate-50 disabled:cursor-not-allowed ${className}`}
          {...props}
        >
          {options
            ? options.map((opt) => (
                <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                  {opt.label}
                </option>
              ))
            : children}
        </select>
        {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
        {!error && helperText && <p className="mt-1 text-xs text-slate-500">{helperText}</p>}
      </div>
    );
  }
);

Select.displayName = "Select";
