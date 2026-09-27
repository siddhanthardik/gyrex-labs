import { notFound } from "next/navigation";
import { getLabStorefront } from "@/services/labs/storefront";
import { TestList } from "@/components/patient/test-list";
import { FileText } from "lucide-react";
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
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <div className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
            Diagnostic Tests
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {store.popularTests.length} tests available at {store.lab.name}
          </p>
        </div>
        <Link
          href={`/${labSlug}/prescription`}
          className="flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
        >
          <FileText className="h-4 w-4" /> Upload Prescription
        </Link>
      </div>

      <TestList
        tests={store.popularTests}
        categories={store.categories}
        initialCategory={category || ""}
      />
    </div>
  );
}
