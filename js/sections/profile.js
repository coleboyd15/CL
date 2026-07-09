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

  function render(root) {
    function paint() {
      const profile = CL.profile.get();
      const settings = CL.profile.getSettings();
      const keySet = !!(settings.xaiApiKey || "").trim();

      root.innerHTML = `
        <section class="page">
          <h1 class="page-title">Profile & Settings</h1>
          <p class="page-sub">Couple info, photo, and Grok API</p>

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
                <label for="pf-model">Model</label>
                <select id="pf-model">
                  <option value="grok-3-mini" ${settings.xaiModel === "grok-3-mini" ? "selected" : ""}>grok-3-mini (fast)</option>
                  <option value="grok-3" ${settings.xaiModel === "grok-3" ? "selected" : ""}>grok-3</option>
                  <option value="grok-2-latest" ${settings.xaiModel === "grok-2-latest" ? "selected" : ""}>grok-2-latest</option>
                </select>
              </div>
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

    paint();
  }

  global.CL = global.CL || {};
  global.CL.sections = global.CL.sections || {};
  global.CL.sections.profile = { render };
})(window);
