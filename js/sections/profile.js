(function (global) {
  function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function compressImage(dataUrl, maxW) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, (maxW || 480) / img.width);
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  }

  function syncStatusLabel(st) {
    if (!st.configured) return { text: "Firebase not set up yet", cls: "" };
    if (!st.joined) return { text: "Ready — create or join a group", cls: "" };
    if (st.status === "connected") return { text: "Synced live", cls: "sync-ok" };
    if (st.status === "connecting") return { text: "Connecting…", cls: "sync-pending" };
    if (st.status === "error") return { text: "Sync error — check config", cls: "sync-err" };
    return { text: "Group saved · reconnecting…", cls: "sync-pending" };
  }

  function coupleGroupCardHtml() {
    const st = CL.sync.getStatus();
    const cfg = CL.sync.getFirebaseConfig() || {};
    const group = st.group;
    const badge = syncStatusLabel(st);

    return `
      <div class="card section-block couple-group-card">
        <div class="section-label">Couple Group</div>
        <p class="card-meta" style="margin-bottom:10px">
          Share movies, books, trips, games, OpEds, recipes & food notes in real time.
          Free Firebase Realtime Database · both of you use the same code.
        </p>
        <p class="sync-status ${badge.cls}">
          <span class="sync-dot" aria-hidden="true"></span>
          ${CL.escapeHtml(badge.text)}
          ${group ? ` · code <strong class="mono">${CL.escapeHtml(group.code)}</strong>` : ""}
        </p>
        ${
          st.lastError
            ? `<p class="card-meta sync-err-msg">${CL.escapeHtml(st.lastError)}</p>`
            : ""
        }

        <details class="firebase-setup" ${st.configured ? "" : "open"}>
          <summary>Firebase setup (one-time, free)</summary>
          <ol class="setup-steps">
            <li>Open <a href="https://console.firebase.google.com/" target="_blank" rel="noopener">Firebase Console</a> → Create project</li>
            <li>Build → <strong>Realtime Database</strong> → Create database</li>
            <li>Rules: allow read/write on <code>groups</code> (see README) — your code is the secret</li>
            <li>Project settings → Web app → copy config into the fields below</li>
          </ol>
          <div class="form-stack" style="margin-top:10px">
            <div class="field">
              <label for="fb-api">apiKey</label>
              <input id="fb-api" value="${CL.escapeHtml(cfg.apiKey || "")}" placeholder="AIza…" autocomplete="off" />
            </div>
            <div class="field">
              <label for="fb-url">databaseURL</label>
              <input id="fb-url" value="${CL.escapeHtml(cfg.databaseURL || "")}" placeholder="https://….firebaseio.com" autocomplete="off" />
            </div>
            <div class="field">
              <label for="fb-domain">authDomain (optional)</label>
              <input id="fb-domain" value="${CL.escapeHtml(cfg.authDomain || "")}" placeholder="project.firebaseapp.com" />
            </div>
            <div class="field">
              <label for="fb-project">projectId (optional)</label>
              <input id="fb-project" value="${CL.escapeHtml(cfg.projectId || "")}" placeholder="my-project" />
            </div>
            <button type="button" class="btn btn-secondary btn-block" id="fb-save">Save Firebase config</button>
            ${
              st.configured
                ? `<button type="button" class="btn btn-ghost btn-sm" id="fb-clear">Clear Firebase config</button>`
                : ""
            }
          </div>
        </details>

        <div class="form-stack" style="margin-top:14px">
          ${
            group
              ? `
            <div class="group-joined">
              <div class="card-title">You're in: ${CL.escapeHtml(group.label || "Couple group")}</div>
              <p class="card-meta">Share this code with your partner:</p>
              <div class="group-code-display mono" id="group-code-text">${CL.escapeHtml(group.code)}</div>
              <div class="card-actions">
                <button type="button" class="btn btn-secondary btn-sm" id="grp-copy">Copy code</button>
                <button type="button" class="btn btn-secondary btn-sm" id="grp-push">Push my data now</button>
                <button type="button" class="btn btn-ghost btn-sm" id="grp-leave">Leave group</button>
              </div>
            </div>`
              : `
            <div class="field">
              <label for="grp-label">Group nickname (optional)</label>
              <input id="grp-label" placeholder="e.g. ${CL.escapeHtml(CL.profile.coupleLabel())}" />
            </div>
            <button type="button" class="btn btn-primary btn-block" id="grp-create" ${st.configured ? "" : "disabled"}>
              Create couple group
            </button>
            <div class="or-divider"><span>or join</span></div>
            <div class="field">
              <label for="grp-code">Partner's group code</label>
              <input id="grp-code" class="mono" placeholder="e.g. K7M2QX" maxlength="8" autocomplete="off" style="text-transform:uppercase;letter-spacing:0.12em" />
            </div>
            <button type="button" class="btn btn-secondary btn-block" id="grp-join" ${st.configured ? "" : "disabled"}>
              Join couple group
            </button>
            ${
              !st.configured
                ? `<p class="filter-hint">Save Firebase config above before creating or joining.</p>`
                : ""
            }`
          }
        </div>
      </div>
    `;
  }

  function bindCoupleGroup(root, paint) {
    root.querySelector("#fb-save")?.addEventListener("click", () => {
      CL.sync.setFirebaseConfig({
        apiKey: root.querySelector("#fb-api").value,
        databaseURL: root.querySelector("#fb-url").value,
        authDomain: root.querySelector("#fb-domain").value,
        projectId: root.querySelector("#fb-project").value
      });
      CL.toast("Firebase config saved");
      if (CL.sync.isJoined()) CL.sync.reconnect();
      paint();
    });

    root.querySelector("#fb-clear")?.addEventListener("click", () => {
      if (!confirm("Remove Firebase config from this device?")) return;
      CL.sync.clearFirebaseConfig();
      CL.toast("Firebase config cleared");
      paint();
    });

    root.querySelector("#grp-create")?.addEventListener("click", async () => {
      const btn = root.querySelector("#grp-create");
      btn.disabled = true;
      btn.textContent = "Creating…";
      try {
        const label = root.querySelector("#grp-label")?.value.trim() || "";
        await CL.sync.createGroup(label);
        paint();
      } catch (err) {
        CL.toast(err.message || "Could not create group");
        btn.disabled = false;
        btn.textContent = "Create couple group";
      }
    });

    root.querySelector("#grp-join")?.addEventListener("click", async () => {
      const btn = root.querySelector("#grp-join");
      const code = root.querySelector("#grp-code")?.value || "";
      btn.disabled = true;
      btn.textContent = "Joining…";
      try {
        await CL.sync.joinGroup(code);
        paint();
      } catch (err) {
        CL.toast(err.message || "Could not join");
        btn.disabled = false;
        btn.textContent = "Join couple group";
      }
    });

    root.querySelector("#grp-copy")?.addEventListener("click", async () => {
      const g = CL.sync.getGroup();
      if (!g) return;
      try {
        await navigator.clipboard.writeText(g.code);
        CL.toast("Code copied");
      } catch {
        CL.toast("Code: " + g.code);
      }
    });

    root.querySelector("#grp-push")?.addEventListener("click", async () => {
      try {
        await CL.sync.pushAllLocal();
        CL.toast("Pushed latest data to the group");
      } catch (err) {
        CL.toast(err.message || "Push failed");
      }
    });

    root.querySelector("#grp-leave")?.addEventListener("click", async () => {
      if (!confirm("Leave this couple group? Data stays on this phone; it will stop syncing.")) return;
      await CL.sync.leaveGroup();
      paint();
    });
  }

  function render(root) {
    function paint() {
      const profile = CL.profile.get();
      const settings = CL.profile.getSettings();
      const keySet = !!(settings.xaiApiKey || "").trim();

      root.innerHTML = `
        <section class="page">
          <h1 class="page-title">Profile & Settings</h1>
          <p class="page-sub">Couple info, shared group, and Grok API</p>

          <div class="card section-block profile-card">
            <div class="profile-avatar-row">
              ${CL.profile.avatarHtml("avatar-xl")}
              <div>
                <div class="card-title">${CL.escapeHtml(CL.profile.coupleLabel())}</div>
                <p class="card-meta">Tap below to update your shared photo</p>
                <div class="card-actions">
                  <label class="btn btn-secondary btn-sm" style="cursor:pointer">
                    Upload photo
                    <input type="file" id="pf-photo" accept="image/*" class="sr-only" />
                  </label>
                  ${
                    profile.avatar
                      ? `<button type="button" class="btn btn-ghost btn-sm" id="pf-clear-photo">Remove</button>`
                      : ""
                  }
                </div>
              </div>
            </div>
          </div>

          ${coupleGroupCardHtml()}

          <div class="card section-block">
            <div class="section-label">Couple profiles</div>
            <div class="form-stack">
              <div class="field">
                <label for="pf-my">My Name</label>
                <input id="pf-my" value="${CL.escapeHtml(profile.myName)}" placeholder="Your name" />
              </div>
              <div class="field">
                <label for="pf-partner">Partner's Name</label>
                <input id="pf-partner" value="${CL.escapeHtml(profile.partnerName)}" placeholder="Their name" />
              </div>
              <div class="field">
                <label for="pf-couple">Couple nickname (optional)</label>
                <input id="pf-couple" value="${CL.escapeHtml(profile.coupleName)}" placeholder="e.g. Team Soft Launch" />
              </div>
              <div class="field">
                <label for="pf-anniv">Anniversary / since (optional)</label>
                <input id="pf-anniv" value="${CL.escapeHtml(profile.anniversary)}" placeholder="e.g. June 2024" />
              </div>
              <div class="field">
                <label for="pf-city">Home city (optional)</label>
                <input id="pf-city" value="${CL.escapeHtml(profile.city)}" placeholder="e.g. Austin" />
              </div>
              <div class="field">
                <label for="pf-bio">About us</label>
                <textarea id="pf-bio" placeholder="A short note about you two…">${CL.escapeHtml(profile.bio)}</textarea>
              </div>
              <button type="button" class="btn btn-primary btn-block" id="pf-save">Save profile</button>
            </div>
          </div>

          <div class="card section-block">
            <div class="section-label">Grok API (xAI)</div>
            <p class="card-meta" style="margin-bottom:10px">
              Add an API key from
              <a href="https://console.x.ai/" target="_blank" rel="noopener">console.x.ai</a>
              to enable live Grok chats. Stored only in this browser.
              ${keySet ? " <strong>· Key saved</strong>" : ""}
            </p>
            <div class="form-stack">
              <div class="field">
                <label for="pf-key">xAI API key</label>
                <input id="pf-key" type="password" autocomplete="off" placeholder="${keySet ? "••••••••  (enter to replace)" : "xai-…"}" />
              </div>
              <div class="field">
                <label for="pf-model">Grok model (all chats)</label>
                <select id="pf-model">
                  ${(CL.profile.GROK_MODELS || [])
                    .map((m) => {
                      const selected =
                        (settings.xaiModel || CL.profile.DEFAULT_SETTINGS.xaiModel) === m.id
                          ? "selected"
                          : "";
                      return `<option value="${CL.escapeHtml(m.id)}" ${selected}>${CL.escapeHtml(m.label)}</option>`;
                    })
                    .join("")}
                </select>
              </div>
              <p class="filter-hint" style="margin-top:-4px">
                Active: <strong class="mono">${CL.escapeHtml(CL.profile.getGrokModel())}</strong>
                · used by Food, Movies, Trips, Recipes, Books &amp; more
              </p>
              <div class="toggle-row">
                <span>Use live API when key is set</span>
                <label><input type="checkbox" id="pf-use-api" ${settings.useGrokApi !== false ? "checked" : ""} /></label>
              </div>
              <button type="button" class="btn btn-primary btn-block" id="pf-save-api">Save API settings</button>
              ${keySet ? `<button type="button" class="btn btn-ghost btn-block" id="pf-clear-key">Remove API key</button>` : ""}
            </div>
            <p class="filter-hint" style="margin-top:10px">
              Note: browser-side keys are convenient for a private couple app but not ideal for public sites.
              Without a key, Ask Grok still works in smart offline mode.
            </p>
          </div>

          <div class="card section-block">
            <div class="section-label">Data</div>
            <button type="button" class="btn btn-secondary btn-sm" id="pf-export">Export all CL data</button>
            <button type="button" class="btn btn-ghost btn-sm" id="pf-clear-all" style="margin-left:6px">Clear all data…</button>
          </div>
        </section>
      `;

      bindCoupleGroup(root, paint);

      root.querySelector("#pf-save").addEventListener("click", () => {
        CL.profile.set({
          myName: root.querySelector("#pf-my").value.trim(),
          partnerName: root.querySelector("#pf-partner").value.trim(),
          coupleName: root.querySelector("#pf-couple").value.trim(),
          anniversary: root.querySelector("#pf-anniv").value.trim(),
          city: root.querySelector("#pf-city").value.trim(),
          bio: root.querySelector("#pf-bio").value.trim()
        });
        CL.toast("Profile saved");
        if (typeof CL.refreshHeader === "function") CL.refreshHeader();
        paint();
      });

      root.querySelector("#pf-photo")?.addEventListener("change", async (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        try {
          const raw = await readFileAsDataURL(file);
          const compressed = await compressImage(raw, 640);
          CL.profile.set({ avatar: compressed });
          CL.toast("Photo saved");
          if (typeof CL.refreshHeader === "function") CL.refreshHeader();
          paint();
        } catch {
          CL.toast("Could not load photo");
        }
      });

      root.querySelector("#pf-clear-photo")?.addEventListener("click", () => {
        CL.profile.set({ avatar: "" });
        CL.toast("Photo removed");
        if (typeof CL.refreshHeader === "function") CL.refreshHeader();
        paint();
      });

      root.querySelector("#pf-save-api").addEventListener("click", () => {
        const keyInput = root.querySelector("#pf-key").value.trim();
        const patch = {
          xaiModel: root.querySelector("#pf-model").value,
          useGrokApi: root.querySelector("#pf-use-api").checked
        };
        if (keyInput) patch.xaiApiKey = keyInput;
        CL.profile.setSettings(patch);
        CL.toast("API settings saved");
        paint();
      });

      root.querySelector("#pf-clear-key")?.addEventListener("click", () => {
        CL.profile.setSettings({ xaiApiKey: "" });
        CL.toast("API key removed");
        paint();
      });

      root.querySelector("#pf-export")?.addEventListener("click", () => {
        const payload = {};
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith("cl_")) {
            try {
              payload[k] = JSON.parse(localStorage.getItem(k));
            } catch {
              payload[k] = localStorage.getItem(k);
            }
          }
        }
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `cl-backup-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(a.href);
        CL.toast("Export downloaded");
      });

      root.querySelector("#pf-clear-all")?.addEventListener("click", () => {
        if (!confirm("Clear all CL data on this device? This cannot be undone.")) return;
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith("cl_")) keys.push(k);
        }
        keys.forEach((k) => localStorage.removeItem(k));
        CL.toast("All CL data cleared");
        location.hash = "#home";
      });
    }

    const onSync = () => {
      // Refresh couple group card when status changes while on profile
      if (location.hash.replace(/^#/, "").split("?")[0] === "profile") paint();
    };
    window.addEventListener("cl-sync-status", onSync);
    window.addEventListener("cl-sync-update", onSync);

    paint();
  }

  global.CL = global.CL || {};
  global.CL.sections = global.CL.sections || {};
  global.CL.sections.profile = { render };
})(window);
