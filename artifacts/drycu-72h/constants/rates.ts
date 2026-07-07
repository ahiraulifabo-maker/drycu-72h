import { ItemCategory, ServiceType } from '@/types';

export interface GarmentRate {
  Laundry: number;
  'Dry Cleaning': number;
  'Simple Press': number;
  'Steam Press': number;
  laundryPerKg: boolean;
}

export const GARMENTS: Record<ItemCategory, string[]> = {
  Men: [
    'Shirt',
    'T-Shirt',
    'Track Pant / Lower',
    'Pajama',
    'Kurta',
    'Dhoti',
    'Suit (2-Piece)',
    'Suit (3-Piece)',
    'Jeans',
    'Trouser',
    'Half Pant / Shorts',
    'Sherwani',
    'Jacket',
    'Coat / Blazer',
    'Waist Coat',
    'Safari Suit',
    'Track Suit (Set)',
    'Sweater',
    'Sweat Shirt',
    'Hoodie',
    'Baniyan / Vest',
    'Underwear',
    'Socks (Pair)',
    'Tie',
    'Handkerchief',
    'Muffler / Scarf',
    'Cap / Hat',
  ],
  Women: [
    'Saree',
    'Salwar Suit (Set)',
    'Lehenga (Set)',
    'Kurti',
    'Top / Blouse',
    'Gown',
    'Dupatta',
    'Blouse',
    'Petticoat / Lining',
    'Salwar / Churidar',
    'Palazzo',
    'Sharara',
    'Skirt',
    'Maxi / Long Dress',
    'Mini / Short Dress',
    'Night Suit (Set)',
    'Stole',
    'Shawl',
    'Cardigan',
    'Sweater',
    'Jacket',
    'Socks (Pair)',
    'Scarf',
    'Inner Wear',
    'Half Saree (Set)',
    'Anarkali Suit',
    'Jumpsuit',
  ],
  Kids: [
    'Kids Shirt',
    'Kids T-Shirt',
    'Kids Lower / Track Pant',
    'Kids Jeans',
    'Kids Kurta',
    'Kids Pajama',
    'Kids Frock',
    'Kids Salwar Suit',
    'School Uniform (Shirt)',
    'School Uniform (Pant)',
    'Kids Track Suit (Set)',
    'Kids Jacket',
    'Kids Sweater',
    'Kids Shorts',
    'Kids Baniyan / Vest',
    'Kids Underwear',
    'Kids Socks (Pair)',
    'Baby Clothes',
    'Kids Cap',
    'Kids Tie',
  ],
  Household: [
    'Blanket (Single)',
    'Blanket (Double)',
    'Bed Sheet (Single)',
    'Bed Sheet (Double)',
    'Pillow Cover',
    'Bedspread / Bed Cover',
    'Sofa Cover (Per Piece)',
    'Curtain (Small)',
    'Curtain (Large)',
    'Table Cover / Cloth',
    'Carpet / Dhurrie',
    'Bath Towel',
    'Hand Towel',
    'Face Towel',
    'Bath Mat',
    'Door Mat',
    'Quilt / Razai (Single)',
    'Quilt / Razai (Double)',
    'Cushion Cover',
    'Duvet Cover',
    'Car Seat Cover',
    'Curtain Lining',
  ],
  Shoes: [
    'Sports Shoes',
    'Formal Shoes',
    'Casual Shoes',
    'Sandals',
    'Loafers',
    'Boots (Ankle)',
    'Boots (Long)',
    'Sneakers',
    'Heels / Pumps',
    'School Shoes',
    'Canvas Shoes',
    'Kolhapuri / Traditional',
    'Flip Flops / Slippers',
    'Moccasins',
  ],
  Others: [
    'Bag (Small)',
    'Bag (Large)',
    'Purse / Handbag',
    'Backpack',
    'Helmet',
    'Soft Toy (Small)',
    'Soft Toy (Large)',
    'Gloves (Pair)',
    'Cap / Hat',
    'Belt',
    'Umbrella',
    'Fancy Dress Costume',
    'Gym Bag / Duffel',
    'Wallet',
    'Stuffed Animal',
  ],
};

