# CL — Couple's Lifestyle App

Mobile-friendly web app: home, food, movies, games, trips, op-eds, books, recipes.

**Path:** `Documents\CL` · HTML/CSS/JS · `localStorage` · pink + soft green  
**Live deploy:** push to GitHub → Vercel auto-updates

## Open

Double-click `index.html`, or:

```powershell
cd $env:USERPROFILE\Documents\CL
npx --yes serve .
```

Use **HTTPS / Vercel / localhost** so GPS works.

## Features

| Area | Details |
|------|---------|
| **Home** | Dashboard, names, quick links |
| **Food** | Fast GPS, OpenStreetMap nearby places, filters, visits, **Ask Grok** |
| **Movies** | Watched / wishlist / recs + **Ask Grok** |
| **Games** | Golf, Darts, Spades, Gin · scores + history (syncs) |
| **8-Ball** | Under More · Magic 8-Ball |
| **Trips** | NL plan + stay/eat/drink/do + **Ask Grok** (syncs) |
| **Recipes** | Meal + drink + **Ask Grok** (syncs) |
| **Books** | Shelves + **Ask Grok** (syncs) |
| **OpEds** | Live opinion RSS + like/dislike ranking (syncs) |
| **Profile** | Couple photo/names · **Couple Group sync** · xAI API key |

## Couple Group (shared sync)

You and your partner share **movies, books, trips, games, OpEds, recipes, food notes, and profile names** in real time via free **Firebase Realtime Database**.

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
4. Use **Ask Grok** on Food, Movies, Trips, Recipes, Books — all use the selected model  

Without a key, smart offline mode still works.

## Food location

- **Use My Location** uses a fast GPS fix first, then refines in the background  
- Nearby venues from OpenStreetMap (multiple Overpass mirrors, first success wins)  
- Local cache for instant reload; expanded radius if sparse; realistic fallbacks if maps fail  

## Header

Brand shows **CL** only (no subtitle).
