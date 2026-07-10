import { Router, type IRouter, type NextFunction, type Request, type Response } from "express";
import { db, storeDataTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  CreateStoreBody,
  PushStoreBody,
} from "@workspace/api-zod";

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
  return {
    storeId: row.storeId,
    storeName: row.storeName,
    customers: row.customers,
    orders: row.orders,
    nextDI: row.nextDi,
    topUpRates: row.topUpRates,
    garmentRateOverrides: row.garmentRateOverrides,
    storeInfo: row.storeInfo,
    updatedAt: row.updatedAt.toISOString(),
  };
}

router.post("/stores", asyncHandler(async (req, res) => {
  const body = CreateStoreBody.parse(req.body);

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
      customers: [],
      orders: [],
      nextDi: 1,
      topUpRates: {},
      garmentRateOverrides: {},
      storeInfo: {},
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
  const existing = await db.query.storeDataTable.findFirst({
    where: eq(storeDataTable.storeId, storeId),
  });
  if (!existing) {
    res.status(404).json({ error: "Store not found — create it first with POST /stores" });
    return;
  }

  const [row] = await db
    .update(storeDataTable)
    .set({
      storeName: body.storeName,
      customers: body.customers,
      orders: body.orders,
      nextDi: body.nextDI,
      topUpRates: body.topUpRates,
      garmentRateOverrides: body.garmentRateOverrides,
      storeInfo: body.storeInfo,
      updatedAt: new Date(),
    })
    .where(eq(storeDataTable.storeId, storeId))
    .returning();

  res.json(toResponse(row));
}));

export default router;