export const RATE_CHART: Record<string, GarmentRate> = {
  // ── Men ──────────────────────────────────────────────────────────────
  'Shirt':                    { Laundry: 60, 'Dry Cleaning': 120, 'Simple Press': 20, 'Steam Press': 30, laundryPerKg: true },
  'T-Shirt':                  { Laundry: 60, 'Dry Cleaning': 100, 'Simple Press': 15, 'Steam Press': 25, laundryPerKg: true },
  'Track Pant / Lower':       { Laundry: 60, 'Dry Cleaning': 80,  'Simple Press': 15, 'Steam Press': 20, laundryPerKg: true },
  'Pajama':                   { Laundry: 60, 'Dry Cleaning': 80,  'Simple Press': 15, 'Steam Press': 20, laundryPerKg: true },
  'Kurta':                    { Laundry: 60, 'Dry Cleaning': 120, 'Simple Press': 25, 'Steam Press': 35, laundryPerKg: true },
  'Dhoti':                    { Laundry: 60, 'Dry Cleaning': 100, 'Simple Press': 20, 'Steam Press': 30, laundryPerKg: true },
  'Suit (2-Piece)':           { Laundry: 60, 'Dry Cleaning': 220, 'Simple Press': 55, 'Steam Press': 80, laundryPerKg: true },
  'Suit (3-Piece)':           { Laundry: 60, 'Dry Cleaning': 300, 'Simple Press': 70, 'Steam Press': 100, laundryPerKg: true },
  'Jeans':                    { Laundry: 60, 'Dry Cleaning': 150, 'Simple Press': 30, 'Steam Press': 40, laundryPerKg: true },
  'Trouser':                  { Laundry: 60, 'Dry Cleaning': 100, 'Simple Press': 20, 'Steam Press': 30, laundryPerKg: true },
  'Half Pant / Shorts':       { Laundry: 60, 'Dry Cleaning': 80,  'Simple Press': 15, 'Steam Press': 20, laundryPerKg: true },
  'Sherwani':                 { Laundry: 60, 'Dry Cleaning': 350, 'Simple Press': 100, 'Steam Press': 150, laundryPerKg: true },
  'Jacket':                   { Laundry: 60, 'Dry Cleaning': 200, 'Simple Press': 50, 'Steam Press': 70, laundryPerKg: true },
  'Coat / Blazer':            { Laundry: 60, 'Dry Cleaning': 250, 'Simple Press': 60, 'Steam Press': 90, laundryPerKg: true },
  'Waist Coat':               { Laundry: 60, 'Dry Cleaning': 120, 'Simple Press': 30, 'Steam Press': 45, laundryPerKg: true },
  'Safari Suit':              { Laundry: 60, 'Dry Cleaning': 200, 'Simple Press': 50, 'Steam Press': 70, laundryPerKg: true },
  'Track Suit (Set)':         { Laundry: 60, 'Dry Cleaning': 150, 'Simple Press': 35, 'Steam Press': 50, laundryPerKg: true },
  'Sweater':                  { Laundry: 60, 'Dry Cleaning': 150, 'Simple Press': 30, 'Steam Press': 45, laundryPerKg: true },
  'Sweat Shirt':              { Laundry: 60, 'Dry Cleaning': 130, 'Simple Press': 25, 'Steam Press': 40, laundryPerKg: true },
  'Hoodie':                   { Laundry: 60, 'Dry Cleaning': 150, 'Simple Press': 30, 'Steam Press': 45, laundryPerKg: true },
  'Baniyan / Vest':           { Laundry: 60, 'Dry Cleaning': 60,  'Simple Press': 10, 'Steam Press': 15, laundryPerKg: true },
  'Underwear':                { Laundry: 60, 'Dry Cleaning': 50,  'Simple Press': 10, 'Steam Press': 15, laundryPerKg: true },
  'Socks (Pair)':             { Laundry: 60, 'Dry Cleaning': 40,  'Simple Press': 10, 'Steam Press': 10, laundryPerKg: true },
  'Tie':                      { Laundry: 60, 'Dry Cleaning': 80,  'Simple Press': 20, 'Steam Press': 30, laundryPerKg: true },
  'Handkerchief':             { Laundry: 60, 'Dry Cleaning': 30,  'Simple Press': 8,  'Steam Press': 10, laundryPerKg: true },
  'Muffler / Scarf':          { Laundry: 60, 'Dry Cleaning': 80,  'Simple Press': 20, 'Steam Press': 25, laundryPerKg: true },
  'Cap / Hat':                { Laundry: 60, 'Dry Cleaning': 80,  'Simple Press': 15, 'Steam Press': 20, laundryPerKg: true },

  // ── Women ────────────────────────────────────────────────────────────
  'Saree':                    { Laundry: 60, 'Dry Cleaning': 220, 'Simple Press': 55, 'Steam Press': 75, laundryPerKg: true },
  'Salwar Suit (Set)':        { Laundry: 60, 'Dry Cleaning': 200, 'Simple Press': 55, 'Steam Press': 70, laundryPerKg: true },
  'Lehenga (Set)':            { Laundry: 60, 'Dry Cleaning': 400, 'Simple Press': 120, 'Steam Press': 180, laundryPerKg: true },
  'Kurti':                    { Laundry: 60, 'Dry Cleaning': 100, 'Simple Press': 20, 'Steam Press': 30, laundryPerKg: true },
  'Top / Blouse':             { Laundry: 60, 'Dry Cleaning': 80,  'Simple Press': 15, 'Steam Press': 25, laundryPerKg: true },
  'Gown':                     { Laundry: 60, 'Dry Cleaning': 320, 'Simple Press': 90, 'Steam Press': 120, laundryPerKg: true },
  'Dupatta':                  { Laundry: 60, 'Dry Cleaning': 80,  'Simple Press': 20, 'Steam Press': 30, laundryPerKg: true },
  'Blouse':                   { Laundry: 60, 'Dry Cleaning': 80,  'Simple Press': 18, 'Steam Press': 25, laundryPerKg: true },
  'Petticoat / Lining':       { Laundry: 60, 'Dry Cleaning': 70,  'Simple Press': 15, 'Steam Press': 20, laundryPerKg: true },
  'Salwar / Churidar':        { Laundry: 60, 'Dry Cleaning': 80,  'Simple Press': 15, 'Steam Press': 20, laundryPerKg: true },
  'Palazzo':                  { Laundry: 60, 'Dry Cleaning': 90,  'Simple Press': 20, 'Steam Press': 30, laundryPerKg: true },
  'Sharara':                  { Laundry: 60, 'Dry Cleaning': 150, 'Simple Press': 40, 'Steam Press': 60, laundryPerKg: true },
  'Skirt':                    { Laundry: 60, 'Dry Cleaning': 100, 'Simple Press': 20, 'Steam Press': 30, laundryPerKg: true },
  'Maxi / Long Dress':        { Laundry: 60, 'Dry Cleaning': 180, 'Simple Press': 45, 'Steam Press': 65, laundryPerKg: true },
  'Mini / Short Dress':       { Laundry: 60, 'Dry Cleaning': 130, 'Simple Press': 30, 'Steam Press': 45, laundryPerKg: true },
  'Night Suit (Set)':         { Laundry: 60, 'Dry Cleaning': 120, 'Simple Press': 25, 'Steam Press': 35, laundryPerKg: true },
  'Stole':                    { Laundry: 60, 'Dry Cleaning': 80,  'Simple Press': 20, 'Steam Press': 25, laundryPerKg: true },
  'Shawl':                    { Laundry: 60, 'Dry Cleaning': 150, 'Simple Press': 35, 'Steam Press': 50, laundryPerKg: true },
  'Cardigan':                 { Laundry: 60, 'Dry Cleaning': 150, 'Simple Press': 30, 'Steam Press': 45, laundryPerKg: true },
  // Note: 'Sweater' and 'Jacket' share rates across Men/Women — defined once under Men above
  'Scarf':                    { Laundry: 60, 'Dry Cleaning': 70,  'Simple Press': 15, 'Steam Press': 20, laundryPerKg: true },
  'Inner Wear':               { Laundry: 60, 'Dry Cleaning': 50,  'Simple Press': 10, 'Steam Press': 15, laundryPerKg: true },
  'Half Saree (Set)':         { Laundry: 60, 'Dry Cleaning': 280, 'Simple Press': 70, 'Steam Press': 100, laundryPerKg: true },
  'Anarkali Suit':            { Laundry: 60, 'Dry Cleaning': 250, 'Simple Press': 65, 'Steam Press': 90, laundryPerKg: true },
  'Jumpsuit':                 { Laundry: 60, 'Dry Cleaning': 160, 'Simple Press': 40, 'Steam Press': 55, laundryPerKg: true },

  // ── Kids ─────────────────────────────────────────────────────────────
  'Kids Shirt':               { Laundry: 60, 'Dry Cleaning': 70,  'Simple Press': 12, 'Steam Press': 18, laundryPerKg: true },
  'Kids T-Shirt':             { Laundry: 60, 'Dry Cleaning': 60,  'Simple Press': 10, 'Steam Press': 15, laundryPerKg: true },
  'Kids Lower / Track Pant':  { Laundry: 60, 'Dry Cleaning': 60,  'Simple Press': 10, 'Steam Press': 15, laundryPerKg: true },
  'Kids Jeans':               { Laundry: 60, 'Dry Cleaning': 100, 'Simple Press': 20, 'Steam Press': 30, laundryPerKg: true },
  'Kids Kurta':               { Laundry: 60, 'Dry Cleaning': 80,  'Simple Press': 15, 'Steam Press': 20, laundryPerKg: true },
  'Kids Pajama':              { Laundry: 60, 'Dry Cleaning': 60,  'Simple Press': 10, 'Steam Press': 15, laundryPerKg: true },
  'Kids Frock':               { Laundry: 60, 'Dry Cleaning': 80,  'Simple Press': 15, 'Steam Press': 20, laundryPerKg: true },
  'Kids Salwar Suit':         { Laundry: 60, 'Dry Cleaning': 100, 'Simple Press': 20, 'Steam Press': 30, laundryPerKg: true },
  'School Uniform (Shirt)':   { Laundry: 60, 'Dry Cleaning': 80,  'Simple Press': 15, 'Steam Press': 20, laundryPerKg: true },
  'School Uniform (Pant)':    { Laundry: 60, 'Dry Cleaning': 70,  'Simple Press': 12, 'Steam Press': 18, laundryPerKg: true },
  'Kids Track Suit (Set)':    { Laundry: 60, 'Dry Cleaning': 120, 'Simple Press': 25, 'Steam Press': 35, laundryPerKg: true },
  'Kids Jacket':              { Laundry: 60, 'Dry Cleaning': 150, 'Simple Press': 35, 'Steam Press': 50, laundryPerKg: true },
  'Kids Sweater':             { Laundry: 60, 'Dry Cleaning': 100, 'Simple Press': 20, 'Steam Press': 30, laundryPerKg: true },
  'Kids Shorts':              { Laundry: 60, 'Dry Cleaning': 60,  'Simple Press': 10, 'Steam Press': 15, laundryPerKg: true },
  'Kids Baniyan / Vest':      { Laundry: 60, 'Dry Cleaning': 40,  'Simple Press': 8,  'Steam Press': 12, laundryPerKg: true },
  'Kids Underwear':           { Laundry: 60, 'Dry Cleaning': 40,  'Simple Press': 8,  'Steam Press': 12, laundryPerKg: true },
  'Kids Socks (Pair)':        { Laundry: 60, 'Dry Cleaning': 30,  'Simple Press': 8,  'Steam Press': 10, laundryPerKg: true },
  'Baby Clothes':             { Laundry: 60, 'Dry Cleaning': 50,  'Simple Press': 10, 'Steam Press': 15, laundryPerKg: true },
  'Kids Cap':                 { Laundry: 60, 'Dry Cleaning': 50,  'Simple Press': 10, 'Steam Press': 15, laundryPerKg: true },
  'Kids Tie':                 { Laundry: 60, 'Dry Cleaning': 50,  'Simple Press': 10, 'Steam Press': 15, laundryPerKg: true },

  // ── Household ─────────────────────────────────────────────────────────
  'Blanket (Single)':         { Laundry: 80, 'Dry Cleaning': 200, 'Simple Press': 60, 'Steam Press': 80, laundryPerKg: true },
  'Blanket (Double)':         { Laundry: 80, 'Dry Cleaning': 300, 'Simple Press': 80, 'Steam Press': 120, laundryPerKg: true },
  'Bed Sheet (Single)':       { Laundry: 60, 'Dry Cleaning': 120, 'Simple Press': 35, 'Steam Press': 50, laundryPerKg: true },
  'Bed Sheet (Double)':       { Laundry: 60, 'Dry Cleaning': 160, 'Simple Press': 45, 'Steam Press': 65, laundryPerKg: true },
  'Pillow Cover':             { Laundry: 60, 'Dry Cleaning': 60,  'Simple Press': 15, 'Steam Press': 20, laundryPerKg: true },
  'Bedspread / Bed Cover':    { Laundry: 60, 'Dry Cleaning': 200, 'Simple Press': 55, 'Steam Press': 80, laundryPerKg: true },
  'Sofa Cover (Per Piece)':   { Laundry: 60, 'Dry Cleaning': 180, 'Simple Press': 50, 'Steam Press': 70, laundryPerKg: true },
  'Curtain (Small)':          { Laundry: 60, 'Dry Cleaning': 150, 'Simple Press': 40, 'Steam Press': 60, laundryPerKg: true },
  'Curtain (Large)':          { Laundry: 60, 'Dry Cleaning': 250, 'Simple Press': 60, 'Steam Press': 90, laundryPerKg: true },
  'Table Cover / Cloth':      { Laundry: 60, 'Dry Cleaning': 100, 'Simple Press': 25, 'Steam Press': 40, laundryPerKg: true },
  'Carpet / Dhurrie':         { Laundry: 80, 'Dry Cleaning': 350, 'Simple Press': 80, 'Steam Press': 120, laundryPerKg: true },
  'Bath Towel':               { Laundry: 60, 'Dry Cleaning': 80,  'Simple Press': 20, 'Steam Press': 30, laundryPerKg: true },
  'Hand Towel':               { Laundry: 60, 'Dry Cleaning': 50,  'Simple Press': 12, 'Steam Press': 18, laundryPerKg: true },
  'Face Towel':               { Laundry: 60, 'Dry Cleaning': 40,  'Simple Press': 10, 'Steam Press': 15, laundryPerKg: true },
  'Bath Mat':                 { Laundry: 80, 'Dry Cleaning': 120, 'Simple Press': 30, 'Steam Press': 45, laundryPerKg: true },
  'Door Mat':                 { Laundry: 80, 'Dry Cleaning': 120, 'Simple Press': 25, 'Steam Press': 40, laundryPerKg: true },
  'Quilt / Razai (Single)':   { Laundry: 80, 'Dry Cleaning': 300, 'Simple Press': 80, 'Steam Press': 120, laundryPerKg: true },
  'Quilt / Razai (Double)':   { Laundry: 80, 'Dry Cleaning': 450, 'Simple Press': 110, 'Steam Press': 160, laundryPerKg: true },
  'Cushion Cover':            { Laundry: 60, 'Dry Cleaning': 60,  'Simple Press': 15, 'Steam Press': 20, laundryPerKg: true },
  'Duvet Cover':              { Laundry: 60, 'Dry Cleaning': 200, 'Simple Press': 55, 'Steam Press': 80, laundryPerKg: true },
  'Car Seat Cover':           { Laundry: 60, 'Dry Cleaning': 200, 'Simple Press': 40, 'Steam Press': 60, laundryPerKg: true },
  'Curtain Lining':           { Laundry: 60, 'Dry Cleaning': 150, 'Simple Press': 35, 'Steam Press': 55, laundryPerKg: true },

  // ── Shoes ─────────────────────────────────────────────────────────────
  'Sports Shoes':             { Laundry: 0, 'Dry Cleaning': 150, 'Simple Press': 0, 'Steam Press': 0, laundryPerKg: false },
  'Formal Shoes':             { Laundry: 0, 'Dry Cleaning': 200, 'Simple Press': 0, 'Steam Press': 0, laundryPerKg: false },
  'Casual Shoes':             { Laundry: 0, 'Dry Cleaning': 150, 'Simple Press': 0, 'Steam Press': 0, laundryPerKg: false },
  'Sandals':                  { Laundry: 0, 'Dry Cleaning': 100, 'Simple Press': 0, 'Steam Press': 0, laundryPerKg: false },
  'Loafers':                  { Laundry: 0, 'Dry Cleaning': 150, 'Simple Press': 0, 'Steam Press': 0, laundryPerKg: false },
  'Boots (Ankle)':            { Laundry: 0, 'Dry Cleaning': 200, 'Simple Press': 0, 'Steam Press': 0, laundryPerKg: false },
  'Boots (Long)':             { Laundry: 0, 'Dry Cleaning': 300, 'Simple Press': 0, 'Steam Press': 0, laundryPerKg: false },
  'Sneakers':                 { Laundry: 0, 'Dry Cleaning': 180, 'Simple Press': 0, 'Steam Press': 0, laundryPerKg: false },
  'Heels / Pumps':            { Laundry: 0, 'Dry Cleaning': 200, 'Simple Press': 0, 'Steam Press': 0, laundryPerKg: false },
  'School Shoes':             { Laundry: 0, 'Dry Cleaning': 130, 'Simple Press': 0, 'Steam Press': 0, laundryPerKg: false },
  'Canvas Shoes':             { Laundry: 0, 'Dry Cleaning': 120, 'Simple Press': 0, 'Steam Press': 0, laundryPerKg: false },
  'Kolhapuri / Traditional':  { Laundry: 0, 'Dry Cleaning': 150, 'Simple Press': 0, 'Steam Press': 0, laundryPerKg: false },
  'Flip Flops / Slippers':    { Laundry: 0, 'Dry Cleaning': 80,  'Simple Press': 0, 'Steam Press': 0, laundryPerKg: false },
  'Moccasins':                { Laundry: 0, 'Dry Cleaning': 180, 'Simple Press': 0, 'Steam Press': 0, laundryPerKg: false },

  // ── Others ────────────────────────────────────────────────────────────
  'Bag (Small)':              { Laundry: 0, 'Dry Cleaning': 120, 'Simple Press': 0, 'Steam Press': 0, laundryPerKg: false },
  'Bag (Large)':              { Laundry: 0, 'Dry Cleaning': 200, 'Simple Press': 0, 'Steam Press': 0, laundryPerKg: false },
  'Purse / Handbag':          { Laundry: 0, 'Dry Cleaning': 180, 'Simple Press': 0, 'Steam Press': 0, laundryPerKg: false },
  'Backpack':                 { Laundry: 0, 'Dry Cleaning': 200, 'Simple Press': 0, 'Steam Press': 0, laundryPerKg: false },
  'Helmet':                   { Laundry: 0, 'Dry Cleaning': 150, 'Simple Press': 0, 'Steam Press': 0, laundryPerKg: false },
  'Soft Toy (Small)':         { Laundry: 0, 'Dry Cleaning': 100, 'Simple Press': 0, 'Steam Press': 0, laundryPerKg: false },
  'Soft Toy (Large)':         { Laundry: 0, 'Dry Cleaning': 200, 'Simple Press': 0, 'Steam Press': 0, laundryPerKg: false },
  'Gloves (Pair)':            { Laundry: 0, 'Dry Cleaning': 80,  'Simple Press': 0, 'Steam Press': 20, laundryPerKg: false },
  'Belt':                     { Laundry: 0, 'Dry Cleaning': 80,  'Simple Press': 0, 'Steam Press': 0, laundryPerKg: false },
  'Umbrella':                 { Laundry: 0, 'Dry Cleaning': 100, 'Simple Press': 0, 'Steam Press': 0, laundryPerKg: false },
  'Fancy Dress Costume':      { Laundry: 60, 'Dry Cleaning': 200, 'Simple Press': 50, 'Steam Press': 70, laundryPerKg: true },
  'Gym Bag / Duffel':         { Laundry: 0, 'Dry Cleaning': 180, 'Simple Press': 0, 'Steam Press': 0, laundryPerKg: false },
  'Wallet':                   { Laundry: 0, 'Dry Cleaning': 80,  'Simple Press': 0, 'Steam Press': 0, laundryPerKg: false },
  'Stuffed Animal':           { Laundry: 0, 'Dry Cleaning': 150, 'Simple Press': 0, 'Steam Press': 0, laundryPerKg: false },
};

