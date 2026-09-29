# CL — Couple's Lifestyle App

Mobile-friendly web app: home, movies, games, notes, books, Carrier Pigeon.

**Path:** `Documents\CL` · HTML/CSS/JS · `localStorage` · red / navy / cream  

## Features

| Area | Details |
|------|---------|
| **Home** | Dashboard, names, day counter, quick links |
| **Movies** | Watched / ranked wishlist (drag to reorder) · decimal ratings |
| **Games** | Golf, Darts, Spades, Gin · +/− scores · history with manual delete (syncs) |
| **Notes** | Shared rich-text notes (syncs) |
| **Carrier Pigeon** | Shared farm, named pigeons, Dequanteous, parchment letters, transit (syncs) |
| **Books** | Shelves · current-read plan (pages/chapters/weeks) · dual sliders + pace marker (syncs) |
| **Profile** | Couple Group Firebase sync |
| **Day counter** | Days since Apr 11, 2026 · `Xd · MY DZ` (month number increases only on the 11th) |

## Couple Group

Syncs: movies, books, notes, games, Carrier Pigeon, profile names via Firebase Realtime Database.

## Day counter

From **April 11, 2026**. The month number increases only on the 11th of each month:

- April 11 = `M0 D0`
- August 11 = `M4 D0`
- September 11 = `M5 D0`

Between 11ths: months completed + days since the last 11th (e.g. August 31 → `M4 D20`).
