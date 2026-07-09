/* CL localStorage helpers */
(function (global) {
  const PREFIX = "cl_";

  function key(k) {
    return k.startsWith(PREFIX) ? k : PREFIX + k;
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

  function set(k, value) {
    localStorage.setItem(key(k), JSON.stringify(value));
    return value;
  }

  function update(k, fn, fallback) {
    const current = get(k, fallback);
    const next = fn(current);
    set(k, next);
    return next;
  }

  function remove(k) {
    localStorage.removeItem(key(k));
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
  global.CL.storage = { get, set, update, remove, key };
  global.CL.toast = toast;
  global.CL.uid = uid;
  global.CL.escapeHtml = escapeHtml;
})(window);
