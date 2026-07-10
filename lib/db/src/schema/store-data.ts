import { pgTable, text, integer, jsonb, timestamp } from "drizzle-orm/pg-core";

// One row per shop/franchise. The whole local app state (customers, orders,
// rates, store profile) is synced here as JSON blobs, keyed by a short
// human-shareable store code. This keeps each franchise's data fully
// isolated (different code => different row => never mixed), and lets a
// second device "join" a store by entering its code to pull the same data.
//
// This is deliberately a whole-document sync, not row-level relational sync:
// the app is offline-first and single/dual-device per shop, so last-write-wins
// on the whole blob is simpler and safe enough for this use case.
export const storeDataTable = pgTable("store_data", {
  storeId: text("store_id").primaryKey(),
  storeName: text("store_name").notNull(),
  customers: jsonb("customers").notNull(),
  orders: jsonb("orders").notNull(),
  nextDi: integer("next_di").notNull(),
  topUpRates: jsonb("top_up_rates").notNull(),
  garmentRateOverrides: jsonb("garment_rate_overrides").notNull(),
  storeInfo: jsonb("store_info").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type StoreDataRow = typeof storeDataTable.$inferSelect;
export type InsertStoreDataRow = typeof storeDataTable.$inferInsert;
