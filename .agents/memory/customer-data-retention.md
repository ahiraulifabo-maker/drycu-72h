---
name: Customer data retention
description: Cross-device sync rules for preserving customers and orders
---

Customer and order records must not disappear because one device uploads an older or incomplete snapshot. Preserve records when devices sync; remove them only after an explicit user deletion represented by a tombstone.

**Why:** The user reported customer data disappearing without their action while using a computer and phone together.

**How to apply:** Review every sync, pull, join, and reset path for stale-snapshot replacement. Keep deletion intentional, explicit, and durable across devices.
