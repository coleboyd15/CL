# CL — Couple's Lifestyle App

Mobile-friendly web app: home, news, movies, games, notes, books, recipes.

**Path:** `Documents\CL` · HTML/CSS/JS · `localStorage` · red / navy / cream  

**Live deploy:** push to GitHub → Vercel auto-updates

## Open

Double-click `index.html`, or:

```powershell
cd $env:USERPROFILE\Documents\CL
npx --yes serve .
```

Use **HTTPS / Vercel / localhost** for best results.

## Features

| Area | Details |
|------|---------|
| **Home** | Dashboard, names, day counter, quick links |
| **News** | Daily ~5 min narrative briefing (science, culture, AI, books, etc.) |
| **Movies** | Watched / wishlist / sort · decimal ratings · **Ask Grok** |
| **Games** | Golf, Darts, Spades, Gin · scores + history (syncs) |
| **8-Ball** | Under More · Magic 8-Ball |
| **Notes** | Shared scratch-paper notes · rich text · Couple Group sync |
| **Recipes** | Meal + drink + custom recipes · **Ask Grok** (syncs) |
| **Books** | Shelves + **Ask Grok** (syncs) |
| **Icons** | `icons/` + `manifest.json` PWA emblem |
| **Profile** | Couple photo/names · **Couple Group sync** · xAI API key |
| **Day counter** | Days since Apr 11, 2026 · Month X, Day Y in header |

## Couple Group (shared sync)

You and your partner share **movies, books, notes, games, recipes, and profile names** in real time via free **Firebase Realtime Database**.

### One-time setup (either of you)

1. Open [Firebase Console](https://console.firebase.google.com/) → **Create project**
2. **Build → Realtime Database → Create** (pick a region)
3. **Rules** tab — for a private couple code (simple):

```json
{
  "rules": {
    "groups": {
      "$code": {
        ".read": true,
        ".write": true
      }
    }
  }
}
```

Treat the group code like a password. Only share it with each other.

4. Project settings (gear) → **Your apps** → Web → copy config  
5. In CL: **Profile → Couple Group → Firebase setup** → paste **apiKey** + **databaseURL** → **Save**

### Create / join

1. Partner A: **Create couple group** → copy the 6-character code  
2. Partner B: same Firebase project config → enter code → **Join couple group**  
3. Edits sync automatically while online  

API keys (xAI) stay on each device and are **not** synced.

Optional: copy `js/firebase-config.example.js` → `js/firebase-config.js` with your keys if you prefer a file over the Profile form.

## Grok

1. Get a key at [console.x.ai](https://console.x.ai/)
2. **Profile → xAI API key** → save  
3. **Profile → Grok model** — default is **grok-4.5** (also grok-4.3, grok-build, legacy options)  
4. Use **Ask Grok** on Movies, Recipes, Books — all use the selected model  

Without a key, smart offline mode still works.

## News

Opens with a stitched daily story (~5 minutes) across movies, culture, science, evolutionary biology, AI, books, opinion, investigations, true crime themes, futurism, and curious studies. Live RSS when available; curated fallbacks otherwise. Refreshes when the calendar day changes (or via **Refresh**).

## Header

Brand shows **CL** plus the day counter (e.g. `45d · M2 D16`).
