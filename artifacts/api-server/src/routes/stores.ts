import { Router, type IRouter, type NextFunction, type Request, type Response } from "express";
import { db, storeDataTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import {
  CreateStoreBody,
  PushStoreBody,
} from "@workspace/api-zod";

type PrinterCalibrationData = {
  tagOffsetXmm: number;
  tagOffsetYmm: number;
  billOffsetXmm: number;
  billOffsetYmm: number;
};

const DEFAULT_PRINTER_CALIBRATION: PrinterCalibrationData = {
  tagOffsetXmm: 0,
  tagOffsetYmm: 0,
  billOffsetXmm: 0,
  billOffsetYmm: 0,
};

function normalizeIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((id): id is string => typeof id === "string" && id.length > 0))];
}

function recordVersion(value: unknown): number {
  if (!value || typeof value !== "object") return 0;
  const record = value as Record<string, unknown>;
  const timestamp = record.updatedAt ?? record.createdAt;
  if (typeof timestamp !== "string" && !(timestamp instanceof Date)) return 0;
  const parsed = Date.parse(String(timestamp));
  return Number.isFinite(parsed) ? parsed : 0;
}

function mergeRecords(
  existingValue: unknown,
  incomingValue: unknown,
  deletedIds: Set<string>,
): unknown[] {
  const merged = new Map<string, unknown>();
  const unkeyed: unknown[] = [];

  for (const source of [existingValue, incomingValue]) {
    if (!Array.isArray(source)) continue;
    for (const value of source) {
      if (!value || typeof value !== "object" || Array.isArray(value)) continue;
      const record = value as Record<string, unknown>;
      const id = typeof record.id === "string" ? record.id : "";
      if (!id) {
        unkeyed.push(value);
        continue;
      }
      if (deletedIds.has(id)) continue;
      const current = merged.get(id);
      // Incoming edits win only when they carry a newer updatedAt/createdAt.
      // This prevents a stale device snapshot from undoing newer customer/order edits.
      if (current === undefined || recordVersion(value) > recordVersion(current)) {
        merged.set(id, value);
      }
    }
  }

  return [...merged.values(), ...unkeyed];
}

function normalizePrinterCalibration(value: unknown): PrinterCalibrationData {
  const input = value && typeof value === "object"
    ? value as Partial<PrinterCalibrationData>
    : {};
  const offset = (raw: unknown) => {
    const numeric = typeof raw === "number" ? raw : Number(raw);
    if (!Number.isFinite(numeric)) return 0;
    return Math.max(-10, Math.min(10, numeric));
  };

  return {
    tagOffsetXmm: offset(input.tagOffsetXmm),
    tagOffsetYmm: offset(input.tagOffsetYmm),
    billOffsetXmm: offset(input.billOffsetXmm),
    billOffsetYmm: offset(input.billOffsetYmm),
  };
}

// Express does not forward rejected promises from async handlers to the
// error middleware by default — this wrapper does, so ZodErrors and DB
// errors reach the global 400/500 handler instead of crashing the process.
function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

const router: IRouter = Router();

// Short, human-shareable code: e.g. "DRY-7F3K9Q". Distinguishable letters/
// numbers only (no 0/O/1/I) so it's easy to read aloud or type on another
// phone when pairing a second device to the same store.
const CODE_CHARS = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
function generateStoreCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return `DRY-${code}`;
}

function toResponse(row: typeof storeDataTable.$inferSelect) {
  const rawStoreInfo = row.storeInfo && typeof row.storeInfo === "object"
    ? row.storeInfo as Record<string, unknown>
    : {};
  const {
    printerCalibration,
    deletedCustomerIds,
    deletedOrderIds,
    ...storeInfo
  } = rawStoreInfo;

  return {
    storeId: row.storeId,
    storeName: row.storeName,
    customers: row.customers,
    orders: row.orders,
    nextDI: row.nextDi,
    topUpRates: row.topUpRates,
    garmentRateOverrides: row.garmentRateOverrides,
    storeInfo,
    printerCalibration: normalizePrinterCalibration(printerCalibration),
    deletedCustomerIds: normalizeIds(deletedCustomerIds),
    deletedOrderIds: normalizeIds(deletedOrderIds),
    updatedAt: row.updatedAt.toISOString(),
  };
}

