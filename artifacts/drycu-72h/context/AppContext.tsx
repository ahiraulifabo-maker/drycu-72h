import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { createStore, getStore, pushStore } from '@workspace/api-client-react';

import { DEFAULT_TOPUP_SERVICES, TOPUP_STORAGE_KEY } from '@/constants/topup';
import { GarmentRate } from '@/constants/rates';
import { STORE_INFO as DEFAULT_STORE_INFO } from '@/constants/storeInfo';
import { DEFAULT_PRINTER_CALIBRATION, normalizePrinterCalibration } from '@/constants/printerCalibration';
import type { PrinterCalibration } from '@workspace/api-client-react';
import { Customer, DiscountType, Order, OrderItem, OrderStatus, OrderTopUp, PickupMode, ServiceType } from '@/types';

const STORAGE_KEYS = {
  CUSTOMERS:    'drycu_customers',
  ORDERS:       'drycu_orders',
  NEXT_DI:      'drycu_next_di',
  GARMENT_RATES:'drycu_garment_rates',
  STORE_INFO:   'drycu_store_info',
  STORE_ID:     'drycu_store_id',
  PRINTER_CALIBRATION: 'drycu_printer_calibration',
  DELETED_CUSTOMER_IDS: 'drycu_deleted_customer_ids',
  DELETED_ORDER_IDS: 'drycu_deleted_order_ids',
};

export type SyncStatus = 'idle' | 'syncing' | 'error';

export interface StoreInfoData {
  name: string;
  line1: string;
  line2: string;
  contact: string;
  tagline: string;
  placeOfSupply: string;
  timing: string;
  website: string;
}

interface AppContextType {
  customers:            Customer[];
  orders:               Order[];
  nextDI:               number;
  isLoaded:             boolean;
  topUpRates:           Record<string, number>;
  garmentRateOverrides: Record<string, Partial<GarmentRate>>;
  storeInfo:            StoreInfoData;
  printerCalibration:   PrinterCalibration;
  updatePrinterCalibration: (changes: Partial<PrinterCalibration>) => Promise<void>;
  deletedCustomerIds:   string[];
  deletedOrderIds:      string[];

  // Multi-device sync — pairs this device to a shop's data by a shareable
  // code. See context comment above `createNewStore` for how it works.
  storeId:              string | null;
  syncStatus:           SyncStatus;
  lastSyncedAt:         string | null;
  createNewStore:       (storeName: string) => Promise<string>;
  joinStore:            (code: string) => Promise<void>;
  pullLatest:           () => Promise<void>;
  leaveStore:           () => Promise<void>;

  addCustomer:         (data: Omit<Customer, 'id' | 'createdAt'>) => Promise<Customer | null>;
  updateCustomer:      (id: string, data: Partial<Omit<Customer, 'id' | 'createdAt'>>) => Promise<void>;
  deleteCustomer:      (id: string) => Promise<void>;
  findDuplicate:       (name: string, mobile: string, excludeId?: string) => Customer | null;
  searchCustomers:     (query: string) => Customer[];
  getCustomer:         (id: string) => Customer | undefined;

  updateTopUpRate:     (name: string, rate: number) => Promise<void>;
  updateTopUpRates:    (rates: Record<string, number>) => Promise<void>;
  updateGarmentRate:   (itemName: string, service: ServiceType, rate: number) => Promise<void>;
  resetGarmentRate:    (itemName: string, service: ServiceType) => Promise<void>;
  updateStoreInfo:     (data: Partial<StoreInfoData>) => Promise<void>;

  addOrder: (data: {
    customerId: string;
    items: OrderItem[];
    topUps: OrderTopUp[];
    discountType: DiscountType;
    discountValue: number;
    pickupDeadline: string;
    advancePaid: number;
    bookedBy?: string;
    note?: string;
    pickupMode?: PickupMode;
  }) => Promise<Order>;
  updateOrder:       (id: string, changes: Partial<Pick<Order, 'status' | 'pickupDeadline' | 'pickupMode' | 'advancePaid' | 'bookedBy' | 'note' | 'discountType' | 'discountValue'>>) => Promise<void>;
  updateOrderStatus: (id: string, status: OrderStatus) => Promise<void>;
  deleteOrder:       (id: string) => Promise<void>;
  deleteAllOrders:   () => Promise<void>;
  deleteAllCustomers:() => Promise<void>;
  factoryReset:      () => Promise<void>;
  getOrdersForCustomer: (customerId: string) => Order[];
  getOrder:          (id: string) => Order | undefined;
}

