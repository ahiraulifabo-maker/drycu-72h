export interface Customer {
  id: string;
  name: string;
  mobile: string;
  address: string;
  secondaryMobile?: string;
  village?: string;
  pinCode?: string;
  email?: string;
  specialNote?: string;
  createdAt: string;
}

export type ServiceType = 'Laundry' | 'Dry Cleaning' | 'Simple Press' | 'Steam Press';
export type ItemCategory = 'Men' | 'Women' | 'Kids' | 'Household' | 'Shoes' | 'Others';
export type OrderStatus = 'Pending' | 'Ready' | 'Delivered';
export type DiscountType = 'none' | 'flat' | 'percentage';

export interface OrderItem {
  id: string;
  category: ItemCategory;
  itemName: string;
  serviceType: ServiceType;
  kg: number;
  qty: number;
  ratePerUnit: number;
  subtotal: number;
}

export interface Order {
  id: string;
  diNumber: number;
  customerId: string;
  items: OrderItem[];
  grossAmount: number;
  discountType: DiscountType;
  discountValue: number;
  discountAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  netPayable: number;
  note?: string;
  createdAt: string;
  pickupDeadline: string;
  status: OrderStatus;
}
