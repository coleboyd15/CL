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
    xaiModel: "grok-3-mini",
    useGrokApi: true
  };

  function getProfile() {
    return Object.assign({}, DEFAULT_PROFILE, CL.storage.get("profile", {}));
  }

  function setProfile(patch) {
    const next = Object.assign(getProfile(), patch || {});
    CL.storage.set("profile", next);
    return next;
  }

  function getSettings() {
    return Object.assign({}, DEFAULT_SETTINGS, CL.storage.get("settings", {}));
  }

  function setSettings(patch) {
    const next = Object.assign(getSettings(), patch || {});
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
