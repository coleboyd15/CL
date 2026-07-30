/* Workout · ⛏️⛏️ — gated entry, maxes, smart weekly progression, history (sync key: workouts) */
(function (global) {
  const STORAGE = "workouts";
  const COWARD = "I'm a Coward";

  function defaultState() {
    return {
      maxes: {
        backSquat: "",
        deadlift: "",
        frontSquat: "",
        bench: "",
        powerClean: ""
      },
      weeks: {},
      history: [],
      gatePassed: false,
      progressionAppliedFor: null,
      lastProgression: null
    };
  }

  function getState() {
    return Object.assign(defaultState(), CL.storage.get(STORAGE, {}));
  }

  function setState(s) {
    CL.storage.set(STORAGE, s);
  }

  function weekProgress(state, key) {
    const w = (state.weeks && state.weeks[key]) || {
      activeIndex: 0,
      completed: [false, false, false, false],
      logs: [{}, {}, {}, {}]
    };
    if (!Array.isArray(w.logs)) w.logs = [{}, {}, {}, {}];
    while (w.logs.length < 4) w.logs.push({});
    if (!Array.isArray(w.completed)) w.completed = [false, false, false, false];
    return w;
  }

  function saveWeekProgress(state, key, prog) {
    state.weeks = state.weeks || {};
    state.weeks[key] = prog;
    setState(state);
  }

  function expandWorkingSets(blockSets) {
    const rows = [];
    (blockSets || []).forEach((s, bi) => {
      if (s.free) {
        for (let i = 1; i <= (s.sets || 1); i++) {
          rows.push({
            key: "free_" + bi + "_" + i,
            free: true,
            name: s.name,
            setNum: i,
            setsTotal: s.sets,
            reps: s.reps,
            note: s.note || "",
            liftId: null,
            pct: null
          });
        }
      } else {
        const n = s.sets || 1;
        for (let i = 1; i <= n; i++) {
          rows.push({
            key: (s.liftId || "x") + "_" + bi + "_" + i,
            free: false,
            name: s.label || "",
            setNum: i,
            setsTotal: n,
            reps: s.reps,
            note: s.note || "",
            liftId: s.liftId,
            pct: s.pct
          });
        }
      }
    });
    return rows;
  }

  function prescribedRepsOf(row) {
    if (typeof row.reps === "number") return row.reps;
    const n = parseInt(String(row.reps || ""), 10);
    return Number.isNaN(n) ? 0 : n;
  }

  /** Read weight/reps from log entry for form defaults */
  function logFields(val, prescribedReps) {
    const parsed = CL.workoutsApi.parseLogEntry(val, prescribedReps);
    if (!parsed || parsed.coward) {
      return { weight: "", reps: prescribedReps || "", coward: true };
    }
    return {
      weight: parsed.weight != null ? String(parsed.weight) : "",
      reps: parsed.reps != null ? String(parsed.reps) : String(prescribedReps || ""),
      coward: false
    };
  }

  function showGate(onPass) {
    const root = document.getElementById("modal-root");
    if (!root) {
      onPass();
      return;
    }
    root.innerHTML = "";
    const el = document.createElement("div");
    el.className = "workout-gate";
    el.innerHTML = `
      <div class="workout-gate-card">
        <div class="workout-gate-emoji" aria-hidden="true">⛏️⛏️</div>
        <p class="workout-gate-text">Are you going to let Lauren starve you and make you be small and weak and not fit in any of your shorts anymore?</p>
        <button type="button" class="btn btn-primary btn-block workout-gate-btn" id="gate-enter">No, I'm not a coward</button>
      </div>
    `;
    root.appendChild(el);
    el.querySelector("#gate-enter").addEventListener("click", () => {
      root.innerHTML = "";
      const st = getState();
      st.gatePassed = true;
      setState(st);
      onPass();
    });
  }

  /** Sunday week rollover: evaluate last week’s real weights/reps → smart maxes */
  function ensureSmartProgression(state) {
    if (!CL.workoutsApi.applySmartProgression) return state;
    const key = CL.workoutsApi.weekKey();
    if (state.progressionAppliedFor === key) return state;
    const result = CL.workoutsApi.applySmartProgression(state, key);
    setState(result.state);
    return result.state;
  }

  function render(root) {
    let view = "active"; // active | maxes | history
    let browseIndex = null;
    let unlocked = false;

    function start() {
      unlocked = true;
      paint();
    }

    root.innerHTML = `<section class="page"><div class="empty"><p>…</p></div></section>`;
    showGate(start);

    function paint() {
      if (!unlocked) return;
      let state = ensureSmartProgression(getState());
      const key = CL.workoutsApi.weekKey();
      const seed = CL.workoutsApi.weekSeedFromKey(key);
      const program = CL.workoutsApi.weekProgram(seed);
      const prog = weekProgress(state, key);
      let active = prog.activeIndex || 0;
      while (active < 4 && prog.completed[active]) active++;
      if (active > 3) active = 3;
      if (browseIndex == null) browseIndex = active;
      if (browseIndex < 0) browseIndex = 0;
      if (browseIndex > 3) browseIndex = 3;

      const workout = program[browseIndex];
      const isActive = browseIndex === active && !prog.completed[browseIndex];
      const isDone = !!prog.completed[browseIndex];
      const logs = (prog.logs && prog.logs[browseIndex]) || {};

      root.innerHTML = `
        <section class="page workout-page">
          <div class="row-between" style="align-items:center;margin-bottom:8px">
            <h1 class="page-title" style="margin:0" aria-label="Workout">⛏️⛏️</h1>
            <div class="card-actions">
              <button type="button" class="btn btn-ghost btn-sm ${view === "maxes" ? "btn-secondary" : ""}" data-view="maxes">Maxes</button>
              <button type="button" class="btn btn-ghost btn-sm ${view === "history" ? "btn-secondary" : ""}" data-view="history">History</button>
              <button type="button" class="btn btn-ghost btn-sm ${view === "active" ? "btn-secondary" : ""}" data-view="active">Week</button>
            </div>
          </div>

          ${
            view === "maxes"
              ? maxesHtml(state)
              : view === "history"
                ? historyHtml(state)
                : workoutHtml(state, key, program, prog, browseIndex, active, workout, isActive, isDone, logs)
          }
        </section>
      `;

      root.querySelectorAll("[data-view]").forEach((btn) => {
        btn.addEventListener("click", () => {
          view = btn.dataset.view;
          if (view === "active") browseIndex = null;
          paint();
        });
      });

      if (view === "maxes") bindMaxes(root, state, paint);
      else if (view === "history") {
        /* read-only */
      } else
        bindWorkout(root, state, key, program, prog, browseIndex, paint, () => {
          browseIndex = null;
        });
    }

    function progressionBannerHtml(state) {
      const lp = state.lastProgression;
      if (!lp || lp.weekKey !== CL.workoutsApi.weekKey()) return "";
      const notes = lp.notes || [];
      if (!notes.length) {
        return `
          <div class="card wo-progress-banner">
            <div class="card-title">This week’s targets</div>
            <p class="card-meta">Based on last week’s logs — no linear auto-jumps. Performance looked steady, so intensity is held or barely nudged.</p>
          </div>`;
      }
      const lines = notes
        .map((n) => {
          const arrow =
            n.held || Number(n.to) === Number(n.from)
              ? `${n.from || "—"} lb · ${n.reason}`
              : `${n.from || "—"} → <strong>${n.to}</strong> lb · ${n.reason}`;
          return `<div class="wo-progress-line"><span>${CL.escapeHtml(n.label)}</span><span>${arrow}</span></div>`;
        })
        .join("");
      return `
        <div class="card wo-progress-banner">
          <div class="card-title">Smart progression · from last week</div>
          <p class="card-meta" style="margin-bottom:8px">
            New week targets use what you actually lifted and rep’d — not a flat weekly increase.
          </p>
          <div class="wo-progress-lines">${lines}</div>
        </div>`;
    }

    function maxesHtml(state) {
      const lifts = CL.workoutsApi.LIFTS;
      return `
        ${progressionBannerHtml(state)}
        <div class="card">
          <div class="card-title">Training maxes (lb)</div>
          <p class="card-meta" style="margin-bottom:12px">
            Used for % work. Every Sunday, maxes update from last week’s logged weights &amp; reps
            (extra reps at a weight → heavier next week; struggle → hold or tiny bump).
            You can still override anytime. Syncs with Couple Group.
          </p>
          <div class="form-stack">
            ${lifts
              .map(
                (l) => `
              <div class="field">
                <label for="max-${l.id}">${CL.escapeHtml(l.label)}</label>
                <input id="max-${l.id}" type="number" inputmode="decimal" min="0" step="1" value="${CL.escapeHtml(
                  state.maxes[l.id] != null ? String(state.maxes[l.id]) : ""
                )}" placeholder="e.g. 315" />
              </div>`
              )
              .join("")}
            <button type="button" class="btn btn-primary btn-block" id="max-save">Save maxes</button>
          </div>
        </div>`;
    }

    function bindMaxes(root, state, repaint) {
      root.querySelector("#max-save")?.addEventListener("click", () => {
        CL.workoutsApi.LIFTS.forEach((l) => {
          const el = root.querySelector("#max-" + l.id);
          const v = el && el.value.trim() !== "" ? Number(el.value) : "";
          state.maxes[l.id] = v === "" || Number.isNaN(v) ? "" : v;
        });
        setState(state);
        CL.toast("Maxes saved");
        repaint();
      });
    }

    function historyHtml(state) {
      const hist = (state.history || []).slice().reverse();
      if (!hist.length) {
        return `<div class="empty"><div class="emoji">⛏️</div><p>No finished workouts yet. Complete one to build history.</p></div>`;
      }
      return `
        <div class="stack-sm">
          ${hist
            .map((h) => {
              const when = h.completedAt
                ? new Date(h.completedAt).toLocaleString(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit"
                  })
                : "";
              const lifts = Object.keys(h.weights || {})
                .map((k) => {
                  const w = h.weights[k];
                  return `<div class="wo-hist-set"><span>${CL.escapeHtml(k)}</span><strong>${CL.escapeHtml(
                    String(w)
                  )}</strong></div>`;
                })
                .join("");
              return `
              <article class="card">
                <div class="card-title">${CL.escapeHtml(h.title || "Workout")}</div>
                <div class="card-meta">${CL.escapeHtml(when)} · ${CL.escapeHtml(h.weekKey || "")}</div>
                <div class="wo-hist-grid">${lifts || "<p class=\"card-meta\">No sets logged</p>"}</div>
              </article>`;
            })
            .join("")}
        </div>`;
    }

    function workoutHtml(state, key, program, prog, idx, activeIdx, workout, isActive, isDone, logs) {
      return `
        ${progressionBannerHtml(state)}
        <p class="card-meta" style="margin-bottom:8px">Week of ${CL.escapeHtml(key)} · resets Sunday · smart progression from real logs</p>
        <div class="wo-week-tabs">
          ${program
            .map((w, i) => {
              const done = prog.completed[i];
              const act = i === activeIdx && !done;
              return `<button type="button" class="wo-week-tab ${i === idx ? "on" : ""} ${done ? "done" : ""} ${
                act ? "current" : ""
              }" data-i="${i}">${i + 1}${done ? " ✓" : act ? " ●" : ""}</button>`;
            })
            .join("")}
        </div>

        <article class="card wo-card">
          <div class="section-label">${CL.escapeHtml(workout.dayLabel)}</div>
          <div class="card-title">${CL.escapeHtml(workout.title)}</div>
          <p class="card-meta">${CL.escapeHtml(workout.focus || "")}${isDone ? " · Completed" : isActive ? " · Up next" : ""}</p>

          <div class="wo-block">
            <div class="section-label">Warm-up</div>
            <ul class="wo-list">
              ${(workout.warmup || []).map((x) => `<li>${CL.escapeHtml(x)}</li>`).join("")}
            </ul>
          </div>

          ${(workout.blocks || [])
            .map((block) => {
              const rows = expandWorkingSets(block.sets);
              return `
              <div class="wo-block">
                <div class="section-label">${CL.escapeHtml(block.name)}</div>
                ${block.rest ? `<p class="filter-hint">${CL.escapeHtml(block.rest)}</p>` : ""}
                <div class="wo-sets">
                  ${rows
                    .map((row) => {
                      const target = row.free
                        ? null
                        : CL.workoutsApi.calcTarget(state.maxes, row.liftId, row.pct);
                      const pctLabel = row.pct != null ? Math.round(row.pct * 100) + "%" : "";
                      const liftName = row.free
                        ? row.name
                        : (CL.workoutsApi.LIFTS.find((l) => l.id === row.liftId) || {}).label || row.liftId;
                      const presc = prescribedRepsOf(row);
                      const title = row.free
                        ? `${liftName} · set ${row.setNum}/${row.setsTotal} · target ${row.reps}`
                        : `${liftName} · set ${row.setNum}/${row.setsTotal} · ${row.reps} @ ${pctLabel}`;
                      const fields = logFields(logs[row.key], presc || 0);
                      const showReps = !row.free || presc > 0;
                      return `
                        <div class="wo-set-row" data-key="${CL.escapeHtml(row.key)}">
                          <div class="wo-set-info">
                            <div class="wo-set-title">${CL.escapeHtml(title)}</div>
                            ${
                              target != null
                                ? `<div class="wo-set-target">Target ≈ <strong>${target}</strong> lb × ${presc || row.reps}</div>`
                                : row.note
                                  ? `<div class="card-meta">${CL.escapeHtml(row.note)}</div>`
                                  : ""
                            }
                          </div>
                          <div class="wo-log-inputs">
                            <input type="text" class="wo-weight-input" data-key="${CL.escapeHtml(
                              row.key
                            )}" inputmode="decimal" placeholder="lb" value="${CL.escapeHtml(
                              fields.weight
                            )}" ${isDone ? "readonly" : ""} aria-label="Weight lb" />
                            ${
                              showReps
                                ? `<input type="text" class="wo-reps-input" data-key="${CL.escapeHtml(
                                    row.key
                                  )}" inputmode="numeric" placeholder="reps" value="${CL.escapeHtml(
                                    fields.weight ? fields.reps : presc ? String(presc) : ""
                                  )}" ${isDone ? "readonly" : ""} aria-label="Reps completed" />`
                                : ""
                            }
                          </div>
                        </div>`;
                    })
                    .join("")}
                </div>
              </div>`;
            })
            .join("")}

          ${
            workout.finisher
              ? `<div class="wo-block"><div class="section-label">Finish</div><p class="card-meta">${CL.escapeHtml(
                  workout.finisher
                )}</p></div>`
              : ""
          }

          ${
            isDone
              ? `<p class="filter-hint">Already completed this week. Browse other days or check History.</p>`
              : `<button type="button" class="btn btn-primary btn-block" id="wo-finish">Complete Workout</button>
                 <p class="filter-hint" style="margin-top:8px">Log actual weight + reps. Blank weight = “I'm a Coward”.</p>`
          }
        </article>
      `;
    }

    function bindWorkout(root, state, key, program, prog, idx, repaint, resetBrowse) {
      root.querySelectorAll(".wo-week-tab").forEach((btn) => {
        btn.addEventListener("click", () => {
          browseIndex = Number(btn.dataset.i);
          repaint();
        });
      });

      root.querySelector("#wo-finish")?.addEventListener("click", () => {
        const workout = program[idx];
        const weights = {};
        const pretty = {};
        (workout.blocks || []).forEach((block) => {
          expandWorkingSets(block.sets).forEach((row) => {
            const wInput = root.querySelector(`.wo-weight-input[data-key="${row.key}"]`);
            const rInput = root.querySelector(`.wo-reps-input[data-key="${row.key}"]`);
            let rawW = wInput ? String(wInput.value).trim() : "";
            const presc = prescribedRepsOf(row);
            let rawR = rInput ? String(rInput.value).trim() : "";
            const liftName = row.free
              ? row.name
              : (CL.workoutsApi.LIFTS.find((l) => l.id === row.liftId) || {}).label || row.liftId;
            const label =
              liftName +
              " set " +
              row.setNum +
              (row.pct != null ? " @" + Math.round(row.pct * 100) + "%" : "");

            if (!rawW) {
              weights[row.key] = { weight: 0, reps: 0, coward: true };
              pretty[label] = COWARD;
            } else {
              const w = Number(String(rawW).replace(/lb/i, "").trim());
              let reps = rawR !== "" ? Number(rawR) : presc;
              if (Number.isNaN(reps) || reps < 0) reps = presc || 0;
              if (Number.isNaN(w) || w <= 0) {
                weights[row.key] = { weight: 0, reps: 0, coward: true };
                pretty[label] = COWARD;
              } else {
                weights[row.key] = { weight: w, reps: reps, coward: false };
                pretty[label] = w + " × " + reps;
              }
            }
          });
        });

        prog.logs[idx] = weights;
        prog.completed[idx] = true;
        let next = idx + 1;
        while (next < 4 && prog.completed[next]) next++;
        prog.activeIndex = next < 4 ? next : 4;
        saveWeekProgress(state, key, prog);

        state.history = state.history || [];
        state.history.push({
          id: CL.uid("wo"),
          weekKey: key,
          workoutIndex: idx,
          title: workout.dayLabel + " · " + workout.title,
          completedAt: Date.now(),
          weights: pretty
        });
        setState(state);
        CL.toast("Workout complete");
        browseIndex = prog.activeIndex < 4 ? prog.activeIndex : idx;
        repaint();
      });
    }

    paint();
  }

  global.CL = global.CL || {};
  global.CL.sections = global.CL.sections || {};
  global.CL.sections.workout = { render };
})(window);
