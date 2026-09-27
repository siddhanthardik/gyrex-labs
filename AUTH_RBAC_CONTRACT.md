# GYREX LABS — AUTHENTICATION & RBAC CONTRACT

Version: 1.0  
Owner: 02 — AUTHENTICATION & RBAC Specialist  
Target Audience: All Downstream Agents (Patient, Lab Admin, Superadmin, Integration Agents)  

---

## 1. Security Architecture Principles

1. **Authentication:** Determines identity ("Who are you?"). Verified via tamper-proof HTTP-only JWT cookies (`gyrex_session`).
2. **Authorization:** Determines capabilities ("What are you allowed to do?"). Enforced strictly server-side using explicit roles and granular permissions.
3. **Tenant Isolation:** Enforces multi-tenancy ("Which lab's data may you access?"). Ensures Lab A staff can NEVER view or mutate Lab B data.
4. **Never Trust the Client:** Client-supplied role states, localStorage, and query parameters (`?labId=...`) must **never** be trusted without server-side validation.

---

## 2. Core Authentication & Authorization API

All security functions are imported from `@/lib/auth/context`:

```typescript
import {
  getCurrentUser,
  requireAuth,
  requireRole,
  requirePlatformAccess,
  requireSuperadmin,
  requireLabAccess,
  requirePermission,
  assertAuthorizedTenantParam,
  AuthorizationError,
} from "@/lib/auth/context";
```

### 2.1 How to Determine the Current User
Returns the decoded `SessionUser` or `null` if unauthenticated:
```typescript
const user = await getCurrentUser();
if (user) {
  console.log(`Signed in as: ${user.fullName} (${user.role})`);
}
```

### 2.2 How to Require Authentication
Guarantees a valid session. Throws `AuthorizationError` (HTTP 401) if not signed in:
```typescript
const user = await requireAuth();
```

### 2.3 How to Require a Role
Enforces that the user has one of the allowed platform or lab roles:
```typescript
import { UserRole } from "@prisma/client";

// Allow only Lab Owners and Lab Admins:
const user = await requireRole([UserRole.LAB_OWNER, UserRole.LAB_ADMIN]);

// Allow only Superadmin:
const superadmin = await requireSuperadmin();

// Allow any platform administrator:
const platformAdmin = await requirePlatformAccess();
```

### 2.4 How to Require a Permission
Enforces explicit permissions (combining role defaults with `LabUser.permissions`):
```typescript
import { PERMISSIONS } from "@/lib/auth/permissions";

// Require permission within the active or target lab:
const { user, labMembership } = await requirePermission(PERMISSIONS.ORDERS_UPDATE, targetLabId);

// Require platform-level permission:
await requirePermission(PERMISSIONS.LABS_SUSPEND);
```

### 2.5 How to Require Laboratory Access & Obtain Tenant Context
Validates that the user is an authorized member of `targetLabId`.  
**If `targetLabId` is omitted, resolves the user's primary/active laboratory context.**

```typescript
// Lab Admin route or action:
const { user, labMembership } = await requireLabAccess();
console.log(`Operating within tenant: ${labMembership.name} (${labMembership.labId})`);

// Specific lab check (e.g. from route params /lab/[labSlug]):
const { user, labMembership } = await requireLabAccess(params.labSlug);
```

> **CRITICAL SECURITY NOTE:**  
> If an authenticated staff member from **Lab A** calls `requireLabAccess("LAB_B")`, it throws `AuthorizationError` (HTTP 403) and logs a `SECURITY_ALERT` audit entry.

### 2.6 How to Validate Client-Supplied `labId`
Never use `request.query.labId` or `body.labId` directly in Prisma queries!
```typescript
// ❌ INSECURE:
const orders = await prisma.order.findMany({ where: { labId: searchParams.get("labId") } });

// ✅ SECURE:
const validatedLabId = await assertAuthorizedTenantParam(searchParams.get("labId"));
const orders = await prisma.order.findMany({ where: { labId: validatedLabId } });
```

---

## 3. Protecting API Routes

Standard pattern for Route Handlers (`app/api/.../route.ts`):

```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireLabAccess, requirePermission } from "@/lib/auth/context";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db/prisma";

export async function GET(request: NextRequest) {
  try {
    // 1. Authorize tenant and permission
    const { labMembership } = await requirePermission(PERMISSIONS.ORDERS_READ);

    // 2. Query strictly scoped to authorized labId
    const orders = await prisma.order.findMany({
      where: { labId: labMembership.labId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, orders });
  } catch (error: any) {
    const status = error.statusCode || 403;
    return NextResponse.json({ error: error.message }, { status });
  }
}
```

---

## 4. Protecting Server Actions

Standard pattern for Next.js Server Actions:

```typescript
"use server";

import { requireLabAccess, requirePermission } from "@/lib/auth/context";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db/prisma";
import { recordAuditLog } from "@/lib/db/audit";
import { AuditAction } from "@prisma/client";

export async function updateOrderStatusAction(orderId: string, newStatus: OrderStatus) {
  // 1. Authorize: requires orders.update permission
  const { user, labMembership } = await requirePermission(PERMISSIONS.ORDERS_UPDATE);

  // 2. Assert order belongs to the authorized tenant
  const order = await prisma.order.findFirst({
    where: { id: orderId, labId: labMembership.labId },
  });

  if (!order) {
    throw new Error("Order not found or unauthorized.");
  }

  // 3. Mutate
  const updated = await prisma.order.update({
    where: { id: orderId },
    data: { orderStatus: newStatus },
  });

  // 4. Audit Log
  await recordAuditLog({
    actorUserId: user.userId,
    actorRole: user.role,
    action: AuditAction.ORDER_STATUS_CHANGED,
    entityType: "Order",
    entityId: orderId,
    labId: labMembership.labId,
    metadata: { previousStatus: order.orderStatus, newStatus },
  });

  return { success: true, order: updated };
}
```

---

## 5. Audit Logging for Security Actions

All security-relevant events should be logged using `recordAuditLog` from `@/lib/db/audit`:

```typescript
import { recordAuditLog } from "@/lib/db/audit";
import { AuditAction } from "@prisma/client";

await recordAuditLog({
  actorUserId: user.userId,
  actorRole: user.role,
  action: AuditAction.SECURITY_ALERT, // or USER_PERMISSION_CHANGED, LAB_SUSPENDED, etc.
  entityType: "SecurityPolicy",
  entityId: targetUserId,
  labId: labId,
  metadata: { event: "role_elevation_attempted" },
});
```

---

## 6. Route Boundaries in `middleware.ts`

- `/superadmin/*` & `/api/superadmin/*`: Requires valid session with a platform role (`SUPERADMIN`, `PLATFORM_ADMIN`, etc.). Tenant staff are blocked with 403 Forbidden.
- `/lab/*` & `/api/lab/*`: Requires valid session with active laboratory membership.
- State-changing API requests (`POST`, `PUT`, `DELETE`) are origin-verified against CSRF attacks.
