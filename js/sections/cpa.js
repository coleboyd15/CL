/* CPA Rankings — Lauren Wax is always #1 (gold medal). No one else appears. */
(function (global) {
  const SORT_KEY = "cpaRankSort";

  const LAUREN = {
    name: "Lauren Wax, CPA",
    title: "Certified Public Accountant",
    bestLooking: 100,
    smartest: 100
  };

  function render(root) {
    let sortBy = CL.storage.get(SORT_KEY, "bestLooking");
    if (sortBy !== "bestLooking" && sortBy !== "smartest") sortBy = "bestLooking";

    function paint() {
      const sortLabel = sortBy === "smartest" ? "Smartest" : "Best looking";

      root.innerHTML = `
        <section class="page cpa-page">
          <h1 class="page-title">CPA Rankings</h1>
          <p class="page-sub">Official standings · no debates · no runner-ups</p>

          <div class="cpa-sort-bar">
            <span class="card-meta">Sort by</span>
            <div class="chips">
              <button type="button" class="chip ${sortBy === "bestLooking" ? "active" : ""}" data-sort="bestLooking">
                💅 Best looking
              </button>
              <button type="button" class="chip ${sortBy === "smartest" ? "active" : ""}" data-sort="smartest">
                🧠 Smartest
              </button>
            </div>
          </div>

          <div class="card cpa-leader-card">
            <div class="cpa-rank-row cpa-rank-1">
              <div class="cpa-medal" aria-hidden="true">🥇</div>
              <div class="cpa-rank-num">#1</div>
              <div class="cpa-rank-info">
                <div class="card-title">${CL.escapeHtml(LAUREN.name)}</div>
                <div class="card-meta">${CL.escapeHtml(LAUREN.title)}</div>
                <div class="cpa-score-pills">
                  <span class="cpa-pill">${sortLabel}: perfect</span>
                  <span class="cpa-pill cpa-pill-gold">Undefeated</span>
                </div>
              </div>
            </div>
          </div>

          <div class="card section-block" style="margin-top:14px">
            <div class="section-label">Board notes</div>
            <ul class="cpa-notes">
              <li>Sorted by <strong>${CL.escapeHtml(sortLabel)}</strong> — Lauren remains #1.</li>
              <li>Gold medal is permanent and non-transferable.</li>
              <li>No other candidates are eligible for this ranking.</li>
            </ul>
          </div>
        </section>
      `;

      root.querySelectorAll("[data-sort]").forEach((btn) => {
        btn.addEventListener("click", () => {
          sortBy = btn.dataset.sort;
          CL.storage.set(SORT_KEY, sortBy);
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