const AppContext = createContext<AppContextType | null>(null);

function generateId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

function formatDINumber(n: number): string {
  return `DI-${n.toString().padStart(5, '0')}`;
}

function computeFinancials(
  items: OrderItem[],
  topUps: OrderTopUp[],
  discountType: DiscountType,
  discountValue: number
) {
  const itemsTotal = items.reduce((s, i) => s + i.subtotal, 0);
  const topUpTotal = topUps.reduce((s, t) => s + t.subtotal, 0);
  const gross = itemsTotal + topUpTotal;
  let discountAmount = 0;
  if (discountType === 'flat')       discountAmount = Math.min(discountValue, gross);
  if (discountType === 'percentage') discountAmount = (gross * discountValue) / 100;
  const net = gross - discountAmount;
  return { grossAmount: gross, discountAmount, cgstAmount: 0, sgstAmount: 0, netPayable: net };
}

function buildDefaultTopUpRates(): Record<string, number> {
  const r: Record<string, number> = {};
  DEFAULT_TOPUP_SERVICES.forEach(s => { r[s.name] = s.defaultRate; });
  return r;
}

function parseIdList(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed)
      ? [...new Set(parsed.filter((id): id is string => typeof id === 'string' && id.length > 0))]
      : [];
  } catch {
    return [];
  }
}

