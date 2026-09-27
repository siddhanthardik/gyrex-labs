import { UserRole } from "@prisma/client";

/**
 * Standardized Explicit Permissions for Gyrex Labs
 */
export const PERMISSIONS = {
  // Laboratories Management (Platform level)
  LABS_READ: "labs.read",
  LABS_CREATE: "labs.create",
  LABS_UPDATE: "labs.update",
  LABS_VERIFY: "labs.verify",
  LABS_SUSPEND: "labs.suspend",

  // Catalogue Management
  CATALOGUE_READ: "catalogue.read",
  CATALOGUE_WRITE: "catalogue.write", // lab catalogue pricing/toggle
  CATALOGUE_MASTER_MANAGE: "catalogue.master.manage", // central TestMaster

  // Orders Management
  ORDERS_READ: "orders.read",
  ORDERS_UPDATE: "orders.update",
  ORDERS_CANCEL: "orders.cancel",

  // Patients Management
  PATIENTS_READ: "patients.read",
  PATIENTS_WRITE: "patients.write",

  // Diagnostic Reports
  REPORTS_READ: "reports.read",
  REPORTS_UPLOAD: "reports.upload",
  REPORTS_RELEASE: "reports.release",

  // Payments & Financials
  PAYMENTS_READ: "payments.read",
  PAYMENTS_REFUND: "payments.refund",

  // Subscriptions (SaaS Platform)
  SUBSCRIPTIONS_READ: "subscriptions.read",
  SUBSCRIPTIONS_MANAGE: "subscriptions.manage",

  // Users & Staff
  USERS_READ: "users.read",
  USERS_MANAGE: "users.manage",

  // Customer Support
  SUPPORT_READ: "support.read",
  SUPPORT_MANAGE: "support.manage",

  // Audit Logs
  AUDIT_READ: "audit.read",

  // System & Platform Settings
  SYSTEM_MANAGE: "system.manage",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS] | string;

/**
 * Default permissions assigned by role.
 * Explicit permissions in LabUser.permissions can further augment these.
 */
export const ROLE_DEFAULT_PERMISSIONS: Record<UserRole, string[]> = {
  SUPERADMIN: ["*"], // Unrestricted platform access

  PLATFORM_ADMIN: [
    "labs.*",
    "catalogue.*",
    "orders.read",
    "patients.read",
    "reports.read",
    "subscriptions.read",
    "support.*",
    "audit.read",
    "users.read",
  ],

  OPERATIONS_ADMIN: [
    "labs.read",
    "orders.*",
    "patients.read",
    "reports.read",
    "support.*",
  ],

  FINANCE_ADMIN: [
    "subscriptions.*",
    "payments.*",
    "labs.read",
    "orders.read",
    "audit.read",
  ],

  SUPPORT_ADMIN: [
    "support.*",
    "labs.read",
    "orders.read",
    "patients.read",
    "reports.read",
  ],

  CATALOGUE_ADMIN: [
    "catalogue.*",
    "labs.read",
  ],

  LAB_OWNER: [
    "*", // All permissions, but strictly scoped to their own lab tenant
  ],

  LAB_ADMIN: [
    "orders.*",
    "reports.*",
    "patients.*",
    "catalogue.read",
    "catalogue.write",
    "payments.read",
    "users.read",
    "support.*",
  ],

  LAB_STAFF: [
    "orders.read",
    "orders.update",
    "reports.read",
    "reports.upload",
    "patients.read",
  ],
};

/**
 * Checks whether an array of granted permissions satisfies a required permission.
 * Supports exact match, wildcard prefix (e.g. "orders.*"), and universal wildcard ("*").
 */
export function matchPermission(granted: string[], required: string): boolean {
  if (granted.includes("*")) {
    return true;
  }

  if (granted.includes(required)) {
    return true;
  }

  // Check prefix wildcard, e.g. "orders.*" matches "orders.read"
  const parts = required.split(".");
  if (parts.length > 1) {
    const namespaceWildcard = `${parts[0]}.*`;
    if (granted.includes(namespaceWildcard)) {
      return true;
    }
  }

  return false;
}

/**
 * Checks if a user role has the required permission by default.
 */
export function hasRolePermission(role: UserRole, required: string): boolean {
  const defaults = ROLE_DEFAULT_PERMISSIONS[role] || [];
  return matchPermission(defaults, required);
}

/**
 * Checks if a user has a permission, combining role defaults and custom permissions.
 */
export function hasEffectivePermission(
  role: UserRole,
  customPermissions: string[] = [],
  required: string
): boolean {
  const combined = [...(ROLE_DEFAULT_PERMISSIONS[role] || []), ...customPermissions];
  return matchPermission(combined, required);
}

/**
 * Determines whether a role is a platform-level administrative role.
 */
export function isPlatformRole(role: UserRole): boolean {
  const platformRoles: UserRole[] = [
    UserRole.SUPERADMIN,
    UserRole.PLATFORM_ADMIN,
    UserRole.OPERATIONS_ADMIN,
    UserRole.FINANCE_ADMIN,
    UserRole.SUPPORT_ADMIN,
    UserRole.CATALOGUE_ADMIN,
  ];
  return platformRoles.includes(role);
}

/**
 * Determines whether a role is a laboratory tenant-scoped role.
 */
export function isLabRole(role: UserRole): boolean {
  const labRoles: UserRole[] = [
    UserRole.LAB_OWNER,
    UserRole.LAB_ADMIN,
    UserRole.LAB_STAFF,
  ];
  return labRoles.includes(role);
}
