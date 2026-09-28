"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "./cart-context";
import {
  Upload,
  Sparkles,
  FileText,
  Check,
  AlertCircle,
  ArrowRight,
  Camera,
  Image as ImageIcon,
  CheckCircle2,
  Lock,
  Plus,
  Info,
} from "lucide-react";

interface ExtractedCandidate {
  rawTestName: string;
  matchedMasterTestId: string | null;
  matchedTestName: string | null;
  labTestId: string | null;
  sellingPrice: number | null;
  isAvailableInLab: boolean;
  selectedByDefault: boolean;
}

interface ExtractionResponse {
  status: "SUCCESS" | "PARTIAL" | "NO_MATCH" | "ERROR";
  message: string;
  totalFound: number;
  candidates: ExtractedCandidate[];
}

export function PrescriptionUploader({
  labSlug,
  labId,
  labName = "this laboratory",
}: {
  labSlug: string;
  labId: string;
  labName?: string;
}) {
  const router = useRouter();
  const { addItem } = useCart();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ExtractionResponse | null>(null);
  const [selectedTests, setSelectedTests] = useState<Record<string, boolean>>({});

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setPreviewUrl(URL.createObjectURL(selected));
      setResult(null);
    }
  };

  const handleExtract = async (sampleTests?: string[]) => {
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/prescription/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          labId,
          testNames: sampleTests || [
            "Complete Blood Count (CBC)",
            "Liver Function Test (LFT)",
            "Kidney Function Test (KFT)",
            "Lipid Profile",
            "Thyroid Profile (TSH)",
            "Fasting Blood Sugar",
          ],
        }),
      });

      const data: ExtractionResponse = await res.json();
      setResult(data);

      // Default selection to all available tests
      const initialSelection: Record<string, boolean> = {};
      data.candidates?.forEach((c) => {
        if (c.labTestId && c.isAvailableInLab) {
          initialSelection[c.labTestId] = true;
        }
      });
      setSelectedTests(initialSelection);
    } catch {
      setResult({
        status: "ERROR",
        message: "Unable to process prescription at this time. Please try again or search tests manually.",
        totalFound: 0,
        candidates: [],
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleTest = (labTestId: string) => {
    setSelectedTests((prev) => ({
      ...prev,
      [labTestId]: !prev[labTestId],
    }));
  };

  const selectedCount = Object.values(selectedTests).filter(Boolean).length;
  const selectedPriceTotal = result?.candidates?.reduce((sum, c) => {
    if (c.labTestId && selectedTests[c.labTestId] && c.sellingPrice) {
      return sum + c.sellingPrice;
    }
    return sum;
  }, 0) || 0;

  const handleAddSelectedToCart = () => {
    if (!result) return;

    result.candidates.forEach((c) => {
      if (c.labTestId && selectedTests[c.labTestId] && c.sellingPrice) {
        addItem({
          id: c.labTestId,
          itemType: "TEST",
          name: c.matchedTestName || c.rawTestName,
          price: c.sellingPrice,
        });
      }
    });

    router.push(`/${labSlug}/cart`);
  };

  return (
    <div className="space-y-4">
      {/* Upload Box (Reference Screen 8: Upload Prescription) */}
      <div className="overflow-hidden rounded-3xl border-2 border-dashed border-sky-300 bg-sky-50/40 p-6 text-center dark:border-sky-800 dark:bg-zinc-900 shadow-sm">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300 shadow-inner">
          <Upload className="h-8 w-8" />
        </div>

        <h3 className="mt-4 text-base font-extrabold text-zinc-900 dark:text-white">
          Upload Doctor&apos;s Prescription
        </h3>
        <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400 max-w-sm mx-auto leading-relaxed">
          Upload a clear photo or PDF scan. Our system instantly identifies test names and matches them with {labName}&apos;s rate card.
        </p>

        {/* AI Transparency Badge */}
        <div className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-white px-3.5 py-2 text-xs font-semibold text-sky-800 border border-sky-100 shadow-xs dark:border-sky-900/50 dark:bg-sky-950/60 dark:text-sky-200">
          <Sparkles className="h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400" />
          <span>Automated test identification with full patient review</span>
        </div>

        {/* Upload Action Buttons */}
        <div className="mt-6 flex flex-col items-center justify-center gap-2.5 sm:flex-row">
          <label className="flex w-full sm:w-auto items-center justify-center gap-2 cursor-pointer rounded-2xl bg-sky-700 px-6 py-3.5 text-xs font-bold text-white shadow-md hover:bg-sky-600 transition">
            <Camera className="h-4 w-4" />
            <span>Upload Photo or PDF</span>
            <input
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={handleFileChange}
            />
          </label>

          <button
            type="button"
            onClick={() =>
              handleExtract([
                "Complete Blood Count (CBC)",
                "Liver Function Test",
                "Lipid Profile",
                "Thyroid Profile (TSH)",
                "Fasting Blood Sugar",
              ])
            }
            className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-2xl border border-zinc-300 bg-white px-5 py-3 text-xs font-bold text-zinc-700 hover:bg-zinc-50 shadow-xs dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 transition"
          >
            <Sparkles className="h-4 w-4 text-amber-500" />
            <span>Try Sample Routine Rx</span>
          </button>
        </div>

        {file && (
          <div className="mt-4 flex items-center justify-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
            <span>Selected File: {file.name}</span>
          </div>
        )}

        {previewUrl && (
          <div className="mt-4 flex flex-col items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Prescription preview"
              className="max-h-52 rounded-2xl border border-zinc-200 object-contain shadow-md dark:border-zinc-800"
            />
            <button
              type="button"
              disabled={loading}
              onClick={() => handleExtract()}
              className="mt-4 flex items-center gap-2 rounded-2xl bg-sky-700 px-8 py-3.5 text-xs font-bold text-white shadow-md hover:bg-sky-600 transition disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4" />
              <span>{loading ? "Analyzing Prescription..." : "Extract Tests from Prescription"}</span>
            </button>
          </div>
        )}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="rounded-3xl border border-sky-200 bg-sky-50/70 p-8 text-center dark:border-sky-900 dark:bg-sky-950/30">
          <div className="mx-auto flex h-12 w-12 animate-spin items-center justify-center rounded-full border-3 border-sky-600 border-t-transparent" />
          <h4 className="mt-4 text-sm font-extrabold text-sky-900 dark:text-sky-200">
            Reading Medical Investigations...
          </h4>
          <p className="mt-1 text-xs text-sky-700 dark:text-sky-400 max-w-xs mx-auto">
            Matching extracted doctor prescriptions with {labName}&apos;s verified catalogue.
          </p>
        </div>
      )}

      {/* Reference Screen 7: Prescription Test Review */}
      {result && !loading && (
        <div className="rounded-3xl border border-zinc-200/90 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                  <Check className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-extrabold text-zinc-900 dark:text-white">
                  Prescription Test Review
                </h3>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                Select the tests recommended by your doctor to add them directly to your booking.
              </p>
            </div>
            <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-bold text-sky-800 dark:bg-sky-950 dark:text-sky-300 shrink-0">
              {result.totalFound} Detected
            </span>
          </div>

          {/* Test candidates list */}
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800 rounded-2xl border border-zinc-100 dark:border-zinc-800">
            {result.candidates.map((c, idx) => {
              const isSelected = c.labTestId ? Boolean(selectedTests[c.labTestId]) : false;

              return (
                <div
                  key={idx}
                  className={`flex items-center justify-between p-3.5 transition ${
                    isSelected
                      ? "bg-sky-50/40 dark:bg-sky-950/20"
                      : "bg-white dark:bg-zinc-900"
                  }`}
                >
                  <label className="flex items-start gap-3 flex-1 cursor-pointer min-w-0 pr-2">
                    {c.isAvailableInLab && c.labTestId ? (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleTest(c.labTestId!)}
                        className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-sky-600 focus:ring-sky-500"
                      />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                    )}

                    <div className="min-w-0">
                      <p className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                        {c.matchedTestName || c.rawTestName}
                      </p>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                        {c.isAvailableInLab
                          ? `Rx: "${c.rawTestName}"`
                          : `"${c.rawTestName}" not available in this lab`}
                      </p>
                    </div>
                  </label>

                  <div className="shrink-0 text-right">
                    {c.isAvailableInLab && c.sellingPrice ? (
                      <span className="text-xs font-extrabold text-zinc-900 dark:text-white">
                        ₹{c.sellingPrice}
                      </span>
                    ) : (
                      <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-950/50 dark:text-amber-400">
                        Unavailable
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sticky confirmation bar */}
          <div className="pt-2">
            <button
              type="button"
              disabled={selectedCount === 0}
              onClick={handleAddSelectedToCart}
              className="flex w-full items-center justify-between rounded-2xl bg-sky-700 px-5 py-4 text-xs font-bold text-white shadow-md hover:bg-sky-600 active:scale-[0.99] transition disabled:opacity-50"
            >
              <span>
                Add {selectedCount} Selected {selectedCount === 1 ? "Test" : "Tests"} (₹{selectedPriceTotal})
              </span>
              <div className="flex items-center gap-1">
                <span>Go to Cart</span>
                <ArrowRight className="h-4 w-4" />
              </div>
            </button>
            <div className="mt-2 flex items-center justify-center gap-1 text-[11px] text-zinc-400 text-center">
              <Info className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
              <span>You can adjust quantities or remove items anytime before confirming.</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