function recordVersion(record: { updatedAt?: string; createdAt?: string }): number {
  const timestamp = Date.parse(record.updatedAt ?? record.createdAt ?? '');
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function mergeById<T extends { id: string; createdAt?: string; updatedAt?: string }>(
  local: T[],
  remote: T[],
  deletedIds: string[],
): T[] {
  const deleted = new Set(deletedIds);
  const merged = new Map<string, T>();

  for (const record of local) {
    if (record?.id && !deleted.has(record.id)) merged.set(record.id, record);
  }
  for (const record of remote) {
    if (!record?.id || deleted.has(record.id)) continue;
    const current = merged.get(record.id);
    // The server copy wins on ties; local wins only when it has a newer edit.
    if (!current || recordVersion(record) >= recordVersion(current)) {
      merged.set(record.id, record);
    }
  }
  return [...merged.values()];
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [customers,            setCustomers]            = useState<Customer[]>([]);
  const [orders,               setOrders]               = useState<Order[]>([]);
  const [nextDI,               setNextDI]               = useState(1);
  const [isLoaded,             setIsLoaded]             = useState(false);
  const [topUpRates,           setTopUpRates]           = useState<Record<string, number>>(buildDefaultTopUpRates());
  const [garmentRateOverrides, setGarmentRateOverrides] = useState<Record<string, Partial<GarmentRate>>>({});
  const [storeInfo,            setStoreInfo]            = useState<StoreInfoData>({ ...DEFAULT_STORE_INFO });
  const [printerCalibration,   setPrinterCalibration]   = useState<PrinterCalibration>({ ...DEFAULT_PRINTER_CALIBRATION });
  const printerCalibrationRef = useRef<PrinterCalibration>({ ...DEFAULT_PRINTER_CALIBRATION });
  const [deletedCustomerIds, setDeletedCustomerIds] = useState<string[]>([]);
  const [deletedOrderIds, setDeletedOrderIds] = useState<string[]>([]);
  const deletedCustomerIdsRef = useRef<string[]>([]);
  const deletedOrderIdsRef = useRef<string[]>([]);

  const [storeId,      setStoreId]      = useState<string | null>(null);
  const [syncStatus,   setSyncStatus]   = useState<SyncStatus>('idle');
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  // Set right after a pull/join so the very next state-change effect doesn't
  // immediately push the data straight back up to the server.
  const skipNextPush = useRef(false);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [c, o, d, t, g, si, sid, pc, deletedCustomers, deletedOrders] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.CUSTOMERS),
          AsyncStorage.getItem(STORAGE_KEYS.ORDERS),
          AsyncStorage.getItem(STORAGE_KEYS.NEXT_DI),
          AsyncStorage.getItem(TOPUP_STORAGE_KEY),
          AsyncStorage.getItem(STORAGE_KEYS.GARMENT_RATES),
          AsyncStorage.getItem(STORAGE_KEYS.STORE_INFO),
          AsyncStorage.getItem(STORAGE_KEYS.STORE_ID),
          AsyncStorage.getItem(STORAGE_KEYS.PRINTER_CALIBRATION),
          AsyncStorage.getItem(STORAGE_KEYS.DELETED_CUSTOMER_IDS),
          AsyncStorage.getItem(STORAGE_KEYS.DELETED_ORDER_IDS),
        ]);
        if (c)  setCustomers(JSON.parse(c));
        if (o)  setOrders(JSON.parse(o));
        if (d)  setNextDI(parseInt(d, 10));
        if (t)  setTopUpRates({ ...buildDefaultTopUpRates(), ...JSON.parse(t) });
        if (g)  setGarmentRateOverrides(JSON.parse(g));
        if (si) {
          const savedInfo = { ...DEFAULT_STORE_INFO, ...JSON.parse(si) } as StoreInfoData;
          // Migrate the old FABO wording so existing devices also print the
          // new DRYCU-72H branding instead of keeping the legacy tagline.
          if (/fabo/i.test(savedInfo.name)) {
            savedInfo.name = savedInfo.name.replace(/fabo/gi, 'DRYCU-72H');
          }
          if (/fabo|fabulous homes and fabric/i.test(savedInfo.tagline)) {
            savedInfo.tagline = 'Clean. Fast. You.';
          }
          setStoreInfo(savedInfo);
        }
        if (pc) {
          let savedCalibration = { ...DEFAULT_PRINTER_CALIBRATION };
          try {
            savedCalibration = normalizePrinterCalibration(JSON.parse(pc));
          } catch {
            await AsyncStorage.removeItem(STORAGE_KEYS.PRINTER_CALIBRATION);
          }
          printerCalibrationRef.current = savedCalibration;
          setPrinterCalibration(savedCalibration);
        }
        const savedDeletedCustomers = parseIdList(deletedCustomers);
        const savedDeletedOrders = parseIdList(deletedOrders);
        deletedCustomerIdsRef.current = savedDeletedCustomers;
        deletedOrderIdsRef.current = savedDeletedOrders;
        setDeletedCustomerIds(savedDeletedCustomers);
        setDeletedOrderIds(savedDeletedOrders);
        if (sid) {
          setStoreId(sid);
          // Loading local data isn't a "change" that should trigger a push.
          skipNextPush.current = true;
        }
      } catch (_) {
        // ignore
      } finally {
        setIsLoaded(true);
      }
    })();
  }, []);

  const saveCustomers = async (list: Customer[]) =>
    AsyncStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(list));
  const saveOrders = async (list: Order[]) =>
    AsyncStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(list));

  const updateTopUpRate = async (name: string, rate: number) => {
    const updated = { ...topUpRates, [name]: rate };
    setTopUpRates(updated);
    await AsyncStorage.setItem(TOPUP_STORAGE_KEY, JSON.stringify(updated));
  };

  // Batch update — avoids the race condition of firing many updateTopUpRate
  // calls in parallel, where each closes over the same stale `topUpRates`
  // and only the last write to resolve survives.
  const updateTopUpRates = async (rates: Record<string, number>) => {
    const updated = { ...topUpRates, ...rates };
    setTopUpRates(updated);
    await AsyncStorage.setItem(TOPUP_STORAGE_KEY, JSON.stringify(updated));
  };

  const updateGarmentRate = async (itemName: string, service: ServiceType, rate: number) => {
    const updated = {
      ...garmentRateOverrides,
      [itemName]: { ...(garmentRateOverrides[itemName] ?? {}), [service]: rate },
    };
    setGarmentRateOverrides(updated);
    await AsyncStorage.setItem(STORAGE_KEYS.GARMENT_RATES, JSON.stringify(updated));
  };

  const resetGarmentRate = async (itemName: string, service: ServiceType) => {
    const item = { ...(garmentRateOverrides[itemName] ?? {}) };
    delete item[service as keyof GarmentRate];
    const updated = { ...garmentRateOverrides, [itemName]: item };
    if (Object.keys(item).length === 0) delete updated[itemName];
    setGarmentRateOverrides(updated);
    await AsyncStorage.setItem(STORAGE_KEYS.GARMENT_RATES, JSON.stringify(updated));
  };

  const updateStoreInfo = async (data: Partial<StoreInfoData>) => {
    const updated = { ...storeInfo, ...data };
    setStoreInfo(updated);
    await AsyncStorage.setItem(STORAGE_KEYS.STORE_INFO, JSON.stringify(updated));
  };

  const updatePrinterCalibration = async (changes: Partial<PrinterCalibration>) => {
    const updated = normalizePrinterCalibration({ ...printerCalibrationRef.current, ...changes });
    printerCalibrationRef.current = updated;
    setPrinterCalibration(updated);
    await AsyncStorage.setItem(STORAGE_KEYS.PRINTER_CALIBRATION, JSON.stringify(updated));
  };

  // ── Multi-device sync ──────────────────────────────────────────────────
  // Whole-document sync: the entire local state is pushed as one JSON blob
  // to /api/stores/:storeId, and pulling overwrites local state with the
  // server's blob. This is last-write-wins, not merge — fine for a shop
  // that's mostly used from one counter device with an occasional second
  // phone, but two devices editing at the exact same moment can clobber
  // each other. Different storeId codes never share data, which is what
  // keeps separate franchise locations fully isolated.

  type Snapshot = {
    customers: Customer[]; orders: Order[]; nextDI: number;
    topUpRates: Record<string, number>;
    garmentRateOverrides: Record<string, Partial<GarmentRate>>;
    storeInfo: StoreInfoData;
    printerCalibration: PrinterCalibration;
    deletedCustomerIds: string[];
    deletedOrderIds: string[];
  };

  // Single-flight push queue: on a flaky connection two overlapping PUTs
  // can resolve out of order, letting an older snapshot silently clobber a
  // newer one server-side. Instead of firing requests as changes happen, we
  // keep at most one request in flight and, if newer local state arrives
  // while it's outstanding, queue only the LATEST snapshot to send next —
  // never running two pushes concurrently.
  const pushInFlight = useRef(false);
  const pendingPush = useRef<{ sid: string; snapshot: Snapshot } | null>(null);

  const runPush = useCallback(async (sid: string, snapshot: Snapshot) => {
    pushInFlight.current = true;
    setSyncStatus('syncing');
    try {
      const row = await pushStore(sid, {
        storeName: snapshot.storeInfo.name,
        customers: snapshot.customers,
        orders: snapshot.orders,
        nextDI: snapshot.nextDI,
        topUpRates: snapshot.topUpRates,
        garmentRateOverrides: snapshot.garmentRateOverrides,
        storeInfo: snapshot.storeInfo as unknown as Record<string, string>,
        printerCalibration: snapshot.printerCalibration,
        deletedCustomerIds: snapshot.deletedCustomerIds,
        deletedOrderIds: snapshot.deletedOrderIds,
      });
      setLastSyncedAt(row.updatedAt);
      setSyncStatus('idle');
    } catch (_) {
      // Offline or server unreachable — local AsyncStorage remains the
      // source of truth, so the app keeps working; we just retry on the
      // next change.
      setSyncStatus('error');
    } finally {
      pushInFlight.current = false;
      const next = pendingPush.current;
      pendingPush.current = null;
      if (next) {
        // Fire-and-forget: chains to the next queued push, still one at a time.
        runPush(next.sid, next.snapshot);
      }
    }
  }, []);

  const pushToServer = useCallback(async (sid: string, snapshot: Snapshot) => {
    if (pushInFlight.current) {
      // Replace any older queued snapshot — only the freshest state matters.
      // (Callers that need to await completion, like createNewStore, are
      // rare enough on a fresh pairing that this fire-and-forget is fine.)
      pendingPush.current = { sid, snapshot };
      return;
    }
    await runPush(sid, snapshot);
  }, [runPush]);

  // Debounced auto-push whenever synced data changes, once paired.
  useEffect(() => {
    if (!isLoaded || !storeId) return;
    if (skipNextPush.current) { skipNextPush.current = false; return; }
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => {
      pushToServer(storeId, {
        customers, orders, nextDI, topUpRates, garmentRateOverrides, storeInfo, printerCalibration,
        deletedCustomerIds, deletedOrderIds,
      });
    }, 1500);
    return () => { if (syncTimer.current) clearTimeout(syncTimer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customers, orders, nextDI, topUpRates, garmentRateOverrides, storeInfo, printerCalibration, deletedCustomerIds, deletedOrderIds, storeId, isLoaded]);

  const applyRemoteSnapshot = async (row: {
    storeId: string; updatedAt: string; customers: unknown; orders: unknown;
    nextDI: number; topUpRates: Record<string, number>;
    garmentRateOverrides: Record<string, unknown>; storeInfo: Record<string, string>;
    printerCalibration?: PrinterCalibration;
    deletedCustomerIds?: string[];
    deletedOrderIds?: string[];
  }) => {
    if (!Array.isArray(row.customers) || !Array.isArray(row.orders)) {
      throw new Error('The store server returned an invalid customer/order snapshot; local data was kept.');
    }
    const remoteDeletedCustomers = parseIdList(JSON.stringify(row.deletedCustomerIds ?? []));
    const remoteDeletedOrders = parseIdList(JSON.stringify(row.deletedOrderIds ?? []));
    const remoteDeletedCustomerSet = new Set(remoteDeletedCustomers);
    const remoteDeletedOrderSet = new Set(remoteDeletedOrders);
    const remoteCustomers = (row.customers as Customer[]).filter(customer => !remoteDeletedCustomerSet.has(customer.id));
    const remoteOrders = (row.orders as Order[]).filter(order => !remoteDeletedOrderSet.has(order.id));
    const remoteGarmentRates = row.garmentRateOverrides as Record<string, Partial<GarmentRate>>;
    const remoteStoreInfo = { ...DEFAULT_STORE_INFO, ...row.storeInfo } as StoreInfoData;
    const remotePrinterCalibration = normalizePrinterCalibration(row.printerCalibration);

    deletedCustomerIdsRef.current = remoteDeletedCustomers;
    deletedOrderIdsRef.current = remoteDeletedOrders;
    setDeletedCustomerIds(remoteDeletedCustomers);
    setDeletedOrderIds(remoteDeletedOrders);
    setCustomers(remoteCustomers);
    setOrders(remoteOrders);
    setNextDI(row.nextDI);
    setTopUpRates({ ...buildDefaultTopUpRates(), ...row.topUpRates });
    setGarmentRateOverrides(remoteGarmentRates);
    setStoreInfo(remoteStoreInfo);
    printerCalibrationRef.current = remotePrinterCalibration;
    setPrinterCalibration(remotePrinterCalibration);
    setStoreId(row.storeId);
    setLastSyncedAt(row.updatedAt);
    skipNextPush.current = true;

    await Promise.all([
      saveCustomers(remoteCustomers),
      saveOrders(remoteOrders),
      AsyncStorage.setItem(STORAGE_KEYS.NEXT_DI, row.nextDI.toString()),
      AsyncStorage.setItem(TOPUP_STORAGE_KEY, JSON.stringify({ ...buildDefaultTopUpRates(), ...row.topUpRates })),
      AsyncStorage.setItem(STORAGE_KEYS.GARMENT_RATES, JSON.stringify(remoteGarmentRates)),
      AsyncStorage.setItem(STORAGE_KEYS.STORE_INFO, JSON.stringify(remoteStoreInfo)),
      AsyncStorage.setItem(STORAGE_KEYS.PRINTER_CALIBRATION, JSON.stringify(remotePrinterCalibration)),
      AsyncStorage.setItem(STORAGE_KEYS.DELETED_CUSTOMER_IDS, JSON.stringify(remoteDeletedCustomers)),
      AsyncStorage.setItem(STORAGE_KEYS.DELETED_ORDER_IDS, JSON.stringify(remoteDeletedOrders)),
      AsyncStorage.setItem(STORAGE_KEYS.STORE_ID, row.storeId),
    ]);
  };

  // Create the code and seed its complete snapshot in one API request. This
  // avoids exposing a valid-looking code that points at an empty server row
  // when the follow-up upload fails.
  const createNewStore = async (storeName: string): Promise<string> => {
    const row = await createStore({
      storeName,
      customers,
      orders,
      nextDI,
      topUpRates,
      garmentRateOverrides,
      storeInfo: storeInfo as unknown as Record<string, string>,
      printerCalibration,
      deletedCustomerIds,
      deletedOrderIds,
    });
    // Publish the returned code to the UI as soon as the server confirms it;
    // local persistence must not keep a successfully-created code hidden.
    setStoreId(row.storeId);
    setLastSyncedAt(row.updatedAt);
    setSyncStatus('idle');
    await AsyncStorage.setItem(STORAGE_KEYS.STORE_ID, row.storeId);
    return row.storeId;
  };

  // Pairs this device to an existing store code (e.g. typed in from the
  // shop's other phone) and overwrites local data with that store's data.
  const joinStore = async (code: string): Promise<void> => {
    const row = await getStore(code.trim().toUpperCase());
    await applyRemoteSnapshot(row);
  };

  // Manually re-pull the latest server snapshot for the currently paired store.
  const pullLatest = async (): Promise<void> => {
    if (!storeId) return;
    const row = await getStore(storeId);
    if (!Array.isArray(row.customers) || !Array.isArray(row.orders)) {
      throw new Error('The store server returned an invalid customer/order snapshot; local data was kept.');
    }
    const mergedDeletedCustomers = [...new Set([...deletedCustomerIds, ...(row.deletedCustomerIds ?? [])])];
    const mergedDeletedOrders = [...new Set([...deletedOrderIds, ...(row.deletedOrderIds ?? [])])];
    const merged = await pushStore(storeId, {
      storeName: row.storeName,
      customers: mergeById(customers, row.customers as Customer[], mergedDeletedCustomers),
      orders: mergeById(orders, row.orders as Order[], mergedDeletedOrders),
      nextDI: Math.max(nextDI, row.nextDI),
      topUpRates: row.topUpRates,
      garmentRateOverrides: row.garmentRateOverrides,
      storeInfo: row.storeInfo,
      printerCalibration: row.printerCalibration ?? printerCalibration,
      deletedCustomerIds: mergedDeletedCustomers,
      deletedOrderIds: mergedDeletedOrders,
    });
    await applyRemoteSnapshot(merged);
  };

  // Unpairs this device from sync without deleting any server-side data —
  // the store code still works on any other device.
  const leaveStore = async () => {
    await AsyncStorage.removeItem(STORAGE_KEYS.STORE_ID);
    setStoreId(null);
    setLastSyncedAt(null);
    setSyncStatus('idle');
  };

  const findDuplicate = useCallback((name: string, mobile: string, excludeId?: string): Customer | null => {
    const n = name.trim().toLowerCase();
    const m = mobile.trim();
    return customers.find(c =>
      c.id !== excludeId &&
      c.name.trim().toLowerCase() === n &&
      c.mobile.trim() === m
    ) ?? null;
  }, [customers]);

  const addCustomer = async (data: Omit<Customer, 'id' | 'createdAt'>): Promise<Customer | null> => {
    const dup = findDuplicate(data.name, data.mobile);
    if (dup) return null;
    const now = new Date().toISOString();
    const customer: Customer = { ...data, id: generateId(), createdAt: now, updatedAt: now };
    const updated = [...customers, customer];
    setCustomers(updated);
    await saveCustomers(updated);
    return customer;
  };

  const updateCustomer = async (id: string, data: Partial<Omit<Customer, 'id' | 'createdAt'>>) => {
    const updated = customers.map(c => c.id === id ? { ...c, ...data, updatedAt: new Date().toISOString() } : c);
    setCustomers(updated);
    await saveCustomers(updated);
  };

  const deleteCustomer = async (id: string) => {
    const updated = customers.filter(c => c.id !== id);
    const deleted = [...new Set([...deletedCustomerIdsRef.current, id])];
    deletedCustomerIdsRef.current = deleted;
    setDeletedCustomerIds(deleted);
    setCustomers(updated);
    await Promise.all([
      saveCustomers(updated),
      AsyncStorage.setItem(STORAGE_KEYS.DELETED_CUSTOMER_IDS, JSON.stringify(deleted)),
    ]);
  };

  const searchCustomers = useCallback((query: string): Customer[] => {
    if (!query.trim()) return customers;
    const q = query.trim().toLowerCase();
    return customers.filter(c =>
      c.id.toLowerCase().includes(q) ||
      c.name.toLowerCase().includes(q) ||
      c.mobile.includes(q)
    );
  }, [customers]);

  const getCustomer = useCallback((id: string) => customers.find(c => c.id === id), [customers]);

  const addOrder = async (data: {
    customerId: string;
    items: OrderItem[];
    topUps: OrderTopUp[];
    discountType: DiscountType;
    discountValue: number;
    pickupDeadline: string;
    advancePaid: number;
    bookedBy?: string;
    note?: string;
    pickupMode?: PickupMode;
  }): Promise<Order> => {
    const { grossAmount, discountAmount, cgstAmount, sgstAmount, netPayable } =
      computeFinancials(data.items, data.topUps, data.discountType, data.discountValue);

    const order: Order = {
      id: formatDINumber(nextDI),
      diNumber: nextDI,
      customerId: data.customerId,
      items: data.items,
      topUps: data.topUps,
      grossAmount,
      discountType: data.discountType,
      discountValue: data.discountValue,
      discountAmount,
      cgstAmount,
      sgstAmount,
      netPayable,
      advancePaid: data.advancePaid,
      bookedBy: data.bookedBy,
      note: data.note,
      pickupMode: data.pickupMode ?? 'store',
      createdAt: new Date().toISOString(),
      pickupDeadline: data.pickupDeadline,
      status: 'Pending',
      updatedAt: new Date().toISOString(),
    };

    const newDI = nextDI + 1;
    const updatedOrders = [...orders, order];
    setOrders(updatedOrders);
    setNextDI(newDI);
    await Promise.all([
      saveOrders(updatedOrders),
      AsyncStorage.setItem(STORAGE_KEYS.NEXT_DI, newDI.toString()),
    ]);
    return order;
  };

  const updateOrder = async (
    id: string,
    changes: Partial<Pick<Order, 'status' | 'pickupDeadline' | 'pickupMode' | 'advancePaid' | 'bookedBy' | 'note' | 'discountType' | 'discountValue'>>
  ) => {
    const updated = orders.map(o => {
      if (o.id !== id) return o;
      const merged = { ...o, ...changes, updatedAt: new Date().toISOString() };
      // Recompute financials if discount settings changed
      if (changes.discountType !== undefined || changes.discountValue !== undefined) {
        const { grossAmount, discountAmount, cgstAmount, sgstAmount, netPayable } =
          computeFinancials(o.items, o.topUps ?? [], merged.discountType, merged.discountValue);
        return { ...merged, grossAmount, discountAmount, cgstAmount, sgstAmount, netPayable };
      }
      return merged;
    });
    setOrders(updated);
    await saveOrders(updated);
  };

  const updateOrderStatus = async (id: string, status: OrderStatus) => {
    const updated = orders.map(o => o.id === id ? { ...o, status, updatedAt: new Date().toISOString() } : o);
    setOrders(updated);
    await saveOrders(updated);
  };

  const deleteOrder = async (id: string) => {
    const updated = orders.filter(o => o.id !== id);
    const deleted = [...new Set([...deletedOrderIdsRef.current, id])];
    deletedOrderIdsRef.current = deleted;
    setDeletedOrderIds(deleted);
    setOrders(updated);
    await Promise.all([
      saveOrders(updated),
      AsyncStorage.setItem(STORAGE_KEYS.DELETED_ORDER_IDS, JSON.stringify(deleted)),
    ]);
  };

  const deleteAllOrders = async () => {
    const deleted = [...new Set([...deletedOrderIdsRef.current, ...orders.map(order => order.id)])];
    deletedOrderIdsRef.current = deleted;
    setDeletedOrderIds(deleted);
    setOrders([]);
    setNextDI(1);
    await Promise.all([
      saveOrders([]),
      AsyncStorage.setItem(STORAGE_KEYS.NEXT_DI, '1'),
      AsyncStorage.setItem(STORAGE_KEYS.DELETED_ORDER_IDS, JSON.stringify(deleted)),
    ]);
  };

  const deleteAllCustomers = async () => {
    const deleted = [...new Set([...deletedCustomerIdsRef.current, ...customers.map(customer => customer.id)])];
    deletedCustomerIdsRef.current = deleted;
    setDeletedCustomerIds(deleted);
    setCustomers([]);
    await Promise.all([
      saveCustomers([]),
      AsyncStorage.setItem(STORAGE_KEYS.DELETED_CUSTOMER_IDS, JSON.stringify(deleted)),
    ]);
  };

  const factoryReset = async () => {
    const deletedCustomers = [...new Set([...deletedCustomerIdsRef.current, ...customers.map(customer => customer.id)])];
    const deletedOrders = [...new Set([...deletedOrderIdsRef.current, ...orders.map(order => order.id)])];
    deletedCustomerIdsRef.current = deletedCustomers;
    deletedOrderIdsRef.current = deletedOrders;
    setDeletedCustomerIds(deletedCustomers);
    setDeletedOrderIds(deletedOrders);
    setCustomers([]);
    setOrders([]);
    setNextDI(1);
    setTopUpRates(buildDefaultTopUpRates());
    setGarmentRateOverrides({});
    setStoreInfo({ ...DEFAULT_STORE_INFO });
    printerCalibrationRef.current = { ...DEFAULT_PRINTER_CALIBRATION };
    setPrinterCalibration({ ...DEFAULT_PRINTER_CALIBRATION });
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.CUSTOMERS,
      STORAGE_KEYS.ORDERS,
      STORAGE_KEYS.NEXT_DI,
      STORAGE_KEYS.GARMENT_RATES,
      STORAGE_KEYS.STORE_INFO,
      STORAGE_KEYS.PRINTER_CALIBRATION,
      TOPUP_STORAGE_KEY,
    ]);
    await Promise.all([
      AsyncStorage.setItem(STORAGE_KEYS.DELETED_CUSTOMER_IDS, JSON.stringify(deletedCustomers)),
      AsyncStorage.setItem(STORAGE_KEYS.DELETED_ORDER_IDS, JSON.stringify(deletedOrders)),
      AsyncStorage.setItem(STORAGE_KEYS.CUSTOMERS, '[]'),
      AsyncStorage.setItem(STORAGE_KEYS.ORDERS, '[]'),
    ]);
  };

  const getOrdersForCustomer = useCallback((customerId: string) =>
    orders.filter(o => o.customerId === customerId).sort((a, b) => b.diNumber - a.diNumber),
    [orders]);

  const getOrder = useCallback((id: string) => orders.find(o => o.id === id), [orders]);

  return (
    <AppContext.Provider value={{
      customers, orders, nextDI, isLoaded, topUpRates, garmentRateOverrides, storeInfo, printerCalibration,
      deletedCustomerIds, deletedOrderIds,
      storeId, syncStatus, lastSyncedAt, createNewStore, joinStore, pullLatest, leaveStore,
      addCustomer, updateCustomer, deleteCustomer, findDuplicate, searchCustomers, getCustomer,
      updateTopUpRate, updateTopUpRates, updateGarmentRate, resetGarmentRate, updateStoreInfo, updatePrinterCalibration,
      addOrder, updateOrder, updateOrderStatus, deleteOrder,
      deleteAllOrders, deleteAllCustomers, factoryReset,
      getOrdersForCustomer, getOrder,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
