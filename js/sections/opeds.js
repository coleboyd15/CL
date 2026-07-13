/* Boredom section — daily short essays (storage key remains "opeds" for Couple Group sync) */
(function (global) {
  function getPrefs() {
    return CL.storage.get("opeds", { likes: {}, dislikes: {} });
  }

  function setPrefs(p) {
    CL.storage.set("opeds", p);
  }

  function articleIndex() {
    if (CL.opedsApi && typeof CL.opedsApi.refreshDaily === "function") {
      return CL.opedsApi.refreshDaily();
    }
    return CL.data.opeds || CL.data.fallbackOpeds || [];
  }

  function scoreArticle(a, prefs) {
    let s = 0;
    if (prefs.likes[a.id]) s += 10;
    if (prefs.dislikes[a.id]) s -= 10;
    (a.tags || []).forEach((tag) => {
      Object.keys(prefs.likes).forEach((id) => {
        const art = (CL.data.boredomLibrary || articleIndex()).find((x) => x.id === id);
        if (art && (art.tags || []).includes(tag)) s += 1;
      });
      Object.keys(prefs.dislikes).forEach((id) => {
        const art = (CL.data.boredomLibrary || articleIndex()).find((x) => x.id === id);
        if (art && (art.tags || []).includes(tag)) s -= 1;
      });
    });
    return s;
  }

  function formatDate(iso) {
    if (!iso) return "";
    try {
      const d = new Date(iso + "T12:00:00");
      if (Number.isNaN(d.getTime())) return String(iso).slice(0, 10);
      return d.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric"
      });
    } catch {
      return String(iso).slice(0, 10);
    }
  }

  function bodyHtml(paragraphs) {
    return (paragraphs || [])
      .map((p) => `<p>${CL.escapeHtml(p)}</p>`)
      .join("");
  }

  function previewText(paragraphs) {
    return (paragraphs || []).join(" ").slice(0, 180) + ((paragraphs || []).join(" ").length > 180 ? "…" : "");
  }

  function render(root) {
    let openId = null;

    function paint() {
      const prefs = getPrefs();
      const list = articleIndex()
        .slice()
        .sort((a, b) => scoreArticle(b, prefs) - scoreArticle(a, prefs));
      const dayLabel = formatDate(list[0] && list[0].published) || "Today";

      root.innerHTML = `
        <section class="page">
          <h1 class="page-title">Boredom</h1>
          <p class="page-sub">Short essays for ${CL.escapeHtml(dayLabel)} · full text in-app · like what you love</p>
          <p class="filter-hint" style="margin-bottom:14px">
            Five quick reads rotate daily (philosophy, history, sci-fi, science, America).
            Preferences sync with your Couple Group.
          </p>
          <div class="stack-sm">
            ${
              list.length
                ? list
                    .map((a) => {
                      const liked = !!prefs.likes[a.id];
                      const disliked = !!prefs.dislikes[a.id];
                      const tags = (a.tags || []).join(", ");
                      const isOpen = openId === a.id;
                      return `
                <article class="card boredom-card ${isOpen ? "is-open" : ""}" data-id="${CL.escapeHtml(a.id)}">
                  <div class="card-title">${CL.escapeHtml(a.title)}</div>
                  <div class="card-meta">
                    ${CL.escapeHtml(a.author || "")}${a.source ? " · " + CL.escapeHtml(a.source) : ""}
                    ${tags ? " · " + CL.escapeHtml(tags) : ""}
                  </div>
                  <p class="boredom-preview">${CL.escapeHtml(previewText(a.body))}</p>
                  <div class="boredom-full">${bodyHtml(a.body)}</div>
                  <div class="card-actions">
                    <button type="button" class="btn btn-secondary btn-sm btn-toggle">
                      ${isOpen ? "Collapse" : "Read in app"}
                    </button>
                    <button type="button" class="btn btn-sm ${liked ? "btn-primary" : "btn-ghost"} btn-like">👍 Like</button>
                    <button type="button" class="btn btn-sm ${disliked ? "btn-primary" : "btn-ghost"} btn-dislike">👎 Pass</button>
                  </div>
                </article>`;
                    })
                    .join("")
                : `<div class="empty"><div class="emoji">📖</div><p>No essays loaded.</p></div>`
            }
          </div>
        </section>
      `;

      root.querySelectorAll(".boredom-card").forEach((card) => {
        const id = card.dataset.id;
        card.querySelector(".btn-toggle")?.addEventListener("click", () => {
          openId = openId === id ? null : id;
          paint();
        });
        card.querySelector(".btn-like")?.addEventListener("click", () => {
          const p = getPrefs();
          delete p.dislikes[id];
          if (p.likes[id]) delete p.likes[id];
          else p.likes[id] = true;
          setPrefs(p);
          CL.toast(p.likes[id] ? "Liked — ranking updated" : "Like removed");
          paint();
        });
        card.querySelector(".btn-dislike")?.addEventListener("click", () => {
          const p = getPrefs();
          delete p.likes[id];
          if (p.dislikes[id]) delete p.dislikes[id];
          else p.dislikes[id] = true;
          setPrefs(p);
          CL.toast(p.dislikes[id] ? "Noted — ranking updated" : "Pass removed");
          paint();
        });
      });

      if (openId) {
        const openCard = root.querySelector('.boredom-card[data-id="' + openId + '"]');
        openCard?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }

    paint();
  }

  global.CL = global.CL || {};
  global.CL.sections = global.CL.sections || {};
  global.CL.sections.opeds = { render };
})(window);
