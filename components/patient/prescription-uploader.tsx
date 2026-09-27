"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "./cart-context";
import { Upload, Sparkles, FileText, Check, AlertCircle, ArrowRight } from "lucide-react";

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
          // If sample tests provided (for demo/testing button), pass them, otherwise standard extraction tests
          testNames: sampleTests || ["Complete Blood Count (CBC)", "Liver Function Test", "Kidney Function Test", "Lipid Profile", "Thyroid Profile (TSH)", "Fasting Blood Sugar"],
        }),
      });

      const data: ExtractionResponse = await res.json();
      setResult(data);

      // Default selection to all available tests
      const initialSelection: Record<string, boolean> = {};
      data.candidates.forEach((c) => {
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
    <div className="space-y-6">
      {/* Upload Zone */}
      <div className="rounded-2xl border-2 border-dashed border-zinc-200 bg-zinc-50/50 p-6 text-center dark:border-zinc-800 dark:bg-zinc-900/40 sm:p-10">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 dark:bg-sky-950/60 dark:text-sky-400">
          <Upload className="h-7 w-7" />
        </div>

        <h3 className="mt-4 text-base font-bold text-zinc-900 dark:text-white">
          Upload Doctor&apos;s Prescription
        </h3>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
          Upload a clear photo or PDF of your doctor&apos;s prescription. Our AI reads the test names so you don&apos;t have to search manually.
        </p>

        {/* Clear Medical AI Notice */}
        <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-sky-50 px-3.5 py-2 text-xs font-medium text-sky-800 dark:bg-sky-950/50 dark:text-sky-300">
          <Sparkles className="h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400" />
          <span>We use AI only to identify written investigation names. You will review every test before ordering.</span>
        </div>

        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <label className="cursor-pointer rounded-xl bg-sky-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-sky-500 transition">
            <span>Browse File or Take Photo</span>
            <input
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={handleFileChange}
            />
          </label>

          <span className="text-xs text-zinc-400">or try a sample:</span>

          <button
            type="button"
            onClick={() => handleExtract(["Complete Blood Count", "Liver Function Test", "Lipid Profile", "TSH"])}
            className="rounded-xl border border-zinc-300 bg-white px-3.5 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 transition"
          >
            Demo Routine Prescription
          </button>
        </div>

        {file && (
          <div className="mt-5 flex items-center justify-center gap-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            <FileText className="h-4 w-4" />
            <span>Selected: {file.name}</span>
          </div>
        )}

        {previewUrl && (
          <div className="mt-4 flex flex-col items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Prescription preview"
              className="max-h-48 rounded-xl border border-zinc-200 object-contain shadow-sm dark:border-zinc-800"
            />
            <button
              type="button"
              disabled={loading}
              onClick={() => handleExtract()}
              className="mt-4 rounded-xl bg-sky-600 px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-sky-500 transition disabled:opacity-50"
            >
              {loading ? "Reading prescription with Gemini..." : "Extract Tests with AI"}
            </button>
          </div>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="rounded-2xl border border-sky-200 bg-sky-50/50 p-6 text-center dark:border-sky-900/50 dark:bg-sky-950/20">
          <div className="mx-auto flex h-10 w-10 animate-spin items-center justify-center rounded-full border-2 border-sky-600 border-t-transparent" />
          <h4 className="mt-3 text-sm font-bold text-sky-900 dark:text-sky-200">
            Reading your prescription...
          </h4>
          <p className="mt-1 text-xs text-sky-700 dark:text-sky-400">
            Identifying diagnostic investigations and matching with {labName}&apos;s catalogue.
          </p>
        </div>
      )}

      {/* Extracted Test Review Card */}
      {result && !loading && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                  <Check className="h-4 w-4" />
                </span>
                <h4 className="text-base font-bold text-zinc-950 dark:text-white">
                  {result.message}
                </h4>
              </div>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Please review and confirm which tests you wish to book with {labName}.
              </p>
            </div>

            <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              {result.totalFound} Found
            </span>
          </div>

          {/* Test Candidates List */}
          <div className="mt-5 divide-y divide-zinc-100 dark:divide-zinc-800/80">
            {result.candidates.map((c, idx) => {
              const isSelected = c.labTestId ? Boolean(selectedTests[c.labTestId]) : false;

              return (
                <div key={idx} className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    {c.isAvailableInLab && c.labTestId ? (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleTest(c.labTestId!)}
                        className="h-4 w-4 rounded border-zinc-300 text-sky-600 focus:ring-sky-500"
                      />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-amber-500" />
                    )}

                    <div>
                      <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        {c.matchedTestName || c.rawTestName}
                      </div>
                      <div className="text-xs text-zinc-400">
                        {c.isAvailableInLab
                          ? `Matched from prescription: "${c.rawTestName}"`
                          : `"${c.rawTestName}" is currently not offered by this lab`}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    {c.isAvailableInLab && c.sellingPrice ? (
                      <span className="text-sm font-bold text-zinc-950 dark:text-white">
                        ₹{c.sellingPrice}
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                        Unavailable
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action to Cart */}
          <div className="mt-6 flex flex-col items-center justify-between gap-3 border-t border-zinc-100 pt-4 dark:border-zinc-800 sm:flex-row">
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              AI extraction does not substitute medical consultation. You control your final selection.
            </span>

            <button
              type="button"
              onClick={handleAddSelectedToCart}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-sky-600 px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-sky-500 transition sm:w-auto"
            >
              <span>Add Selected to Cart</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
