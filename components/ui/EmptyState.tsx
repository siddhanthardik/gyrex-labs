import React from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { FileText } from "lucide-react";
import { Button } from "./Button";

export interface EmptyStateProps {
  icon?: LucideIcon | React.ReactNode;
  title: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
  onActionClick?: () => void;
  actionHref?: string;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  actionText,
  onAction,
  onActionClick,
  actionHref,
  className = "",
}: EmptyStateProps) {
  const handleAction = onAction || onActionClick;

  const renderIcon = () => {
    if (!icon) {
      return <FileText className="h-6 w-6 text-slate-400" />;
    }
    // Check if icon is a valid React node (e.g. <Search ... />)
    if (React.isValidElement(icon)) {
      return icon;
    }
    // Otherwise treat as a LucideIcon component
    const IconComponent = icon as LucideIcon;
    return <IconComponent className="h-6 w-6 text-slate-400" />;
  };

  return (
    <div
      className={`flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 p-10 text-center ${className}`}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white border border-slate-200 shadow-2xs text-slate-500 mb-3">
        {renderIcon()}
      </div>
      <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
      {description && <p className="mt-1 text-xs text-slate-500 max-w-sm">{description}</p>}
      {actionText && (
        <div className="mt-4">
          {actionHref ? (
            <Link href={actionHref}>
              <Button size="sm">{actionText}</Button>
            </Link>
          ) : (
            <Button size="sm" onClick={handleAction}>
              {actionText}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
