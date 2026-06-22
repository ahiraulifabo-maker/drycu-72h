import { ItemCategory, ServiceType } from '@/types';

export interface GarmentRate {
  Laundry: number;
  'Dry Cleaning': number;
  'Simple Press': number;
  'Steam Press': number;
  laundryPerKg: boolean;
}

export const GARMENTS: Record<ItemCategory, string[]> = {
  Men: ['Shirt', 'T-Shirt', 'Lower', 'Pajama', 'Kurta', 'Suit', 'Jeans', 'Sherwani'],
  Women: ['Saree', 'Suit', 'Lehenga', 'Kurti', 'Top', 'Gown', 'Dupatta'],
  Kids: ['Kids Frock', 'Kids Suit', 'Kids Shirts', 'Uniforms'],
  Household: ['Blanket (Single)', 'Blanket (Double)', 'Bed Sheet', 'Curtain', 'Mat', 'Pillow Cover'],
};

export const RATE_CHART: Record<string, GarmentRate> = {
  Shirt:             { Laundry: 60, 'Dry Cleaning': 120, 'Simple Press': 20, 'Steam Press': 30, laundryPerKg: true },
  'T-Shirt':         { Laundry: 60, 'Dry Cleaning': 100, 'Simple Press': 15, 'Steam Press': 25, laundryPerKg: true },
  Lower:             { Laundry: 60, 'Dry Cleaning': 80,  'Simple Press': 15, 'Steam Press': 20, laundryPerKg: true },
  Pajama:            { Laundry: 60, 'Dry Cleaning': 80,  'Simple Press': 15, 'Steam Press': 20, laundryPerKg: true },
  Kurta:             { Laundry: 60, 'Dry Cleaning': 120, 'Simple Press': 25, 'Steam Press': 35, laundryPerKg: true },
  Suit:              { Laundry: 60, 'Dry Cleaning': 200, 'Simple Press': 50, 'Steam Press': 70, laundryPerKg: true },
  Jeans:             { Laundry: 60, 'Dry Cleaning': 150, 'Simple Press': 30, 'Steam Press': 40, laundryPerKg: true },
  Sherwani:          { Laundry: 60, 'Dry Cleaning': 300, 'Simple Press': 80, 'Steam Press': 120, laundryPerKg: true },
  Saree:             { Laundry: 60, 'Dry Cleaning': 200, 'Simple Press': 50, 'Steam Press': 70, laundryPerKg: true },
  Lehenga:           { Laundry: 60, 'Dry Cleaning': 350, 'Simple Press': 100, 'Steam Press': 150, laundryPerKg: true },
  Kurti:             { Laundry: 60, 'Dry Cleaning': 100, 'Simple Press': 20, 'Steam Press': 30, laundryPerKg: true },
  Top:               { Laundry: 60, 'Dry Cleaning': 80,  'Simple Press': 15, 'Steam Press': 25, laundryPerKg: true },
  Gown:              { Laundry: 60, 'Dry Cleaning': 300, 'Simple Press': 80, 'Steam Press': 100, laundryPerKg: true },
  Dupatta:           { Laundry: 60, 'Dry Cleaning': 80,  'Simple Press': 20, 'Steam Press': 30, laundryPerKg: true },
  'Kids Frock':      { Laundry: 60, 'Dry Cleaning': 80,  'Simple Press': 15, 'Steam Press': 20, laundryPerKg: true },
  'Kids Suit':       { Laundry: 60, 'Dry Cleaning': 100, 'Simple Press': 20, 'Steam Press': 30, laundryPerKg: true },
  'Kids Shirts':     { Laundry: 60, 'Dry Cleaning': 70,  'Simple Press': 12, 'Steam Press': 18, laundryPerKg: true },
  Uniforms:          { Laundry: 60, 'Dry Cleaning': 100, 'Simple Press': 20, 'Steam Press': 30, laundryPerKg: true },
  'Blanket (Single)':{ Laundry: 80, 'Dry Cleaning': 200, 'Simple Press': 60, 'Steam Press': 80, laundryPerKg: true },
  'Blanket (Double)':{ Laundry: 80, 'Dry Cleaning': 300, 'Simple Press': 80, 'Steam Press': 120, laundryPerKg: true },
  'Bed Sheet':       { Laundry: 60, 'Dry Cleaning': 150, 'Simple Press': 40, 'Steam Press': 60, laundryPerKg: true },
  Curtain:           { Laundry: 60, 'Dry Cleaning': 180, 'Simple Press': 50, 'Steam Press': 70, laundryPerKg: true },
  Mat:               { Laundry: 80, 'Dry Cleaning': 150, 'Simple Press': 30, 'Steam Press': 50, laundryPerKg: true },
  'Pillow Cover':    { Laundry: 60, 'Dry Cleaning': 60,  'Simple Press': 15, 'Steam Press': 20, laundryPerKg: true },
};

export function computeItemSubtotal(itemName: string, serviceType: ServiceType, kg: number, qty: number): number {
  const rate = RATE_CHART[itemName];
  if (!rate) return 0;
  if (serviceType === 'Laundry') {
    return rate.Laundry * (kg > 0 ? kg : qty);
  }
  return rate[serviceType] * (qty > 0 ? qty : 1);
}

export function getRateLabel(itemName: string, serviceType: ServiceType): string {
  const rate = RATE_CHART[itemName];
  if (!rate) return '₹0';
  if (serviceType === 'Laundry') return `₹${rate.Laundry}/kg`;
  return `₹${rate[serviceType]}/pc`;
}

export const SERVICE_TYPES: ServiceType[] = ['Laundry', 'Dry Cleaning', 'Simple Press', 'Steam Press'];
export const CATEGORIES: ItemCategory[] = ['Men', 'Women', 'Kids', 'Household'];
