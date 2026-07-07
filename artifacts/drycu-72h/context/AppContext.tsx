import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

import { DEFAULT_TOPUP_SERVICES, TOPUP_STORAGE_KEY } from '@/constants/topup';
import { GarmentRate } from '@/constants/rates';
import { Customer, DiscountType, Order, OrderItem, OrderStatus, OrderTopUp, ServiceType } from '@/types';

const STORAGE_KEYS = {
  CUSTOMERS: 'drycu_customers',
  ORDERS: 'drycu_orders',
  NEXT_DI: 'drycu_next_di',
  GARMENT_RATES: 'drycu_garment_rates',
};

interface AppContextType {
  customers: Customer[];
  orders: Order[];
  nextDI: number;
  isLoaded: boolean;
  topUpRates: Record<string, number>;
  garmentRateOverrides: Record<string, Partial<GarmentRate>>;

  addCustomer: (data: Omit<Customer, 'id' | 'createdAt'>) => Promise<Customer | null>;
  updateCustomer: (id: string, data: Partial<Omit<Customer, 'id' | 'createdAt'>>) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
  findDuplicate: (name: string, mobile: string, excludeId?: string) => Customer | null;
  searchCustomers: (query: string) => Customer[];
  getCustomer: (id: string) => Customer | undefined;

  updateTopUpRate: (name: string, rate: number) => Promise<void>;
  updateGarmentRate: (itemName: string, service: ServiceType, rate: number) => Promise<void>;
  resetGarmentRate: (itemName: string, service: ServiceType) => Promise<void>;

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
  }) => Promise<Order>;
  updateOrderStatus: (id: string, status: OrderStatus) => Promise<void>;
  deleteOrder: (id: string) => Promise<void>;
  getOrdersForCustomer: (customerId: string) => Order[];
  getOrder: (id: string) => Order | undefined;
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
  if (discountType === 'flat') discountAmount = Math.min(discountValue, gross);
  if (discountType === 'percentage') discountAmount = (gross * discountValue) / 100;
  const net = gross - discountAmount;
  return { grossAmount: gross, discountAmount, cgstAmount: 0, sgstAmount: 0, netPayable: net };
}

function buildDefaultTopUpRates(): Record<string, number> {
  const r: Record<string, number> = {};
  DEFAULT_TOPUP_SERVICES.forEach(s => { r[s.name] = s.defaultRate; });
  return r;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [nextDI, setNextDI] = useState(1);
  const [isLoaded, setIsLoaded] = useState(false);
  const [topUpRates, setTopUpRates] = useState<Record<string, number>>(buildDefaultTopUpRates());
  const [garmentRateOverrides, setGarmentRateOverrides] = useState<Record<string, Partial<GarmentRate>>>({});

  useEffect(() => {
    (async () => {
      try {
        const [c, o, d, t, g] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.CUSTOMERS),
          AsyncStorage.getItem(STORAGE_KEYS.ORDERS),
          AsyncStorage.getItem(STORAGE_KEYS.NEXT_DI),
          AsyncStorage.getItem(TOPUP_STORAGE_KEY),
          AsyncStorage.getItem(STORAGE_KEYS.GARMENT_RATES),
        ]);
        if (c) setCustomers(JSON.parse(c));
        if (o) setOrders(JSON.parse(o));
        if (d) setNextDI(parseInt(d, 10));
        if (t) setTopUpRates({ ...buildDefaultTopUpRates(), ...JSON.parse(t) });
        if (g) setGarmentRateOverrides(JSON.parse(g));
      } catch (e) {
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
    const customer: Customer = { ...data, id: generateId(), createdAt: new Date().toISOString() };
    const updated = [...customers, customer];
    setCustomers(updated);
    await saveCustomers(updated);
    return customer;
  };

  const updateCustomer = async (id: string, data: Partial<Omit<Customer, 'id' | 'createdAt'>>) => {
    const updated = customers.map(c => c.id === id ? { ...c, ...data } : c);
    setCustomers(updated);
    await saveCustomers(updated);
  };

  const deleteCustomer = async (id: string) => {
    const updated = customers.filter(c => c.id !== id);
    setCustomers(updated);
    await saveCustomers(updated);
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
      createdAt: new Date().toISOString(),
      pickupDeadline: data.pickupDeadline,
      status: 'Pending',
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

  const updateOrderStatus = async (id: string, status: OrderStatus) => {
    const updated = orders.map(o => o.id === id ? { ...o, status } : o);
    setOrders(updated);
    await saveOrders(updated);
  };

  const deleteOrder = async (id: string) => {
    const updated = orders.filter(o => o.id !== id);
    setOrders(updated);
    await saveOrders(updated);
  };

  const getOrdersForCustomer = useCallback((customerId: string) =>
    orders.filter(o => o.customerId === customerId).sort((a, b) => b.diNumber - a.diNumber),
    [orders]);

  const getOrder = useCallback((id: string) => orders.find(o => o.id === id), [orders]);

  return (
    <AppContext.Provider value={{
      customers, orders, nextDI, isLoaded, topUpRates, garmentRateOverrides,
      addCustomer, updateCustomer, deleteCustomer, findDuplicate, searchCustomers, getCustomer,
      updateTopUpRate, updateGarmentRate, resetGarmentRate,
      addOrder, updateOrderStatus, deleteOrder, getOrdersForCustomer, getOrder,
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
