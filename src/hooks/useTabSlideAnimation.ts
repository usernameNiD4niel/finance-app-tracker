import { ViewStyle } from 'react-native';

/**
 * Kept for API compatibility. Returns a plain flex:1 style — no animation.
 * All transition animations were removed to prevent white flashes in dark mode
 * and to match the instant, natural feel of native tab apps.
 */
export function useTabSlideAnimation(): ViewStyle {
  return { flex: 1 };
}
