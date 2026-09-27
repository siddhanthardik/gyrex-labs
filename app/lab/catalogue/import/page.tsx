"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MatchResult, BulkImportAnalysis } from "@/services/lab/catalogue-service";

export default function BulkImportPage() {
  const router = useRouter();
  const [csvText, setCsvText] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [analysis, setAnalysis] = useState<BulkImportAnalysis | null>(null);
  const [reviewItems, setReviewItems] = useState<MatchResult[]>([]);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const sampleCsv = `Test Name,Code,Price,MRP
Complete Blood Count,CBC,350,500
Lipid Profile,LIPID,750,1100
Liver Function Test,LFT,600,900
Thyroid Profile Total,THYROID,450,700
Fasting Blood Sugar,FBS,90,150
Glycated Hemoglobin,HBA1C,450,650
Serum Creatinine,CREAT,180,250
Urine Routine and Microscopy,URINE,200,300`;

  const handleParseAndAnalyze = async () => {
    if (!csvText.trim()) {
      setNotification({ type: "error", message: "Please enter or paste CSV content." });
      return;
    }

    setAnalyzing(true);
    setNotification(null);

    try {
      const lines = csvText.trim().split("\n");
      const rows: Array<{ name: string; code?: string; price: number; mrp?: number }> = [];

      // Skip header if first line looks like header
      const startIndex = lines[0].toLowerCase().includes("name") ? 1 : 0;

      for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const cols = line.split(",").map((c) => c.trim().replace(/^["']|["']$/g, ""));
        if (cols.length >= 2) {
          const name = cols[0];
          const code = cols[1] && isNaN(Number(cols[1])) ? cols[1] : undefined;
          const price = parseFloat(cols[2] || cols[1] || "350");
          const mrp = cols[3] ? parseFloat(cols[3]) : undefined;

          if (name) {
            rows.push({
              name,
              code,
              price: isNaN(price) ? 350 : price,
              mrp: isNaN(mrp || 0) ? undefined : mrp,
            });
          }
        }
      }

      if (rows.length === 0) {
        throw new Error("Could not parse any valid test rows from the CSV text.");
      }

      const res = await fetch("/api/lab/catalogue/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ANALYZE", rows }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Analysis failed.");
      }

      const data = await res.json();
      setAnalysis(data.analysis);
      setReviewItems(data.analysis.results || []);
    } catch (err: any) {
      setNotification({ type: "error", message: err.message || "Failed to analyze import file." });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!analysis) return;
    setConfirming(true);
    setNotification(null);

    try {
      // Gather confirmed items that have a matchedMaster
      const confirmed = reviewItems
        .filter((r) => r.matchedMaster !== null)
        .map((r) => ({
          masterTestId: r.matchedMaster!.id,
          sellingPrice: r.row.price,
          mrpPrice: r.row.mrp,
          isHomeCollectionAvailable: true,
        }));

      if (confirmed.length === 0) {
        throw new Error("No matched tests available to import.");
      }

      const res = await fetch("/api/lab/catalogue/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "CONFIRM", items: confirmed }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Confirmation failed.");
      }

      const data = await res.json();
      setNotification({
        type: "success",
        message: `Successfully imported ${data.result.count} diagnostic tests to your catalogue!`,
      });

      setTimeout(() => {
        router.push("/lab/catalogue");
      }, 1500);
    } catch (err: any) {
      setNotification({ type: "error", message: err.message || "Failed to confirm import." });
    } finally {
      setConfirming(false);
    }
  };

  const handleIgnoreRow = (index: number) => {
    setReviewItems((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div>
        <Link href="/lab/catalogue" className="text-xs font-semibold text-zinc-400 hover:text-white transition">
          ← Back to Catalogue
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-white">
          Bulk Test Catalogue Import (Excel / CSV)
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Upload your existing laboratory test list. Our system automatically matches your test names
          against standard Gyrex Test Master records with zero guesswork.
        </p>
      </div>

      {notification && (
        <div
          className={`rounded-xl p-4 text-xs font-medium border ${
            notification.type === "error"
              ? "bg-rose-500/10 border-rose-500/25 text-rose-400"
              : "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
          }`}
        >
          {notification.message}
        </div>
      )}

      {/* Stage 1: Input / Upload */}
      {!analysis && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-white">Paste CSV or Test List</h2>
              <p className="text-xs text-zinc-400">
                Columns: <code className="text-sky-400">Test Name, Code, Price, MRP</code>
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCsvText(sampleCsv)}
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1 text-xs font-medium text-zinc-300 hover:bg-zinc-700"
            >
              Load Sample Template
            </button>
          </div>

          <textarea
            rows={10}
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            placeholder="Complete Blood Count, CBC, 350, 500&#10;Lipid Profile, LIPID, 750, 1100..."
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-4 font-mono text-xs text-white focus:border-sky-500 focus:outline-none"
          />

          <div className="flex items-center justify-between pt-2">
            <p className="text-[11px] text-zinc-400">
              Matches are matched safely and previewed before any changes are written to your database.
            </p>
            <button
              type="button"
              disabled={analyzing}
              onClick={handleParseAndAnalyze}
              className="rounded-lg bg-sky-500 px-6 py-2.5 text-xs font-semibold text-white shadow-lg shadow-sky-500/20 hover:bg-sky-400 transition disabled:opacity-50"
            >
              {analyzing ? "Analyzing Test Names..." : "Parse & Match Against Test Master →"}
            </button>
          </div>
        </div>
      )}

      {/* Stage 2: Matching Results & Review */}
      {analysis && (
        <div className="space-y-6">
          {/* Analysis Summary Cards */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
              <span className="text-xs text-zinc-400">Total Found</span>
              <p className="mt-1 text-2xl font-bold text-white">{analysis.totalImported}</p>
            </div>
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-4">
              <span className="text-xs text-emerald-400">Auto-Matched</span>
              <p className="mt-1 text-2xl font-bold text-emerald-300">{analysis.autoMatchedCount}</p>
            </div>
            <div className="rounded-xl border border-amber-500/20 bg-amber-950/20 p-4">
              <span className="text-xs text-amber-400">Requires Review</span>
              <p className="mt-1 text-2xl font-bold text-amber-300">{analysis.needsReviewCount}</p>
            </div>
            <div className="rounded-xl border border-sky-500/20 bg-sky-950/20 p-4">
              <span className="text-xs text-sky-400">Ready to Publish</span>
              <p className="mt-1 text-2xl font-bold text-sky-300">{analysis.readyPercentage}%</p>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div>
              <p className="text-xs font-semibold text-white">
                Review Matching & Prices ({reviewItems.length} items)
              </p>
              <p className="text-[11px] text-zinc-400">
                Tests with &gt;90% match confidence are pre-selected. Unmatched tests can be ignored or mapped.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setAnalysis(null)}
                className="rounded-lg border border-zinc-700 bg-zinc-800 px-3.5 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-700"
              >
                Reset
              </button>
              <button
                type="button"
                disabled={confirming || reviewItems.length === 0}
                onClick={handleConfirmImport}
                className="rounded-lg bg-sky-500 px-5 py-1.5 text-xs font-semibold text-white shadow-lg shadow-sky-500/20 hover:bg-sky-400 transition disabled:opacity-50"
              >
                {confirming ? "Importing to Lab..." : `Confirm & Add (${reviewItems.filter(r => r.matchedMaster).length}) Tests`}
              </button>
            </div>
          </div>

          {/* Review Table */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-900/60 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    <th className="py-3 px-4">Imported Name & Price</th>
                    <th className="py-3 px-4">Matched Gyrex Standard Test</th>
                    <th className="py-3 px-4">Match Reason / Confidence</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {reviewItems.map((item, idx) => (
                    <tr key={idx} className="transition hover:bg-zinc-800/20">
                      <td className="py-3 px-4">
                        <p className="font-semibold text-white">{item.row.name}</p>
                        <p className="text-xs text-zinc-400">
                          Price: <strong className="text-emerald-400">₹{item.row.price}</strong>
                          {item.row.mrp && <span className="ml-2">MRP: ₹{item.row.mrp}</span>}
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        {item.matchedMaster ? (
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="rounded bg-sky-500/10 px-1.5 py-0.5 font-mono text-[10px] font-bold text-sky-400">
                                {item.matchedMaster.code}
                              </span>
                              <span className="font-medium text-white">{item.matchedMaster.name}</span>
                            </div>
                            <span className="text-[11px] text-zinc-400">
                              {item.matchedMaster.categoryName} • {item.matchedMaster.standardTatHours}h TAT
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs font-medium text-rose-400">No match found</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                              item.confidence >= 0.9
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                : item.confidence >= 0.7
                                ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                            }`}
                          >
                            {Math.round(item.confidence * 100)}%
                          </span>
                          <span className="text-xs text-zinc-400">{item.reason}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleIgnoreRow(idx)}
                          className="rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-400 hover:text-white"
                        >
                          Ignore
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
