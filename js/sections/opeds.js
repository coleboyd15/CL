(function (global) {
  function getPrefs() {
    return CL.storage.get("opeds", { likes: {}, dislikes: {} });
  }

  function setPrefs(p) {
    CL.storage.set("opeds", p);
  }

  function articleIndex() {
    return CL.data.opeds || CL.data.fallbackOpeds || [];
  }

  function scoreArticle(a, prefs) {
    let s = 0;
    if (prefs.likes[a.id]) s += 10;
    if (prefs.dislikes[a.id]) s -= 10;
    (a.tags || []).forEach((tag) => {
      Object.keys(prefs.likes).forEach((id) => {
        const art = articleIndex().find((x) => x.id === id);
        if (art && (art.tags || []).includes(tag)) s += 1;
      });
      Object.keys(prefs.dislikes).forEach((id) => {
        const art = articleIndex().find((x) => x.id === id);
        if (art && (art.tags || []).includes(tag)) s -= 1;
      });
    });
    // Slight boost for fresher pieces when dates exist
    if (a.published) {
      const age = (Date.now() - new Date(a.published).getTime()) / (1000 * 60 * 60 * 24);
      if (!Number.isNaN(age) && age < 7) s += 2;
      else if (!Number.isNaN(age) && age < 30) s += 1;
    }
    return s;
  }

  function formatDate(iso) {
    if (!iso) return "";
    try {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return String(iso).slice(0, 10);
      return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    } catch {
      return String(iso).slice(0, 10);
    }
  }

  function render(root) {
    let loading = true;
    let meta = { source: "fallback" };

    async function loadArticles(force) {
      loading = true;
      paint();
      try {
        if (force) {
          CL.storage.remove("opedsCache");
          CL.storage.remove("opedsCache_v3");
        }
        const result = await CL.opedsApi.fetchLiveOpeds();
        meta = {
          source: result.source,
          note: result.note || "",
          fromCache: !!result.fromCache
        };
        if (result.source === "rss" && !result.fromCache) {
          CL.toast("Loaded current opinion pieces");
        }
      } catch (err) {
        console.warn("OpEds load failed:", err);
        CL.data.opeds = CL.data.fallbackOpeds || [];
        meta = { source: "fallback", note: "Couldn’t refresh feeds — showing curated picks." };
      } finally {
        loading = false;
        paint();
      }
    }

    function paint() {
      const prefs = getPrefs();
      const list = articleIndex()
        .slice()
        .sort((a, b) => scoreArticle(b, prefs) - scoreArticle(a, prefs));

      let sourceLine = "Curated picks from major outlets";
      if (meta.source === "rss") sourceLine = "Live opinion feeds · NYT, WaPo, Guardian, Atlantic";
      if (meta.source === "cache") sourceLine = "Cached live feeds · refresh anytime";
      if (meta.source === "mixed") sourceLine = "Live feeds + curated backups";
      if (meta.source === "fallback") sourceLine = "Curated opinion picks · links to major outlets";

      root.innerHTML = `
        <section class="page">
          <h1 class="page-title">Today's OpEds</h1>
          <p class="page-sub">${CL.escapeHtml(sourceLine)}</p>
          ${
            meta.note
              ? `<p class="card-meta" style="margin-bottom:12px">${CL.escapeHtml(meta.note)}</p>`
              : ""
          }
          <div class="card-actions" style="margin-bottom:14px">
            <button type="button" class="btn btn-secondary btn-sm" id="oped-refresh" ${loading ? "disabled" : ""}>
              ${loading ? "Loading…" : "Refresh articles"}
            </button>
          </div>
          <div class="stack-sm">
            ${
              loading && !list.length
                ? `<div class="empty"><div class="emoji">📰</div><p>Fetching opinion pieces…</p></div>`
                : list
                    .map((a) => {
                      const liked = !!prefs.likes[a.id];
                      const disliked = !!prefs.dislikes[a.id];
                      const tags = (a.tags || []).join(", ");
                      const date = formatDate(a.published);
                      const safeUrl = CL.escapeHtml(a.url || "#");
                      return `
                <article class="card" data-id="${CL.escapeHtml(a.id)}">
                  <div class="card-title">
                    <a class="oped-title-link" href="${safeUrl}" target="_blank" rel="noopener noreferrer">${CL.escapeHtml(a.title)}</a>
                  </div>
                  <div class="card-meta">
                    ${CL.escapeHtml(a.source)}${a.author ? " · " + CL.escapeHtml(a.author) : ""}${
                      date ? " · " + CL.escapeHtml(date) : ""
                    }${a.live ? ' · <span class="tag">Live</span>' : ""}
                    ${tags ? " · " + CL.escapeHtml(tags) : ""}
                  </div>
                  ${
                    a.summary
                      ? `<p class="review-text" style="font-style:normal;margin-top:8px">${CL.escapeHtml(a.summary)}</p>`
                      : ""
                  }
                  <div class="card-actions">
                    <a class="btn btn-secondary btn-sm" href="${safeUrl}" target="_blank" rel="noopener noreferrer">Read article ↗</a>
                    <button type="button" class="btn btn-sm ${liked ? "btn-primary" : "btn-ghost"} btn-like">👍 Like</button>
                    <button type="button" class="btn btn-sm ${disliked ? "btn-primary" : "btn-ghost"} btn-dislike">👎 Pass</button>
                  </div>
                </article>`;
                    })
                    .join("")
            }
          </div>
        </section>
      `;

      root.querySelector("#oped-refresh")?.addEventListener("click", () => loadArticles(true));

      root.querySelectorAll(".card[data-id]").forEach((card) => {
        const id = card.dataset.id;
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
    }

    paint();
    loadArticles(false);
  }

  global.CL = global.CL || {};
  global.CL.sections = global.CL.sections || {};
  global.CL.sections.opeds = { render };
})(window);
