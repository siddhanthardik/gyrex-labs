import { NextRequest, NextResponse } from "next/server";
import { requireSuperadminApi } from "@/lib/auth/superadmin-auth";
import { getSupportTickets, updateSupportTicket } from "@/services/superadmin/support-service";
import { TicketStatus, TicketPriority } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    await requireSuperadminApi("support.read");

    const searchParams = req.nextUrl.searchParams;
    const search = searchParams.get("search") || undefined;
    const labId = searchParams.get("labId") || undefined;
    const statusParam = searchParams.get("status") || undefined;
    const priorityParam = searchParams.get("priority") || undefined;
    const page = searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : 1;
    const pageSize = searchParams.get("pageSize") ? parseInt(searchParams.get("pageSize")!, 10) : 20;

    let status: TicketStatus | undefined;
    if (statusParam && Object.values(TicketStatus).includes(statusParam as TicketStatus)) {
      status = statusParam as TicketStatus;
    }

    let priority: TicketPriority | undefined;
    if (priorityParam && Object.values(TicketPriority).includes(priorityParam as TicketPriority)) {
      priority = priorityParam as TicketPriority;
    }

    const data = await getSupportTickets({ search, labId, status, priority, page, pageSize });
    return NextResponse.json(data);
  } catch (error: unknown) {
    const err = error as { statusCode?: number; message?: string };
    return NextResponse.json(
      { error: err.message || "Unable to fetch support tickets." },
      { status: err.statusCode || 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const actor = await requireSuperadminApi("support.manage");
    const body = await req.json();
    const { ticketId, status, priority, assignedToUserId } = body;

    if (!ticketId) {
      return NextResponse.json({ error: "ticketId is required." }, { status: 400 });
    }

    const updated = await updateSupportTicket(ticketId, { status, priority, assignedToUserId }, actor);
    return NextResponse.json({ success: true, ticket: updated });
  } catch (error: unknown) {
    const err = error as { statusCode?: number; message?: string };
    return NextResponse.json(
      { error: err.message || "Failed to update support ticket." },
      { status: err.statusCode || 500 }
    );
  }
}
