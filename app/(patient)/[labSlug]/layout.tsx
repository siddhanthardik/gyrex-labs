import { notFound } from "next/navigation";
import { getLabStorefront } from "@/services/labs/storefront";
import { CartProvider } from "@/components/patient/cart-context";
import { StorefrontHeader } from "@/components/patient/storefront-header";
import { FloatingCartBar } from "@/components/patient/floating-cart-bar";
import { LabStatus } from "@prisma/client";
import { AlertTriangle, Clock, ShieldCheck } from "lucide-react";

export default async function PatientStoreLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ labSlug: string }>;
}) {
  const { labSlug } = await params;
  const store = await getLabStorefront(labSlug);

  if (!store) {
    notFound();
  }

  // Check if laboratory is active
  if (store.lab.status !== LabStatus.ACTIVE) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 text-center dark:bg-zinc-950">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <h2 className="mt-4 text-2xl font-bold text-zinc-900 dark:text-white">
          {store.lab.name} is Currently Unavailable
        </h2>
        <p className="mt-2 max-w-md text-sm text-zinc-500 dark:text-zinc-400">
          This laboratory storefront is currently not accepting new patient bookings online. Please contact the laboratory directly at {store.lab.phone} for assistance.
        </p>
        <div className="mt-6 text-xs text-zinc-400">
          Powered by Gyrex Labs
        </div>
      </div>
    );
  }

  return (
    <CartProvider labSlug={labSlug}>
      <div className="min-h-screen flex flex-col bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
        <StorefrontHeader
          labName={store.lab.name}
          labSlug={store.lab.slug}
          city={store.lab.city}
          state={store.lab.state}
          phone={store.lab.phone}
          isVerified={store.lab.isVerified}
          nablNumber={store.lab.nablAccreditationNumber}
        />

        <main className="flex-1 pb-24">{children}</main>

        <FloatingCartBar />

        {/* Branded Storefront Footer */}
        <footer className="border-t border-zinc-200 bg-white py-10 dark:border-zinc-800 dark:bg-zinc-900/40 text-xs text-zinc-500 dark:text-zinc-400">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
              <div className="text-center sm:text-left">
                <div className="font-bold text-zinc-900 dark:text-white text-sm">
                  {store.lab.name}
                </div>
                <div className="mt-1">
                  {store.lab.addressLine1}, {store.lab.city}, {store.lab.state} - {store.lab.postalCode}
                </div>
                {store.lab.nablAccreditationNumber && (
                  <div className="mt-1 flex items-center justify-center sm:justify-start gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>NABL Accredited: {store.lab.nablAccreditationNumber}</span>
                  </div>
                )}
              </div>

              <div className="text-center sm:text-right">
                <div className="flex items-center justify-center sm:justify-end gap-1.5 text-zinc-700 dark:text-zinc-300 font-medium">
                  <Clock className="h-3.5 w-3.5 text-sky-600" />
                  <span>{store.settings.deliveryPromiseNotice || "Fast digital report turnaround"}</span>
                </div>
                <div className="mt-1 text-[11px] text-zinc-400">
                  Direct Diagnostic Provider: {store.lab.name} • Powered by Gyrex Labs
                </div>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </CartProvider>
  );
}
