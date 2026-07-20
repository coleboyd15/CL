/* Tech vs A&M 2026 win-total betting tracker — Kalshi-style */
(function (global) {
  function render(root) {
    let loading = true;
    let data = null;
    let error = "";
    let tab = "market"; // market | tech | agm

    async function load(force) {
      loading = true;
      error = "";
      paint();
      try {
        const cached = CL.cfb.getCache();
        // Bust cache if it still has the old wrong ESPN id (264 = Washington)
        const badCache =
          !cached ||
          !cached.tech ||
          String(cached.tech.espnId) !== "2641" ||
          /washington/i.test(cached.tech.displayName || "") ||
          (cached.lines && cached.lines.tech && Number(cached.lines.tech.line) <= 8);
        data = await CL.cfb.loadTracker({
          force: !!force || badCache,
          season: 2026
        });
      } catch (err) {
        error = err.message || "Could not load tracker";
        const cached = CL.cfb.getCache();
        if (
          cached &&
          cached.tech &&
          String(cached.tech.espnId) === "2641" &&
          cached.lines &&
          cached.lines.tech &&
          Number(cached.lines.tech.line) > 8
        ) {
          data = cached;
        } else {
          data = null;
        }
      } finally {
        loading = false;
        paint();
      }
    }

    function sparklineSvg(history) {
      const pts = (history || []).slice(-30);
      if (pts.length < 2) {
        return `<div class="cfb-chart-empty">Trend builds as odds are checked each day.</div>`;
      }
      const w = 320;
      const h = 120;
      const pad = 12;
      const xs = pts.map((_, i) => pad + (i * (w - pad * 2)) / (pts.length - 1));
      const techYs = pts.map((p) => {
        const v = p.techCents != null ? p.techCents : 50;
        return pad + (1 - v / 100) * (h - pad * 2);
      });
      const agmYs = pts.map((p) => {
        const v = p.agmCents != null ? p.agmCents : 50;
        return pad + (1 - v / 100) * (h - pad * 2);
      });
      function path(ys) {
        return ys.map((y, i) => (i === 0 ? "M" : "L") + xs[i].toFixed(1) + "," + y.toFixed(1)).join(" ");
      }
      const lastT = pts[pts.length - 1].techCents;
      const lastA = pts[pts.length - 1].agmCents;
      return `
        <svg class="cfb-chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="Implied odds trend">
          <line x1="${pad}" y1="${h / 2}" x2="${w - pad}" y2="${h / 2}" class="cfb-chart-mid" />
          <path d="${path(techYs)}" class="cfb-chart-tech" fill="none" />
          <path d="${path(agmYs)}" class="cfb-chart-agm" fill="none" />
          <circle cx="${xs[xs.length - 1]}" cy="${techYs[techYs.length - 1]}" r="3.5" class="cfb-chart-tech-dot" />
          <circle cx="${xs[xs.length - 1]}" cy="${agmYs[agmYs.length - 1]}" r="3.5" class="cfb-chart-agm-dot" />
          <text x="${pad}" y="${pad + 4}" class="cfb-chart-label">100¢</text>
          <text x="${pad}" y="${h - 4}" class="cfb-chart-label">0¢</text>
          <text x="${w - pad - 70}" y="${pad + 4}" class="cfb-chart-label">TTU ${lastT}¢ · A&M ${lastA}¢</text>
        </svg>`;
    }

    function teamCard(team, lines) {
      const overImp = CL.cfb.americanToImplied(lines.overOdds);
      const underImp = CL.cfb.americanToImplied(lines.underOdds);
      const fair = overImp + underImp || 1;
      const overPct = formatPctLocal(overImp / fair);
      const underPct = formatPctLocal(underImp / fair);
      const mu = CL.cfb.expectedWins(lines.line, lines.overOdds, lines.underOdds);

      return `
        <div class="cfb-team-odds">
          <div class="cfb-team-odds-head">
            ${
              team.logo
                ? `<img src="${CL.escapeHtml(team.logo)}" alt="" class="cfb-logo" width="40" height="40" />`
                : `<div class="cfb-logo-fallback">${CL.escapeHtml(team.short || "?")}</div>`
            }
            <div>
              <div class="cfb-team-name">${CL.escapeHtml(team.name || team.displayName)}</div>
              <div class="card-meta">${CL.escapeHtml(team.conf || "")} · ${CL.escapeHtml(
                team.record || "0-0"
              )}</div>
            </div>
          </div>
          <div class="cfb-line-hero">
            <div class="cfb-line-label">2026 Win total</div>
            <div class="cfb-line-value">${CL.escapeHtml(String(lines.line))}</div>
            <div class="card-meta">Exp. wins ≈ ${mu.toFixed(2)}</div>
          </div>
          <div class="cfb-ou-grid">
            <div class="cfb-ou-cell">
              <div class="cfb-ou-side">Over ${CL.escapeHtml(String(lines.line))}</div>
              <div class="cfb-ou-odds">${CL.escapeHtml(CL.cfb.formatAmerican(lines.overOdds))}</div>
              <div class="cfb-ou-pct">${overPct} impl.</div>
            </div>
            <div class="cfb-ou-cell">
              <div class="cfb-ou-side">Under ${CL.escapeHtml(String(lines.line))}</div>
              <div class="cfb-ou-odds">${CL.escapeHtml(CL.cfb.formatAmerican(lines.underOdds))}</div>
              <div class="cfb-ou-pct">${underPct} impl.</div>
            </div>
          </div>
          <div class="card-meta" style="margin-top:8px">${CL.escapeHtml(lines.book || "Consensus")}</div>
        </div>`;
    }

    function linesAsOfLabel(d) {
      if (!d || !d.lines || !d.lines.asOf) return "";
      try {
        return new Date(d.lines.asOf).toLocaleString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit"
        });
      } catch {
        return "";
      }
    }

    function formatPctLocal(p) {
      return CL.cfb.formatPct(p);
    }

    function scheduleHtml(team) {
      const games = team.games || [];
      if (!games.length) {
        return `<p class="card-meta">Schedule not available yet for this season (ESPN). Pull-to-refresh later.</p>`;
      }
      return `
        <div class="cfb-sched-list">
          ${games
            .map((g) => {
              const badge =
                g.done && g.result
                  ? `<span class="cfb-result ${g.result === "W" ? "win" : g.result === "L" ? "loss" : ""}">${CL.escapeHtml(
                      g.result
                    )}${g.score ? " " + CL.escapeHtml(g.score) : ""}</span>`
                  : `<span class="cfb-ha">${CL.escapeHtml(g.homeAway === "home" ? "HOME" : "AWAY")}</span>`;
              return `
              <article class="cfb-game-row">
                <div class="cfb-game-when">
                  <div class="cfb-game-date">${CL.escapeHtml(g.dateLabel || "")}</div>
                  <div class="card-meta">${CL.escapeHtml(g.timeLabel || "")}</div>
                </div>
                ${
                  g.opponentLogo
                    ? `<img src="${CL.escapeHtml(g.opponentLogo)}" alt="" class="cfb-opp-logo" width="28" height="28" />`
                    : `<div class="cfb-opp-logo cfb-logo-fallback sm">?</div>`
                }
                <div class="cfb-game-main">
                  <div class="cfb-game-opp">${g.homeAway === "home" ? "vs" : "@"} ${CL.escapeHtml(
                    g.opponent
                  )}</div>
                  <div class="card-meta">${CL.escapeHtml(g.location || g.venue || "")}${
                    g.tv ? " · " + CL.escapeHtml(g.tv) : ""
                  }</div>
                </div>
                ${badge}
              </article>`;
            })
            .join("")}
        </div>`;
    }

    function paint() {
      const updated =
        data && data.fetchedAt
          ? new Date(data.fetchedAt).toLocaleString(undefined, {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit"
            })
          : "";

      root.innerHTML = `
        <section class="page cfb-tracker-page">
          <div class="row-between" style="align-items:flex-start;gap:10px;margin-bottom:6px">
            <div>
              <h1 class="page-title" style="margin:0">Tech vs A&amp;M</h1>
              <p class="page-sub" style="margin:4px 0 0">2026 regular season · win totals &amp; who wins more</p>
            </div>
            <button type="button" class="btn btn-secondary btn-sm" id="cfb-refresh" ${loading ? "disabled" : ""}>
              ${loading ? "Updating…" : "Update"}
            </button>
          </div>
          ${
            updated
              ? `<p class="filter-hint" style="margin-bottom:12px">Updated ${CL.escapeHtml(updated)}${
                  data.fromCache ? " · cached" : ""
                }</p>`
              : ""
          }

          ${
            loading && !data
              ? `<div class="empty"><div class="spinner spinner-lg"></div><p>Loading lines &amp; schedules…</p></div>`
              : ""
          }
          ${error && !data ? `<div class="card"><p class="card-meta">${CL.escapeHtml(error)}</p></div>` : ""}

          ${
            data
              ? `
          <div class="cfb-market card">
            <div class="cfb-market-q">Who will win more regular-season games in 2026?</div>
            <div class="cfb-market-sub">Implied from each team’s win-total O/U (Monte Carlo)</div>
            <div class="cfb-binary">
              <div class="cfb-binary-side tech">
                <div class="cfb-binary-name">Texas Tech</div>
                <div class="cfb-binary-cents">${data.market.techCents}¢</div>
                <div class="cfb-binary-pct">${formatPctLocal(data.market.techProb)}</div>
              </div>
              <div class="cfb-binary-bar" aria-hidden="true">
                <div class="cfb-binary-fill tech" style="width:${data.market.techCents}%"></div>
              </div>
              <div class="cfb-binary-side agm">
                <div class="cfb-binary-name">Texas A&amp;M</div>
                <div class="cfb-binary-cents">${data.market.agmCents}¢</div>
                <div class="cfb-binary-pct">${formatPctLocal(data.market.agmProb)}</div>
              </div>
            </div>
            <p class="card-meta" style="margin-top:10px">
              Exp. wins: Tech ${data.sim.muTech} · A&amp;M ${data.sim.muAgm}
              · P(tie) ${(data.sim.pTie * 100).toFixed(1)}% (excluded from ¢ prices)
            </p>
          </div>

          <div class="card section-block">
            <div class="section-label">Trend (daily snapshots)</div>
            ${sparklineSvg(data.history || CL.cfb.getHistory())}
            <div class="cfb-legend">
              <span><i class="cfb-dot tech"></i> Tech ¢</span>
              <span><i class="cfb-dot agm"></i> A&amp;M ¢</span>
            </div>
          </div>

          <div class="section-label">2026 regular-season win totals</div>
          <p class="filter-hint" style="margin-bottom:8px">
            Source: ${CL.escapeHtml(data.lines.source === "live" ? "Live public odds pages" : "Published consensus")}
            ${linesAsOfLabel(data) ? " · " + CL.escapeHtml(linesAsOfLabel(data)) : ""}
          </p>
          <div class="cfb-odds-grid section-block">
            ${teamCard(data.tech, data.lines.tech)}
            ${teamCard(data.agm, data.lines.agm)}
          </div>
          ${
            data.lines.note
              ? `<p class="filter-hint">${CL.escapeHtml(data.lines.note)}</p>`
              : ""
          }

          <div class="tabs" role="tablist" style="margin-top:14px">
            <button type="button" class="tab ${tab === "market" ? "active" : ""}" data-tab="market">How it works</button>
            <button type="button" class="tab ${tab === "tech" ? "active" : ""}" data-tab="tech">Tech schedule</button>
            <button type="button" class="tab ${tab === "agm" ? "active" : ""}" data-tab="agm">A&amp;M schedule</button>
          </div>
          <div class="card" style="margin-top:10px">
            ${
              tab === "market"
                ? `<p class="review-text" style="font-style:normal;margin:0">
                    Each team’s <strong>win total</strong> O/U and American odds convert to an expected win total.
                    We simulate many seasons to estimate who finishes with more wins, then show Kalshi-style
                    prices in cents (probability × 100). Schedules and records pull from ESPN and refresh on open
                    (and when you tap Update). Odds history saves one point per day on this device.
                  </p>`
                : tab === "tech"
                  ? `<div class="cfb-sched-head">
                      ${data.tech.logo ? `<img src="${CL.escapeHtml(data.tech.logo)}" class="cfb-logo" width="36" height="36" alt="" />` : ""}
                      <div>
                        <div class="card-title">${CL.escapeHtml(data.tech.name)}</div>
                        <div class="card-meta">2026 · ${CL.escapeHtml(data.tech.record)} (${data.tech.wins}-${data.tech.losses})</div>
                      </div>
                    </div>
                    ${scheduleHtml(data.tech)}`
                  : `<div class="cfb-sched-head">
                      ${data.agm.logo ? `<img src="${CL.escapeHtml(data.agm.logo)}" class="cfb-logo" width="36" height="36" alt="" />` : ""}
                      <div>
                        <div class="card-title">${CL.escapeHtml(data.agm.name)}</div>
                        <div class="card-meta">2026 · ${CL.escapeHtml(data.agm.record)} (${data.agm.wins}-${data.agm.losses})</div>
                      </div>
                    </div>
                    ${scheduleHtml(data.agm)}`
            }
          </div>
          ${
            data.scheduleError
              ? `<p class="filter-hint" style="margin-top:8px">Schedule note: ${CL.escapeHtml(
                  data.scheduleError
                )}</p>`
              : ""
          }
          `
              : ""
          }
        </section>
      `;

      root.querySelector("#cfb-refresh")?.addEventListener("click", () => load(true));
      root.querySelectorAll(".tab[data-tab]").forEach((t) => {
        t.addEventListener("click", () => {
          tab = t.dataset.tab;
          paint();
        });
      });
    }

    paint();
    load(false);
  }

  global.CL = global.CL || {};
  global.CL.sections = global.CL.sections || {};
  global.CL.sections.cfb = { render };
})(window);
