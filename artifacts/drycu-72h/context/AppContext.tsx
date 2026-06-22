import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

import { Customer, DiscountType, Order, OrderItem, OrderStatus } from '@/types';

const STORAGE_KEYS = {
  CUSTOMERS: 'drycu_customers',
  ORDERS: 'drycu_orders',
  NEXT_DI: 'drycu_next_di',
};

interface AppContextType {
  customers: Customer[];
  orders: Order[];
  nextDI: number;
  isLoaded: boolean;

  addCustomer: (data: Omit<Customer, 'id' | 'createdAt'>) => Promise<Customer | null>;
  updateCustomer: (id: string, data: Partial<Omit<Customer, 'id' | 'createdAt'>>) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
  findDuplicate: (name: string, mobile: string, excludeId?: string) => Customer | null;
  searchCustomers: (query: string) => Customer[];
  getCustomer: (id: string) => Customer | undefined;

  addOrder: (data: {
    customerId: string;
    items: OrderItem[];
    discountType: DiscountType;
    discountValue: number;
    pickupDeadline: string;
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
  discountType: DiscountType,
  discountValue: number
) {
  const gross = items.reduce((s, i) => s + i.subtotal, 0);
  let discountAmount = 0;
  if (discountType === 'flat') discountAmount = Math.min(discountValue, gross);
  if (discountType === 'percentage') discountAmount = (gross * discountValue) / 100;
  const taxable = gross - discountAmount;
  const cgst = taxable * 0.09;
  const sgst = taxable * 0.09;
  const net = taxable + cgst + sgst;
  return { grossAmount: gross, discountAmount, cgstAmount: cgst, sgstAmount: sgst, netPayable: net };
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [nextDI, setNextDI] = useState(1);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [c, o, d] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.CUSTOMERS),
          AsyncStorage.getItem(STORAGE_KEYS.ORDERS),
          AsyncStorage.getItem(STORAGE_KEYS.NEXT_DI),
        ]);
        if (c) setCustomers(JSON.parse(c));
        if (o) setOrders(JSON.parse(o));
        if (d) setNextDI(parseInt(d, 10));
      } catch (e) {
        // ignore
      } finally {
        setIsLoaded(true);
      }
    })();
  }, []);

  const saveCustomers = async (list: Customer[]) => {
    await AsyncStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(list));
  };
  const saveOrders = async (list: Order[]) => {
    await AsyncStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(list));
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
    discountType: DiscountType;
    discountValue: number;
    pickupDeadline: string;
    note?: string;
  }): Promise<Order> => {
    const { grossAmount, discountAmount, cgstAmount, sgstAmount, netPayable } =
      computeFinancials(data.items, data.discountType, data.discountValue);

    const order: Order = {
      id: formatDINumber(nextDI),
      diNumber: nextDI,
      customerId: data.customerId,
      items: data.items,
      grossAmount,
      discountType: data.discountType,
      discountValue: data.discountValue,
      discountAmount,
      cgstAmount,
      sgstAmount,
      netPayable,
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
      customers, orders, nextDI, isLoaded,
      addCustomer, updateCustomer, deleteCustomer, findDuplicate, searchCustomers, getCustomer,
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
