(function (global) {
  function getPrefs() {
    return CL.storage.get("opeds", { likes: {}, dislikes: {} });
  }

  function setPrefs(p) {
    CL.storage.set("opeds", p);
  }

  function scoreArticle(a, prefs) {
    let s = 0;
    if (prefs.likes[a.id]) s += 10;
    if (prefs.dislikes[a.id]) s -= 10;
    (a.tags || []).forEach((tag) => {
      Object.keys(prefs.likes).forEach((id) => {
        const art = (CL.data.opeds || []).find((x) => x.id === id);
        if (art && (art.tags || []).includes(tag)) s += 1;
      });
      Object.keys(prefs.dislikes).forEach((id) => {
        const art = (CL.data.opeds || []).find((x) => x.id === id);
        if (art && (art.tags || []).includes(tag)) s -= 1;
      });
    });
    return s;
  }

  function render(root) {
    function paint() {
      const prefs = getPrefs();
      const list = (CL.data.opeds || [])
        .slice()
        .sort((a, b) => scoreArticle(b, prefs) - scoreArticle(a, prefs));

      root.innerHTML = `
        <section class="page">
          <h1 class="page-title">Today's OpEds</h1>
          <p class="page-sub">Mock picks · like/dislike teaches preferences</p>
          <div class="stack-sm">
            ${list
              .map((a) => {
                const liked = !!prefs.likes[a.id];
                const disliked = !!prefs.dislikes[a.id];
                return `
                <article class="card" data-id="${CL.escapeHtml(a.id)}">
                  <div class="card-title">${CL.escapeHtml(a.title)}</div>
                  <div class="card-meta">${CL.escapeHtml(a.source)} · ${(a.tags || []).join(", ")}</div>
                  <div class="card-actions">
                    <a class="btn btn-secondary btn-sm" href="${CL.escapeHtml(a.url)}" target="_blank" rel="noopener">Open</a>
                    <button type="button" class="btn btn-sm ${liked ? "btn-primary" : "btn-ghost"} btn-like">👍 Like</button>
                    <button type="button" class="btn btn-sm ${disliked ? "btn-primary" : "btn-ghost"} btn-dislike">👎 Pass</button>
                  </div>
                </article>`;
              })
              .join("")}
          </div>
        </section>
      `;

      root.querySelectorAll(".card").forEach((card) => {
        const id = card.dataset.id;
        card.querySelector(".btn-like").addEventListener("click", () => {
          const p = getPrefs();
          delete p.dislikes[id];
          if (p.likes[id]) delete p.likes[id];
          else p.likes[id] = true;
          setPrefs(p);
          CL.toast(p.likes[id] ? "Liked — ranking updated" : "Like removed");
          paint();
        });
        card.querySelector(".btn-dislike").addEventListener("click", () => {
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
  }

  global.CL = global.CL || {};
  global.CL.sections = global.CL.sections || {};
  global.CL.sections.opeds = { render };
})(window);
