/* Couple Group sync via Firebase Realtime Database (optional, free-tier friendly) */
(function (global) {
  const GROUP_KEY = "coupleGroup";
  const FIREBASE_CFG_KEY = "firebaseConfig";
  const SYNC_META_KEY = "syncMeta";

  const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let db = null;
  let groupRef = null;
  let unsub = null;
  let pushing = false;
  let applyingRemote = false;
  let status = "idle"; // idle | connecting | connected | error | offline
  let lastError = "";
  let sdkReady = null;

  function getGroup() {
    return CL.storage.get(GROUP_KEY, null);
  }

  function setGroup(g) {
    if (g) CL.storage.set(GROUP_KEY, g, { skipSync: true });
    else CL.storage.remove(GROUP_KEY, { skipSync: true });
    return g;
  }

  function getFirebaseConfig() {
    // Prefer saved settings; optional global override from firebase-config.js
    const saved = CL.storage.get(FIREBASE_CFG_KEY, null);
    if (saved && saved.databaseURL && saved.apiKey) return saved;
    if (global.CL_FIREBASE_CONFIG && global.CL_FIREBASE_CONFIG.databaseURL) {
      return global.CL_FIREBASE_CONFIG;
    }
    return null;
  }

  function setFirebaseConfig(cfg) {
    const clean = {
      apiKey: (cfg.apiKey || "").trim(),
      authDomain: (cfg.authDomain || "").trim(),
      databaseURL: (cfg.databaseURL || "").trim().replace(/\/$/, ""),
      projectId: (cfg.projectId || "").trim()
    };
    CL.storage.set(FIREBASE_CFG_KEY, clean, { skipSync: true });
    db = null;
    return clean;
  }

  function clearFirebaseConfig() {
    CL.storage.remove(FIREBASE_CFG_KEY, { skipSync: true });
    db = null;
  }

  function isConfigured() {
    const c = getFirebaseConfig();
    return !!(c && c.apiKey && c.databaseURL);
  }

  function isJoined() {
    const g = getGroup();
    return !!(g && g.code);
  }

  function getStatus() {
    return {
      status,
      lastError,
      configured: isConfigured(),
      joined: isJoined(),
      group: getGroup()
    };
  }

  function generateCode(len) {
    len = len || 6;
    let out = "";
    const arr = new Uint8Array(len);
    if (global.crypto && crypto.getRandomValues) crypto.getRandomValues(arr);
    else for (let i = 0; i < len; i++) arr[i] = Math.floor(Math.random() * 256);
    for (let i = 0; i < len; i++) out += CODE_ALPHABET[arr[i] % CODE_ALPHABET.length];
    return out;
  }

  function normalizeCode(code) {
    return String(code || "")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 8);
  }

  function loadFirebaseSdk() {
    if (sdkReady) return sdkReady;
    if (global.firebase && firebase.database) {
      sdkReady = Promise.resolve();
      return sdkReady;
    }
    sdkReady = new Promise((resolve, reject) => {
      const app = document.createElement("script");
      app.src = "https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js";
      app.async = true;
      app.onload = () => {
        const dbScript = document.createElement("script");
        dbScript.src = "https://www.gstatic.com/firebasejs/10.14.1/firebase-database-compat.js";
        dbScript.async = true;
        dbScript.onload = () => resolve();
        dbScript.onerror = () => reject(new Error("Could not load Firebase Database SDK"));
        document.head.appendChild(dbScript);
      };
      app.onerror = () => reject(new Error("Could not load Firebase SDK — check network"));
      document.head.appendChild(app);
    });
    return sdkReady;
  }

  async function ensureDb() {
    const cfg = getFirebaseConfig();
    if (!cfg || !cfg.apiKey || !cfg.databaseURL) {
      throw new Error("Add your free Firebase config in Profile first.");
    }
    await loadFirebaseSdk();
    if (!global.firebase) throw new Error("Firebase SDK missing");

    if (!firebase.apps || !firebase.apps.length) {
      firebase.initializeApp({
        apiKey: cfg.apiKey,
        authDomain: cfg.authDomain || undefined,
        databaseURL: cfg.databaseURL,
        projectId: cfg.projectId || undefined
      });
    }
    db = firebase.database();
    return db;
  }

  function collectLocalSyncData() {
    const data = {};
    CL.storage.SYNC_KEYS.forEach((k) => {
      const v = CL.storage.get(k, null);
      if (v != null) data[k] = v;
    });
    // Never sync API keys
    if (data.profile) {
      data.profile = Object.assign({}, data.profile);
      // keep names/bio; drop huge avatar optional — keep small avatars
      if (data.profile.avatar && data.profile.avatar.length > 120000) {
        delete data.profile.avatar;
      }
    }
    return data;
  }

  function applyRemoteData(remote) {
    if (!remote || typeof remote !== "object") return;
    applyingRemote = true;
    try {
      CL.storage.SYNC_KEYS.forEach((k) => {
        if (Object.prototype.hasOwnProperty.call(remote, k) && remote[k] != null) {
          let val = remote[k];
          // Preserve local API settings when merging profile
          if (k === "profile") {
            const local = CL.storage.get("profile", {}) || {};
            val = Object.assign({}, local, val);
          }
          CL.storage.set(k, val, { remote: true });
        }
      });
      CL.storage.set(
        SYNC_META_KEY,
        { lastRemoteAt: Date.now(), lastRemoteBy: (remote._meta && remote._meta.updatedBy) || "" },
        { skipSync: true }
      );
    } finally {
      applyingRemote = false;
    }
  }

  function stopListening() {
    if (unsub) {
      try {
        unsub();
      } catch (_) {}
      unsub = null;
    }
    groupRef = null;
  }

  async function startListening(code) {
    const database = await ensureDb();
    stopListening();
    status = "connecting";
    lastError = "";
    emitStatus();

    const ref = database.ref("groups/" + code);
    groupRef = ref;

    const handler = (snap) => {
      if (pushing) return;
      const val = snap.val();
      if (!val) return;
      status = "connected";
      lastError = "";
      // val may be { meta, data } or flat data
      const payload = val.data != null ? val.data : val;
      applyRemoteData(payload);
      emitStatus();
      if (typeof CL.refreshHeader === "function") CL.refreshHeader();
    };

    ref.on(
      "value",
      handler,
      (err) => {
        status = "error";
        lastError = (err && err.message) || "Sync connection error";
        emitStatus();
      }
    );

    unsub = () => ref.off("value", handler);
    status = "connected";
    emitStatus();
  }

  function emitStatus() {
    try {
      window.dispatchEvent(new CustomEvent("cl-sync-status", { detail: getStatus() }));
    } catch (_) {}
  }

  async function pushKey(keyName, value) {
    if (applyingRemote) return;
    if (!isJoined() || !isConfigured()) return;
    const g = getGroup();
    if (!g || !g.code) return;

    try {
      if (!db) await ensureDb();
      pushing = true;
      const path = "groups/" + g.code + "/data/" + keyName;
      await db.ref(path).set(value === undefined ? null : value);
      await db.ref("groups/" + g.code + "/meta").update({
        updatedAt: Date.now(),
        updatedBy: (CL.profile.displayNames().myName || "partner").slice(0, 40)
      });
      status = "connected";
      lastError = "";
    } catch (err) {
      status = "error";
      lastError = err.message || "Push failed";
      console.warn("pushKey", err);
    } finally {
      pushing = false;
      emitStatus();
    }
  }

  async function pushAllLocal() {
    if (!isJoined() || !isConfigured()) return;
    const g = getGroup();
    const database = await ensureDb();
    const data = collectLocalSyncData();
    pushing = true;
    try {
      await database.ref("groups/" + g.code + "/data").update(data);
      await database.ref("groups/" + g.code + "/meta").update({
        updatedAt: Date.now(),
        updatedBy: (CL.profile.displayNames().myName || "partner").slice(0, 40)
      });
      status = "connected";
    } finally {
      pushing = false;
      emitStatus();
    }
  }

  async function createGroup(label) {
    if (!isConfigured()) throw new Error("Save Firebase config first (free Firebase project).");
    await ensureDb();
    let code = generateCode(6);
    // Avoid rare collision
    for (let i = 0; i < 3; i++) {
      const existing = await db.ref("groups/" + code).once("value");
      if (!existing.exists()) break;
      code = generateCode(6);
    }

    const names = CL.profile.displayNames();
    const meta = {
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdBy: names.myName || "You",
      label: (label || names.coupleLabel || "Our group").slice(0, 60)
    };
    const data = collectLocalSyncData();

    pushing = true;
    try {
      await db.ref("groups/" + code).set({ meta, data });
    } finally {
      pushing = false;
    }

    setGroup({ code, label: meta.label, joinedAt: Date.now(), role: "creator" });
    await startListening(code);
    CL.toast("Couple group created — share code " + code);
    return getGroup();
  }

  async function joinGroup(rawCode) {
    if (!isConfigured()) throw new Error("Save Firebase config first (free Firebase project).");
    const code = normalizeCode(rawCode);
    if (code.length < 4) throw new Error("Enter a valid group code.");

    await ensureDb();
    const snap = await db.ref("groups/" + code).once("value");
    if (!snap.exists()) throw new Error("No group found for that code. Check spelling.");

    const val = snap.val() || {};
    const remoteData = val.data != null ? val.data : {};
    const meta = val.meta || {};

    // Merge: remote wins for shared lists; keep local-only fields on profile
    applyingRemote = true;
    try {
      CL.storage.SYNC_KEYS.forEach((k) => {
        if (remoteData[k] == null) return;
        if (k === "profile") {
          const local = CL.storage.get("profile", {}) || {};
          const merged = Object.assign({}, local, remoteData[k]);
          CL.storage.set(k, merged, { remote: true });
        } else {
          CL.storage.set(k, remoteData[k], { remote: true });
        }
      });
    } finally {
      applyingRemote = false;
    }

    // Upload any local-only keys remote is missing
    const local = collectLocalSyncData();
    const patch = {};
    Object.keys(local).forEach((k) => {
      if (remoteData[k] == null) patch[k] = local[k];
    });
    if (Object.keys(patch).length) {
      pushing = true;
      try {
        await db.ref("groups/" + code + "/data").update(patch);
      } finally {
        pushing = false;
      }
    }

    setGroup({
      code,
      label: meta.label || "Couple group",
      joinedAt: Date.now(),
      role: "member"
    });
    await startListening(code);
    CL.toast("Joined couple group " + code);
    if (typeof CL.refreshHeader === "function") CL.refreshHeader();
    return getGroup();
  }

  async function leaveGroup() {
    stopListening();
    setGroup(null);
    status = "idle";
    lastError = "";
    emitStatus();
    CL.toast("Left couple group (data stays on this device)");
  }

  async function reconnect() {
    const g = getGroup();
    if (!g || !g.code || !isConfigured()) {
      status = "idle";
      emitStatus();
      return;
    }
    try {
      await startListening(g.code);
    } catch (err) {
      status = "error";
      lastError = err.message || "Reconnect failed";
      emitStatus();
    }
  }

  function init() {
    // Auto-reconnect if already in a group
    if (isJoined() && isConfigured()) {
      reconnect().catch((err) => console.warn("Sync reconnect:", err));
    }
  }

  global.CL = global.CL || {};
  global.CL.sync = {
    getGroup,
    getFirebaseConfig,
    setFirebaseConfig,
    clearFirebaseConfig,
    isConfigured,
    isJoined,
    getStatus,
    generateCode,
    normalizeCode,
    createGroup,
    joinGroup,
    leaveGroup,
    pushKey,
    pushAllLocal,
    reconnect,
    init,
    collectLocalSyncData
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    setTimeout(init, 0);
  }
})(window);
