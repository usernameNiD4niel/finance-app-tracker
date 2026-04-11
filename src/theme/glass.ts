import type { AppTheme } from './index';

type ShadowSize = 'sm' | 'md' | 'lg';

const SHADOWS: Record<ShadowSize, { offsetY: number; blur: number; opacity: number }> = {
  sm: { offsetY: 4,  blur: 16, opacity: 0.18 },
  md: { offsetY: 8,  blur: 28, opacity: 0.24 },
  lg: { offsetY: 14, blur: 48, opacity: 0.36 },
};

/**
 * Soft single drop-shadow for glass cards.
 * Returns a boxShadow-compatible array (React Native ≥ 0.76 / Expo SDK 54).
 */
export function glassShadow(_theme: AppTheme, size: ShadowSize = 'md') {
  const { offsetY, blur, opacity } = SHADOWS[size];
  return [
    {
      offsetX: 0,
      offsetY,
      blurRadius: blur,
      spreadDistance: 0,
      color: `rgba(0,0,0,${opacity})`,
    },
  ];
}
