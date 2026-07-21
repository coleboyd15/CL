/* CL Games: Golf, Darts, Spades, Gin Rummy */
(function (global) {
  const STORAGE = "games";
  const HISTORY_LIMIT = 200;
  const GAME_META = {
    golf: { emoji: "⛳", name: "Golf", blurb: "Card game · low score · first to limit loses" },
    darts: { emoji: "🎯", name: "Darts", blurb: "501 countdown · first to zero wins" },
    spades: { emoji: "♠️", name: "Spades", blurb: "Two-player · hands to a point limit" },
    gin: { emoji: "🃏", name: "Gin Rummy", blurb: "Round scores · first to limit wins" }
  };

  function load() {
    const data = CL.storage.get(STORAGE, { active: null, history: [] });
    if (!Array.isArray(data.history)) data.history = [];
    return data;
  }

  function save(data) {
    CL.storage.set(STORAGE, data);
    return data;
  }

  function defaultNames() {
    const n = CL.profile.displayNames();
    return [n.myName || "Player 1", n.partnerName || "Player 2"];
  }

  function totals(players) {
    return (players || []).map((p) => ({
      name: p.name,
      total: (p.scores || []).reduce((a, b) => a + (Number(b) || 0), 0)
    }));
  }

  function nameKey(name) {
    return String(name || "")
      .trim()
      .toLowerCase();
  }

  /** Aggregate wins, losses, points, and per-game stats from match history (localStorage). */
  function computePlayerStats(history) {
    const map = {};

    function ensure(name) {
      const key = nameKey(name);
      if (!key) return null;
      if (!map[key]) {
        map[key] = {
          name: String(name).trim(),
          key,
          played: 0,
          wins: 0,
          losses: 0,
          points: 0,
          byGame: {}
        };
        Object.keys(GAME_META).forEach((t) => {
          map[key].byGame[t] = { played: 0, wins: 0, losses: 0, points: 0 };
        });
      } else if (name && String(name).trim().length > map[key].name.length) {
        // Prefer the longer/more complete casing of the same name
        map[key].name = String(name).trim();
      }
      return map[key];
    }

    (history || []).forEach((h) => {
      const type = h.type || "unknown";
      const final = h.final || [];
      const winnerKey = nameKey(h.winner);
      const loserKey = nameKey(h.loser);
      const seen = {};
      const participants = [];

      final.forEach((p) => {
        const row = ensure(p.name);
        if (!row || seen[row.key]) return;
        seen[row.key] = true;
        participants.push(row);
        row.played += 1;
        row.points += Number(p.total) || 0;
        if (!row.byGame[type]) {
          row.byGame[type] = { played: 0, wins: 0, losses: 0, points: 0 };
        }
        row.byGame[type].played += 1;
        row.byGame[type].points += Number(p.total) || 0;
      });

      if (winnerKey && map[winnerKey]) {
        map[winnerKey].wins += 1;
        if (map[winnerKey].byGame[type]) map[winnerKey].byGame[type].wins += 1;
        // Everyone else in the match counts as a loss
        participants.forEach((row) => {
          if (row.key === winnerKey) return;
          row.losses += 1;
          if (row.byGame[type]) row.byGame[type].losses += 1;
        });
      } else if (loserKey && map[loserKey]) {
        map[loserKey].losses += 1;
        if (map[loserKey].byGame[type]) map[loserKey].byGame[type].losses += 1;
      }
    });

    return Object.values(map)
      .map((r) => ({
        ...r,
        winPct: r.played ? Math.round((r.wins / r.played) * 1000) / 10 : 0
      }))
      // Rank by wins, then win rate, then games played — not raw points (games scoring differs)
      .sort((a, b) => b.wins - a.wins || b.winPct - a.winPct || b.played - a.played);
  }

  /** Neutral match result — not phrased from one person's POV */
  function matchResultLabel(h) {
    const winner = String(h.winner || "").trim();
    const loser = String(h.loser || "").trim();
    const names = (h.final || [])
      .map((p) => String(p.name || "").trim())
      .filter(Boolean);

    if (winner && loser && nameKey(winner) !== nameKey(loser)) {
      return winner + " won against " + loser;
    }
    if (winner) {
      const opp = names.find((n) => nameKey(n) !== nameKey(winner));
      if (opp) return winner + " won against " + opp;
      return "Winner: " + winner;
    }
    if (loser) {
      const opp = names.find((n) => nameKey(n) !== nameKey(loser));
      if (opp) return opp + " won against " + loser;
      return "Lost: " + loser;
    }
    if (names.length >= 2) return names.join(" vs ");
    return "Finished";
  }

  function leaderboardHtml(players, opts) {
    opts = opts || {};
    const limit = opts.limit;
    const rows = totals(players);
    if (opts.mode === "lowest") {
      rows.sort((a, b) => a.total - b.total);
    } else {
      rows.sort((a, b) => b.total - a.total);
    }
    const best = rows[0] && rows[0].total;
    const loserName = opts.loserName || null;
    return `
      <div class="game-totals">
        ${rows
          .map((r) => {
            const isLoser = loserName
              ? r.name === loserName
              : limit != null && r.total >= limit;
            const isBest =
              !isLoser &&
              opts.mode === "lowest" &&
              r.total === best &&
              rows.some((x) => x.total !== best);
            const isLeadHigh =
              !isLoser &&
              opts.mode !== "lowest" &&
              r.total === best &&
              rows.some((x) => x.total !== best);
            const cls = isLoser ? "loser" : isBest || isLeadHigh ? "lead" : "";
            const over =
              limit != null ? ` <span class="game-limit-hint">/ ${limit}</span>` : "";
            return `
            <div class="game-total-row ${cls}">
              <span class="game-total-name">${CL.escapeHtml(r.name)}${
                isLoser ? ' <span class="tag wish">over limit</span>' : ""
              }</span>
              <span class="game-total-score">${r.total}${over}</span>
            </div>`;
          })
          .join("")}
      </div>
    `;
  }

  function historyListHtml(history, filterType, limit) {
    const max = limit != null ? limit : 12;
    const list = (history || [])
      .filter((h) => !filterType || h.type === filterType)
      .slice(0, max);
    if (!list.length) {
      return `<p class="card-meta">No finished games yet. Play a match and tap “Save to history” when it ends.</p>`;
    }
    return `
      <div class="stack-sm">
        ${list
          .map((h) => {
            const meta = GAME_META[h.type] || { emoji: "🎮", name: h.type };
            const when = h.endedAt ? new Date(h.endedAt).toLocaleString() : "";
            const scores = (h.final || [])
              .map((p) => `${p.name}: ${p.total}`)
              .join(" · ");
            const resultLabel = matchResultLabel(h);
            return `
              <article class="card game-history-card">
                <div class="row-between">
                  <div class="card-title" style="font-size:0.95rem">${meta.emoji} ${CL.escapeHtml(meta.name)}</div>
                </div>
                <div class="card-meta" style="font-weight:600;color:var(--text)">${CL.escapeHtml(resultLabel)}</div>
                <div class="card-meta">${CL.escapeHtml(scores)}</div>
                <div class="card-meta">${CL.escapeHtml(when)}</div>
              </article>`;
          })
          .join("")}
      </div>
    `;
  }

  function standingsHtml(stats, opts) {
    opts = opts || {};
    const rows = (stats || []).slice(0, opts.limit || 20);
    if (!rows.length) {
      return `<p class="card-meta">No wins recorded yet. Finish a game to build standings.</p>`;
    }
    return `
      <div class="game-standings">
        <div class="game-standings-head">
          <span>Player</span>
          <span>W</span>
          <span>L</span>
          <span>Win%</span>
        </div>
        ${rows
          .map((r, i) => {
            const rankCls = i === 0 ? "rank-1" : i === 1 ? "rank-2" : "";
            return `
            <div class="game-standings-row ${rankCls}">
              <span class="game-standings-name">
                <span class="game-standings-rank">${i + 1}</span>
                ${CL.escapeHtml(r.name)}
                <span class="card-meta game-standings-played">${r.played} played</span>
              </span>
              <span class="game-stat-w">${r.wins}</span>
              <span>${r.losses}</span>
              <span>${r.winPct}%</span>
            </div>`;
          })
          .join("")}
      </div>
    `;
  }

  function perGameBreakdownHtml(stats) {
    if (!stats.length) return "";
    const types = Object.keys(GAME_META);
    return `
      <div class="stack-sm">
        ${types
          .map((type) => {
            const meta = GAME_META[type];
            const players = stats
              .map((s) => ({
                name: s.name,
                ...(s.byGame[type] || { played: 0, wins: 0, losses: 0, points: 0 })
              }))
              .filter((p) => p.played > 0)
              .sort((a, b) => b.wins - a.wins || b.played - a.played);
            if (!players.length) {
              return `
                <div class="card game-history-card">
                  <div class="card-title" style="font-size:0.95rem">${meta.emoji} ${CL.escapeHtml(meta.name)}</div>
                  <p class="card-meta">No finished matches yet.</p>
                </div>`;
            }
            return `
              <div class="card game-history-card">
                <div class="card-title" style="font-size:0.95rem">${meta.emoji} ${CL.escapeHtml(meta.name)}</div>
                <div class="game-bygame-list">
                  ${players
                    .map((p) => {
                      const pct = p.played ? Math.round((p.wins / p.played) * 1000) / 10 : 0;
                      return `
                        <div class="game-bygame-row">
                          <span>${CL.escapeHtml(p.name)}</span>
                          <span class="card-meta">${p.wins}W · ${p.losses}L · ${pct}%</span>
                        </div>`;
                    })
                    .join("")}
                </div>
              </div>`;
          })
          .join("")}
      </div>
    `;
  }

  function finishGame(active, winnerName, loserName) {
    const data = load();
    const final = totals(active.players);
    const record = {
      id: CL.uid("gm"),
      type: active.type,
      winner: winnerName || "",
      loser: loserName || "",
      final,
      limit: active.limit,
      startScore: active.startScore,
      holes: active.holes,
      rounds: active.round || (active.players[0] && active.players[0].scores.length) || 0,
      endedAt: Date.now(),
      startedAt: active.startedAt
    };
    data.history = [record].concat(data.history || []).slice(0, HISTORY_LIMIT);
    data.active = null;
    save(data);
    return record;
  }

  /** Golf card game: first player to reach/exceed limit loses. If several in one hand, highest total loses. */
  function checkGolfLoser(active) {
    if (!active || active.type !== "golf" || !active.limit) return null;
    const hit = totals(active.players).filter((p) => p.total >= active.limit);
    if (!hit.length) return null;
    hit.sort((a, b) => b.total - a.total);
    return hit[0].name;
  }

  function golfWinnerWhenLoser(active, loserName) {
    const safe = totals(active.players)
      .filter((p) => p.name !== loserName)
      .sort((a, b) => a.total - b.total);
    return safe[0] ? safe[0].name : "";
  }

  function checkWinner(active) {
    if (!active || !active.limit) return null;
    const t = totals(active.players);

    if (active.type === "golf") return null;

    if (active.type === "darts") {
      return null;
    }

    // Spades & Gin: first to reach limit
    const hit = t.filter((p) => p.total >= active.limit);
    if (!hit.length) return null;
    hit.sort((a, b) => b.total - a.total);
    return hit[0].name;
  }

  /* ---------- SETUP UI ---------- */
  function setupFormHtml(type) {
    const names = defaultNames();
    const meta = GAME_META[type];

    if (type === "golf") {
      return `
        <div class="form-stack">
          <p class="card-meta">Golf (cards): lowest total is best. Score each hand. First to reach the point limit <strong>loses</strong>.</p>
          <div class="field">
            <label>Players (2–6)</label>
            <select id="g-count">
              <option value="2" selected>2</option>
              <option value="3">3</option>
              <option value="4">4</option>
              <option value="5">5</option>
              <option value="6">6</option>
            </select>
          </div>
          <div id="g-names"></div>
          <div class="field">
            <label>Point limit (first to reach/exceed loses)</label>
            <select id="g-limit">
              <option value="50">50</option>
              <option value="100" selected>100</option>
              <option value="150">150</option>
              <option value="200">200</option>
              <option value="250">250</option>
            </select>
          </div>
          <div class="field">
            <label>Or custom limit</label>
            <input id="g-limit-custom" type="number" min="10" max="999" placeholder="Leave blank to use dropdown" />
          </div>
          <button type="button" class="btn btn-primary btn-block" id="g-start">Start game</button>
        </div>
      `;
    }

    if (type === "darts") {
      return `
        <div class="form-stack">
          <p class="card-meta">${meta.blurb}. Tap scores to subtract from remaining.</p>
          <div class="field"><label>Player 1</label><input id="g-p1" value="${CL.escapeHtml(names[0])}" /></div>
          <div class="field"><label>Player 2</label><input id="g-p2" value="${CL.escapeHtml(names[1])}" /></div>
          <div class="field">
            <label>Start score</label>
            <select id="g-start-score">
              <option value="501" selected>501</option>
              <option value="301">301</option>
              <option value="101">101</option>
            </select>
          </div>
          <button type="button" class="btn btn-primary btn-block" id="g-start">Start game</button>
        </div>
      `;
    }

    if (type === "spades") {
      return `
        <div class="form-stack">
          <p class="card-meta">Two-person Spades. Enter points each hand. First to limit wins.</p>
          <div class="field"><label>Player 1</label><input id="g-p1" value="${CL.escapeHtml(names[0])}" /></div>
          <div class="field"><label>Player 2</label><input id="g-p2" value="${CL.escapeHtml(names[1])}" /></div>
          <div class="field">
            <label>Game limit (points)</label>
            <input id="g-limit" type="number" min="50" max="1000" value="500" />
          </div>
          <button type="button" class="btn btn-primary btn-block" id="g-start">Start game</button>
        </div>
      `;
    }

    // gin
    return `
      <div class="form-stack">
        <p class="card-meta">Gin Rummy score tracking. First player to the limit wins.</p>
        <div class="field"><label>Players</label>
          <select id="g-count"><option value="2">2</option><option value="3">3</option><option value="4">4</option></select>
        </div>
        <div id="g-names"></div>
        <div class="field">
          <label>Score limit</label>
          <input id="g-limit" type="number" min="50" max="500" value="100" />
        </div>
        <button type="button" class="btn btn-primary btn-block" id="g-start">Start game</button>
      </div>
    `;
  }

  function fillNameFields(container, count) {
    const names = defaultNames();
    const wrap = container.querySelector("#g-names");
    if (!wrap) return;
    let html = "";
    for (let i = 0; i < count; i++) {
      const def = names[i] || "Player " + (i + 1);
      html += `<div class="field"><label>Player ${i + 1}</label><input class="g-name" data-i="${i}" value="${CL.escapeHtml(def)}" /></div>`;
    }
    wrap.innerHTML = html;
  }

  function readNames(container, count) {
    const inputs = container.querySelectorAll(".g-name");
    if (inputs.length) {
      return [...inputs].map((el, i) => el.value.trim() || "Player " + (i + 1));
    }
    const p1 = container.querySelector("#g-p1");
    const p2 = container.querySelector("#g-p2");
    if (p1 && p2) {
      return [p1.value.trim() || "Player 1", p2.value.trim() || "Player 2"];
    }
    return defaultNames().slice(0, count);
  }

  /** Plus/minus stepper — supports negatives for golf / spades / gin */
  function scoreStepperHtml(inputClass, dataI, value) {
    const v = value != null ? value : 0;
    return `
      <div class="score-stepper">
        <button type="button" class="score-step-btn score-minus" aria-label="Subtract point">−</button>
        <input type="number" class="${inputClass}" data-i="${dataI}" value="${v}" step="1" inputmode="numeric" />
        <button type="button" class="score-step-btn score-plus" aria-label="Add point">+</button>
      </div>`;
  }

  function bindScoreSteppers(root) {
    root.querySelectorAll(".score-stepper").forEach((step) => {
      const input = step.querySelector("input");
      if (!input) return;
      step.querySelector(".score-minus")?.addEventListener("click", () => {
        input.value = String((Number(input.value) || 0) - 1);
        input.dispatchEvent(new Event("input", { bubbles: true }));
      });
      step.querySelector(".score-plus")?.addEventListener("click", () => {
        input.value = String((Number(input.value) || 0) + 1);
        input.dispatchEvent(new Event("input", { bubbles: true }));
      });
    });
  }

  function readScoreInput(inp) {
    const raw = String(inp.value == null ? "" : inp.value).trim();
    if (raw === "" || raw === "-") return 0;
    const v = Number(raw);
    return Number.isNaN(v) ? 0 : v;
  }

  /* ---------- ACTIVE GAME VIEWS ---------- */
  function renderGolfPlay(root, active, paintAll) {
    const limit = active.limit || 100;
    const loser = checkGolfLoser(active);
    const roundNum = (active.players[0] && active.players[0].scores.length) || 0;
    const nextHand = roundNum + 1;
    const maxTotal = totals(active.players).reduce((m, p) => Math.max(m, p.total), 0);
    const progressPct = Math.min(100, (maxTotal / limit) * 100);
    const winnerSafe = loser ? golfWinnerWhenLoser(active, loser) : "";

    root.innerHTML = `
      <section class="page">
        <button type="button" class="btn btn-ghost btn-sm" id="g-back">← Games</button>
        <h1 class="page-title">⛳ Golf</h1>
        <p class="page-sub">Card game · low is good · first to ${limit} loses · hand ${nextHand}</p>
        ${leaderboardHtml(active.players, { mode: "lowest", limit, loserName: loser })}
        <div class="game-progress">
          <div class="game-progress-bar ${loser ? "danger" : ""}" style="width:${progressPct}%"></div>
        </div>
        <p class="filter-hint" style="margin-top:-8px;margin-bottom:12px">Closest to limit without going over is still safe — hitting ${limit}+ loses.</p>
        ${
          loser
            ? `<div class="card game-winner-card game-loser-card">
                <div class="card-title">${CL.escapeHtml(loser)} loses</div>
                <p class="card-meta">Reached or exceeded ${limit} points</p>
                ${
                  winnerSafe
                    ? `<p class="card-meta" style="margin-top:6px">Best remaining: <strong>${CL.escapeHtml(winnerSafe)}</strong> (lowest total)</p>`
                    : ""
                }
                <button type="button" class="btn btn-primary btn-block" id="g-finish" style="margin-top:10px">Save to history</button>
              </div>`
            : `<div class="card section-block">
                <div class="section-label">Points this hand / round</div>
                <p class="filter-hint" style="margin-bottom:8px">Use − / + or type negatives (e.g. −2).</p>
                <div class="form-stack">
                  ${active.players
                    .map(
                      (p, i) => `
                    <div class="field">
                      <label>${CL.escapeHtml(p.name)} <span class="card-meta">(total ${totals(active.players)[i].total})</span></label>
                      ${scoreStepperHtml("g-hand-score", i, 0)}
                    </div>`
                    )
                    .join("")}
                  <button type="button" class="btn btn-primary btn-block" id="g-submit-hand">Add hand scores</button>
                </div>
              </div>`
        }
        <div class="section-block">
          <div class="section-label">Hand history</div>
          ${roundHistoryTable(active)}
        </div>
        <button type="button" class="btn btn-ghost btn-sm" id="g-abandon">Abandon game</button>
      </section>
    `;

    bindCommon(root, active, paintAll);
    bindScoreSteppers(root);

    root.querySelector("#g-submit-hand")?.addEventListener("click", () => {
      root.querySelectorAll(".g-hand-score").forEach((inp) => {
        const i = Number(inp.dataset.i);
        const v = readScoreInput(inp);
        active.players[i].scores.push(v);
      });
      persistActive(active);
      const who = checkGolfLoser(active);
      if (who) {
        CL.toast(who + " hit the limit — loses!");
      }
      paintAll("play");
    });

    root.querySelector("#g-finish")?.addEventListener("click", () => {
      const L = checkGolfLoser(active);
      const W = L ? golfWinnerWhenLoser(active, L) : winnerLowest(active.players);
      finishGame(active, W, L);
      CL.toast(L ? L + " recorded as loser" : "Saved");
      paintAll("hub");
    });
  }

  function winnerLowest(players) {
    const t = totals(players).sort((a, b) => a.total - b.total);
    return t[0] ? t[0].name : "";
  }

  function winnerHighest(players) {
    const t = totals(players).sort((a, b) => b.total - a.total);
    return t[0] ? t[0].name : "";
  }

  function renderDartsPlay(root, active, paintAll) {
    const remaining = active.players.map((p) => ({
      name: p.name,
      left: p.remaining != null ? p.remaining : active.startScore
    }));
    const turn = active.turn || 0;
    const winner = remaining.find((p) => p.left === 0);

    root.innerHTML = `
      <section class="page">
        <button type="button" class="btn btn-ghost btn-sm" id="g-back">← Games</button>
        <h1 class="page-title">🎯 Darts</h1>
        <p class="page-sub">${active.startScore} · first to exactly 0</p>
        <div class="darts-boards">
          ${remaining
            .map(
              (p, i) => `
            <div class="card darts-player ${i === turn && !winner ? "active-turn" : ""} ${p.left === 0 ? "won" : ""}">
              <div class="card-meta">${CL.escapeHtml(p.name)}${i === turn && !winner ? " · turn" : ""}</div>
              <div class="darts-score">${p.left}</div>
            </div>`
            )
            .join("")}
        </div>
        ${
          winner
            ? `<div class="card game-winner-card"><div class="card-title">${CL.escapeHtml(winner.name)} wins!</div>
               <button type="button" class="btn btn-primary btn-block" id="g-finish" style="margin-top:10px">Save to history</button></div>`
            : `<div class="card section-block">
                <div class="section-label">Score this turn (${CL.escapeHtml(active.players[turn].name)})</div>
                <div class="field">
                  <label>Points scored (darts total)</label>
                  <input id="d-score" type="number" min="0" max="180" value="0" inputmode="numeric" />
                </div>
                <div class="chips darts-quick" style="margin:10px 0">
                  ${[20, 40, 60, 85, 100, 140, 180]
                    .map((n) => `<button type="button" class="chip d-quick" data-n="${n}">${n}</button>`)
                    .join("")}
                </div>
                <button type="button" class="btn btn-primary btn-block" id="d-submit">Submit score</button>
                <p class="filter-hint">Bust if score &gt; remaining (turn skipped, score unchanged).</p>
              </div>`
        }
        <div class="section-block">
          <div class="section-label">Throw log</div>
          <div class="stack-sm">
            ${(active.log || [])
              .slice()
              .reverse()
              .slice(0, 10)
              .map(
                (l) =>
                  `<div class="card-meta">${CL.escapeHtml(l.player)}: ${l.scored}${l.bust ? " (bust)" : ""} → ${l.left}</div>`
              )
              .join("") || '<p class="card-meta">No throws yet.</p>'}
          </div>
        </div>
        <button type="button" class="btn btn-ghost btn-sm" id="g-abandon">Abandon game</button>
      </section>
    `;

    bindCommon(root, active, paintAll);

    root.querySelectorAll(".d-quick").forEach((btn) => {
      btn.addEventListener("click", () => {
        root.querySelector("#d-score").value = btn.dataset.n;
      });
    });

    root.querySelector("#d-submit")?.addEventListener("click", () => {
      const scored = Math.max(0, Number(root.querySelector("#d-score").value) || 0);
      const p = active.players[turn];
      const left = p.remaining;
      let bust = false;
      let nextLeft = left - scored;
      if (scored > left || nextLeft < 0) {
        bust = true;
        nextLeft = left;
      }
      p.remaining = nextLeft;
      p.scores = p.scores || [];
      p.scores.push(bust ? 0 : scored);
      active.log = active.log || [];
      active.log.push({ player: p.name, scored, bust, left: nextLeft });
      if (nextLeft === 0) {
        persistActive(active);
        paintAll();
        return;
      }
      active.turn = (turn + 1) % active.players.length;
      persistActive(active);
      paintAll();
    });

    root.querySelector("#g-finish")?.addEventListener("click", () => {
      // Store inverted scores for history totals as points scored
      active.players.forEach((p) => {
        p.scores = [active.startScore - p.remaining];
      });
      finishGame(active, winner.name);
      CL.toast("Saved to history");
      paintAll("hub");
    });
  }

  function renderRoundPlay(root, active, paintAll, titleEmoji, title, sortMode) {
    const t = totals(active.players);
    const winnerHit = t.find((p) => p.total >= (active.limit || Infinity));
    const roundNum = (active.players[0].scores.length || 0) + 1;
    const maxTotal = t.reduce((m, p) => Math.max(m, p.total), 0);
    const progressPct = active.limit ? Math.min(100, (maxTotal / active.limit) * 100) : 0;

    root.innerHTML = `
      <section class="page">
        <button type="button" class="btn btn-ghost btn-sm" id="g-back">← Games</button>
        <h1 class="page-title">${titleEmoji} ${CL.escapeHtml(title)}</h1>
        <p class="page-sub">First to ${active.limit} · round ${roundNum}</p>
        ${leaderboardHtml(active.players, { mode: "highest" })}
        <div class="game-progress">
          <div class="game-progress-bar" style="width:${progressPct}%"></div>
        </div>
        ${
          winnerHit
            ? `<div class="card game-winner-card">
                <div class="card-title">${CL.escapeHtml(winnerHighest(active.players))} wins!</div>
                <p class="card-meta">Reached ${active.limit}+ points</p>
                <button type="button" class="btn btn-primary btn-block" id="g-finish" style="margin-top:10px">Save to history</button>
              </div>`
            : `<div class="card section-block">
                <div class="section-label">Scores for this hand / round</div>
                <p class="filter-hint" style="margin-bottom:8px">Use − / + or type negatives.</p>
                <div class="form-stack">
                  ${active.players
                    .map(
                      (p, i) => `
                    <div class="field">
                      <label>${CL.escapeHtml(p.name)}</label>
                      ${scoreStepperHtml("g-round-score", i, 0)}
                    </div>`
                    )
                    .join("")}
                  <button type="button" class="btn btn-primary btn-block" id="g-submit-round">Add round</button>
                </div>
              </div>`
        }
        <div class="section-block">
          <div class="section-label">Round history</div>
          ${roundHistoryTable(active)}
        </div>
        <button type="button" class="btn btn-ghost btn-sm" id="g-abandon">Abandon game</button>
      </section>
    `;

    bindCommon(root, active, paintAll);
    bindScoreSteppers(root);

    root.querySelector("#g-submit-round")?.addEventListener("click", () => {
      root.querySelectorAll(".g-round-score").forEach((inp) => {
        const i = Number(inp.dataset.i);
        const v = readScoreInput(inp);
        active.players[i].scores.push(v);
      });
      persistActive(active);
      const w = checkWinner(active);
      if (w) {
        CL.toast(w + " reached the limit!");
      }
      paintAll();
    });

    root.querySelector("#g-finish")?.addEventListener("click", () => {
      finishGame(active, winnerHighest(active.players));
      CL.toast("Saved to history");
      paintAll("hub");
    });
  }

  function roundHistoryTable(active) {
    const rounds = active.players[0] ? active.players[0].scores.length : 0;
    if (!rounds) return `<p class="card-meta">No rounds yet.</p>`;
    return `
      <div class="scorecard-wrap">
        <table class="scorecard">
          <thead>
            <tr>
              <th>#</th>
              ${active.players.map((p) => `<th>${CL.escapeHtml(p.name)}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${Array.from({ length: rounds }, (_, r) => {
              return `<tr>
                <td>${r + 1}</td>
                ${active.players.map((p) => `<td>${p.scores[r] != null ? p.scores[r] : "·"}</td>`).join("")}
              </tr>`;
            }).join("")}
            <tr class="sc-footer">
              <td>Tot</td>
              ${active.players
                .map((p) => `<td class="sc-tot">${p.scores.reduce((a, b) => a + b, 0)}</td>`)
                .join("")}
            </tr>
          </tbody>
        </table>
      </div>
    `;
  }

  function persistActive(active) {
    const data = load();
    data.active = active;
    save(data);
  }

  function bindCommon(root, active, paintAll) {
    root.querySelector("#g-back")?.addEventListener("click", () => {
      // keep active game, go to hub (still shows resume)
      const data = load();
      // mark view hub only — don't clear active
      data._view = "hub";
      // we use local view state in render instead
      paintAll("hub");
    });
    root.querySelector("#g-abandon")?.addEventListener("click", () => {
      if (!confirm("Abandon this game without saving?")) return;
      const data = load();
      data.active = null;
      save(data);
      CL.toast("Game abandoned");
      paintAll("hub");
    });
  }

  function renderHub(root, paintAll) {
    const data = load();
    const active = data.active;
    const stats = computePlayerStats(data.history);
    const matchCount = (data.history || []).length;

    root.innerHTML = `
      <section class="page">
        <div class="row-between" style="align-items:flex-start;gap:10px">
          <div>
            <h1 class="page-title">Games</h1>
            <p class="page-sub">Score together · saved on this device</p>
          </div>
          <button type="button" class="btn btn-secondary btn-sm" id="g-stats" style="flex-shrink:0;margin-top:4px">
            📊 Stats
          </button>
        </div>

        ${
          active
            ? `<div class="card game-resume section-block">
                <div class="card-title">${(GAME_META[active.type] || {}).emoji || "🎮"} Resume ${CL.escapeHtml((GAME_META[active.type] || {}).name || active.type)}</div>
                <p class="card-meta">${(active.players || []).map((p) => CL.escapeHtml(p.name)).join(" vs ")}</p>
                <div class="card-actions">
                  <button type="button" class="btn btn-primary btn-sm" id="g-resume">Continue</button>
                  <button type="button" class="btn btn-ghost btn-sm" id="g-drop">Discard</button>
                </div>
              </div>`
            : ""
        }

        ${
          stats.length
            ? `<div class="card section-block game-stats-preview">
                <div class="row-between">
                  <div class="section-label" style="margin:0">Standings</div>
                  <button type="button" class="btn btn-ghost btn-sm" id="g-stats-link">Full stats →</button>
                </div>
                ${standingsHtml(stats, { limit: 4 })}
              </div>`
            : ""
        }

        <div class="section-label">Choose a game</div>
        <div class="game-grid">
          ${Object.keys(GAME_META)
            .map((key) => {
              const m = GAME_META[key];
              return `
              <button type="button" class="game-pick-card" data-type="${key}">
                <span class="emoji">${m.emoji}</span>
                <strong>${CL.escapeHtml(m.name)}</strong>
                <span>${CL.escapeHtml(m.blurb)}</span>
              </button>`;
            })
            .join("")}
        </div>

        <div class="section-block" style="margin-top:20px">
          <div class="row-between">
            <div class="section-label" style="margin:0">Recent matches</div>
            ${
              matchCount
                ? `<button type="button" class="btn btn-ghost btn-sm" id="g-history-link">All history →</button>`
                : ""
            }
          </div>
          ${historyListHtml(data.history, null, 5)}
        </div>
      </section>
    `;

    root.querySelector("#g-stats")?.addEventListener("click", () => paintAll("stats"));
    root.querySelector("#g-stats-link")?.addEventListener("click", () => paintAll("stats"));
    root.querySelector("#g-history-link")?.addEventListener("click", () => paintAll("stats"));

    root.querySelector("#g-resume")?.addEventListener("click", () => paintAll("play"));
    root.querySelector("#g-drop")?.addEventListener("click", () => {
      if (!confirm("Discard the active game?")) return;
      const d = load();
      d.active = null;
      save(d);
      paintAll("hub");
    });

    root.querySelectorAll(".game-pick-card").forEach((btn) => {
      btn.addEventListener("click", () => paintAll("setup", btn.dataset.type));
    });
  }

  function renderStats(root, paintAll) {
    const data = load();
    const history = data.history || [];
    const stats = computePlayerStats(history);
    let filterType = "";

    function paint() {
      const filtered = filterType
        ? history.filter((h) => h.type === filterType)
        : history;

      root.innerHTML = `
        <section class="page">
          <button type="button" class="btn btn-ghost btn-sm" id="g-back-hub">← Games</button>
          <h1 class="page-title">📊 Stats & History</h1>
          <p class="page-sub">
            ${history.length} match${history.length === 1 ? "" : "es"} saved
            · localStorage${CL.sync && CL.sync.isJoined && CL.sync.isJoined() ? " + Couple Group sync" : ""}
          </p>

          <div class="section-block">
            <div class="section-label">All-time standings</div>
            <div class="card">
              ${standingsHtml(stats)}
              <p class="filter-hint" style="margin:10px 0 0">
                Ranked by wins (then win %). Points are omitted because games score differently.
              </p>
            </div>
          </div>

          <div class="section-block">
            <div class="section-label">By game</div>
            ${perGameBreakdownHtml(stats)}
          </div>

          <div class="section-block">
            <div class="section-label">Match history</div>
            <div class="chips game-filter-chips" style="margin-bottom:12px">
              <button type="button" class="chip ${!filterType ? "active" : ""}" data-filter="">All</button>
              ${Object.keys(GAME_META)
                .map((key) => {
                  const m = GAME_META[key];
                  return `<button type="button" class="chip ${filterType === key ? "active" : ""}" data-filter="${key}">${m.emoji} ${CL.escapeHtml(m.name)}</button>`;
                })
                .join("")}
            </div>
            ${historyListHtml(filtered, null, 40)}
          </div>

          ${
            history.length
              ? `<button type="button" class="btn btn-ghost btn-sm" id="g-clear-hist" style="margin-top:8px">Clear all history &amp; stats</button>`
              : ""
          }
        </section>
      `;

      root.querySelector("#g-back-hub")?.addEventListener("click", () => paintAll("hub"));

      root.querySelectorAll(".game-filter-chips .chip").forEach((btn) => {
        btn.addEventListener("click", () => {
          filterType = btn.dataset.filter || "";
          paint();
        });
      });

      root.querySelector("#g-clear-hist")?.addEventListener("click", () => {
        if (!confirm("Clear all match history and stats? This cannot be undone.")) return;
        const d = load();
        d.history = [];
        save(d);
        CL.toast("History & stats cleared");
        paintAll("stats");
      });
    }

    paint();
  }

  function renderSetup(root, type, paintAll) {
    const meta = GAME_META[type];
    root.innerHTML = `
      <section class="page">
        <button type="button" class="btn btn-ghost btn-sm" id="g-back-hub">← Games</button>
        <h1 class="page-title">${meta.emoji} ${CL.escapeHtml(meta.name)}</h1>
        <p class="page-sub">Set players & rules</p>
        <div class="card">${setupFormHtml(type)}</div>
      </section>
    `;

    root.querySelector("#g-back-hub").addEventListener("click", () => paintAll("hub"));

    const countEl = root.querySelector("#g-count");
    if (countEl) {
      fillNameFields(root, Number(countEl.value));
      countEl.addEventListener("change", () => fillNameFields(root, Number(countEl.value)));
    }

    root.querySelector("#g-start").addEventListener("click", () => {
      let active;

      if (type === "golf") {
        const count = Math.min(6, Math.max(2, Number(root.querySelector("#g-count").value) || 2));
        const names = readNames(root, count);
        const custom = root.querySelector("#g-limit-custom").value.trim();
        const limit = custom
          ? Math.max(10, Number(custom) || 100)
          : Math.max(10, Number(root.querySelector("#g-limit").value) || 100);
        active = {
          type: "golf",
          players: names.map((name) => ({ name, scores: [] })),
          limit,
          startedAt: Date.now()
        };
      } else if (type === "darts") {
        const names = readNames(root, 2);
        const startScore = Number(root.querySelector("#g-start-score").value) || 501;
        active = {
          type: "darts",
          players: names.map((name) => ({ name, scores: [], remaining: startScore })),
          startScore,
          turn: 0,
          log: [],
          startedAt: Date.now()
        };
      } else if (type === "spades") {
        const names = readNames(root, 2);
        const limit = Math.max(50, Number(root.querySelector("#g-limit").value) || 500);
        active = {
          type: "spades",
          players: names.map((name) => ({ name, scores: [] })),
          limit,
          startedAt: Date.now()
        };
      } else {
        const count = Number(root.querySelector("#g-count")?.value) || 2;
        const names = readNames(root, count);
        const limit = Math.max(50, Number(root.querySelector("#g-limit").value) || 100);
        active = {
          type: "gin",
          players: names.map((name) => ({ name, scores: [] })),
          limit,
          startedAt: Date.now()
        };
      }

      const data = load();
      data.active = active;
      save(data);
      CL.toast("Game started — have fun!");
      paintAll("play");
    });
  }

  function renderPlay(root, paintAll) {
    const active = load().active;
    if (!active) {
      paintAll("hub");
      return;
    }
    if (active.type === "golf") return renderGolfPlay(root, active, paintAll);
    if (active.type === "darts") return renderDartsPlay(root, active, paintAll);
    if (active.type === "spades") return renderRoundPlay(root, active, paintAll, "♠️", "Spades", "highest");
    if (active.type === "gin") return renderRoundPlay(root, active, paintAll, "🃏", "Gin Rummy", "highest");
    paintAll("hub");
  }

  function render(root) {
    let view = "hub"; // hub | setup | play | stats
    let setupType = "golf";

    function paintAll(nextView, type) {
      if (nextView) view = nextView;
      if (type) setupType = type;
      if (view === "setup") renderSetup(root, setupType, paintAll);
      else if (view === "play") renderPlay(root, paintAll);
      else if (view === "stats") renderStats(root, paintAll);
      else renderHub(root, paintAll);
    }

    // Auto-resume into play if active? Stay on hub so they see resume card.
    // Active games and full match history are loaded from localStorage on every visit.
    paintAll("hub");
  }

  global.CL = global.CL || {};
  global.CL.sections = global.CL.sections || {};
  global.CL.sections.games = { render };
})(window);
