import type { AppTheme } from './index';

type BoxShadow = {
  offsetX: number;
  offsetY: number;
  blurRadius: number;
  spreadDistance: number;
  color: string;
};

const FALLBACK_LIGHT = '#ffffff';
const FALLBACK_DARK = '#b8bcc4';

function dual(
  theme: AppTheme,
  offset: number,
  blur: number,
  spread: number,
): BoxShadow[] {
  const light = theme.custom?.shadowLight ?? FALLBACK_LIGHT;
  const dark = theme.custom?.shadowDark ?? FALLBACK_DARK;
  return [
    {
      offsetX: -offset,
      offsetY: -offset,
      blurRadius: blur,
      spreadDistance: spread,
      color: light,
    },
    {
      offsetX: offset,
      offsetY: offset,
      blurRadius: blur,
      spreadDistance: spread,
      color: dark,
    },
  ];
}

/** Standard card — moderate extrusion */
export const neuCard = (theme: AppTheme): BoxShadow[] =>
  dual(theme, 4, 8, 0);

/** Large card — stronger extrusion */
export const neuCardLg = (theme: AppTheme): BoxShadow[] =>
  dual(theme, 6, 14, 0);

/** List item row — subtle extrusion */
export const neuListItem = (theme: AppTheme): BoxShadow[] =>
  dual(theme, 3, 6, 0);

/** Small chip — light extrusion */
export const neuChip = (theme: AppTheme): BoxShadow[] =>
  dual(theme, 2, 5, 0);

/** Button — medium extrusion */
export const neuButton = (theme: AppTheme): BoxShadow[] =>
  dual(theme, 3, 7, 0);

/** Circle icon — medium extrusion */
export const neuCircle = (theme: AppTheme): BoxShadow[] =>
  dual(theme, 4, 8, 0);

/** Inset / groove — for tracks & empty dots */
export const neuInset = (theme: AppTheme): BoxShadow[] => {
  const light = theme.custom?.shadowLight ?? FALLBACK_LIGHT;
  const dark = theme.custom?.shadowDark ?? FALLBACK_DARK;
  return [
    { offsetX: 2, offsetY: 2, blurRadius: 4, spreadDistance: -1, color: dark },
    { offsetX: -2, offsetY: -2, blurRadius: 4, spreadDistance: -1, color: light },
  ];
};

/** Pressed state — flattened, very subtle */
export const neuPressed = (theme: AppTheme): BoxShadow[] => {
  const light = theme.custom?.shadowLight ?? FALLBACK_LIGHT;
  const dark = theme.custom?.shadowDark ?? FALLBACK_DARK;
  return [
    { offsetX: 1, offsetY: 1, blurRadius: 2, spreadDistance: 0, color: dark },
    { offsetX: -1, offsetY: -1, blurRadius: 2, spreadDistance: 0, color: light },
  ];
};

/** Tab bar — prominent float */
export const neuTabBar = (theme: AppTheme): BoxShadow[] =>
  dual(theme, 6, 16, 0);

/** Hero card (BalanceCard) — strong extrusion */
export const neuHero = (theme: AppTheme): BoxShadow[] =>
  dual(theme, 8, 18, 0);
