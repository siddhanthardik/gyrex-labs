import { prisma } from "@/lib/db/prisma";
import { CollectionType, OrderItemType, OrderStatus, PaymentMethod, PaymentStatus, Gender } from "@prisma/client";
import { sendOrderConfirmationWhatsApp } from "@/services/integrations/whatsapp/whatsapp-notification-service";
import { checkHomeCollectionServiceability } from "./serviceability-service";
import crypto from "crypto";

export function computeOrderPayloadHash(params: {
  labId: string;
  phone: string;
  collectionType: CollectionType;
  scheduledDate: string;
  scheduledSlot?: string | null;
  items: Array<{ itemType: "TEST" | "PACKAGE"; id: string }>;
  addressLine1?: string | null;
  postalCode?: string | null;
  branchId?: string | null;
  paymentMethod?: PaymentMethod | null;
}): string {
  const cleanPhone = params.phone.trim().replace(/\D/g, "").slice(-10);
  const sortedItems = [...params.items]
    .map((i) => `${i.itemType}:${i.id}`)
    .sort()
    .join(",");

  const payload = [
    params.labId,
    cleanPhone,
    params.collectionType,
    params.scheduledDate.trim().slice(0, 10),
    (params.scheduledSlot || "").trim(),
    sortedItems,
    (params.addressLine1 || "").trim().toLowerCase(),
    (params.postalCode || "").trim(),
    params.branchId || "",
    params.paymentMethod || PaymentMethod.CASH_ON_COLLECTION,
  ].join("|");

  return crypto.createHash("sha256").update(payload).digest("hex");
}

export interface CreatePatientOrderItem {
  itemType: "TEST" | "PACKAGE";
  id: string; // labTestId or packageId
}

export interface CreatePatientOrderParams {
  labId: string;
  patient: {
    fullName: string;
    phone: string;
    email?: string;
    ageYears?: number;
    gender: Gender;
    bloodGroup?: string;
  };
  collection: {
    type: CollectionType;
    scheduledDate: string; // ISO date string
    scheduledSlot: string;
    addressLine1?: string;
    addressLine2?: string;
    landmark?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    latitude?: number;
    longitude?: number;
    branchId?: string;
    specialInstructions?: string;
  };
  items: CreatePatientOrderItem[];
  paymentMethod: PaymentMethod;
  prescriptionId?: string;
  idempotencyKey?: string;
}

export interface CalculatedOrderSummary {
  subtotal: number;
  collectionFee: number;
  total: number;
  itemSnapshots: Array<{
    itemType: OrderItemType;
    labTestId?: string;
    packageId?: string;
    name: string;
    code: string | null;
    price: number;
  }>;
}

/**
 * Server-authoritative price calculator.
 * NEVER TRUST CLIENT-SUPPLIED TOTALS.
 * Rejects any item that does not strictly belong to the specified lab.
 */