export function computeItemSubtotal(itemName: string, serviceType: ServiceType, kg: number, qty: number): number {
  const rate = RATE_CHART[itemName];
  if (!rate) return 0;
  if (serviceType === 'Laundry') {
    return rate.Laundry * (kg > 0 ? kg : qty);
  }
  return rate[serviceType] * (qty > 0 ? qty : 1);
}

export function computeItemSubtotalWithOverrides(
  itemName: string, serviceType: ServiceType, kg: number, qty: number,
  overrides: Record<string, Partial<GarmentRate>>
): number {
  const base = RATE_CHART[itemName];
  if (!base) return 0;
  const effectiveRate = overrides[itemName]?.[serviceType] ?? base[serviceType];
  if (serviceType === 'Laundry') return (effectiveRate as number) * (kg > 0 ? kg : qty);
  return (effectiveRate as number) * (qty > 0 ? qty : 1);
}

export function getRateLabel(itemName: string, serviceType: ServiceType): string {
  const rate = RATE_CHART[itemName];
  if (!rate) return '₹0';
  if (serviceType === 'Laundry') return `₹${rate.Laundry}/kg`;
  return `₹${rate[serviceType]}/pc`;
}

export function getRateLabelWithOverrides(
  itemName: string, serviceType: ServiceType,
  overrides: Record<string, Partial<GarmentRate>>
): string {
  const base = RATE_CHART[itemName];
  if (!base) return '₹0';
  const r = overrides[itemName]?.[serviceType] ?? base[serviceType];
  if (serviceType === 'Laundry') return `₹${r}/kg`;
  return `₹${r}/pc`;
}

export const SERVICE_TYPES: ServiceType[] = ['Laundry', 'Dry Cleaning', 'Simple Press', 'Steam Press'];
export const CATEGORIES: ItemCategory[] = ['Men', 'Women', 'Kids', 'Household', 'Shoes', 'Others'];
