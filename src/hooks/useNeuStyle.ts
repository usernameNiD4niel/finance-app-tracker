import { useMemo } from 'react';
import { useTheme } from 'react-native-paper';
import type { AppTheme } from '../theme';

type ShadowFn = (theme: AppTheme) => any[];

export function useNeuStyle(shadowFn: ShadowFn) {
  const theme = useTheme<AppTheme>();
  return useMemo(() => shadowFn(theme), [shadowFn, theme]);
}
