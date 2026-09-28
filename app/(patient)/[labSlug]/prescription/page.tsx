import { notFound } from "next/navigation";
import { getLabStorefront } from "@/services/labs/storefront";
import { PrescriptionUploader } from "@/components/patient/prescription-uploader";
import { ShieldCheck, Lock, Sparkles, CheckCircle2 } from "lucide-react";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ labSlug: string }>;
}) {
  const { labSlug } = await params;
  const store = await getLabStorefront(labSlug);
  if (!store) return { title: "Upload Prescription" };
  return {
    title: `Upload Prescription — ${store.lab.name}`,
    description: `Upload your doctor's prescription at ${store.lab.name}. We'll extract the test names and add them to your order.`,
  };
}

export default async function PrescriptionPage({
  params,
}: {
  params: Promise<{ labSlug: string }>;
}) {
  const { labSlug } = await params;
  const store = await getLabStorefront(labSlug);
  if (!store) notFound();

  return (
    <div className="mx-auto max-w-xl px-4 py-4 sm:px-6 space-y-4">
      {/* Header Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-sky-800 to-sky-700 p-5 text-white shadow-md">
        <div className="flex items-center gap-2 text-xs font-bold text-sky-200">
          <Sparkles className="h-4 w-4" />
          <span>Fast AI Test Identification</span>
        </div>
        <h1 className="mt-1 text-xl font-extrabold text-white">Upload Prescription</h1>
        <p className="mt-1 text-xs text-sky-100 leading-relaxed">
          Upload your doctor&apos;s prescription slip. We automatically match required investigations with {store.lab.name}&apos;s diagnostic catalogue.
        </p>
      </div>

      {/* Security & Privacy Card */}
      <div className="flex items-start gap-3 rounded-2xl border border-sky-100 bg-sky-50/70 p-3.5 text-xs text-sky-900 dark:border-sky-900/40 dark:bg-sky-950/30 dark:text-sky-200">
        <Lock className="h-4 w-4 shrink-0 text-sky-700 dark:text-sky-400 mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-bold">100% Confidential &amp; Verified</p>
          <p className="text-[11px] text-sky-800/80 dark:text-sky-300">
            Prescriptions are processed securely to find test names. You always review and confirm every test before ordering.
          </p>
        </div>
      </div>

      {/* Uploader Component */}
      <PrescriptionUploader labId={store.lab.id} labSlug={labSlug} labName={store.lab.name} />

      {/* NABL Badge Footer */}
      {store.lab.nablAccreditationNumber && (
        <div className="mt-6 flex items-center justify-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
          <ShieldCheck className="h-4 w-4" />
          <span>NABL Accredited Lab ({store.lab.nablAccreditationNumber})</span>
        </div>
      )}
    </div>
  );
}
