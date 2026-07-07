---
name: DRYCU-72H pickup mode
description: Home Pickup vs Store Visit toggle on orders
---

## Implementation
- `PickupMode = 'home' | 'store'` in `types/index.ts`; `Order.pickupMode?: PickupMode` (optional for backward compat)
- `AppContext.addOrder` accepts `pickupMode?`; defaults to `'store'` in the created Order object
- Toggle lives in the **Discount section** of `app/order/new.tsx` — user requested "in the last screen where I give discount"
- Rendered as an icon+text badge in the Pickup Deadline section of `app/order/[id].tsx`
- Legacy orders without `pickupMode` safely degrade to "Store Visit" via `order.pickupMode === 'home'` check

**Why:** Shop needs to track whether garments were collected from customer's home (home pickup) or dropped off in store.
