/* CL localStorage helpers + optional couple-group sync hooks */
(function (global) {
  const PREFIX = "cl_";

  /**
   * Keys that sync across couple devices when a group is joined.
   * App updates never wipe these — they live in localStorage (and Firebase when linked).
   * Includes: game scores/history, movies, books, notes, workouts, profile names.
   */
  const SYNC_KEYS = [
    "movies",
    "books",
    "games",
    "notes",
    "workouts",
    "profile"
  ];

  function key(k) {
    return k.startsWith(PREFIX) ? k : PREFIX + k;
  }

  function bareKey(k) {
    return k.startsWith(PREFIX) ? k.slice(PREFIX.length) : k;
  }

  function isSyncKey(k) {
    return SYNC_KEYS.indexOf(bareKey(k)) !== -1;
  }

  function get(k, fallback) {
    try {
      const raw = localStorage.getItem(key(k));
      if (raw == null) return fallback;
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  /**
   * @param {string} k
   * @param {*} value
   * @param {{ remote?: boolean, skipSync?: boolean }} [opts]
   *   remote: written from Firebase (don't re-upload)
   *   skipSync: force local-only
   */
  function set(k, value, opts) {
    opts = opts || {};
    localStorage.setItem(key(k), JSON.stringify(value));
    if (!opts.remote && !opts.skipSync && isSyncKey(k) && global.CL && CL.sync && typeof CL.sync.pushKey === "function") {
      try {
        CL.sync.pushKey(bareKey(k), value);
      } catch (err) {
        console.warn("Sync push failed:", err);
      }
    }
    if (opts.remote) {
      try {
        window.dispatchEvent(
          new CustomEvent("cl-sync-update", { detail: { key: bareKey(k), value } })
        );
      } catch (_) {}
    }
    return value;
  }

  function update(k, fn, fallback, opts) {
    const current = get(k, fallback);
    const next = fn(current);
    set(k, next, opts);
    return next;
  }

  function remove(k, opts) {
    opts = opts || {};
    localStorage.removeItem(key(k));
    if (!opts.remote && !opts.skipSync && isSyncKey(k) && global.CL && CL.sync && typeof CL.sync.pushKey === "function") {
      try {
        CL.sync.pushKey(bareKey(k), null);
      } catch (_) {}
    }
  }

  function toast(message, ms) {
    const host = document.getElementById("toast-host");
    if (!host) return;
    host.innerHTML = "";
    const el = document.createElement("div");
    el.className = "toast";
    el.textContent = message;
    host.appendChild(el);
    setTimeout(() => {
      if (el.parentNode === host) el.remove();
    }, ms || 2200);
  }

  function uid(prefix) {
    return (prefix || "id") + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function escapeHtml(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  global.CL = global.CL || {};
  global.CL.storage = {
    get,
    set,
    update,
    remove,
    key,
    bareKey,
    isSyncKey,
    SYNC_KEYS
  };
  global.CL.toast = toast;
  global.CL.uid = uid;
  global.CL.escapeHtml = escapeHtml;
})(window);
