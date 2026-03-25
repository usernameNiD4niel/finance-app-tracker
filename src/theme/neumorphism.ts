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

/** Standard card — subtle elevation */
export const neuCard = (theme: AppTheme): BoxShadow[] =>
  dual(theme, 2, 4, 0);

/** Large card — moderate elevation */
export const neuCardLg = (theme: AppTheme): BoxShadow[] =>
  dual(theme, 3, 7, 0);

/** List item row — very subtle elevation */
export const neuListItem = (theme: AppTheme): BoxShadow[] =>
  dual(theme, 1.5, 3, 0);

/** Small chip — light elevation */
export const neuChip = (theme: AppTheme): BoxShadow[] =>
  dual(theme, 1, 3, 0);

/** Button — light elevation */
export const neuButton = (theme: AppTheme): BoxShadow[] =>
  dual(theme, 1.5, 4, 0);

/** Circle icon — subtle elevation */
export const neuCircle = (theme: AppTheme): BoxShadow[] =>
  dual(theme, 2, 4, 0);

/** Inset / groove — for tracks & empty dots */
export const neuInset = (theme: AppTheme): BoxShadow[] => {
  const light = theme.custom?.shadowLight ?? FALLBACK_LIGHT;
  const dark = theme.custom?.shadowDark ?? FALLBACK_DARK;
  return [
    { offsetX: 1, offsetY: 1, blurRadius: 2, spreadDistance: -1, color: dark },
    { offsetX: -1, offsetY: -1, blurRadius: 2, spreadDistance: -1, color: light },
  ];
};

/** Pressed state — flattened, very subtle */
export const neuPressed = (theme: AppTheme): BoxShadow[] => {
  const light = theme.custom?.shadowLight ?? FALLBACK_LIGHT;
  const dark = theme.custom?.shadowDark ?? FALLBACK_DARK;
  return [
    { offsetX: 0.5, offsetY: 0.5, blurRadius: 1, spreadDistance: 0, color: dark },
    { offsetX: -0.5, offsetY: -0.5, blurRadius: 1, spreadDistance: 0, color: light },
  ];
};

/** Tab bar — moderate float */
export const neuTabBar = (theme: AppTheme): BoxShadow[] =>
  dual(theme, 3, 8, 0);

/** Hero card (BalanceCard) — moderate elevation */
export const neuHero = (theme: AppTheme): BoxShadow[] =>
  dual(theme, 4, 9, 0);