export async function calculateOrderTotal(
  labId: string,
  items: CreatePatientOrderItem[],
  collectionType: CollectionType,
  postalCode?: string,
  branchId?: string
): Promise<CalculatedOrderSummary> {
  const lab = await prisma.lab.findUnique({
    where: { id: labId },
    include: { storeSettings: true },
  });

  if (!lab) {
    throw new Error(`Laboratory not found: ${labId}`);
  }

  // Level 1: Laboratory Master Service Enforcement
  if (collectionType === CollectionType.HOME_COLLECTION && !lab.storeSettings?.homeCollectionAvailable) {
    throw new Error(
      `Home sample collection is not currently offered by ${lab.name}. Please select laboratory visit.`
    );
  }

  // Service Area PIN Code Coverage Enforcement
  if (collectionType === CollectionType.HOME_COLLECTION && postalCode && postalCode.trim().length > 0) {
    const coverage = await checkHomeCollectionServiceability(labId, postalCode.trim());
    if (!coverage.serviceable) {
      throw new Error(coverage.message || `Home sample collection is not available in PIN code ${postalCode}.`);
    }
  }

  let subtotal = 0;
  const itemSnapshots: CalculatedOrderSummary["itemSnapshots"] = [];

  for (const item of items) {
    if (item.itemType === "TEST") {
      const labTest = await prisma.labTest.findUnique({
        where: { id: item.id },
        include: { masterTest: true },
      });

      if (!labTest) {
        throw new Error(`Diagnostic test not found: ${item.id}`);
      }

      // STRICT MULTI-TENANT CHECK: Test must belong to this laboratory!
      if (labTest.labId !== labId) {
        throw new Error(`Security Violation: Test '${labTest.masterTest.name}' does not belong to laboratory '${lab.name}'.`);
      }

      // Level 2 & Level 3 Validation for Home Collection
      if (collectionType === CollectionType.HOME_COLLECTION) {
        if (!labTest.masterTest.homeCollectionEligible) {
          throw new Error(
            `Test '${labTest.masterTest.name}' requires on-site clinical collection and cannot be booked for home collection.`
          );
        }
        if (!labTest.isHomeCollectionAvailable) {
          throw new Error(
            `Test '${labTest.masterTest.name}' is not currently offered for home collection by ${lab.name}.`
          );
        }
      }

      const price = Number(labTest.sellingPrice);
      subtotal += price;
      itemSnapshots.push({
        itemType: OrderItemType.TEST,
        labTestId: labTest.id,
        name: labTest.masterTest.name,
        code: labTest.masterTest.code,
        price,
      });
    } else if (item.itemType === "PACKAGE") {
      const pkg = await prisma.package.findUnique({
        where: { id: item.id },
        include: {
          packageTests: {
            include: {
              labTest: {
                include: { masterTest: true },
              },
            },
          },
        },
      });

      if (!pkg) {
        throw new Error(`Health package not found: ${item.id}`);
      }

      // STRICT MULTI-TENANT CHECK: Package must belong to this laboratory!
      if (pkg.labId !== labId) {
        throw new Error(`Security Violation: Package '${pkg.name}' does not belong to laboratory '${lab.name}'.`);
      }

      // Level 2 & Level 3 Validation for Home Collection
      if (collectionType === CollectionType.HOME_COLLECTION) {
        if (!pkg.isHomeCollectionAvailable) {
          throw new Error(
            `Health package '${pkg.name}' is not offered for home collection by ${lab.name}.`
          );
        }
        for (const pt of pkg.packageTests) {
          if (!pt.labTest.masterTest.homeCollectionEligible) {
            throw new Error(
              `Health package '${pkg.name}' includes '${pt.labTest.masterTest.name}' which requires on-site clinical collection and cannot be booked for home collection.`
            );
          }
          if (!pt.labTest.isHomeCollectionAvailable) {
            throw new Error(
              `Health package '${pkg.name}' includes '${pt.labTest.masterTest.name}' which is not offered for home collection by ${lab.name}.`
            );
          }
        }
      }

      const price = Number(pkg.sellingPrice);
      subtotal += price;
      itemSnapshots.push({
        itemType: OrderItemType.PACKAGE,
        packageId: pkg.id,
        name: pkg.name,
        code: pkg.code,
        price,
      });
    }
  }

  // Calculate home collection fee based on laboratory store settings or branch override
  let collectionFee = 0;
  if (collectionType === CollectionType.HOME_COLLECTION) {
    let baseFee = lab.storeSettings?.homeCollectionFee ? Number(lab.storeSettings.homeCollectionFee) : 100;
    let threshold = lab.storeSettings?.freeHomeCollectionThreshold
      ? Number(lab.storeSettings.freeHomeCollectionThreshold)
      : null;

    if (branchId) {
      const branch = await prisma.labBranch.findUnique({
        where: { id: branchId },
      });
      if (branch && branch.labId === labId) {
        if (branch.homeCollectionFee !== null) {
          baseFee = Number(branch.homeCollectionFee);
        }
        if (branch.freeHomeCollectionThreshold !== null) {
          threshold = Number(branch.freeHomeCollectionThreshold);
        }
      }
    }

    if (threshold !== null && subtotal >= threshold) {
      collectionFee = 0; // Free home collection promotion
    } else {
      collectionFee = baseFee;
    }
  }

  const total = subtotal + collectionFee;

  return {
    subtotal,
    collectionFee,
    total,
    itemSnapshots,
  };
}