router.post("/stores", asyncHandler(async (req, res) => {
  const body = CreateStoreBody.parse(req.body);
  const deletedCustomerIds = normalizeIds(body.deletedCustomerIds);
  const deletedOrderIds = normalizeIds(body.deletedOrderIds);
  const deletedCustomerSet = new Set(deletedCustomerIds);
  const deletedOrderSet = new Set(deletedOrderIds);

  let storeId = generateStoreCode();
  // Extremely unlikely collision, but guard against it anyway.
  for (let attempt = 0; attempt < 5; attempt++) {
    const existing = await db.query.storeDataTable.findFirst({
      where: eq(storeDataTable.storeId, storeId),
    });
    if (!existing) break;
    storeId = generateStoreCode();
  }

  const [row] = await db
    .insert(storeDataTable)
    .values({
      storeId,
      storeName: body.storeName,
      customers: mergeRecords([], body.customers, deletedCustomerSet),
      orders: mergeRecords([], body.orders, deletedOrderSet),
      nextDi: body.nextDI ?? 1,
      topUpRates: body.topUpRates ?? {},
      garmentRateOverrides: body.garmentRateOverrides ?? {},
      storeInfo: {
        ...(body.storeInfo ?? {}),
        printerCalibration: normalizePrinterCalibration(body.printerCalibration),
        deletedCustomerIds,
        deletedOrderIds,
      },
    })
    .returning();

  res.json(toResponse(row));
}));

router.get("/stores/:storeId", asyncHandler(async (req, res) => {
  const row = await db.query.storeDataTable.findFirst({
    where: eq(storeDataTable.storeId, String(req.params.storeId)),
  });
  if (!row) {
    res.status(404).json({ error: "Store not found" });
    return;
  }
  res.json(toResponse(row));
}));

router.put("/stores/:storeId", asyncHandler(async (req, res) => {
  const body = PushStoreBody.parse(req.body);
  const storeId = String(req.params.storeId);

  // Update-only: a client can only push to a code that was actually
  // server-generated via POST /stores. This keeps the shareable code the
  // sole namespace-allocation path instead of letting any caller create
  // (or guess-squat) an arbitrary storeId via PUT.
  const row = await db.transaction(async (tx) => {
    // Lock the store row so simultaneous requests from a computer and phone
    // are merged serially instead of one complete snapshot erasing the other.
    await tx.execute(sql`SELECT store_id FROM store_data WHERE store_id = ${storeId} FOR UPDATE`);
    const existing = await tx.query.storeDataTable.findFirst({
      where: eq(storeDataTable.storeId, storeId),
    });
    if (!existing) return null;

    const existingStoreInfo = existing.storeInfo as Record<string, unknown>;
    const deletedCustomerIds = normalizeIds([
      ...normalizeIds(existingStoreInfo.deletedCustomerIds),
      ...normalizeIds(body.deletedCustomerIds),
    ]);
    const deletedOrderIds = normalizeIds([
      ...normalizeIds(existingStoreInfo.deletedOrderIds),
      ...normalizeIds(body.deletedOrderIds),
    ]);
    const printerCalibration = normalizePrinterCalibration(
      body.printerCalibration ?? existingStoreInfo.printerCalibration,
    );

    const [updated] = await tx
      .update(storeDataTable)
      .set({
        storeName: body.storeName,
        customers: mergeRecords(existing.customers, body.customers, new Set(deletedCustomerIds)),
        orders: mergeRecords(existing.orders, body.orders, new Set(deletedOrderIds)),
        nextDi: Math.max(existing.nextDi, body.nextDI),
        topUpRates: body.topUpRates,
        garmentRateOverrides: body.garmentRateOverrides,
        storeInfo: {
          ...body.storeInfo,
          printerCalibration,
          deletedCustomerIds,
          deletedOrderIds,
        },
        updatedAt: new Date(),
      })
      .where(eq(storeDataTable.storeId, storeId))
      .returning();

    return updated ?? null;
  });

  if (!row) {
    res.status(404).json({ error: "Store not found — create it first with POST /stores" });
    return;
  }

  res.json(toResponse(row));
}));

export default router;
