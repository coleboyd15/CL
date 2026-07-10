/* Couple profile + app settings (localStorage) */
(function (global) {
  const DEFAULT_PROFILE = {
    myName: "",
    partnerName: "",
    coupleName: "",
    anniversary: "",
    bio: "",
    avatar: "", // data URL or empty
    city: ""
  };

  const DEFAULT_SETTINGS = {
    xaiApiKey: "",
    xaiModel: "grok-4.5",
    useGrokApi: true
  };

  /** Chat / completions models shown in Profile and used by all Grok features */
  const GROK_MODELS = [
    { id: "grok-4.5", label: "grok-4.5 — newest flagship (recommended)" },
    { id: "grok-4.3", label: "grok-4.3" },
    { id: "grok-4.20-0309-reasoning", label: "grok-4.20 reasoning" },
    { id: "grok-4.20-0309-non-reasoning", label: "grok-4.20 non-reasoning" },
    { id: "grok-build-0.1", label: "grok-build — code-focused" },
    { id: "grok-3", label: "grok-3 (legacy)" },
    { id: "grok-3-mini", label: "grok-3-mini — fast legacy" },
    { id: "grok-2-latest", label: "grok-2-latest (legacy)" }
  ];

  function getGrokModel() {
    const s = getSettings();
    const id = (s.xaiModel || "").trim() || DEFAULT_SETTINGS.xaiModel;
    return id;
  }

  function getProfile() {
    return Object.assign({}, DEFAULT_PROFILE, CL.storage.get("profile", {}));
  }

  function setProfile(patch) {
    const next = Object.assign(getProfile(), patch || {});
    CL.storage.set("profile", next);
    return next;
  }

  function getSettings() {
    const saved = Object.assign({}, CL.storage.get("settings", {}) || {});
    const next = Object.assign({}, DEFAULT_SETTINGS, saved);
    // Bump silent old defaults to newest flagship; keep an explicit Profile choice
    if (!saved.modelUserSet) {
      if (!saved.xaiModel || saved.xaiModel === "grok-3-mini" || saved.xaiModel === "grok-2-latest") {
        next.xaiModel = DEFAULT_SETTINGS.xaiModel;
      }
    }
    return next;
  }

  function setSettings(patch) {
    const current = Object.assign({}, CL.storage.get("settings", {}) || {});
    const next = Object.assign({}, DEFAULT_SETTINGS, current, patch || {});
    if (patch && Object.prototype.hasOwnProperty.call(patch, "xaiModel")) {
      next.modelUserSet = true;
    }
    CL.storage.set("settings", next);
    return next;
  }

  function displayNames() {
    const p = getProfile();
    const a = (p.myName || "").trim() || "You";
    const b = (p.partnerName || "").trim() || "Partner";
    return { myName: a, partnerName: b, coupleLabel: coupleLabel() };
  }

  function coupleLabel() {
    const p = getProfile();
    if ((p.coupleName || "").trim()) return p.coupleName.trim();
    const a = (p.myName || "").trim();
    const b = (p.partnerName || "").trim();
    if (a && b) return a + " & " + b;
    if (a) return a + " & Partner";
    if (b) return "You & " + b;
    return "you two";
  }

  function initials() {
    const p = getProfile();
    const a = (p.myName || "Y").trim().charAt(0).toUpperCase() || "Y";
    const b = (p.partnerName || "P").trim().charAt(0).toUpperCase() || "P";
    return a + b;
  }

  function hasNames() {
    const p = getProfile();
    return !!(p.myName || "").trim() && !!(p.partnerName || "").trim();
  }

  function greeting() {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }

  function avatarHtml(sizeClass) {
    const p = getProfile();
    const cls = sizeClass || "avatar-lg";
    if (p.avatar) {
      return `<div class="couple-avatar ${cls}"><img src="${p.avatar}" alt="Couple photo" /></div>`;
    }
    return `<div class="couple-avatar ${cls} avatar-fallback" aria-hidden="true">${CL.escapeHtml(initials())}</div>`;
  }

  global.CL = global.CL || {};
  global.CL.profile = {
    get: getProfile,
    set: setProfile,
    getSettings,
    setSettings,
    getGrokModel,
    GROK_MODELS,
    displayNames,
    coupleLabel,
    initials,
    hasNames,
    greeting,
    avatarHtml,
    DEFAULT_PROFILE,
    DEFAULT_SETTINGS
  };
})(window);
