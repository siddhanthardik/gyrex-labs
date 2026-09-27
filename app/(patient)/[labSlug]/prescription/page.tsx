import { notFound } from "next/navigation";
import { getLabStorefront } from "@/services/labs/storefront";
import { PrescriptionUploader } from "@/components/patient/prescription-uploader";
import { ShieldCheck, Lock } from "lucide-react";

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
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
          Upload Prescription
        </h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Upload your doctor&apos;s prescription and we&apos;ll identify the tests recommended for you.
        </p>
      </div>

      {/* Privacy notice */}
      <div className="mb-5 rounded-xl border border-sky-200 bg-sky-50 p-4 dark:border-sky-800 dark:bg-sky-950/30">
        <div className="flex items-start gap-3">
          <Lock className="mt-0.5 h-4 w-4 flex-shrink-0 text-sky-600 dark:text-sky-400" />
          <div>
            <p className="text-sm font-semibold text-sky-800 dark:text-sky-200">
              Your Privacy is Protected
            </p>
            <p className="mt-1 text-xs text-sky-700 dark:text-sky-300">
              We use AI only to identify laboratory test names written on your prescription.
              Your prescription image is processed securely and never used for diagnosis.
              You will review all extracted tests before anything is added to your order.
            </p>
          </div>
        </div>
      </div>

      {/* Uploader */}
      <PrescriptionUploader labId={store.lab.id} labSlug={labSlug} />

      {/* NABL badge if applicable */}
      {store.lab.nablAccreditationNumber && (
        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
          <ShieldCheck className="h-4 w-4" />
          <span>
            NABL Accredited: {store.lab.nablAccreditationNumber} — Certified diagnostic quality
          </span>
        </div>
      )}
    </div>
  );
}
