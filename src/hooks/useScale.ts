import { useWindowDimensions } from 'react-native';
/** مقياس تكبير نسبي: يعتمد 390 كعرض تصميم، سقف 1.15، وأرضية 0.8 */
export function useScale(): number {
  const { width } = useWindowDimensions();
  return Math.min(Math.max(width / 390, 0.8), 1.15);
}
export function scaleSize(v: number, s: number): number { return Math.round(v * s); }
