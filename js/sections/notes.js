/* Shared Notes — Apple Notes–style list + editor, Couple Group sync via "notes" */
(function (global) {
  const COLORS = [
    { id: "ink", label: "Default", value: "#1c1c1e" },
    { id: "navy", label: "Navy", value: "#0a3161" },
    { id: "red", label: "Red", value: "#b22234" },
    { id: "blue", label: "Blue", value: "#007aff" },
    { id: "green", label: "Green", value: "#248a3d" },
    { id: "purple", label: "Purple", value: "#8944ab" },
    { id: "orange", label: "Orange", value: "#c93400" },
    { id: "gray", label: "Gray", value: "#8e8e93" }
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
    const items = (data.items || []).slice();
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
    return text || "No additional text";
  }

  function formatRelative(ts) {
    if (!ts) return "";
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return "";
    const now = new Date();
    const sameDay =
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYday =
      d.getFullYear() === yesterday.getFullYear() &&
      d.getMonth() === yesterday.getMonth() &&
      d.getDate() === yesterday.getDate();

    if (sameDay) {
      return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    }
    if (isYday) return "Yesterday";
    if (d.getFullYear() === now.getFullYear()) {
      return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    }
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  }

  function exec(cmd, value) {
    try {
      document.execCommand(cmd, false, value != null ? value : null);
    } catch (err) {
      console.warn("format", cmd, err);
    }
  }

  function render(root) {
    // null = list; id = open editor for that note
    let viewId = CL.storage.get("notesActiveId", null);
    let saveTimer = null;
    let suppressRemote = false;
    let searchQ = "";

    function goList() {
      // Flush pending save before leaving editor
      clearTimeout(saveTimer);
      viewId = null;
      CL.storage.set("notesActiveId", null, { skipSync: true });
      paint();
    }

    function goNote(id) {
      viewId = id;
      CL.storage.set("notesActiveId", id, { skipSync: true });
      paint();
      // Focus body after open for quick typing
      requestAnimationFrame(() => {
        const body = root.querySelector("#note-body");
        if (body) {
          body.focus();
          // Place caret at end
          try {
            const range = document.createRange();
            range.selectNodeContents(body);
            range.collapse(false);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
          } catch (_) {}
        }
      });
    }

    function scheduleSave(id, title, html) {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        if (!id) return;
        const existing = listItems().find((n) => n.id === id) || {};
        const cleanTitle = (title || "").trim() || "New Note";
        suppressRemote = true;
        saveItem({
          id,
          title: cleanTitle,
          html: html || "",
          createdAt: existing.createdAt || Date.now(),
          updatedAt: Date.now()
        });
        suppressRemote = false;
        const status = root.querySelector("#note-save-status");
        if (status) {
          const synced = CL.sync && CL.sync.isJoined && CL.sync.isJoined();
          status.textContent = synced ? "Saved · Couple Group" : "Saved";
        }
      }, 400);
    }

    function createNote() {
      const note = {
        id: CL.uid("note"),
        title: "New Note",
        html: "",
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      saveItem(note);
      goNote(note.id);
    }

    function filteredItems() {
      const q = searchQ.trim().toLowerCase();
      const items = listItems();
      if (!q) return items;
      return items.filter((n) => {
        const t = (n.title || "").toLowerCase();
        const p = plainPreview(n.html).toLowerCase();
        return t.includes(q) || p.includes(q);
      });
    }

    function paintList() {
      const items = filteredItems();
      const allCount = listItems().length;
      const synced = CL.sync && CL.sync.isJoined && CL.sync.isJoined();

      root.innerHTML = `
        <section class="page notes-page notes-list-view">
          <header class="notes-topbar">
            <div>
              <h1 class="notes-screen-title">Notes</h1>
              <p class="notes-screen-sub">
                ${allCount} note${allCount === 1 ? "" : "s"}
                ${synced ? " · Shared live" : ""}
              </p>
            </div>
            <button type="button" class="notes-compose-btn" id="note-new" aria-label="New note" title="New Note">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>
              </svg>
            </button>
          </header>

          <div class="notes-search-wrap">
            <svg class="notes-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <circle cx="11" cy="11" r="7"/><path d="m20 20-3-3"/>
            </svg>
            <input type="search" id="note-search" class="notes-search" placeholder="Search" value="${CL.escapeHtml(searchQ)}" autocomplete="off" enterkeyhint="search" />
          </div>

          <div class="notes-list-scroll" role="list">
            ${
              items.length
                ? items
                    .map(
                      (n) => `
              <button type="button" class="notes-row" data-note-id="${CL.escapeHtml(n.id)}" role="listitem">
                <div class="notes-row-main">
                  <div class="notes-row-title">${CL.escapeHtml(n.title || "New Note")}</div>
                  <div class="notes-row-line">
                    <span class="notes-row-time">${CL.escapeHtml(formatRelative(n.updatedAt))}</span>
                    <span class="notes-row-preview">${CL.escapeHtml(plainPreview(n.html))}</span>
                  </div>
                </div>
                <span class="notes-row-chevron" aria-hidden="true">›</span>
              </button>`
                    )
                    .join("")
                : `
              <div class="notes-empty">
                <div class="notes-empty-icon" aria-hidden="true">📝</div>
                <p class="notes-empty-title">${searchQ ? "No matching notes" : "No Notes"}</p>
                <p class="notes-empty-sub">${
                  searchQ
                    ? "Try a different search."
                    : "Tap the compose button to write something — notes sync with your Couple Group."
                }</p>
                ${
                  !searchQ
                    ? `<button type="button" class="btn btn-primary" id="note-new-empty">New Note</button>`
                    : ""
                }
              </div>`
            }
          </div>

          <button type="button" class="notes-fab" id="note-fab" aria-label="New note">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true">
              <path d="M12 5v14M5 12h14"/>
            </svg>
          </button>
        </section>
      `;

      root.querySelector("#note-new")?.addEventListener("click", createNote);
      root.querySelector("#note-fab")?.addEventListener("click", createNote);
      root.querySelector("#note-new-empty")?.addEventListener("click", createNote);

      const search = root.querySelector("#note-search");
      search?.addEventListener("input", () => {
        searchQ = search.value;
        paintList();
        const el = root.querySelector("#note-search");
        if (el) {
          el.focus();
          const len = el.value.length;
          try {
            el.setSelectionRange(len, len);
          } catch (_) {}
        }
      });

      root.querySelectorAll(".notes-row").forEach((row) => {
        row.addEventListener("click", () => goNote(row.dataset.noteId));
      });
    }

    function paintEditor(note) {
      const synced = CL.sync && CL.sync.isJoined && CL.sync.isJoined();

      root.innerHTML = `
        <section class="page notes-page notes-editor-view">
          <header class="notes-editor-top">
            <button type="button" class="notes-back" id="note-back">
              <span aria-hidden="true">‹</span> Notes
            </button>
            <div class="notes-editor-actions">
              <span class="notes-save-pill" id="note-save-status">${synced ? "Synced" : "On device"}</span>
              <button type="button" class="notes-icon-btn" id="note-delete" aria-label="Delete note" title="Delete">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                  <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>
                </svg>
              </button>
            </div>
          </header>

          <div class="notes-toolbar" role="toolbar" aria-label="Formatting">
            <button type="button" class="notes-tool" data-cmd="bold" title="Bold"><strong>B</strong></button>
            <button type="button" class="notes-tool" data-cmd="italic" title="Italic"><em>I</em></button>
            <button type="button" class="notes-tool" data-cmd="strikeThrough" title="Strikethrough"><s>S</s></button>
            <button type="button" class="notes-tool" data-cmd="insertUnorderedList" title="Bullets">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <circle cx="4" cy="6" r="1.6"/><circle cx="4" cy="12" r="1.6"/><circle cx="4" cy="18" r="1.6"/>
                <rect x="8" y="5" width="12" height="2" rx="1"/><rect x="8" y="11" width="12" height="2" rx="1"/><rect x="8" y="17" width="12" height="2" rx="1"/>
              </svg>
            </button>
            <div class="notes-tool-sep"></div>
            <div class="notes-swatches" role="group" aria-label="Text color">
              ${COLORS.map(
                (c) =>
                  `<button type="button" class="notes-swatch" data-color="${CL.escapeHtml(
                    c.value
                  )}" title="${CL.escapeHtml(c.label)}" style="--swatch:${CL.escapeHtml(
                    c.value
                  )}" aria-label="${CL.escapeHtml(c.label)}"></button>`
              ).join("")}
            </div>
          </div>

          <div class="notes-sheet">
            <input
              type="text"
              class="notes-title-input"
              id="note-title"
              value="${CL.escapeHtml(note.title === "New Note" || note.title === "Untitled" ? "" : note.title || "")}"
              placeholder="Title"
              maxlength="120"
              autocomplete="off"
            />
            <div
              class="notes-body"
              id="note-body"
              contenteditable="true"
              role="textbox"
              aria-multiline="true"
              data-placeholder="Start writing…"
            >${note.html || ""}</div>
          </div>
        </section>
      `;

      const titleEl = root.querySelector("#note-title");
      const bodyEl = root.querySelector("#note-body");
      const statusEl = root.querySelector("#note-save-status");
      const noteId = note.id;

      root.querySelector("#note-back")?.addEventListener("click", () => {
        // Force save then list
        clearTimeout(saveTimer);
        const t = titleEl.value.trim() || "New Note";
        const h = bodyEl.innerHTML;
        suppressRemote = true;
        saveItem({
          id: noteId,
          title: t,
          html: h,
          createdAt: note.createdAt || Date.now(),
          updatedAt: Date.now()
        });
        suppressRemote = false;
        goList();
      });

      function markSaving() {
        if (statusEl) statusEl.textContent = "Saving…";
      }

      const onEdit = () => {
        markSaving();
        scheduleSave(noteId, titleEl.value, bodyEl.innerHTML);
      };

      titleEl.addEventListener("input", onEdit);
      bodyEl.addEventListener("input", onEdit);

      bodyEl.addEventListener("paste", (e) => {
        e.preventDefault();
        const plain = (e.clipboardData || window.clipboardData).getData("text/plain");
        exec("insertText", plain);
        onEdit();
      });

      root.querySelectorAll(".notes-tool[data-cmd]").forEach((btn) => {
        btn.addEventListener("mousedown", (e) => e.preventDefault());
        btn.addEventListener("click", () => {
          bodyEl.focus();
          exec(btn.dataset.cmd);
          onEdit();
        });
      });

      root.querySelectorAll(".notes-swatch").forEach((btn) => {
        btn.addEventListener("mousedown", (e) => e.preventDefault());
        btn.addEventListener("click", () => {
          bodyEl.focus();
          exec("styleWithCSS", true);
          exec("foreColor", btn.dataset.color);
          onEdit();
        });
      });

      root.querySelector("#note-delete")?.addEventListener("click", () => {
        if (!confirm("Delete this note?")) return;
        clearTimeout(saveTimer);
        deleteItem(noteId);
        CL.toast("Note deleted");
        goList();
      });
    }

    function paint() {
      if (viewId) {
        const note = listItems().find((n) => n.id === viewId);
        if (!note) {
          viewId = null;
          CL.storage.set("notesActiveId", null, { skipSync: true });
          paintList();
          return;
        }
        paintEditor(note);
      } else {
        paintList();
      }
    }

    function onSync(e) {
      if (suppressRemote) return;
      if (e.detail && e.detail.key === "notes") {
        const ae = document.activeElement;
        if (ae && (ae.id === "note-title" || ae.id === "note-body" || ae.isContentEditable)) {
          return;
        }
        paint();
      }
    }

    window.addEventListener("cl-sync-update", onSync);

    // Open list by default when landing on Notes (unless mid-edit from same session)
    // If active id is stale, list view is cleaner for Apple-like UX on re-entry
    if (viewId && !listItems().some((n) => n.id === viewId)) {
      viewId = null;
      CL.storage.set("notesActiveId", null, { skipSync: true });
    }

    paint();
  }

  global.CL = global.CL || {};
  global.CL.sections = global.CL.sections || {};
  global.CL.sections.notes = { render };
})(window);
