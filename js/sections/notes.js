/* Shared Notes — scratch-paper rich text, Couple Group sync via "notes" key */
(function (global) {
  const COLORS = [
    { id: "ink", label: "Ink", value: "#1a1a1a" },
    { id: "navy", label: "Navy", value: "#0a3161" },
    { id: "red", label: "Red", value: "#b22234" },
    { id: "blue", label: "Blue", value: "#2563eb" },
    { id: "green", label: "Green", value: "#166534" },
    { id: "purple", label: "Purple", value: "#6b21a8" },
    { id: "orange", label: "Orange", value: "#c2410c" },
    { id: "gray", label: "Gray", value: "#6b7280" }
  ];

  function getNotes() {
    const raw = CL.storage.get("notes", { items: [] });
    if (Array.isArray(raw)) return { items: raw };
    if (!raw || !Array.isArray(raw.items)) return { items: [] };
    return raw;
  }

  function setNotes(data) {
    CL.storage.set("notes", data);
  }

  function listItems() {
    return (getNotes().items || [])
      .slice()
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  }

  function saveItem(note) {
    const data = getNotes();
    const items = data.items || [];
    const idx = items.findIndex((n) => n.id === note.id);
    if (idx >= 0) items[idx] = note;
    else items.unshift(note);
    setNotes({ items });
    return note;
  }

  function deleteItem(id) {
    const data = getNotes();
    data.items = (data.items || []).filter((n) => n.id !== id);
    setNotes(data);
  }

  function plainPreview(html) {
    const tmp = document.createElement("div");
    tmp.innerHTML = html || "";
    const text = (tmp.textContent || "").replace(/\s+/g, " ").trim();
    return text.slice(0, 100) || "Empty note";
  }

  function formatDate(ts) {
    if (!ts) return "";
    try {
      return new Date(ts).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit"
      });
    } catch {
      return "";
    }
  }

  function exec(cmd, value) {
    try {
      document.execCommand(cmd, false, value || null);
    } catch (err) {
      console.warn("format", cmd, err);
    }
  }

  function render(root) {
    let activeId = CL.storage.get("notesActiveId", null);
    let saveTimer = null;
    let suppressRemote = false;

    function currentNote() {
      const items = listItems();
      if (activeId) {
        const found = items.find((n) => n.id === activeId);
        if (found) return found;
      }
      return null;
    }

    function scheduleSave(title, html) {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        const id = activeId;
        if (!id) return;
        const existing = listItems().find((n) => n.id === id) || {};
        suppressRemote = true;
        saveItem({
          id,
          title: title || existing.title || "Untitled",
          html: html || "",
          createdAt: existing.createdAt || Date.now(),
          updatedAt: Date.now()
        });
        suppressRemote = false;
        // Refresh list sidebar meta without tearing down editor focus
        const meta = root.querySelector(`[data-note-id="${id}"] .note-list-meta`);
        if (meta) meta.textContent = formatDate(Date.now());
        const prev = root.querySelector(`[data-note-id="${id}"] .note-list-preview`);
        if (prev) prev.textContent = plainPreview(html);
        const titleEl = root.querySelector(`[data-note-id="${id}"] .note-list-title`);
        if (titleEl) titleEl.textContent = title || "Untitled";
      }, 450);
    }

    function createNote() {
      const note = {
        id: CL.uid("note"),
        title: "Untitled",
        html: "",
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      saveItem(note);
      activeId = note.id;
      CL.storage.set("notesActiveId", activeId, { skipSync: true });
      CL.toast("New note");
      paint();
    }

    function paint() {
      const items = listItems();
      if (activeId && !items.some((n) => n.id === activeId)) {
        activeId = items[0] ? items[0].id : null;
        CL.storage.set("notesActiveId", activeId, { skipSync: true });
      }
      if (!activeId && items[0]) {
        activeId = items[0].id;
        CL.storage.set("notesActiveId", activeId, { skipSync: true });
      }

      const note = currentNote();
      const synced = CL.sync && CL.sync.isJoined && CL.sync.isJoined();

      root.innerHTML = `
        <section class="page notes-page">
          <div class="row-between" style="margin-bottom:8px">
            <div>
              <h1 class="page-title" style="margin:0">Notes</h1>
              <p class="page-sub" style="margin:4px 0 0">Scratch paper · shared${synced ? " live" : ""}</p>
            </div>
            <button type="button" class="btn btn-primary btn-sm" id="note-new">+ Note</button>
          </div>

          <div class="notes-layout">
            <aside class="notes-list-panel">
              ${
                items.length
                  ? items
                      .map(
                        (n) => `
                <button type="button" class="note-list-item ${n.id === activeId ? "active" : ""}" data-note-id="${CL.escapeHtml(n.id)}">
                  <div class="note-list-title">${CL.escapeHtml(n.title || "Untitled")}</div>
                  <div class="note-list-preview">${CL.escapeHtml(plainPreview(n.html))}</div>
                  <div class="note-list-meta">${CL.escapeHtml(formatDate(n.updatedAt))}</div>
                </button>`
                      )
                      .join("")
                  : `<p class="card-meta notes-empty-list">No notes yet. Tap + Note.</p>`
              }
            </aside>

            <div class="notes-editor-panel">
              ${
                note
                  ? `
                <div class="notes-paper">
                  <div class="notes-toolbar" role="toolbar" aria-label="Formatting">
                    <button type="button" class="notes-tool" data-cmd="bold" title="Bold"><strong>B</strong></button>
                    <button type="button" class="notes-tool" data-cmd="italic" title="Italic"><em>I</em></button>
                    <button type="button" class="notes-tool" data-cmd="strikeThrough" title="Strikethrough"><s>S</s></button>
                    <button type="button" class="notes-tool" data-cmd="insertUnorderedList" title="Bullets">• List</button>
                    <div class="notes-tool-sep"></div>
                    <label class="notes-color-wrap" title="Text color">
                      <span class="notes-color-label">A</span>
                      <select id="note-color" class="notes-color-select" aria-label="Font color">
                        ${COLORS.map(
                          (c) =>
                            `<option value="${CL.escapeHtml(c.value)}">${CL.escapeHtml(c.label)}</option>`
                        ).join("")}
                      </select>
                    </label>
                    <button type="button" class="notes-tool notes-tool-ghost" id="note-delete" title="Delete note">Delete</button>
                  </div>
                  <input type="text" class="notes-title-input" id="note-title" value="${CL.escapeHtml(
                    note.title || ""
                  )}" placeholder="Title" maxlength="120" autocomplete="off" />
                  <div
                    class="notes-body"
                    id="note-body"
                    contenteditable="true"
                    role="textbox"
                    aria-multiline="true"
                    data-placeholder="Start scribbling…"
                  >${note.html || ""}</div>
                  <div class="notes-footer">
                    <span id="note-save-status">${synced ? "Syncs with Couple Group" : "Saved on this device"}</span>
                  </div>
                </div>`
                  : `
                <div class="notes-paper notes-paper-empty">
                  <p class="card-meta">Pick a note or create one — it feels like scratch paper, and both of you can edit when the Couple Group is linked.</p>
                  <button type="button" class="btn btn-primary" id="note-new-empty">+ New note</button>
                </div>`
              }
            </div>
          </div>
        </section>
      `;

      root.querySelector("#note-new")?.addEventListener("click", createNote);
      root.querySelector("#note-new-empty")?.addEventListener("click", createNote);

      root.querySelectorAll(".note-list-item").forEach((btn) => {
        btn.addEventListener("click", () => {
          activeId = btn.dataset.noteId;
          CL.storage.set("notesActiveId", activeId, { skipSync: true });
          paint();
        });
      });

      if (!note) return;

      const titleEl = root.querySelector("#note-title");
      const bodyEl = root.querySelector("#note-body");
      const statusEl = root.querySelector("#note-save-status");

      function bumpStatus() {
        if (statusEl) {
          statusEl.textContent = synced ? "Saving…" : "Saving…";
          clearTimeout(bumpStatus._t);
          bumpStatus._t = setTimeout(() => {
            if (statusEl) {
              statusEl.textContent = synced ? "Saved · Couple Group" : "Saved on this device";
            }
          }, 600);
        }
      }

      const onEdit = () => {
        bumpStatus();
        scheduleSave(titleEl.value.trim() || "Untitled", bodyEl.innerHTML);
      };

      titleEl.addEventListener("input", onEdit);
      bodyEl.addEventListener("input", onEdit);

      // Keep caret inside paper; strip paste junk to basic rich text
      bodyEl.addEventListener("paste", (e) => {
        e.preventDefault();
        const text = (e.clipboardData || window.clipboardData).getData("text/html") ||
          (e.clipboardData || window.clipboardData).getData("text/plain");
        if (/<[a-z][\s\S]*>/i.test(text)) {
          // Prefer plain text for safety/simplicity on paste
          const plain = (e.clipboardData || window.clipboardData).getData("text/plain");
          exec("insertText", plain);
        } else {
          exec("insertText", text);
        }
        onEdit();
      });

      root.querySelectorAll(".notes-tool[data-cmd]").forEach((btn) => {
        btn.addEventListener("mousedown", (e) => {
          e.preventDefault(); // keep selection in contenteditable
        });
        btn.addEventListener("click", () => {
          bodyEl.focus();
          exec(btn.dataset.cmd);
          onEdit();
        });
      });

      const colorSel = root.querySelector("#note-color");
      colorSel?.addEventListener("change", () => {
        bodyEl.focus();
        exec("styleWithCSS", true);
        exec("foreColor", colorSel.value);
        onEdit();
      });

      root.querySelector("#note-delete")?.addEventListener("click", () => {
        if (!confirm("Delete this note?")) return;
        clearTimeout(saveTimer);
        deleteItem(note.id);
        activeId = null;
        CL.storage.set("notesActiveId", null, { skipSync: true });
        CL.toast("Note deleted");
        paint();
      });
    }

    function onSync(e) {
      if (suppressRemote) return;
      if (e.detail && e.detail.key === "notes") {
        const ae = document.activeElement;
        if (ae && (ae.id === "note-title" || ae.id === "note-body" || ae.isContentEditable)) {
          // Soft-refresh list titles only if not typing — full paint would steal focus
          return;
        }
        paint();
      }
    }

    window.addEventListener("cl-sync-update", onSync);
    paint();
  }

  global.CL = global.CL || {};
  global.CL.sections = global.CL.sections || {};
  global.CL.sections.notes = { render };
})(window);