/**
 * Creates an authoritative diagnostic order.
 */
export async function createPatientOrder(params: CreatePatientOrderParams) {
  const { labId, patient: patientData, collection, items, paymentMethod, prescriptionId, idempotencyKey } = params;

  if (!items || items.length === 0) {
    throw new Error("Order must contain at least one diagnostic test or health package.");
  }

  if (collection.type === CollectionType.HOME_COLLECTION) {
    if (!collection.postalCode || !collection.postalCode.trim()) {
      throw new Error("A valid 6-digit Indian PIN code is required for home sample collection.");
    }
  }

  // 1. Authoritative Server Calculation (with serviceability and branch fee support)
  const summary = await calculateOrderTotal(
    labId,
    items,
    collection.type,
    collection.postalCode,
    collection.branchId
  );

  const cleanPhone = patientData.phone.trim().replace(/\D/g, "");
  const scheduledDateObj = new Date(collection.scheduledDate);
  const startOfDay = new Date(scheduledDateObj);
  startOfDay.setUTCHours(0, 0, 0, 0);
  const endOfDay = new Date(scheduledDateObj);
  endOfDay.setUTCHours(23, 59, 59, 999);

  const cleanIdempotencyKey = idempotencyKey?.trim() || null;
  const payloadHash = computeOrderPayloadHash({
    labId,
    phone: patientData.phone,
    collectionType: collection.type,
    scheduledDate: collection.scheduledDate,
    scheduledSlot: collection.scheduledSlot,
    items,
    addressLine1: collection.addressLine1,
    postalCode: collection.postalCode,
    branchId: collection.branchId,
    paymentMethod,
  });

  // 1.1 Database-Enforced Idempotency Key Pre-Check
  if (cleanIdempotencyKey) {
    const existingByKey = await prisma.order.findUnique({
      where: { idempotencyKey: cleanIdempotencyKey },
      include: {
        lab: {
          select: {
            name: true,
            slug: true,
            phone: true,
            email: true,
          },
        },
        patient: true,
        items: true,
        collection: true,
      },
    });

    if (existingByKey) {
      if (existingByKey.idempotencyHash && existingByKey.idempotencyHash !== payloadHash) {
        throw new Error(
          "Idempotency conflict: The provided idempotency key has already been used for a different order request."
        );
      }
      return existingByKey; // Idempotently return existing order
    }
  }

  // 1.2 Recent Window Deduplication (for callers without explicit idempotencyKey)
  const sixtySecondsAgo = new Date(Date.now() - 60 * 1000);
  const itemsKey = items
    .map((i) => `${i.itemType}:${i.id}`)
    .sort()
    .join(",");

  const existingRecentOrders = await prisma.order.findMany({
    where: {
      labId,
      patient: { phone: { contains: cleanPhone.slice(-10) } },
      collectionType: collection.type,
      orderStatus: { in: [OrderStatus.PENDING_PAYMENT, OrderStatus.CONFIRMED] },
      createdAt: { gte: sixtySecondsAgo },
    },
    include: {
      lab: {
        select: {
          name: true,
          slug: true,
          phone: true,
          email: true,
        },
      },
      patient: true,
      items: true,
      collection: true,
    },
    orderBy: { createdAt: "desc" },
  });

  for (const existing of existingRecentOrders) {
    const existingItemsKey = existing.items
      .map((i) => `${i.itemType}:${i.labTestId || i.packageId}`)
      .sort()
      .join(",");
    const sameSlot =
      !collection.scheduledSlot || existing.collection?.scheduledSlot === collection.scheduledSlot;
    if (existingItemsKey === itemsKey && sameSlot) {
      return existing; // Idempotently return existing order
    }
  }

  // 2. Resolve Branch Assignment for Home Collection with Daily Capacity Checking
  let assignedBranch: any = null;
  if (collection.type === CollectionType.HOME_COLLECTION) {
    const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000);

    if (collection.branchId) {
      const branch = await prisma.labBranch.findUnique({
        where: { id: collection.branchId },
        include: {
          serviceAreas: {
            where: { isActive: true },
          },
        },
      });
      if (!branch || branch.labId !== labId) {
        throw new Error(`Security Violation: Branch does not belong to this laboratory.`);
      }
      if (!branch.isActive || !branch.homeCollectionAvailable) {
        throw new Error(`Branch '${branch.name}' is not currently available for home sample collection.`);
      }
      // If the branch has configured service areas, strictly enforce PIN coverage
      if (collection.postalCode && branch.serviceAreas.length > 0) {
        const servesPin = branch.serviceAreas.some((sa) => sa.pincode === collection.postalCode!.trim());
        if (!servesPin) {
          throw new Error(`Branch '${branch.name}' does not service postal code ${collection.postalCode}.`);
        }
      }

      // Daily capacity check on scheduled collection date (defined active & recent pending statuses consume capacity)
      if (branch.maxDailyCapacity !== null && branch.maxDailyCapacity > 0) {
        const bookedOrders = await prisma.collection.count({
          where: {
            branchId: branch.id,
            scheduledDate: { gte: startOfDay, lte: endOfDay },
            order: {
              OR: [
                {
                  orderStatus: {
                    in: [
                      OrderStatus.CONFIRMED,
                      OrderStatus.COLLECTION_SCHEDULED,
                      OrderStatus.SAMPLE_COLLECTED,
                      OrderStatus.PROCESSING,
                      OrderStatus.REPORT_READY,
                      OrderStatus.COMPLETED,
                    ],
                  },
                },
                {
                  orderStatus: OrderStatus.PENDING_PAYMENT,
                  createdAt: { gte: thirtyMinsAgo },
                },
              ],
            },
          },
        });
        if (bookedOrders >= branch.maxDailyCapacity) {
          throw new Error(
            `Branch '${branch.name}' has reached its maximum daily collection capacity (${branch.maxDailyCapacity} orders) for ${collection.scheduledDate}. Please select another branch or choose a different date.`
          );
        }
      }

      assignedBranch = branch;
    } else if (collection.postalCode) {
      // Automatic Mode: Find active branches explicitly covering this PIN code
      const candidates = await prisma.labBranch.findMany({
        where: {
          labId,
          isActive: true,
          homeCollectionAvailable: true,
          serviceAreas: {
            some: { pincode: collection.postalCode.trim(), isActive: true },
          },
        },
        orderBy: [
          { priority: "desc" },
          { homeCollectionFee: "asc" },
          { createdAt: "asc" },
        ],
      });

      // Select first eligible candidate with available capacity
      for (const branch of candidates) {
        if (branch.maxDailyCapacity !== null && branch.maxDailyCapacity > 0) {
          const bookedOrders = await prisma.collection.count({
            where: {
              branchId: branch.id,
              scheduledDate: { gte: startOfDay, lte: endOfDay },
              order: {
                OR: [
                  {
                    orderStatus: {
                      in: [
                        OrderStatus.CONFIRMED,
                        OrderStatus.COLLECTION_SCHEDULED,
                        OrderStatus.SAMPLE_COLLECTED,
                        OrderStatus.PROCESSING,
                        OrderStatus.REPORT_READY,
                        OrderStatus.COMPLETED,
                      ],
                    },
                  },
                  {
                    orderStatus: OrderStatus.PENDING_PAYMENT,
                    createdAt: { gte: thirtyMinsAgo },
                  },
                ],
              },
            },
          });
          if (bookedOrders >= branch.maxDailyCapacity) {
            continue; // Saturated on this date, try next candidate
          }
        }
        assignedBranch = branch;
        break;
      }
    }
  }

  // 3. Find or create global patient by phone
  let patient = await prisma.patient.findFirst({
    where: { phone: patientData.phone.trim() },
  });

  if (!patient) {
    patient = await prisma.patient.create({
      data: {
        fullName: patientData.fullName.trim(),
        phone: patientData.phone.trim(),
        email: patientData.email?.trim().toLowerCase() || null,
        ageYears: patientData.ageYears || null,
        gender: patientData.gender,
        bloodGroup: patientData.bloodGroup || null,
      },
    });
  }

  // 4. Link or update LabPatient tenant record
  await prisma.labPatient.upsert({
    where: { labId_patientId: { labId, patientId: patient.id } },
    update: {
      lastVisitAt: new Date(),
      totalOrdersCount: { increment: 1 },
      totalSpent: { increment: summary.total },
    },
    create: {
      labId,
      patientId: patient.id,
      totalOrdersCount: 1,
      totalSpent: summary.total,
    },
  });

  // 4b. Persist patient address into PatientAddress model for reuse
  if (
    collection.type === CollectionType.HOME_COLLECTION &&
    collection.addressLine1?.trim() &&
    collection.postalCode?.trim()
  ) {
    const existingAddr = await prisma.patientAddress.findFirst({
      where: {
        patientId: patient.id,
        postalCode: collection.postalCode.trim(),
        addressLine1: collection.addressLine1.trim(),
      },
    });

    if (!existingAddr) {
      await prisma.patientAddress.create({
        data: {
          patientId: patient.id,
          label: "Home",
          addressLine1: collection.addressLine1.trim(),
          addressLine2: collection.addressLine2?.trim() || null,
          landmark: collection.landmark?.trim() || null,
          city: collection.city?.trim() || "",
          state: collection.state?.trim() || "",
          postalCode: collection.postalCode.trim(),
          latitude: collection.latitude || null,
          longitude: collection.longitude || null,
          isDefault: true,
        },
      });
    }
  }

  // 5. Generate human-readable order number
  const timestamp = Date.now().toString().slice(-4);
  const random = Math.floor(1000 + Math.random() * 9000);
  const orderNumber = `GYR-${new Date().getFullYear()}-${timestamp}${random}`;

  // 6. Create Order with Immutable Branch Snapshot and Database-Enforced Idempotency
  let order: any;
  try {
    order = await prisma.order.create({
      data: {
        orderNumber,
        labId,
        patientId: patient.id,
        idempotencyKey: cleanIdempotencyKey,
        idempotencyHash: payloadHash,
        prescriptionId: prescriptionId || null,
        collectionType: collection.type,
        orderStatus: paymentMethod === PaymentMethod.CASH_ON_COLLECTION ? OrderStatus.CONFIRMED : OrderStatus.PENDING_PAYMENT,
        paymentStatus: paymentMethod === PaymentMethod.CASH_ON_COLLECTION ? PaymentStatus.CASH_ON_COLLECTION : PaymentStatus.PENDING,
        subtotal: summary.subtotal,
        collectionFee: summary.collectionFee,
        discountAmount: 0,
        totalAmount: summary.total,
        items: {
          create: summary.itemSnapshots.map((item) => ({
            itemType: item.itemType,
            labTestId: item.labTestId || null,
            packageId: item.packageId || null,
            itemName: item.name,
            itemCode: item.code,
            quantity: 1,
            unitPrice: item.price,
            totalPrice: item.price,
          })),
        },
        collection: {
          create: {
            labId,
            branchId: assignedBranch?.id || null,
            branchSnapshot: assignedBranch
              ? {
                  branchId: assignedBranch.id,
                  name: assignedBranch.name,
                  code: assignedBranch.code,
                  phone: assignedBranch.phone,
                  addressLine1: assignedBranch.addressLine1,
                  locality: assignedBranch.locality,
                  postalCode: assignedBranch.postalCode,
                }
              : undefined,
            collectionType: collection.type,
            scheduledDate: new Date(collection.scheduledDate),
            scheduledSlot: collection.scheduledSlot,
            collectionAddressLine1: collection.addressLine1 || null,
            collectionAddressLine2: collection.addressLine2 || null,
            landmark: collection.landmark || null,
            city: collection.city || null,
            state: collection.state || null,
            postalCode: collection.postalCode || null,
            latitude: collection.latitude || null,
            longitude: collection.longitude || null,
            specialInstructions: collection.specialInstructions || null,
          },
        },
      },
      include: {
        lab: {
          select: {
            name: true,
            slug: true,
            phone: true,
            email: true,
          },
        },
        patient: true,
        items: true,
        collection: true,
      },
    });
  } catch (err: any) {
    // Database-enforced concurrency race resolution (Prisma P2002 Unique Constraint Violation)
    if (
      cleanIdempotencyKey &&
      (err.code === "P2002" || err.message?.includes("Order_idempotencyKey_key"))
    ) {
      const raceWinner = await prisma.order.findUnique({
        where: { idempotencyKey: cleanIdempotencyKey },
        include: {
          lab: {
            select: {
              name: true,
              slug: true,
              phone: true,
              email: true,
            },
          },
          patient: true,
          items: true,
          collection: true,
        },
      });

      if (raceWinner) {
        if (raceWinner.idempotencyHash && raceWinner.idempotencyHash !== payloadHash) {
          throw new Error(
            "Idempotency conflict: The provided idempotency key has already been used for a different order request."
          );
        }
        return raceWinner;
      }
    }
    throw err;
  }

  // Non-blocking transactional notification for confirmed orders (e.g. Cash on Collection)
  if (order.orderStatus === OrderStatus.CONFIRMED) {
    try {
      sendOrderConfirmationWhatsApp(order.id).catch((err) =>
        console.error("Non-blocking WhatsApp order confirmation error:", err)
      );
    } catch {
      // non-blocking
    }
  }

  return order;
}

