import { NextRequest, NextResponse } from "next/server";
import { requireSuperadminApi } from "@/lib/auth/superadmin-auth";
import { getSubscriptionInvoices } from "@/services/superadmin/subscriptions-service";
import { InvoiceStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    await requireSuperadminApi("subscriptions.read");

    const searchParams = req.nextUrl.searchParams;
    const search = searchParams.get("search") || undefined;
    const statusParam = searchParams.get("status") || undefined;
    const page = searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : 1;
    const pageSize = searchParams.get("pageSize") ? parseInt(searchParams.get("pageSize")!, 10) : 20;

    let status: InvoiceStatus | undefined;
    if (statusParam && Object.values(InvoiceStatus).includes(statusParam as InvoiceStatus)) {
      status = statusParam as InvoiceStatus;
    }

    const data = await getSubscriptionInvoices({ search, status, page, pageSize });
    return NextResponse.json(data);
  } catch (error: unknown) {
    const err = error as { statusCode?: number; message?: string };
    return NextResponse.json(
      { error: err.message || "Unable to fetch subscription invoices." },
      { status: err.statusCode || 500 }
    );
  }
}
