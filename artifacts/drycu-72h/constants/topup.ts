export interface TopUpService {
  name: string;
  defaultRate: number;
  icon: string;
}

export const DEFAULT_TOPUP_SERVICES: TopUpService[] = [
  { name: 'Saree Rolling', defaultRate: 120, icon: '🌀' },
  { name: 'Saree Polishing', defaultRate: 150, icon: '✨' },
  { name: 'Starch', defaultRate: 25, icon: '🧴' },
  { name: 'Vacuum Packing', defaultRate: 100, icon: '📦' },
  { name: 'Hanger Packing', defaultRate: 20, icon: '🪝' },
  { name: 'Stain Removal', defaultRate: 0, icon: '🫧' },
  { name: 'Raffu', defaultRate: 0, icon: '🪡' },
  { name: 'Button Stitching', defaultRate: 0, icon: '🧵' },
  { name: 'Minor Repair', defaultRate: 0, icon: '🔧' },
  { name: 'Heavier', defaultRate: 0, icon: '⬆️' },
  { name: 'Medium', defaultRate: 0, icon: '↔️' },
];

export const TOPUP_STORAGE_KEY = 'drycu_topup_rates';
