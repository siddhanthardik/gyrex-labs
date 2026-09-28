import { notFound } from "next/navigation";
import { getLabStorefront } from "@/services/labs/storefront";
import { TestList } from "@/components/patient/test-list";
import { FileText, FlaskConical, Sparkles } from "lucide-react";
import Link from "next/link";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ labSlug: string }>;
}) {
  const { labSlug } = await params;
  const store = await getLabStorefront(labSlug);
  if (!store) return { title: "Tests Not Found" };
  return {
    title: `Diagnostic Tests — ${store.lab.name}`,
    description: `Browse and book ${store.popularTests.length}+ diagnostic tests at ${store.lab.name}, ${store.lab.city}.`,
  };
}

export default async function TestsPage({
  params,
  searchParams,
}: {
  params: Promise<{ labSlug: string }>;
  searchParams: Promise<{ category?: string }>;
}) {
  const { labSlug } = await params;
  const { category } = await searchParams;

  const store = await getLabStorefront(labSlug);
  if (!store) notFound();

  return (
    <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6 space-y-4">
      {/* Header Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-sky-800 to-sky-700 p-5 text-white shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-sky-200">
              <FlaskConical className="h-4 w-4" />
              <span>Verified Test Catalogue</span>
            </div>
            <h1 className="mt-1 text-xl font-extrabold text-white">Diagnostic Tests</h1>
            <p className="mt-1 text-xs text-sky-100">
              {store.popularTests.length} tests available with transparent pricing at {store.lab.name}
            </p>
          </div>
          <Link
            href={`/${labSlug}/prescription`}
            className="flex flex-col items-center gap-1 rounded-2xl bg-white/15 px-3.5 py-2.5 text-center text-xs font-bold text-white backdrop-blur-sm hover:bg-white/25 transition shrink-0"
          >
            <FileText className="h-4 w-4 text-emerald-300" />
            <span className="text-[11px] leading-tight">Upload Rx</span>
          </Link>
        </div>
      </div>

      <TestList
        tests={store.popularTests}
        categories={store.categories}
        initialCategory={category || ""}
      />
    </div>
  );
}
