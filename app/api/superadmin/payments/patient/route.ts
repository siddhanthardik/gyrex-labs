import { NextRequest, NextResponse } from "next/server";
import { requireSuperadminApi } from "@/lib/auth/superadmin-auth";
import { getPatientDiagnosticPayments } from "@/services/superadmin/payments-service";
import { PaymentStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    await requireSuperadminApi("payments.read");

    const searchParams = req.nextUrl.searchParams;
    const search = searchParams.get("search") || undefined;
    const labId = searchParams.get("labId") || undefined;
    const statusParam = searchParams.get("status") || undefined;
    const page = searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : 1;
    const pageSize = searchParams.get("pageSize") ? parseInt(searchParams.get("pageSize")!, 10) : 20;

    let status: PaymentStatus | undefined;
    if (statusParam && Object.values(PaymentStatus).includes(statusParam as PaymentStatus)) {
      status = statusParam as PaymentStatus;
    }

    const data = await getPatientDiagnosticPayments({ search, labId, status, page, pageSize });
    return NextResponse.json(data);
  } catch (error: unknown) {
    const err = error as { statusCode?: number; message?: string };
    return NextResponse.json(
      { error: err.message || "Unable to fetch patient diagnostic payments." },
      { status: err.statusCode || 500 }
    );
  }
}
