/* Daily narrative News section */
(function (global) {
  function render(root) {
    let loading = true;
    let edition = null;
    let error = "";

    async function load(force) {
      loading = true;
      error = "";
      paint();
      try {
        edition = await CL.news.getDailyEdition({ force: !!force });
      } catch (err) {
        error = err.message || "Could not load today's briefing";
        edition = CL.news.getCached();
      } finally {
        loading = false;
        paint();
      }
    }

    function paint() {
      const syncedNote =
        CL.sync && CL.sync.isJoined && CL.sync.isJoined()
          ? "Couple Group is separate — this briefing is per device & refreshes daily."
          : "Refreshes on open when the calendar day changes (morning-friendly).";

      root.innerHTML = `
        <section class="page news-page">
          <div class="row-between" style="align-items:flex-start;gap:10px;margin-bottom:8px">
            <div>
              <h1 class="page-title" style="margin:0">News</h1>
              <p class="page-sub" style="margin:4px 0 0">Your daily story · ~5 min · curiosity over clickbait</p>
            </div>
            <button type="button" class="btn btn-secondary btn-sm" id="news-refresh" ${loading ? "disabled" : ""}>
              ${loading ? "Loading…" : "Refresh"}
            </button>
          </div>

          ${
            loading && !edition
              ? `<div class="empty news-loading"><div class="spinner spinner-lg"></div><p>Gathering today's briefing…</p></div>`
              : ""
          }

          ${error && !edition ? `<div class="card"><p class="card-meta">${CL.escapeHtml(error)}</p></div>` : ""}

          ${
            edition
              ? `
            <article class="card news-story">
              <div class="news-kicker">
                ${CL.escapeHtml(edition.title || "Today's briefing")}
                · ~${edition.readMinutes || 5} min
                ${edition.fromCache ? " · saved" : " · fresh"}
              </div>
              ${
                edition.note
                  ? `<p class="card-meta" style="margin-bottom:10px">${CL.escapeHtml(edition.note)}</p>`
                  : ""
              }
              <div class="news-body">
                ${(edition.parts || [])
                  .map((p) => {
                    if (p.type === "intro" || p.type === "outro") {
                      return `<p class="news-prose news-${p.type}">${CL.escapeHtml(p.text)}</p>`;
                    }
                    return `
                      <section class="news-segment">
                        <div class="news-seg-label">${CL.escapeHtml(
                          String(p.index || "")
                        )}. ${CL.escapeHtml((p.category || "story").replace(/_/g, " "))}</div>
                        <h2 class="news-seg-title">${CL.escapeHtml(p.title || "")}</h2>
                        ${p.hook ? `<p class="news-hook">${CL.escapeHtml(p.hook)}</p>` : ""}
                        <p class="news-prose">${CL.escapeHtml(p.body || "")}</p>
                      </section>`;
                  })
                  .join("")}
              </div>
              <p class="filter-hint" style="margin-top:14px">${CL.escapeHtml(syncedNote)}</p>
            </article>

            <div class="section-block" style="margin-top:16px">
              <div class="section-label">Topics in today's loop</div>
              <div class="chips">
                ${(edition.segments || [])
                  .map(
                    (s) =>
                      `<span class="chip active">${CL.escapeHtml(
                        (s.category || "").replace(/_/g, " ")
                      )}</span>`
                  )
                  .join("")}
              </div>
            </div>`
              : !loading
                ? `<div class="empty"><div class="emoji">📰</div><p>No briefing yet. Tap Refresh.</p></div>`
                : ""
          }
        </section>
      `;

      root.querySelector("#news-refresh")?.addEventListener("click", () => load(true));
    }

    paint();
    load(false);
  }

  global.CL = global.CL || {};
  global.CL.sections = global.CL.sections || {};
  global.CL.sections.news = { render };
})(window);
