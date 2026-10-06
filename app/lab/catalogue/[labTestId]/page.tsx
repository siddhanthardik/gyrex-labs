"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Save,
  Clock,
  FlaskConical,
  FileText,
  Building2,
  Tag,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function LabTestEditPage() {
  const params = useParams();
  const labTestId = params?.labTestId as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [test, setTest] = useState<any>(null);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const [formData, setFormData] = useState({
    sellingPrice: 0,
    mrpPrice: 0,
    isActive: true,
    isHomeCollectionAvailable: true,
    customTatHours: 24,
    customPreparation: "",
    labSpecificNotes: "",
  });

  useEffect(() => {
    async function loadTest() {
      try {
        const res = await fetch(`/api/lab/catalogue/${labTestId}`);
        if (!res.ok) throw new Error("Failed to load diagnostic test details.");
        const data = await res.json();
        setTest(data.test);
        setFormData({
          sellingPrice: data.test.sellingPrice,
          mrpPrice: data.test.mrpPrice || data.test.sellingPrice,
          isActive: data.test.isActive,
          isHomeCollectionAvailable: data.test.isHomeCollectionAvailable,
          customTatHours: data.test.customTatHours || data.test.standardTatHours,
          customPreparation: data.test.customPreparation || "",
          labSpecificNotes: data.test.labSpecificNotes || "",
        });
      } catch (err: any) {
        setNotification({
          type: "error",
          message: err.message || "Failed to load test details.",
        });
      } finally {
        setLoading(false);
      }
    }

    if (labTestId) loadTest();
  }, [labTestId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setNotification(null);

    try {
      const res = await fetch(`/api/lab/catalogue/${labTestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Unable to update this test. Please try again.");
      }

      setNotification({
        type: "success",
        message: "Test pricing and laboratory rules saved successfully.",
      });
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err.message || "Unable to update this test. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-24 text-slate-500">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-sky-600 border-t-transparent" />
        <span className="ml-3 text-sm">Loading test details...</span>
      </div>
    );
  }

  if (!test) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-xs">
        <FlaskConical className="mx-auto h-8 w-8 text-slate-400" />
        <p className="mt-2 text-sm font-semibold text-slate-900">Diagnostic test not found.</p>
        <Link
          href="/lab/catalogue"
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-sky-600 hover:text-sky-700 hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Catalogue</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Page Header */}
      <div>
        <Link
          href="/lab/catalogue"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Catalogue</span>
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-sky-50 px-2 py-0.5 font-mono text-xs font-bold text-sky-700 border border-sky-200">
                {test.code}
              </span>
              <span className="text-xs font-medium text-slate-500">{test.categoryName}</span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{test.name}</h1>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold border ${
              formData.isActive
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-slate-100 text-slate-600 border-slate-200"
            }`}
          >
            {formData.isActive ? "Active in Store" : "Inactive / Hidden"}
          </span>
        </div>
      </div>

      {notification && (
        <div
          className={`rounded-xl p-4 text-xs font-medium border flex items-center gap-2.5 ${
            notification.type === "error"
              ? "bg-rose-50 border-rose-200 text-rose-700"
              : "bg-emerald-50 border-emerald-200 text-emerald-700"
          }`}
        >
          {notification.type === "error" ? (
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          ) : (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Test Specification Card (Read-Only Master Data) */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-sky-600" />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-700">
              Test Specification (Gyrex Master Clinical Standard)
            </span>
          </div>
          <span className="text-xs font-medium text-slate-500">
            Standard TAT: <strong className="text-slate-800">{test.standardTatHours}h</strong>
          </span>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          {test.masterDescription || "Standard diagnostic pathology investigation."}
        </p>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 pt-1 text-xs">
          <div className="rounded-lg bg-slate-50 border border-slate-100 p-2.5">
            <span className="text-[11px] font-medium text-slate-500 block">Specimen / Sample</span>
            <span className="font-semibold text-slate-900 mt-0.5 block">{test.sampleType}</span>
          </div>
          <div className="rounded-lg bg-slate-50 border border-slate-100 p-2.5">
            <span className="text-[11px] font-medium text-slate-500 block">Fasting Requirement</span>
            <span className="font-semibold text-slate-900 mt-0.5 block">
              {test.fastingRequired ? "Required" : "Not Required"}
            </span>
          </div>
          <div className="rounded-lg bg-slate-50 border border-slate-100 p-2.5">
            <span className="text-[11px] font-medium text-slate-500 block">Category</span>
            <span className="font-semibold text-slate-900 mt-0.5 block truncate">
              {test.categoryName}
            </span>
          </div>
          <div className="rounded-lg bg-slate-50 border border-slate-100 p-2.5">
            <span className="text-[11px] font-medium text-slate-500 block">Clinical Standard TAT</span>
            <span className="font-semibold text-slate-900 mt-0.5 block">
              {test.standardTatHours} Hours
            </span>
          </div>
        </div>
      </div>

      {/* Laboratory Configuration Card (Editable Form) */}
      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 space-y-6 shadow-xs"
      >
        <div className="border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-sky-600" />
            <h2 className="text-base font-semibold text-slate-900">
              Laboratory Configuration & Store Availability
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Custom selling prices, turnaround promises, and operational rules for your laboratory storefront.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-slate-700">Selling Price (₹) *</label>
            <input
              type="number"
              min="0"
              required
              value={formData.sellingPrice}
              onChange={(e) => setFormData({ ...formData, sellingPrice: Number(e.target.value) })}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none"
            />
            <p className="mt-1 text-[11px] text-slate-500">The actual price charged to the booking patient.</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700">MRP / Printed Price (₹)</label>
            <input
              type="number"
              min="0"
              value={formData.mrpPrice}
              onChange={(e) => setFormData({ ...formData, mrpPrice: Number(e.target.value) })}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none"
            />
            <p className="mt-1 text-[11px] text-slate-500">
              Maximum retail price. Displayed with strikethrough if higher than selling price.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700">Laboratory Turnaround Time (Hours)</label>
            <input
              type="number"
              min="1"
              value={formData.customTatHours}
              onChange={(e) => setFormData({ ...formData, customTatHours: Number(e.target.value) })}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none"
            />
            <p className="mt-1 text-[11px] text-slate-500">
              Expected time from sample collection to ready diagnostic report.
            </p>
          </div>

          <div className="flex flex-col justify-end space-y-3 pt-1">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
              />
              <span className="text-xs font-medium text-slate-700">
                Active in Store (Visible for patient booking)
              </span>
            </label>

            {/* Mandatory 3-State Home Collection UI Model */}
            <div
              className={`rounded-xl border p-4 space-y-2.5 transition ${
                test?.homeCollectionEligible === false
                  ? "border-slate-200 bg-slate-50/75"
                  : formData.isHomeCollectionAvailable
                  ? "border-sky-200 bg-sky-50/40"
                  : "border-slate-200 bg-white"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-900 block">
                    Home Sample Collection
                  </span>
                  <div className="mt-1">
                    {test?.homeCollectionEligible === false ? (
                      <span className="inline-flex items-center rounded-md bg-slate-100 border border-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                        Not available
                      </span>
                    ) : formData.isHomeCollectionAvailable ? (
                      <span className="inline-flex items-center rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                        Available / Offered
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                        Not offered by laboratory
                      </span>
                    )}
                  </div>
                </div>

                <label
                  className={`relative inline-flex items-center ${
                    test?.homeCollectionEligible === false
                      ? "cursor-not-allowed opacity-60"
                      : "cursor-pointer"
                  }`}
                >
                  <input
                    type="checkbox"
                    disabled={test?.homeCollectionEligible === false}
                    checked={
                      test?.homeCollectionEligible === false
                        ? false
                        : formData.isHomeCollectionAvailable
                    }
                    onChange={(e) => {
                      if (test?.homeCollectionEligible === false) return;
                      setFormData({
                        ...formData,
                        isHomeCollectionAvailable: e.target.checked,
                      });
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-600"></div>
                </label>
              </div>

              {test?.homeCollectionEligible === false ? (
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  This investigation requires on-site clinical collection and cannot be offered for home sample collection.
                </p>
              ) : !formData.isHomeCollectionAvailable ? (
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  This laboratory is not currently offering home collection for this investigation.
                </p>
              ) : null}
            </div>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-700">
              Custom Preparation Instructions
            </label>
            <textarea
              rows={2}
              value={formData.customPreparation}
              onChange={(e) => setFormData({ ...formData, customPreparation: e.target.value })}
              placeholder="e.g. 10-12 hours overnight fasting mandatory. Water intake permitted."
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-700">
              Laboratory Specific Notes (Internal)
            </label>
            <textarea
              rows={2}
              value={formData.labSpecificNotes}
              onChange={(e) => setFormData({ ...formData, labSpecificNotes: e.target.value })}
              placeholder="Internal lab instructions, bench notes, or phlebotomist reminders."
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <Link href="/lab/catalogue">
            <Button type="button" variant="outline" size="md">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            variant="primary"
            size="md"
            icon={Save}
            isLoading={saving}
          >
            {saving ? "Saving Changes..." : "Save Test Settings"}
          </Button>
        </div>
      </form>
    </div>
  );
}
