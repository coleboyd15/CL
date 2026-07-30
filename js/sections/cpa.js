/* CPA Rankings — positions 1–10; only #1 is Lauren Wax, CPA with gold medal */
(function (global) {
  const SORT_KEY = "cpaRankSort";

  function render(root) {
    let sortBy = CL.storage.get(SORT_KEY, "bestLooking");
    if (sortBy !== "bestLooking" && sortBy !== "smartest") sortBy = "bestLooking";

    function paint() {
      const rows = [];
      for (let rank = 1; rank <= 10; rank++) {
        if (rank === 1) {
          rows.push(`
            <li class="cpa-list-row cpa-list-row-1">
              <span class="cpa-list-pos">1</span>
              <span class="cpa-list-medal" aria-hidden="true">🥇</span>
              <span class="cpa-list-name">Lauren Wax, CPA</span>
            </li>
          `);
        } else {
          rows.push(`
            <li class="cpa-list-row cpa-list-row-empty">
              <span class="cpa-list-pos">${rank}</span>
              <span class="cpa-list-name cpa-list-empty" aria-label="Empty"></span>
            </li>
          `);
        }
      }

      root.innerHTML = `
        <section class="page cpa-page">
          <h1 class="page-title">CPA Rankings</h1>
          <p class="page-sub">Official top 10</p>

          <div class="cpa-sort-bar">
            <span class="card-meta">Sort by</span>
            <div class="chips">
              <button type="button" class="chip ${sortBy === "bestLooking" ? "active" : ""}" data-sort="bestLooking">
                Best looking
              </button>
              <button type="button" class="chip ${sortBy === "smartest" ? "active" : ""}" data-sort="smartest">
                Smartest
              </button>
            </div>
          </div>

          <ol class="cpa-rank-list card" start="1">
            ${rows.join("")}
          </ol>
        </section>
      `;

      root.querySelectorAll("[data-sort]").forEach((btn) => {
        btn.addEventListener("click", () => {
          sortBy = btn.dataset.sort;
          CL.storage.set(SORT_KEY, sortBy);
          // Ranking never changes — Lauren stays #1 alone
          paint();
        });
      });
    }

    paint();
  }

  global.CL = global.CL || {};
  global.CL.sections = global.CL.sections || {};
  global.CL.sections.cpa = { render };
})(window);
