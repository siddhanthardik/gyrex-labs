import React from "react";
import Link from "next/link";

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: string;
  actionText?: string;
  actionHref?: string;
  onActionClick?: () => void;
}

export function SuperadminEmptyState({
  title,
  description,
  icon = "🔍",
  actionText,
  actionHref,
  onActionClick,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/60 p-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-900 text-2xl mb-4">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-white">{title}</h3>
      <p className="mt-1 max-w-sm text-xs text-zinc-400">{description}</p>

      {actionText && (
        <div className="mt-5">
          {actionHref ? (
            <Link
              href={actionHref}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-500"
            >
              {actionText}
            </Link>
          ) : (
            <button
              type="button"
              onClick={onActionClick}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-500"
            >
              {actionText}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
