"use client";

import React, { useState } from "react";

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmKeyword?: string;
  confirmButtonText?: string;
  confirmVariant?: "danger" | "warning" | "primary";
  onConfirm: (reason: string) => Promise<void> | void;
  onClose: () => void;
  isLoading?: boolean;
}

export function ConfirmationModal({
  isOpen,
  title,
  description,
  confirmKeyword,
  confirmButtonText = "Confirm Action",
  confirmVariant = "danger",
  onConfirm,
  onClose,
  isLoading = false,
}: ConfirmationModalProps) {
  const [typedKeyword, setTypedKeyword] = useState("");
  const [reason, setReason] = useState("");

  if (!isOpen) return null;

  const isConfirmed = confirmKeyword ? typedKeyword === confirmKeyword : true;
  const canSubmit = isConfirmed && reason.trim().length > 0 && !isLoading;

  const btnClasses = {
    danger: "bg-rose-600 hover:bg-rose-700 text-white",
    warning: "bg-amber-600 hover:bg-amber-700 text-white",
    primary: "bg-sky-500 hover:bg-sky-600 text-white",
  }[confirmVariant];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    onConfirm(reason);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <h3 className="text-base font-bold text-slate-900">{title}</h3>
        <p className="mt-2 text-xs text-slate-500">{description}</p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700">
              Mandatory Administrative Reason / Audit Note <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Provide justification for compliance audit trail..."
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
            />
          </div>

          {confirmKeyword && (
            <div>
              <label className="block text-xs font-medium text-slate-700">
                Type <span className="font-mono text-amber-700 font-semibold">{confirmKeyword}</span> to confirm:
              </label>
              <input
                type="text"
                required
                value={typedKeyword}
                onChange={(e) => setTypedKeyword(e.target.value)}
                placeholder={confirmKeyword}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-mono text-slate-900 placeholder-slate-400 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-100"
              />
            </div>
          )}

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              disabled={isLoading}
              onClick={onClose}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className={`rounded-lg px-4 py-2 text-xs font-medium shadow-xs transition disabled:opacity-40 ${btnClasses}`}
            >
              {isLoading ? "Executing..." : confirmButtonText}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
