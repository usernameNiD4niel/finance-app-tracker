# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Start dev server (choose platform)
npm start          # interactive menu
npm run android    # Android emulator
npm run ios        # iOS simulator
npm run web        # browser

# Install dependencies
npm install
```

There are no lint or test scripts configured. No test framework is set up.

## Architecture

**Ledgerist** is an **offline-only React Native finance tracker** built with Expo (SDK 54) using the file-based router `expo-router`. All data lives on-device in SQLite.

### Navigation Structure

`expo-router` drives routing with a file-based layout under `src/app/`:

- `src/app/_layout.tsx` — Root layout: initializes DB migrations, seeds categories, loads settings, wraps app in `PaperProvider` and `GestureHandlerRootView`.
- `src/app/(tabs)/` — Five main tabs: `index` (Home/Dashboard), `expenses`, `bills`, `stats`, `settings`.
- `src/app/modals/` — Full-screen modals presented over tabs: `add-expense`, `add-bill`, `salary`, `budget-targets`, `categories`, `export`, `change-pin`, `currency-picker`.
- `src/app/(auth)/` — PIN/auth gate screens.

The tab bar is a custom floating pill-style bar with spring animations (`react-native-reanimated`), defined entirely in `src/app/(tabs)/_layout.tsx`.

### Data Layer

**Database:** `expo-sqlite` + Drizzle ORM, stored at `finance_tracker.db` on the device.

- `src/db/client.ts` — Opens the SQLite connection and creates the Drizzle `db` instance.
- `src/db/schema.ts` — All table definitions: `categories`, `expenses`, `bills`, `salary`, `targets`, `categoryTargets`, `settings`. Also exports TypeScript types inferred from the schema.
- `src/db/migrations.ts` — Runs `CREATE TABLE IF NOT EXISTS` via `execSync` (called once at app start). Also seeds 8 predefined categories on first launch.
- `src/db/queries.ts` — All DB operations (no ORM abstractions beyond Drizzle). Every feature's CRUD lives here.

**Schema notes:**
- `salary.period` is `'first' | 'fifteenth'` — supports two monthly pay periods.
- `bills.frequency` is `'daily' | 'weekly' | 'monthly'`.
- `targets.month` is `YYYY-MM` format.
- `settings` is a key-value table persisting currency, theme, pin hash, onboarding state.

### State Management

Zustand stores in `src/store/` bridge the DB and UI:

| Store | Purpose |
|-------|---------|
| `settingsStore` | Currency, theme, PIN hash, onboarding flag — loaded from DB on startup |
| `expenseStore` | Expenses list + CRUD |
| `billStore` | Bills list + CRUD |
| `salaryStore` | Current salary by period |
| `categoryStore` | Categories list + CRUD |
| `targetStore` | Monthly spend targets |
| `tabStore` | Active tab index (for cross-tab animations) |

### Theming

`src/theme/index.ts` exports `lightTheme` and `darkTheme`, both extending `react-native-paper`'s MD3 themes. Access via `useTheme<AppTheme>()` from `react-native-paper`. The theme includes a `custom` property with app-specific tokens (`cardBg`, `tabBarBg`, `income`, `expense`, `glowPrimary`, etc.).

Theme is user-selectable (`light` / `dark` / `system`) and persisted via `settingsStore`.

### UI Components

- `src/components/` — Feature-specific components (`BalanceCard`, `BillCard`, `ExpenseListItem`, `PINPad`, `BudgetProgressBar`, etc.)
- `src/components/ui/` — Generic primitives: `RoundedCard`, `ScreenContainer`, `TopHeader`, `SectionHeader`, `MutedLabel`, `ValueDisplay`, `ListRowCard`, `ActionButtonRow`, `SegmentedChips`, `CircleIconButton`
- Forms use `react-hook-form` + `zod` for validation.
- Icons use `@expo/vector-icons` (`MaterialCommunityIcons`).

### Path Aliases

`babel-plugin-module-resolver` is configured (see `babel.config.js`). Check that file for available aliases before using relative imports.
