import { NextRequest, NextResponse } from "next/server";
import { requireSuperadminApi } from "@/lib/auth/superadmin-auth";
import { getPlatformRefunds, recordManualRefund } from "@/services/superadmin/payments-service";

export async function GET(req: NextRequest) {
  try {
    await requireSuperadminApi("payments.read");

    const searchParams = req.nextUrl.searchParams;
    const page = searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : 1;
    const pageSize = searchParams.get("pageSize") ? parseInt(searchParams.get("pageSize")!, 10) : 20;

    const data = await getPlatformRefunds({ page, pageSize });
    return NextResponse.json(data);
  } catch (error: unknown) {
    const err = error as { statusCode?: number; message?: string };
    return NextResponse.json(
      { error: err.message || "Unable to fetch platform refunds." },
      { status: err.statusCode || 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const actor = await requireSuperadminApi("payments.refund");
    const body = await req.json();

    const { paymentId, amount, reason } = body;
    if (!paymentId || !amount || !reason) {
      return NextResponse.json(
        { error: "paymentId, amount, and reason are required." },
        { status: 400 }
      );
    }

    const result = await recordManualRefund(paymentId, Number(amount), reason, actor);
    return NextResponse.json({ success: true, refund: result });
  } catch (error: unknown) {
    const err = error as { statusCode?: number; message?: string };
    return NextResponse.json(
      { error: err.message || "Failed to process manual refund." },
      { status: err.statusCode || 500 }
    );
  }
}
