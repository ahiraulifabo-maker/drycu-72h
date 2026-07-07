import { useWindowDimensions } from 'react-native';

export interface LayoutInfo {
  /** true when width ≥ 768px (tablet landscape / desktop) */
  isWide: boolean;
  width: number;
  height: number;
}

export function useLayout(): LayoutInfo {
  const { width, height } = useWindowDimensions();
  return { isWide: width >= 768, width, height };
}
