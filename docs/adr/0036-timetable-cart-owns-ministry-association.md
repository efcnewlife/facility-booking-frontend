---
status: accepted
---

# Timetable cart owns Ministry association

The Booking cart, rather than the Timetable Search Bar, owns a proposal's Ministry association. A member changes it through explicit Cart actions and a Ministry chooser; applying the selection immediately preserves the selected rooms but starts fresh availability and server-authoritative price revalidation, which gates Review & Confirm. This prevents an un-applied search control from silently creating a Personal Booking and keeps Ministry classification with the proposal information that is persisted to, and later updates, its Draft.