/**
 * Retrieves public tracking information for an order.
 * Validates ownership by phone number if provided.
 */
export async function getOrderTracking(orderNumber: string, verificationPhone?: string) {
  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: {
      lab: {
        select: {
          name: true,
          slug: true,
          phone: true,
          email: true,
          addressLine1: true,
          city: true,
        },
      },
      patient: {
        select: {
          fullName: true,
          phone: true,
        },
      },
      items: true,
      collection: true,
      reports: {
        select: {
          id: true,
          reportNumber: true,
          status: true,
          releasedAt: true,
        },
      },
    },
  });

  if (!order) {
    return null;
  }

  // If a verification phone is provided, ensure it matches
  if (verificationPhone) {
    const cleanPhone = verificationPhone.replace(/\D/g, "");
    const orderPhone = order.patient.phone.replace(/\D/g, "");
    if (!orderPhone.endsWith(cleanPhone) && !cleanPhone.endsWith(orderPhone)) {
      throw new Error("Authorization Failed: Phone number does not match this booking.");
    }
  }

  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    lab: order.lab,
    patientName: order.patient.fullName,
    patientPhoneMasked: order.patient.phone.replace(/(\d{3})\d{4}(\d{3})/, "$1****$2"),
    collectionType: order.collectionType,
    orderStatus: order.orderStatus,
    paymentStatus: order.paymentStatus,
    subtotal: Number(order.subtotal),
    collectionFee: Number(order.collectionFee),
    totalAmount: Number(order.totalAmount),
    createdAt: order.createdAt,
    items: order.items.map((i) => ({
      id: i.id,
      name: i.itemName,
      code: i.itemCode,
      price: Number(i.totalPrice),
    })),
    collection: order.collection
      ? {
          type: order.collection.collectionType,
          scheduledDate: order.collection.scheduledDate,
          scheduledSlot: order.collection.scheduledSlot,
          address: order.collection.collectionAddressLine1,
          city: order.collection.city,
          phlebotomistName: order.collection.phlebotomistName,
          phlebotomistPhone: order.collection.phlebotomistPhone,
          sampleCollectedAt: order.collection.sampleCollectedAt,
        }
      : null,
    reports: order.reports.map((r) => ({
      reportNumber: r.reportNumber,
      status: r.status,
      releasedAt: r.releasedAt,
    })),
  };
}
