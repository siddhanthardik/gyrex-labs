import { prisma } from "@/lib/db/prisma";
import { CollectionType, OrderItemType, OrderStatus, PaymentMethod, PaymentStatus, Gender } from "@prisma/client";
import { sendOrderConfirmationWhatsApp } from "@/services/integrations/whatsapp/whatsapp-notification-service";

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
    specialInstructions?: string;
  };
  items: CreatePatientOrderItem[];
  paymentMethod: PaymentMethod;
  prescriptionId?: string;
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
  collectionType: CollectionType
): Promise<CalculatedOrderSummary> {
  const lab = await prisma.lab.findUnique({
    where: { id: labId },
    include: { storeSettings: true },
  });

  if (!lab) {
    throw new Error(`Laboratory not found: ${labId}`);
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
      });

      if (!pkg) {
        throw new Error(`Health package not found: ${item.id}`);
      }

      // STRICT MULTI-TENANT CHECK: Package must belong to this laboratory!
      if (pkg.labId !== labId) {
        throw new Error(`Security Violation: Package '${pkg.name}' does not belong to laboratory '${lab.name}'.`);
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

  // Calculate home collection fee based on laboratory store settings
  let collectionFee = 0;
  if (collectionType === CollectionType.HOME_COLLECTION) {
    const baseFee = lab.storeSettings?.homeCollectionFee ? Number(lab.storeSettings.homeCollectionFee) : 100;
    const threshold = lab.storeSettings?.freeHomeCollectionThreshold
      ? Number(lab.storeSettings.freeHomeCollectionThreshold)
      : null;

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
  const { labId, patient: patientData, collection, items, paymentMethod, prescriptionId } = params;

  if (!items || items.length === 0) {
    throw new Error("Order must contain at least one diagnostic test or health package.");
  }

  // 1. Authoritative Server Calculation
  const summary = await calculateOrderTotal(labId, items, collection.type);

  // 2. Find or create global patient by phone
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

  // 3. Link or update LabPatient tenant record
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

  // 4. Generate human-readable order number
  const timestamp = Date.now().toString().slice(-4);
  const random = Math.floor(1000 + Math.random() * 9000);
  const orderNumber = `GYR-${new Date().getFullYear()}-${timestamp}${random}`;

  // 5. Create Order
  const order = await prisma.order.create({
    data: {
      orderNumber,
      labId,
      patientId: patient.id,
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
          collectionType: collection.type,
          scheduledDate: new Date(collection.scheduledDate),
          scheduledSlot: collection.scheduledSlot,
          collectionAddressLine1: collection.addressLine1 || null,
          collectionAddressLine2: collection.addressLine2 || null,
          landmark: collection.landmark || null,
          city: collection.city || null,
          state: collection.state || null,
          postalCode: collection.postalCode || null,
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
