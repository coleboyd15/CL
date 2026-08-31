/* Carrier Pigeon — shared farm, animals, transit, mailboxes (sync key: pigeon) */
(function (global) {
  const STORAGE = "pigeon";
  const WHO_KEY = "pigeonWho";
  const NOTIFIED_KEY = "pigeonNotified";
  const DEFAULT_HOP_MILES = 8;
  const MIN_TRANSIT_MS = 12 * 1000;

  const DEFAULT_ANIMALS = [
    {
      id: "p1",
      type: "pigeon",
      name: "Swift",
      speed: 54,
      delivery: 62,
      stamina: 58,
      hue: "slate",
      blurb: "Fastest bird. Does not always arrive."
    },
    {
      id: "p2",
      type: "pigeon",
      name: "Wisp",
      speed: 50,
      delivery: 74,
      stamina: 70,
      hue: "white",
      blurb: "A bright flyer with a decent record."
    },
    {
      id: "p3",
      type: "pigeon",
      name: "Pip",
      speed: 45,
      delivery: 81,
      stamina: 80,
      hue: "brown",
      blurb: "Steady middle of the flock."
    },
    {
      id: "p4",
      type: "pigeon",
      name: "Mabel",
      speed: 40,
      delivery: 90,
      stamina: 88,
      hue: "green",
      blurb: "Takes her time. Rarely loses a letter."
    },
    {
      id: "p5",
      type: "pigeon",
      name: "Anchor",
      speed: 36,
      delivery: 100,
      stamina: 96,
      hue: "gray",
      blurb: "Slowest pigeon. Never fails."
    },
    {
      id: "deq",
      type: "rat",
      name: "Dequanteous",
      speed: 8,
      delivery: 100,
      stamina: 100,
      hue: "rat",
      nameLocked: true,
      blurb: "Blonde curls. Does not fly. Does not quit."
    }
  ];

  const LOST_REASONS = [
    "A hawk took interest and the letter did not make it.",
    "Dropped somewhere over a field. Gone for good.",
    "The bird got confused and came home empty-beaked.",
    "Weather turned. The letter never arrived.",
    "Lost to the wind. Dequanteous would not have dropped this."
  ];

  function defaultsById() {
    const o = {};
    DEFAULT_ANIMALS.forEach((a) => {
      o[a.id] = a;
    });
    return o;
  }

  function emptyState() {
    const animals = {};
    DEFAULT_ANIMALS.forEach((a) => {
      animals[a.id] = {
        id: a.id,
        name: a.name,
        nameUpdatedAt: 0
      };
    });
    return { animals, letters: {}, locks: {} };
  }

  function normalizeState(raw) {
    const base = emptyState();
    if (!raw || typeof raw !== "object") return base;
    const animals = base.animals;
    const srcA = raw.animals;
    if (srcA) {
      const list = Array.isArray(srcA) ? srcA : Object.values(srcA);
      list.forEach((a) => {
        if (!a || !a.id || !animals[a.id]) return;
        animals[a.id] = {
          id: a.id,
          name: String(a.name || animals[a.id].name || "").slice(0, 28) || animals[a.id].name,
          nameUpdatedAt: Number(a.nameUpdatedAt) || 0
        };
      });
    }
    const letters = {};
    const srcL = raw.letters;
    const listL = Array.isArray(srcL) ? srcL : Object.values(srcL || {});
    listL.forEach((l) => {
      if (l && l.id) letters[l.id] = l;
    });
    const locks = {};
    Object.keys(raw.locks || {}).forEach((id) => {
      const lock = raw.locks[id];
      if (lock && lock.until) locks[id] = lock;
    });
    return { animals, letters, locks };
  }

  function getState() {
    return normalizeState(CL.storage.get(STORAGE, null));
  }

  function setState(s) {
    CL.storage.set(STORAGE, s);
    return s;
  }

  function defOf(id) {
    return DEFAULT_ANIMALS.find((a) => a.id === id) || DEFAULT_ANIMALS[0];
  }

  function animalView(state, id) {
    const def = defOf(id);
    const saved = (state.animals && state.animals[id]) || {};
    const lock = (state.locks && state.locks[id]) || null;
    const now = Date.now();
    const locked = !!(lock && lock.until > now);
    return {
      id: def.id,
      type: def.type,
      name: def.nameLocked ? def.name : saved.name || def.name,
      nameLocked: !!def.nameLocked,
      speed: def.speed,
      delivery: def.delivery,
      stamina: def.stamina,
      hue: def.hue,
      blurb: def.blurb,
      locked,
      lock: locked ? lock : null
    };
  }

  function allAnimals(state) {
    return DEFAULT_ANIMALS.map((a) => animalView(state, a.id));
  }

  function getWho() {
    const stored = CL.storage.get(WHO_KEY, "");
    const names = coupleNames();
    if (stored && names.indexOf(stored) !== -1) return stored;
    return "";
  }

  function setWho(name) {
    CL.storage.set(WHO_KEY, name, { skipSync: true });
  }

  function coupleNames() {
    const p = CL.profile.get();
    const a = (p.myName || "").trim();
    const b = (p.partnerName || "").trim();
    const out = [];
    if (a) out.push(a);
    if (b && b !== a) out.push(b);
    if (!out.length) return ["You", "Partner"];
    if (out.length === 1) out.push(out[0] === "You" ? "Partner" : "Partner");
    return out;
  }

  function otherName(who) {
    const names = coupleNames();
    const me = who || getWho();
    if (me && names[0] === me) return names[1];
    if (me && names[1] === me) return names[0];
    return names[1] || "Partner";
  }

  function lettersList(state) {
    return Object.values(state.letters || {});
  }

  function isForMe(letter, who) {
    who = who || getWho();
    if (!who || !letter) return false;
    return String(letter.toName || "").trim().toLowerCase() === String(who).trim().toLowerCase();
  }

  function isFromMe(letter, who) {
    who = who || getWho();
    if (!who || !letter) return false;
    return String(letter.fromName || "").trim().toLowerCase() === String(who).trim().toLowerCase();
  }

  function unreadCount(state, who) {
    state = state || getState();
    who = who || getWho();
    if (!who) return 0;
    return lettersList(state).filter(
      (l) => l.status === "delivered" && isForMe(l, who) && !l.read && !l.archived
    ).length;
  }

  function mergeLetter(a, b) {
    const rank = { lost: 2, delivered: 2, transit: 1 };
    const newer = (b.updatedAt || b.sentAt || 0) >= (a.updatedAt || a.sentAt || 0) ? b : a;
    const older = newer === b ? a : b;
    const status =
      (rank[b.status] || 0) >= (rank[a.status] || 0) ? b.status : a.status;
    return Object.assign({}, older, newer, {
      status,
      read: !!(a.read || b.read),
      archived: !!(a.archived || b.archived),
      readAt: a.readAt || b.readAt || null,
      archivedAt: a.archivedAt || b.archivedAt || null,
      willDeliver: a.willDeliver != null ? a.willDeliver : b.willDeliver,
      lostReason: a.lostReason || b.lostReason || ""
    });
  }

  function merge(local, remote) {
    const L = normalizeState(local);
    const R = normalizeState(remote);
    const animals = emptyState().animals;
    DEFAULT_ANIMALS.forEach((def) => {
      const a = L.animals[def.id] || animals[def.id];
      const b = R.animals[def.id] || animals[def.id];
      const pick = (b.nameUpdatedAt || 0) >= (a.nameUpdatedAt || 0) ? b : a;
      animals[def.id] = {
        id: def.id,
        name: def.nameLocked ? def.name : pick.name || def.name,
        nameUpdatedAt: pick.nameUpdatedAt || 0
      };
    });
    const letters = {};
    lettersList(L).concat(lettersList(R)).forEach((letter) => {
      if (!letter || !letter.id) return;
      letters[letter.id] = letters[letter.id] ? mergeLetter(letters[letter.id], letter) : letter;
    });
    const now = Date.now();
    const locks = {};
    DEFAULT_ANIMALS.forEach((def) => {
      const cands = [L.locks[def.id], R.locks[def.id]].filter((x) => x && x.until > now);
      if (cands.length) {
        cands.sort((a, b) => (b.until || 0) - (a.until || 0));
        locks[def.id] = cands[0];
      }
    });
    return { animals, letters, locks };
  }

  function shouldRepush(remote, merged) {
    const R = normalizeState(remote);
    const idsR = Object.keys(R.letters || {});
    const idsM = Object.keys((merged && merged.letters) || {});
    if (idsM.some((id) => idsR.indexOf(id) === -1)) return true;
    return DEFAULT_ANIMALS.some((d) => {
      const a = (merged.animals && merged.animals[d.id]) || {};
      const b = R.animals[d.id] || {};
      return (a.nameUpdatedAt || 0) > (b.nameUpdatedAt || 0);
    });
  }

  function getNotified() {
    const raw = CL.storage.get(NOTIFIED_KEY, []);
    return Array.isArray(raw) ? raw : [];
  }

  function markNotified(id) {
    const ids = getNotified();
    if (ids.indexOf(id) !== -1) return;
    ids.push(id);
    CL.storage.set(NOTIFIED_KEY, ids.slice(-80), { skipSync: true });
  }

  function canNotify() {
    return typeof Notification !== "undefined" && Notification.permission === "granted";
  }

  function sendNotification(title, body) {
    try {
      if (!canNotify()) return;
      const n = new Notification(title, {
        body: body || "",
        tag: "cl-pigeon",
        icon: "icons/icon-192.png",
        silent: false
      });
      n.onclick = () => {
        try {
          window.focus();
          location.hash = "#pigeon";
          n.close();
        } catch (_) {}
      };
    } catch (_) {}
  }

  function handleResolved(letter) {
    if (!letter || getNotified().indexOf(letter.id) !== -1) return;
    markNotified(letter.id);
    const who = getWho();
    const animal = letter.animalName || "A courier";
    if (letter.status === "delivered") {
      if (!who || isForMe(letter, who)) {
        CL.toast(animal + " delivered a letter" + (letter.fromName ? " from " + letter.fromName : ""));
        sendNotification(
          "Letter arrived",
          (letter.fromName ? letter.fromName + " sent you a letter via " : "New letter via ") + animal
        );
      } else if (isFromMe(letter, who)) {
        CL.toast("Your letter arrived to " + (letter.toName || "them"));
      }
    } else if (letter.status === "lost") {
      if (!who || isFromMe(letter, who)) {
        CL.toast((letter.animalName || "The pigeon") + " lost the letter");
        sendNotification("Letter lost", (letter.lostReason || "The letter did not arrive.") + "");
      }
    }
    updateBadges();
  }

  function resolveArrivals() {
    const state = getState();
    const now = Date.now();
    let changed = false;
    const resolved = [];
    lettersList(state).forEach((letter) => {
      if (letter.status === "transit" && now >= (letter.arrivesAt || 0)) {
        letter.status = letter.willDeliver ? "delivered" : "lost";
        letter.resolvedAt = now;
        letter.updatedAt = now;
        if (letter.status === "lost" && !letter.lostReason) {
          letter.lostReason = LOST_REASONS[Math.floor(Math.random() * LOST_REASONS.length)];
        }
        resolved.push(letter);
        changed = true;
      }
    });
    Object.keys(state.locks || {}).forEach((id) => {
      const lock = state.locks[id];
      const letter = lock && lock.letterId ? state.letters[lock.letterId] : null;
      if (!lock || lock.until <= now || !letter || letter.status !== "transit") {
        delete state.locks[id];
        changed = true;
      }
    });
    if (changed) setState(state);
    resolved.forEach(handleResolved);
    return resolved;
  }

  function updateBadges() {
    const n = unreadCount();
    const headerBtn = document.getElementById("header-mail");
    const headerBadge = document.getElementById("header-mail-badge");
    const navBadge = document.getElementById("nav-pigeon-badge");
    if (headerBadge) {
      headerBadge.textContent = n > 9 ? "9+" : String(n);
      headerBadge.hidden = n < 1;
    }
    if (headerBtn) {
      headerBtn.classList.toggle("has-mail", n > 0);
      headerBtn.setAttribute("aria-label", n ? "Carrier Pigeon · " + n + " new" : "Carrier Pigeon");
    }
    if (navBadge) {
      navBadge.textContent = n > 9 ? "9+" : String(n);
      navBadge.hidden = n < 1;
    }
  }

  let bgTimer = 0;
  function startBackground() {
    if (bgTimer) return;
    resolveArrivals();
    updateBadges();
    bgTimer = setInterval(() => {
      const resolved = resolveArrivals();
      updateBadges();
      try {
        window.dispatchEvent(new CustomEvent("cl-pigeon-tick", { detail: { resolved } }));
      } catch (_) {}
    }, 1000);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        resolveArrivals();
        updateBadges();
      }
    });
  }

  function haversineMiles(a, b) {
    const R = 3958.7613;
    const toRad = (d) => (d * Math.PI) / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLon = toRad(b.lon - a.lon);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const h =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
  }

  async function geocode(query) {
    const q = String(query || "").trim();
    if (!q) return null;
    try {
      const url =
        "https://geocoding-api.open-meteo.com/v1/search?name=" +
        encodeURIComponent(q) +
        "&count=3&language=en&format=json";
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const r = (data.results || [])[0];
        if (r && r.latitude != null) {
          return {
            lat: r.latitude,
            lon: r.longitude,
            label: [r.name, r.admin1, r.country].filter(Boolean).join(", ")
          };
        }
      }
    } catch (_) {}
    try {
      const url = "https://photon.komoot.io/api/?q=" + encodeURIComponent(q) + "&limit=1";
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const f = (data.features || [])[0];
        if (f && f.geometry && f.geometry.coordinates) {
          const lon = f.geometry.coordinates[0];
          const lat = f.geometry.coordinates[1];
          const p = f.properties || {};
          return {
            lat,
            lon,
            label: [p.name, p.city || p.county, p.state, p.country].filter(Boolean).join(", ")
          };
        }
      }
    } catch (_) {}
    return null;
  }

  function etaMs(miles, animal) {
    const speed = Math.max(1, Number(animal.speed) || 40);
    const stamina = Math.max(1, Number(animal.stamina) || 80);
    const range = Math.max(50, stamina * 12);
    const rest = miles > range ? 1 + (miles - range) / (range * 2.2) : 1;
    const hours = (Math.max(miles, 0.25) / speed) * rest;
    return Math.max(hours * 3600 * 1000, MIN_TRANSIT_MS);
  }

  function formatDuration(ms) {
    if (ms <= 0) return "arriving";
    const s = Math.round(ms / 1000);
    if (s < 60) return s + "s";
    const m = Math.floor(s / 60);
    if (m < 60) {
      const rs = s % 60;
      return rs ? m + "m " + rs + "s" : m + "m";
    }
    const h = Math.floor(m / 60);
    const rm = m % 60;
    if (h < 24) return rm ? h + "h " + rm + "m" : h + "h";
    const d = Math.floor(h / 24);
    const rh = h % 24;
    return rh ? d + "d " + rh + "h" : d + "d";
  }

  function formatWhen(ts) {
    if (!ts) return "";
    const d = new Date(ts);
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });
  }

  function formatMiles(n) {
    if (n == null || Number.isNaN(n)) return "";
    if (n < 10) return (Math.round(n * 10) / 10).toString();
    return String(Math.round(n));
  }

  /* ---------- SVGs ---------- */
  function pigeonSvg(hue) {
    const palettes = {
      slate: { body: "#6b7c93", wing: "#4d5d73", head: "#5c6d84", chest: "#d9dde4", neck: "#3d6b8a" },
      white: { body: "#e8e4dc", wing: "#cfc9bc", head: "#f2efe8", chest: "#fff", neck: "#8eb8c9" },
      brown: { body: "#8a5a3c", wing: "#6e442c", head: "#7a4e34", chest: "#d4b08a", neck: "#6a8f4e" },
      green: { body: "#6d7178", wing: "#545860", head: "#5e646c", chest: "#cfd3c8", neck: "#3f8f6b" },
      gray: { body: "#8a8f96", wing: "#6f747c", head: "#7a8088", chest: "#d8dbe0", neck: "#5b6f88" }
    };
    const p = palettes[hue] || palettes.gray;
    return `
      <svg class="critter-svg pigeon-svg" viewBox="0 0 72 52" aria-hidden="true">
        <ellipse cx="22" cy="32" rx="7" ry="4" fill="${p.wing}"/>
        <ellipse cx="34" cy="30" rx="16" ry="11" fill="${p.body}"/>
        <ellipse cx="32" cy="28" rx="11" ry="7" fill="${p.chest}"/>
        <ellipse class="wing" cx="30" cy="27" rx="10" ry="6" fill="${p.wing}"/>
        <path d="M18 30 Q10 24 8 32 Q14 34 20 33Z" fill="${p.body}"/>
        <circle cx="50" cy="22" r="9" fill="${p.head}"/>
        <path d="M48 26 Q52 30 46 32" fill="${p.neck}" opacity="0.85"/>
        <path d="M58 21 L70 23.5 L58 26Z" fill="#e0a020"/>
        <circle cx="53" cy="20" r="1.7" fill="#1a1a1a"/>
        <circle cx="53.5" cy="19.5" r="0.5" fill="#fff"/>
        <g class="leg back"><path d="M30 40 L28 50 L24 50" fill="none" stroke="#c47a3a" stroke-width="1.8" stroke-linecap="round"/></g>
        <g class="leg front"><path d="M40 40 L42 50 L46 50" fill="none" stroke="#c47a3a" stroke-width="1.8" stroke-linecap="round"/></g>
      </svg>`;
  }

  function ratSvg() {
    return `
      <svg class="critter-svg rat-svg" viewBox="0 0 84 56" aria-hidden="true">
        <path d="M16 34 Q2 18 14 8" fill="none" stroke="#8a5a3c" stroke-width="3.2" stroke-linecap="round"/>
        <ellipse cx="36" cy="34" rx="18" ry="12" fill="#8b5a3c"/>
        <ellipse cx="36" cy="38" rx="12" ry="7" fill="#a56b48"/>
        <circle cx="56" cy="28" r="11" fill="#9a6344"/>
        <ellipse cx="52" cy="16" rx="4.2" ry="5.4" fill="#e8a090"/>
        <ellipse cx="62" cy="16" rx="4.2" ry="5.4" fill="#e8a090"/>
        <ellipse cx="52" cy="16.6" rx="2.2" ry="3" fill="#f4c4b8"/>
        <ellipse cx="62" cy="16.6" rx="2.2" ry="3" fill="#f4c4b8"/>
        <ellipse cx="66" cy="32" rx="7" ry="4.4" fill="#c4896a"/>
        <circle cx="72" cy="32" r="1.5" fill="#d45a68"/>
        <circle cx="58" cy="26" r="1.7" fill="#1a1a1a"/>
        <circle cx="58.6" cy="25.5" r="0.5" fill="#fff"/>
        <g class="hair">
          <ellipse cx="54" cy="12" rx="5" ry="4.2" fill="#f4d35e"/>
          <ellipse cx="60" cy="10" rx="5.4" ry="4.6" fill="#f7e38a"/>
          <ellipse cx="57" cy="7" rx="4.2" ry="3.6" fill="#e8c84a"/>
          <ellipse cx="50" cy="10" rx="4" ry="3.4" fill="#f0d56a"/>
          <ellipse cx="63" cy="12" rx="3.6" ry="3.2" fill="#d4a017"/>
          <ellipse cx="56" cy="5" rx="3.2" ry="2.8" fill="#fff3b0"/>
          <path d="M49 12 q-4 -6 -1 -9" fill="none" stroke="#f4d35e" stroke-width="2.2" stroke-linecap="round"/>
          <path d="M64 11 q5 -6 2 -9" fill="none" stroke="#e8c84a" stroke-width="2.2" stroke-linecap="round"/>
          <path d="M56 4 q1 -6 5 -6" fill="none" stroke="#f7e38a" stroke-width="2" stroke-linecap="round"/>
        </g>
        <g class="leg back"><path d="M28 44 L26 54 L22 54" fill="none" stroke="#6e3d28" stroke-width="2" stroke-linecap="round"/></g>
        <g class="leg front"><path d="M46 44 L48 54 L52 54" fill="none" stroke="#6e3d28" stroke-width="2" stroke-linecap="round"/></g>
      </svg>`;
  }

  function barnSvg() {
    return `
      <svg class="farm-barn" viewBox="0 0 90 70" aria-hidden="true">
        <polygon points="6,30 45,6 84,30" fill="#8a1f2c"/>
        <polygon points="14,30 45,12 76,30" fill="#b22234"/>
        <rect x="14" y="30" width="62" height="34" fill="#c43b48"/>
        <rect x="16" y="32" width="58" height="4" fill="#9c2432"/>
        <rect x="38" y="42" width="14" height="22" fill="#5a3318"/>
        <rect x="22" y="38" width="10" height="10" fill="#cfe6f4"/>
        <rect x="58" y="38" width="10" height="10" fill="#cfe6f4"/>
        <polygon points="40,8 50,8 50,18 45,22 40,18" fill="#faf8f5"/>
      </svg>`;
  }

  function chestSvg() {
    return `
      <svg class="farm-chest" viewBox="0 0 72 56" aria-hidden="true">
        <rect x="8" y="22" width="56" height="28" rx="4" fill="#8b5a2b"/>
        <rect x="8" y="14" width="56" height="16" rx="6" fill="#a56b34"/>
        <rect x="8" y="26" width="56" height="6" fill="#6e431c"/>
        <rect x="32" y="28" width="8" height="10" rx="2" fill="#c9a227"/>
        <circle cx="36" cy="36" r="2.2" fill="#7a5a10"/>
        <rect x="12" y="18" width="48" height="4" fill="#d4a017" opacity="0.7"/>
      </svg>`;
  }

  function critterHtml(animal, i) {
    const svg = animal.type === "rat" ? ratSvg() : pigeonSvg(animal.hue);
    const away = animal.locked ? " is-away" : "";
    const label = CL.escapeHtml(animal.name);
    return `
      <button type="button" class="farm-critter critter-${animal.id} critter-${animal.type}${away}" data-animal="${animal.id}" style="--i:${i}" title="${label}">
        <span class="critter-sprite">${svg}</span>
        <span class="critter-name">${label}</span>
      </button>`;
  }

  function flyerHtml(animal, letter) {
    const svg = animal.type === "rat" ? ratSvg() : pigeonSvg(animal.hue);
    return `
      <div class="farm-flyer flyer-${animal.type} flyer-${animal.id}" title="${CL.escapeHtml(animal.name)} in transit">
        ${svg}
        <span class="flyer-note">✉</span>
      </div>`;
  }

  const composeDraft = {
    body: "",
    fromPlace: "",
    toPlace: "",
    animalId: "",
    miles: null,
    fromGeo: null,
    toGeo: null,
    geoNote: ""
  };
  const session = { view: "farm", openId: "", mailTab: "new" };

  function resetCompose() {
    composeDraft.body = "";
    composeDraft.fromPlace = "";
    composeDraft.toPlace = "";
    composeDraft.animalId = "";
    composeDraft.miles = null;
    composeDraft.fromGeo = null;
    composeDraft.toGeo = null;
    composeDraft.geoNote = "";
  }

  /* ---------- Render ---------- */
  function render(root) {
    const compose = composeDraft;
    let geoTimer = 0;
    function getView() {
      return session.view;
    }
    function setView(v) {
      session.view = v;
    }

    function paint() {
      resolveArrivals();
      updateBadges();
      const state = getState();
      const view = getView();
      if (view === "compose") paintCompose(state);
      else if (view === "mailbox") paintMailbox(state);
      else if (view === "letter") paintLetter(state);
      else paintFarm(state);
    }

    function paintFarm(state) {
      const animals = allAnimals(state);
      const who = getWho();
      const names = coupleNames();
      const unread = unreadCount(state, who);
      const inFlight = lettersList(state)
        .filter((l) => l.status === "transit")
        .sort((a, b) => a.arrivesAt - b.arrivesAt);
      const flyers = inFlight
        .map((l) => {
          const a = animals.find((x) => x.id === l.animalId);
          return a ? flyerHtml(a, l) : "";
        })
        .join("");
      const lostRecent = lettersList(state)
        .filter((l) => l.status === "lost" && Date.now() - (l.resolvedAt || 0) < 36e5 * 12)
        .sort((a, b) => (b.resolvedAt || 0) - (a.resolvedAt || 0))
        .slice(0, 3);

      root.innerHTML = `
        <section class="page pigeon-page">
          <div class="row-between" style="align-items:flex-end;margin-bottom:8px">
            <div>
              <h1 class="page-title" style="margin:0">Carrier Pigeon</h1>
              <p class="page-sub" style="margin:4px 0 0">The CL coop</p>
            </div>
            ${whoPickerHtml(who, names)}
          </div>

          <div class="farm-scene" aria-label="Farm with pigeons and Dequanteous">
            <div class="farm-sky">
              <div class="farm-sun"></div>
              <div class="farm-cloud c1"></div>
              <div class="farm-cloud c2"></div>
              ${flyers}
            </div>
            <div class="farm-hills"></div>
            <div class="farm-ground">
              <div class="farm-barn-wrap">${barnSvg()}</div>
              <button type="button" class="farm-chest-btn" id="open-chest" aria-label="Open mailbox">
                ${chestSvg()}
                <span class="chest-label">Mail</span>
                ${unread ? `<span class="chest-badge">${unread > 9 ? "9+" : unread}</span>` : ""}
              </button>
              <div class="farm-fence"></div>
              ${animals.map((a, i) => critterHtml(a, i)).join("")}
            </div>
            ${
              inFlight.some((l) => l.animalId === "deq")
                ? `<div class="farm-road" aria-hidden="true"><span>Dequanteous is on the road</span></div>`
                : ""
            }
          </div>

          <div class="pigeon-actions">
            <button type="button" class="btn btn-primary btn-block" id="write-letter">Write a letter</button>
          </div>
          <p class="filter-hint" style="margin-top:8px">Tap a pigeon to name it · tap the chest for mail</p>

          ${
            inFlight.length
              ? `<div class="section-block" style="margin-top:16px">
                  <div class="section-label">In flight</div>
                  <div class="stack-sm">${inFlight.map(flightCard).join("")}</div>
                </div>`
              : ""
          }

          ${
            lostRecent.length
              ? `<div class="section-block">
                  <div class="section-label">Lost in transit</div>
                  <div class="stack-sm">${lostRecent.map(lostCard).join("")}</div>
                </div>`
              : ""
          }

          ${notifBannerHtml()}
        </section>
      `;
      bindFarm(state);
    }

    function whoPickerHtml(who, names) {
      return `
        <div class="who-picker" role="group" aria-label="Who is using this device">
          ${names
            .map(
              (n) =>
                `<button type="button" class="chip ${who === n ? "active" : ""}" data-who="${CL.escapeHtml(
                  n
                )}">${CL.escapeHtml(n)}</button>`
            )
            .join("")}
        </div>`;
    }

    function notifBannerHtml() {
      if (typeof Notification === "undefined") return "";
      if (Notification.permission === "granted" || Notification.permission === "denied") return "";
      return `
        <div class="card" style="margin-top:14px">
          <div class="card-title">Arrival alerts</div>
          <p class="card-meta">iPhone PWAs often block push. We’ll always badge the mailbox — this adds a device alert when a letter lands, if the OS allows it.</p>
          <button type="button" class="btn btn-secondary btn-sm" id="enable-notifs">Enable alerts</button>
        </div>`;
    }

    function flightCard(letter) {
      const left = formatDuration((letter.arrivesAt || 0) - Date.now());
      const miles = letter.distanceMiles != null ? formatMiles(letter.distanceMiles) + " mi · " : "";
      return `
        <article class="card flight-card">
          <div class="card-title">${CL.escapeHtml(letter.animalName || "Courier")} · in transit</div>
          <p class="card-meta">${CL.escapeHtml(letter.fromName || "")} → ${CL.escapeHtml(
            letter.toName || ""
          )}</p>
          <p class="card-meta" style="margin:0">${miles}<span data-eta="${letter.arrivesAt}">${left}</span> remaining</p>
        </article>`;
    }

    function lostCard(letter) {
      return `
        <article class="card">
          <div class="card-title">${CL.escapeHtml(letter.animalName || "Courier")} lost a letter</div>
          <p class="card-meta">${CL.escapeHtml(letter.fromName || "")} → ${CL.escapeHtml(
            letter.toName || ""
          )} · ${CL.escapeHtml(formatWhen(letter.resolvedAt))}</p>
          <p class="card-meta" style="margin:0">${CL.escapeHtml(letter.lostReason || "The letter did not arrive.")}</p>
        </article>`;
    }

    function bindFarm(state) {
      root.querySelectorAll("[data-who]").forEach((btn) => {
        btn.addEventListener("click", () => {
          setWho(btn.dataset.who);
          paint();
        });
      });
      root.querySelector("#open-chest")?.addEventListener("click", () => {
        if (!getWho()) {
          CL.toast("Pick who you are first (top right)");
          return;
        }
        setView("mailbox");
        session.mailTab = "new";
        paint();
      });
      root.querySelector("#write-letter")?.addEventListener("click", () => {
        if (!getWho()) {
          CL.toast("Pick who you are first (top right)");
          return;
        }
        setView("compose");
        paint();
      });
      root.querySelector("#enable-notifs")?.addEventListener("click", async () => {
        try {
          await Notification.requestPermission();
        } catch (_) {}
        paint();
      });
      root.querySelectorAll("[data-animal]").forEach((btn) => {
        btn.addEventListener("click", () => {
          openAnimalSheet(state, btn.dataset.animal);
        });
      });
    }

    function openAnimalSheet(state, id) {
      const a = animalView(state, id);
      const lockLine = a.locked
        ? `In transit · ${formatDuration(a.lock.until - Date.now())} left`
        : "Idle on the farm";
      CL.modal.open({
        title: a.name,
        subtitle: a.type === "rat" ? "Rat · 8 mph courier" : "Homing pigeon",
        bodyHtml: `
          <div class="animal-sheet">
            <div class="animal-sheet-art">${a.type === "rat" ? ratSvg() : pigeonSvg(a.hue)}</div>
            <p class="card-meta">${CL.escapeHtml(a.blurb)}</p>
            <div class="stat-grid">
              <div class="stat-pill"><span>Speed</span><strong>${a.speed} mph</strong></div>
              <div class="stat-pill"><span>Delivery</span><strong>${a.delivery}%</strong></div>
              <div class="stat-pill"><span>Stamina</span><strong>${a.stamina}</strong></div>
            </div>
            <p class="filter-hint">${CL.escapeHtml(lockLine)}</p>
            ${
              a.nameLocked
                ? `<p class="card-meta">He is named Dequanteous. That is not negotiable.</p>`
                : `<div class="field" style="margin-top:10px">
                     <label for="rename-animal">Name (shared)</label>
                     <input id="rename-animal" maxlength="28" value="${CL.escapeHtml(a.name)}" />
                   </div>
                   <button type="button" class="btn btn-primary btn-block" id="save-animal-name">Save name</button>`
            }
          </div>`,
        onMount: (body) => {
          body.querySelector("#save-animal-name")?.addEventListener("click", () => {
            const next = (body.querySelector("#rename-animal")?.value || "").trim().slice(0, 28);
            if (!next) {
              CL.toast("Enter a name");
              return;
            }
            const st = getState();
            st.animals[id] = {
              id,
              name: next,
              nameUpdatedAt: Date.now()
            };
            setState(st);
            CL.toast("Named " + next);
            CL.modal.close();
            paint();
          });
        }
      });
    }

    function paintCompose(state) {
      const who = getWho();
      const other = otherName(who);
      const animals = allAnimals(state);
      const miles = compose.miles;
      root.innerHTML = `
        <section class="page pigeon-page">
          <button type="button" class="btn btn-ghost btn-sm" id="back-farm">← Farm</button>
          <h1 class="page-title">Write a letter</h1>
          <p class="page-sub">${CL.escapeHtml(who || "You")} → ${CL.escapeHtml(other)}</p>

          <div class="scroll-stage compose-scroll">
            <div class="scroll-roll top" aria-hidden="true"></div>
            <div class="parchment">
              <label class="sr-only" for="letter-body">Letter</label>
              <textarea id="letter-body" class="parchment-input" maxlength="4000" placeholder="Write on the scroll…">${CL.escapeHtml(
                compose.body
              )}</textarea>
            </div>
            <div class="scroll-roll bottom" aria-hidden="true"></div>
          </div>

          <div class="form-stack" style="margin-top:14px">
            <div class="field">
              <label for="from-place">Where I am <span class="opt">(optional)</span></label>
              <input id="from-place" value="${CL.escapeHtml(compose.fromPlace)}" placeholder="City, state, or place" />
            </div>
            <div class="field">
              <label for="to-place">Where ${CL.escapeHtml(other)} is <span class="opt">(optional)</span></label>
              <input id="to-place" value="${CL.escapeHtml(compose.toPlace)}" placeholder="City, state, or place" />
            </div>
            <p class="card-meta" id="geo-status">${geoStatusText(miles)}</p>
          </div>

          <div class="section-label" style="margin-top:8px">Choose a courier</div>
          <div class="courier-grid">
            ${animals.map((a) => courierCard(a, miles)).join("")}
          </div>
          <button type="button" class="btn btn-primary btn-block" id="send-letter" style="margin-top:14px">Send</button>
        </section>
      `;
      bindCompose(state);
    }

    function geoStatusText(miles) {
      if (compose.geoNote) return CL.escapeHtml(compose.geoNote);
      if (miles != null) {
        return "About " + formatMiles(miles) + " miles. Time depends on who you send.";
      }
      return "Leave places blank for a short hop across town (~" + DEFAULT_HOP_MILES + " mi).";
    }

    function courierCard(a, miles) {
      const eta = formatDuration(etaMs(miles != null ? miles : DEFAULT_HOP_MILES, a));
      const selected = compose.animalId === a.id ? " selected" : "";
      const locked = a.locked ? " locked" : "";
      const lockTxt = a.locked ? `In transit · ${formatDuration(a.lock.until - Date.now())}` : eta + " ETA";
      return `
        <button type="button" class="courier-card${selected}${locked}" data-pick="${a.id}" ${
          a.locked ? "disabled" : ""
        }>
          <div class="courier-art">${a.type === "rat" ? ratSvg() : pigeonSvg(a.hue)}</div>
          <strong>${CL.escapeHtml(a.name)}</strong>
          <span class="courier-stats">${a.speed} mph · ${a.delivery}% delivery · stam ${a.stamina}</span>
          <span class="courier-eta">${CL.escapeHtml(lockTxt)}</span>
        </button>`;
    }

    function bindCompose(state) {
      root.querySelector("#back-farm")?.addEventListener("click", () => {
        setView("farm");
        paint();
      });
      const bodyEl = root.querySelector("#letter-body");
      bodyEl?.addEventListener("input", () => {
        compose.body = bodyEl.value;
      });
      const fromEl = root.querySelector("#from-place");
      const toEl = root.querySelector("#to-place");
      const onPlace = () => {
        compose.fromPlace = fromEl.value;
        compose.toPlace = toEl.value;
        scheduleGeo();
      };
      fromEl?.addEventListener("input", onPlace);
      toEl?.addEventListener("input", onPlace);
      root.querySelectorAll("[data-pick]").forEach((btn) => {
        btn.addEventListener("click", () => {
          compose.animalId = btn.dataset.pick;
          const body = bodyEl ? bodyEl.value : compose.body;
          compose.body = body;
          paint();
        });
      });
      root.querySelector("#send-letter")?.addEventListener("click", () => sendLetter(state));
    }

    function scheduleGeo() {
      clearTimeout(geoTimer);
      geoTimer = setTimeout(async () => {
        const a = (compose.fromPlace || "").trim();
        const b = (compose.toPlace || "").trim();
        if (!a && !b) {
          compose.miles = null;
          compose.fromGeo = null;
          compose.toGeo = null;
          compose.geoNote = "";
          const el = root.querySelector("#geo-status");
          if (el) el.textContent = geoStatusText(null);
          root.querySelectorAll("[data-pick]").forEach((btn) => {
            const id = btn.dataset.pick;
            const animal = animalView(getState(), id);
            const etaEl = btn.querySelector(".courier-eta");
            if (etaEl && !animal.locked) etaEl.textContent = formatDuration(etaMs(DEFAULT_HOP_MILES, animal)) + " ETA";
          });
          return;
        }
        compose.geoNote = "Mapping the route…";
        const el = root.querySelector("#geo-status");
        if (el) el.textContent = compose.geoNote;
        const [g1, g2] = await Promise.all([a ? geocode(a) : null, b ? geocode(b) : null]);
        compose.fromGeo = g1;
        compose.toGeo = g2;
        if (g1 && g2) {
          compose.miles = haversineMiles(g1, g2);
          compose.geoNote = "";
        } else if (a || b) {
          compose.miles = DEFAULT_HOP_MILES;
          compose.geoNote = "Couldn't map both places — using a short hop (~" + DEFAULT_HOP_MILES + " mi).";
        }
        if (getView() !== "compose") return;
        const st = root.querySelector("#geo-status");
        if (st) st.textContent = geoStatusText(compose.miles);
        const miles = compose.miles != null ? compose.miles : DEFAULT_HOP_MILES;
        root.querySelectorAll("[data-pick]").forEach((btn) => {
          const id = btn.dataset.pick;
          const animal = animalView(getState(), id);
          const etaEl = btn.querySelector(".courier-eta");
          if (etaEl && !animal.locked) etaEl.textContent = formatDuration(etaMs(miles, animal)) + " ETA";
        });
      }, 480);
    }

    async function sendLetter(state) {
      const who = getWho();
      const other = otherName(who);
      const body = (root.querySelector("#letter-body")?.value || "").trim();
      if (!who) {
        CL.toast("Pick who you are first");
        return;
      }
      if (!body) {
        CL.toast("Write something on the scroll");
        return;
      }
      if (!compose.animalId) {
        CL.toast("Choose a courier");
        return;
      }
      const animal = animalView(getState(), compose.animalId);
      if (animal.locked) {
        CL.toast(animal.name + " is already in transit");
        return;
      }

      let miles = compose.miles;
      const fromP = (root.querySelector("#from-place")?.value || "").trim();
      const toP = (root.querySelector("#to-place")?.value || "").trim();
      if (miles == null && fromP && toP) {
        const [g1, g2] = await Promise.all([geocode(fromP), geocode(toP)]);
        compose.fromGeo = g1;
        compose.toGeo = g2;
        if (g1 && g2) miles = haversineMiles(g1, g2);
      }
      if (miles == null) miles = DEFAULT_HOP_MILES;

      const transit = etaMs(miles, animal);
      const now = Date.now();
      const willDeliver = Math.random() * 100 < animal.delivery;
      const letter = {
        id: CL.uid("pg"),
        fromName: who,
        toName: other,
        body,
        fromPlace: fromP,
        toPlace: toP,
        fromLabel: (compose.fromGeo && compose.fromGeo.label) || fromP,
        toLabel: (compose.toGeo && compose.toGeo.label) || toP,
        distanceMiles: Math.round(miles * 10) / 10,
        animalId: animal.id,
        animalName: animal.name,
        animalSpeed: animal.speed,
        sentAt: now,
        arrivesAt: now + transit,
        willDeliver,
        status: "transit",
        read: false,
        archived: false,
        lostReason: willDeliver ? "" : LOST_REASONS[Math.floor(Math.random() * LOST_REASONS.length)],
        updatedAt: now
      };

      const st = getState();
      const fresh = animalView(st, animal.id);
      if (fresh.locked) {
        CL.toast(fresh.name + " just left with another letter");
        paint();
        return;
      }
      st.letters[letter.id] = letter;
      st.locks[animal.id] = { letterId: letter.id, until: letter.arrivesAt };
      setState(st);
      resetCompose();
      CL.toast(animal.name + " is on the way · " + formatDuration(transit));
      if (typeof Notification !== "undefined" && Notification.permission === "default") {
        try {
          Notification.requestPermission();
        } catch (_) {}
      }
      setView("farm");
      paint();
    }

    function paintMailbox(state) {
      const who = getWho();
      const mailTab = session.mailTab;
      const mine = lettersList(state)
        .filter((l) => l.status === "delivered" && isForMe(l, who))
        .sort((a, b) => (b.resolvedAt || b.arrivesAt || 0) - (a.resolvedAt || a.arrivesAt || 0));
      const items = mailTab === "archive" ? mine.filter((l) => l.archived) : mine.filter((l) => !l.archived);
      const unread = mine.filter((l) => !l.read && !l.archived).length;

      root.innerHTML = `
        <section class="page pigeon-page">
          <button type="button" class="btn btn-ghost btn-sm" id="back-farm">← Farm</button>
          <h1 class="page-title">Mailbox</h1>
          <p class="page-sub">Letters for ${CL.escapeHtml(who || "you")}</p>
          <div class="tabs" style="margin-bottom:12px">
            <button type="button" class="tab ${mailTab === "new" ? "active" : ""}" data-mtab="new">
              New Mail${unread ? " · " + unread : ""}
            </button>
            <button type="button" class="tab ${mailTab === "archive" ? "active" : ""}" data-mtab="archive">Archive</button>
          </div>
          ${
            items.length
              ? `<div class="stack-sm">${items.map(mailRow).join("")}</div>`
              : `<div class="empty"><div class="emoji">📜</div><p>${
                  mailTab === "archive" ? "Nothing archived yet." : "No letters in the chest."
                }</p></div>`
          }
        </section>
      `;
      root.querySelector("#back-farm")?.addEventListener("click", () => {
        setView("farm");
        paint();
      });
      root.querySelectorAll("[data-mtab]").forEach((btn) => {
        btn.addEventListener("click", () => {
          session.mailTab = btn.dataset.mtab;
          paint();
        });
      });
      root.querySelectorAll("[data-open-letter]").forEach((btn) => {
        btn.addEventListener("click", () => {
          session.openId = btn.dataset.openLetter;
          setView("letter");
          paint();
        });
      });
    }

    function mailRow(letter) {
      const unread = !letter.read;
      const preview = String(letter.body || "").replace(/\s+/g, " ").trim().slice(0, 72);
      return `
        <button type="button" class="card mail-row ${unread ? "unread" : ""}" data-open-letter="${CL.escapeHtml(
          letter.id
        )}">
          <div class="mail-row-seal" aria-hidden="true">${unread ? "●" : "○"}</div>
          <div class="mail-row-body">
            <div class="card-title">${unread ? "New scroll" : "Opened"} · ${CL.escapeHtml(
              letter.fromName || "Unknown"
            )}</div>
            <p class="card-meta" style="margin:0">${CL.escapeHtml(preview || "…")}</p>
            <p class="card-meta" style="margin:4px 0 0">${CL.escapeHtml(formatWhen(letter.resolvedAt || letter.arrivesAt))} · ${CL.escapeHtml(
              letter.animalName || ""
            )}</p>
          </div>
        </button>`;
    }

    function paintLetter(state) {
      const letter = state.letters[session.openId];
      if (!letter || letter.status !== "delivered") {
        setView("mailbox");
        paint();
        return;
      }
      if (!letter.read) {
        letter.read = true;
        letter.readAt = Date.now();
        letter.updatedAt = Date.now();
        setState(state);
        updateBadges();
      }
      const miles =
        letter.distanceMiles != null ? formatMiles(letter.distanceMiles) + " miles · " : "";
      const route =
        (letter.fromLabel || letter.fromPlace || "") && (letter.toLabel || letter.toPlace || "")
          ? `${letter.fromLabel || letter.fromPlace} → ${letter.toLabel || letter.toPlace}`
          : "";

      root.innerHTML = `
        <section class="page pigeon-page">
          <button type="button" class="btn btn-ghost btn-sm" id="back-mail">← Mailbox</button>
          <div class="scroll-stage reading unroll">
            <div class="scroll-roll top" aria-hidden="true"></div>
            <article class="parchment letter-open">
              <p class="letter-kicker">A letter from ${CL.escapeHtml(letter.fromName || "someone")}</p>
              <p class="letter-body">${CL.escapeHtml(letter.body || "").replace(/\r\n/g, "<br>").replace(/\n/g, "<br>")}</p>
              <p class="letter-sign">${CL.escapeHtml(letter.fromName || "")}</p>
            </article>
            <div class="scroll-roll bottom" aria-hidden="true"></div>
          </div>
          <p class="card-meta" style="margin-top:12px">
            Delivered by ${CL.escapeHtml(letter.animalName || "courier")} · ${miles}${CL.escapeHtml(
              formatWhen(letter.resolvedAt || letter.arrivesAt)
            )}
          </p>
          ${route ? `<p class="card-meta">${CL.escapeHtml(route)}</p>` : ""}
          ${
            letter.archived
              ? `<p class="filter-hint">In the archive.</p>`
              : `<button type="button" class="btn btn-secondary btn-block" id="archive-letter">Move to Archive</button>`
          }
        </section>
      `;
      root.querySelector("#back-mail")?.addEventListener("click", () => {
        setView("mailbox");
        paint();
      });
      root.querySelector("#archive-letter")?.addEventListener("click", () => {
        const st = getState();
        const l = st.letters[session.openId];
        if (l) {
          l.archived = true;
          l.archivedAt = Date.now();
          l.updatedAt = Date.now();
          setState(st);
        }
        CL.toast("Archived");
        session.mailTab = "archive";
        setView("mailbox");
        paint();
      });
    }

    const onTick = (e) => {
      if (!root.querySelector(".pigeon-page")) {
        window.removeEventListener("cl-pigeon-tick", onTick);
        return;
      }
      const resolved = (e.detail && e.detail.resolved) || [];
      if (resolved.length) {
        if (getView() === "compose") {
          const bodyEl = root.querySelector("#letter-body");
          if (bodyEl) compose.body = bodyEl.value;
        }
        paint();
        return;
      }
      root.querySelectorAll("[data-eta]").forEach((el) => {
        const until = Number(el.dataset.eta);
        el.textContent = formatDuration(until - Date.now());
      });
    };
    if (render._onTick) window.removeEventListener("cl-pigeon-tick", render._onTick);
    render._onTick = onTick;
    window.addEventListener("cl-pigeon-tick", onTick);

    paint();
  }

  global.CL = global.CL || {};
  global.CL.sections = global.CL.sections || {};
  global.CL.sections.pigeon = { render };
  global.CL.pigeon = {
    getState,
    setState,
    merge,
    shouldRepush,
    unreadCount,
    startBackground,
    updateBadges,
    resolveArrivals,
    allAnimals,
    getWho
  };
})(window);
