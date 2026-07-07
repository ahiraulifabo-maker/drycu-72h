---
name: DRYCU-72H responsive layout
description: Wide-screen (≥768px) sidebar navigation and responsive grid decisions for the Expo app
---

## Rules
- `isWide = width >= 768` — single shared breakpoint via `useLayout()` hook in `hooks/useLayout.ts`. All screens must consume `useLayout()`, not re-implement `useWindowDimensions`.
- `TabLayout` in `app/(tabs)/_layout.tsx` gates NativeTabs behind `!isWide`: on wide screens, always renders `ClassicTabLayout` (which has the sidebar). This is because NativeTabs (iOS 26 Liquid Glass) has no sidebar support.
- Sidebar is a `SidebarNav` (220px) rendered in a `flexDirection: 'row'` wrapper beside the `Tabs` component with `tabBarStyle: { display: 'none' }`.
- FlatLists use `key={isWide ? 'wide' : 'narrow'}` to force re-render when `numColumns` changes.
- Stats grids use `flexWrap: 'wrap'` on narrow and `flexWrap: 'nowrap'` on wide to go 4-across.

**Why:** NativeTabs rendered unconditionally caused wide screens to show bottom tab bar instead of sidebar.
**How to apply:** Any new tab screen must import `useLayout` not `useWindowDimensions`.
