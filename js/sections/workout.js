/* Workout · ⛏️⛏️ — gated entry, maxes, weekly % program, history (sync key: workouts) */
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
      // progress keyed by weekKey
      weeks: {},
      history: [],
      gatePassed: false
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
      logs: [{}, {}, {}, {}] // per-workout set logs
    };
    return w;
  }

  function saveWeekProgress(state, key, prog) {
    state.weeks = state.weeks || {};
    state.weeks[key] = prog;
    setState(state);
  }

  function expandWorkingSets(blockSets) {
    // Expand {sets:5, reps:5, pct} into individual loggable rows
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

  function render(root) {
    let view = "active"; // active | maxes | history
    let browseIndex = null; // when scrolling workouts
    let unlocked = false;

    function start() {
      unlocked = true;
      paint();
    }

    // Full-screen gate every time the section is opened
    root.innerHTML = `<section class="page"><div class="empty"><p>…</p></div></section>`;
    showGate(start);

    function paint() {
      if (!unlocked) return;
      const state = getState();
      const key = CL.workoutsApi.weekKey();
      const seed = CL.workoutsApi.weekSeedFromKey(key);
      const program = CL.workoutsApi.weekProgram(seed);
      const prog = weekProgress(state, key);
      // Advance activeIndex to first incomplete
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
      } else bindWorkout(root, state, key, program, prog, browseIndex, paint, () => {
        browseIndex = null;
      });
    }

    function maxesHtml(state) {
      const lifts = CL.workoutsApi.LIFTS;
      return `
        <div class="card">
          <div class="card-title">Training maxes (lb)</div>
          <p class="card-meta" style="margin-bottom:12px">Used for % work. Update anytime. Syncs with Couple Group.</p>
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
        <p class="card-meta" style="margin-bottom:8px">Week of ${CL.escapeHtml(key)} · resets Sunday</p>
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
                      const title = row.free
                        ? `${liftName} · set ${row.setNum}/${row.setsTotal} · ${row.reps}`
                        : `${liftName} · set ${row.setNum}/${row.setsTotal} · ${row.reps} @ ${pctLabel}`;
                      const val = logs[row.key] != null ? logs[row.key] : "";
                      return `
                        <div class="wo-set-row" data-key="${CL.escapeHtml(row.key)}">
                          <div class="wo-set-info">
                            <div class="wo-set-title">${CL.escapeHtml(title)}</div>
                            ${
                              target != null
                                ? `<div class="wo-set-target">Target ≈ <strong>${target}</strong> lb</div>`
                                : row.note
                                  ? `<div class="card-meta">${CL.escapeHtml(row.note)}</div>`
                                  : ""
                            }
                          </div>
                          <input type="text" class="wo-weight-input" data-key="${CL.escapeHtml(
                            row.key
                          )}" inputmode="decimal" placeholder="lb" value="${CL.escapeHtml(
                            String(val)
                          )}" ${isDone ? "readonly" : ""} />
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
                 <p class="filter-hint" style="margin-top:8px">Blank weight fields log as “I'm a Coward”.</p>`
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
        const labels = {};
        (workout.blocks || []).forEach((block) => {
          expandWorkingSets(block.sets).forEach((row) => {
            const input = root.querySelector(`.wo-weight-input[data-key="${row.key}"]`);
            let raw = input ? String(input.value).trim() : "";
            if (!raw) raw = COWARD;
            weights[row.key] = raw;
            const liftName = row.free
              ? row.name
              : (CL.workoutsApi.LIFTS.find((l) => l.id === row.liftId) || {}).label || row.liftId;
            labels[row.key] =
              liftName +
              " set " +
              row.setNum +
              (row.pct != null ? " @" + Math.round(row.pct * 100) + "%" : "");
          });
        });

        prog.logs[idx] = weights;
        prog.completed[idx] = true;
        // Advance to next incomplete
        let next = idx + 1;
        while (next < 4 && prog.completed[next]) next++;
        prog.activeIndex = next < 4 ? next : 4;
        saveWeekProgress(state, key, prog);

        const pretty = {};
        Object.keys(weights).forEach((k) => {
          pretty[labels[k] || k] = weights[k];
        });
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
