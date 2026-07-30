/* Weekly strength templates — progressive %, never FS+BS same day, Arm Farm finishers
   Spirit: Pen & Paper (Brace Yourself / Brick House) + Sorinex Squatober density */
(function (global) {
  const LIFTS = [
    { id: "backSquat", label: "Back Squat" },
    { id: "deadlift", label: "Deadlift" },
    { id: "frontSquat", label: "Front Squat" },
    { id: "bench", label: "Bench Press" },
    { id: "powerClean", label: "Power Clean" }
  ];

  /**
   * 4-week repeating wave (0 = most conservative).
   * Percentages stay in sustainable training-max ranges — not true 1RM peaking.
   */
  function waveScheme(wave) {
    // wave 0..3
    const w = Math.max(0, Math.min(3, wave | 0));
    return {
      // Back squat working sets of 5: 65% → 68% → 70% → 72%
      bsWork5: [0.65, 0.68, 0.7, 0.72][w],
      bsBuild1: [0.5, 0.52, 0.55, 0.55][w],
      bsBuild2: [0.58, 0.6, 0.62, 0.65][w],
      // Occasional denser squat day (day 4): fewer reps, still not crazy
      bsWork4: [0.68, 0.7, 0.72, 0.74][w],
      // Front squat (never same day as back): volume-focused
      fsWork: [0.58, 0.6, 0.62, 0.65][w],
      fsBuild: [0.5, 0.52, 0.55, 0.55][w],
      // Deadlift sets of 4–5 early; triples only later waves
      dlWork5: [0.65, 0.68, 0.7, 0.72][w],
      dlWork4: [0.68, 0.7, 0.72, 0.75][w],
      dlBuild1: [0.5, 0.52, 0.55, 0.55][w],
      dlBuild2: [0.58, 0.6, 0.62, 0.65][w],
      // Bench
      bpWork5: [0.65, 0.68, 0.7, 0.72][w],
      bpWork3: [0.7, 0.72, 0.75, 0.78][w],
      bpBuild1: [0.5, 0.52, 0.55, 0.55][w],
      bpBuild2: [0.58, 0.6, 0.65, 0.68][w],
      // Power clean — technique + power, not max attempts
      pcWork: [0.6, 0.62, 0.65, 0.68][w],
      pcBuild: [0.5, 0.52, 0.55, 0.55][w],
      // Volume knobs
      bsSets: [4, 5, 5, 5][w],
      dlSets: [4, 4, 5, 4][w],
      dlReps: [5, 5, 4, 4][w], // week 1–2: fives; later: fours
      waveLabel: ["Week A · base", "Week B · build", "Week C · push", "Week D · peak-lite"][w]
    };
  }

  function pct(n) {
    return Math.round(n * 100) / 100;
  }

  /** Rotating Arm Farm burnouts — big pump, not ego lifts */
  function armFarm(dayIndex, wave) {
    const farms = [
      {
        name: "Arm Farm · Biceps & Forearms",
        rest: "45–60s · chase the pump, leave 1–2 in the tank",
        sets: [
          { free: true, name: "EZ-bar or DB curl", sets: 3, reps: "12–15", note: "Full ROM · squeeze top" },
          { free: true, name: "Hammer curl", sets: 3, reps: "12/arm", note: "Control the eccentric" },
          { free: true, name: "Farmer hold or wrist curl", sets: 3, reps: "30–40s / 15", note: "Forearms on fire" }
        ]
      },
      {
        name: "Arm Farm · Triceps & Shoulders",
        rest: "45–60s · high reps, clean lockouts",
        sets: [
          { free: true, name: "Overhead DB triceps ext. or rope pressdown", sets: 3, reps: "12–15", note: "Elbows tucked" },
          { free: true, name: "Close-grip push-up or diamond push-up", sets: 3, reps: "AMRAP", note: "Quality reps" },
          { free: true, name: "DB lateral raise", sets: 3, reps: "15–20", note: "Light · no swinging" },
          { free: true, name: "Band pull-apart or face pull", sets: 2, reps: "20", note: "Rear delts · posture" }
        ]
      },
      {
        name: "Arm Farm · Bi / Tri Supersets",
        rest: "60s after each pair",
        sets: [
          { free: true, name: "A1 · Curl variation", sets: 3, reps: "12", note: "Superset with A2" },
          { free: true, name: "A2 · Triceps pressdown or skullcrusher", sets: 3, reps: "12", note: "No rest after curls" },
          { free: true, name: "B1 · Reverse curl or preacher", sets: 2, reps: "12–15", note: "Forearm + bi" },
          { free: true, name: "B2 · Overhead extension", sets: 2, reps: "12–15", note: "Long head focus" }
        ]
      },
      {
        name: "Arm Farm · Shoulder Pump + Guns",
        rest: "45s · finish strong",
        sets: [
          { free: true, name: "Seated DB shoulder press (light)", sets: 3, reps: "12–15", note: "Smooth tempo" },
          { free: true, name: "Lateral + front raise complex", sets: 3, reps: "10+10", note: "No momentum" },
          { free: true, name: "Cable or band curl 21s", sets: 2, reps: "21", note: "7 bottom / 7 top / 7 full" },
          { free: true, name: "Triceps kickback or diamond push-up", sets: 2, reps: "15", note: "Burnout" }
        ]
      }
    ];
    // Rotate farm emphasis by day; nudge by wave so weeks don't feel identical
    return farms[(dayIndex + wave) % farms.length];
  }

  /**
   * Four sessions per week.
   * RULE: never program Front Squat and Back Squat on the same day.
   * Day 1 = Back Squat · Day 3 = Front Squat · Day 4 may use Back Squat again (no front).
   */
  function weekProgram(weekSeed) {
    const wave = weekSeed % 4;
    const s = waveScheme(wave);
    const farm = (i) => armFarm(i, wave);

    return [
      {
        id: "w1",
        dayLabel: "Day 1 · Back Squat",
        title: "Brace Yourself — Squat",
        focus: s.waveLabel + " · back squat volume (no front squat today)",
        warmup: [
          "5 min easy bike, walk, or row",
          "World’s greatest stretch × 5/side",
          "Bodyweight squat × 10 + hip openers",
          "Empty bar back squat × 8, then build through listed ramp sets"
        ],
        blocks: [
          {
            name: "Main · Back Squat",
            rest: "2–3 min between working sets",
            sets: [
              { liftId: "backSquat", sets: 1, reps: 5, pct: pct(s.bsBuild1), label: "Ramp" },
              { liftId: "backSquat", sets: 1, reps: 5, pct: pct(s.bsBuild2), label: "Ramp" },
              {
                liftId: "backSquat",
                sets: s.bsSets,
                reps: 5,
                pct: pct(s.bsWork5),
                label: "Working · sets of 5"
              }
            ]
          },
          {
            name: "Secondary · Power Clean (technique)",
            rest: "2 min · crisp, not maximal",
            sets: [
              { liftId: "powerClean", sets: 1, reps: 3, pct: pct(s.pcBuild), label: "Ramp" },
              { liftId: "powerClean", sets: 4, reps: 3, pct: pct(s.pcWork), label: "Working" }
            ]
          },
          {
            name: "Accessories · legs & trunk",
            rest: "60–90s",
            sets: [
              { free: true, name: "Walking lunge", sets: 3, reps: "8–10/leg", note: "Bodyweight or light DBs" },
              { free: true, name: "Hanging knee raise or cable crunch", sets: 3, reps: "10–15", note: "Controlled" },
              { free: true, name: "Back extension", sets: 3, reps: "10–12", note: "Squeeze top · no bounce" }
            ]
          },
          Object.assign({ rest: farm(0).rest }, { name: farm(0).name, sets: farm(0).sets })
        ],
        finisher: "Shake arms out. Water. Protein. You are not a coward."
      },
      {
        id: "w2",
        dayLabel: "Day 2 · Press",
        title: "Brick House — Upper",
        focus: s.waveLabel + " · bench + upper back (no squats)",
        warmup: [
          "Band pull-aparts × 20",
          "Scap push-up × 10",
          "Empty bar bench × 8, then ramp"
        ],
        blocks: [
          {
            name: "Main · Bench Press",
            rest: "2–3 min",
            sets: [
              { liftId: "bench", sets: 1, reps: 5, pct: pct(s.bpBuild1), label: "Ramp" },
              { liftId: "bench", sets: 1, reps: 5, pct: pct(s.bpBuild2), label: "Ramp" },
              {
                liftId: "bench",
                sets: wave >= 2 ? 5 : 4,
                reps: wave >= 2 ? 3 : 5,
                pct: pct(wave >= 2 ? s.bpWork3 : s.bpWork5),
                label: wave >= 2 ? "Working · triples" : "Working · sets of 5"
              }
            ]
          },
          {
            name: "Secondary · Power Clean",
            rest: "2 min",
            sets: [
              { liftId: "powerClean", sets: 1, reps: 3, pct: pct(s.pcBuild), label: "Ramp" },
              { liftId: "powerClean", sets: 4, reps: 2, pct: pct(s.pcWork), label: "Working · doubles" }
            ]
          },
          {
            name: "Accessories · back",
            rest: "60–90s",
            sets: [
              { free: true, name: "Chest-supported or DB row", sets: 4, reps: "8–10/arm", note: "Pause at top" },
              { free: true, name: "Face pull", sets: 3, reps: "15–20", note: "High elbows" },
              { free: true, name: "Dead bug", sets: 3, reps: "8/side", note: "Slow · ribs down" }
            ]
          },
          Object.assign({ rest: farm(1).rest }, { name: farm(1).name, sets: farm(1).sets })
        ],
        finisher: "Pump secured. Log weights. Eat like you train."
      },
      {
        id: "w3",
        dayLabel: "Day 3 · Hinge + Front Squat",
        title: "Hinge & Haul",
        focus: s.waveLabel + " · deadlift + front squat (no back squat today)",
        warmup: [
          "Cat-cow × 8",
          "Hip hinge with dowel × 10",
          "Light RDL × 8",
          "Empty bar front squat × 6, then ramp"
        ],
        blocks: [
          {
            name: "Main · Deadlift",
            rest: "3 min between working sets",
            sets: [
              { liftId: "deadlift", sets: 1, reps: 5, pct: pct(s.dlBuild1), label: "Ramp" },
              { liftId: "deadlift", sets: 1, reps: 5, pct: pct(s.dlBuild2), label: "Ramp" },
              {
                liftId: "deadlift",
                sets: s.dlSets,
                reps: s.dlReps,
                pct: pct(s.dlReps >= 5 ? s.dlWork5 : s.dlWork4),
                label: "Working · sets of " + s.dlReps
              }
            ]
          },
          {
            name: "Secondary · Front Squat",
            rest: "2–2.5 min · elbows up, brace hard",
            sets: [
              { liftId: "frontSquat", sets: 1, reps: 5, pct: pct(s.fsBuild), label: "Ramp" },
              {
                liftId: "frontSquat",
                sets: 3,
                reps: wave >= 2 ? 4 : 5,
                pct: pct(s.fsWork),
                label: "Working"
              }
            ]
          },
          {
            name: "Accessories · posterior chain",
            rest: "60–90s",
            sets: [
              { free: true, name: "Nordic curl / ham curl / glute bridge", sets: 3, reps: "6–10", note: "Quality over load" },
              { free: true, name: "Suitcase carry", sets: 3, reps: "25–40m/side", note: "Brace · no lean" },
              { free: true, name: "Side plank", sets: 3, reps: "25–40s/side", note: "Hips high" }
            ]
          },
          Object.assign({ rest: farm(2).rest }, { name: farm(2).name, sets: farm(2).sets })
        ],
        finisher: "Hips and arms smoked. Walk 5 min. You’re building something."
      },
      {
        id: "w4",
        dayLabel: "Day 4 · Mixed Strength",
        title: "Squatober Energy (Back Squat only)",
        focus: s.waveLabel + " · clean + back squat + bench (still no front squat)",
        warmup: [
          "Jump rope or high knees 2 min",
          "PVC pass-throughs × 10",
          "Empty bar clean + front rack hold × 4 (hold only — no front squat sets)",
          "Empty bar back squat × 6"
        ],
        blocks: [
          {
            name: "Main · Power Clean",
            rest: "2–3 min",
            sets: [
              { liftId: "powerClean", sets: 1, reps: 3, pct: pct(s.pcBuild), label: "Ramp" },
              { liftId: "powerClean", sets: 5, reps: 2, pct: pct(s.pcWork), label: "Working · doubles" }
            ]
          },
          {
            name: "Main · Back Squat",
            rest: "2–3 min · sets of 4, not a max-out",
            sets: [
              { liftId: "backSquat", sets: 1, reps: 4, pct: pct(s.bsBuild2), label: "Ramp" },
              {
                liftId: "backSquat",
                sets: 4,
                reps: 4,
                pct: pct(s.bsWork4),
                label: "Working · sets of 4"
              }
            ]
          },
          {
            name: "Secondary · Bench Press",
            rest: "2 min",
            sets: [
              {
                liftId: "bench",
                sets: 3,
                reps: 5,
                pct: pct(s.bpWork5),
                label: "Working · volume"
              }
            ]
          },
          {
            name: "Accessories · pull",
            rest: "60–90s",
            sets: [
              { free: true, name: "Pull-up or lat pulldown", sets: 3, reps: "AMRAP / 8–12", note: "Full hang if you can" },
              { free: true, name: "Rear delt fly or face pull", sets: 3, reps: "15", note: "Light pump" }
            ]
          },
          Object.assign({ rest: farm(3).rest }, { name: farm(3).name, sets: farm(3).sets })
        ],
        finisher: "Week block done for today. Log it. Feed the machine. No cowards in the logbook."
      }
    ];
  }

  /** Round to nearest 5 lb (or 2.5 if under 100) */
  function roundLoad(lbs) {
    if (lbs == null || Number.isNaN(lbs)) return null;
    const step = lbs < 100 ? 2.5 : 5;
    return Math.round(lbs / step) * step;
  }

  function calcTarget(maxes, liftId, pct) {
    const max = Number(maxes && maxes[liftId]);
    if (!max || !pct) return null;
    return roundLoad(max * pct);
  }

  /** Epley estimated 1RM from weight × reps completed */
  function e1rm(weight, reps) {
    const w = Number(weight);
    const r = Math.max(1, Number(reps) || 1);
    if (!w || w <= 0 || Number.isNaN(w)) return 0;
    if (r === 1) return w;
    return w * (1 + r / 30);
  }

  /** Sunday-start week key YYYY-MM-DD of that Sunday */
  function weekKey(date) {
    date = date || new Date();
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const day = d.getDay(); // 0 Sun
    d.setDate(d.getDate() - day);
    return formatWeekDate(d);
  }

  function formatWeekDate(d) {
    return (
      d.getFullYear() +
      "-" +
      String(d.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(d.getDate()).padStart(2, "0")
    );
  }

  function parseWeekKey(key) {
    const parts = String(key || "").split("-").map(Number);
    if (parts.length < 3 || !parts[0]) return null;
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  /** Previous Sunday week key */
  function previousWeekKey(key) {
    const d = parseWeekKey(key) || parseWeekKey(weekKey());
    if (!d) return null;
    d.setDate(d.getDate() - 7);
    return formatWeekDate(d);
  }

  function weekSeedFromKey(key) {
    // Use week-of-year style progression from the Sunday date, not a hash —
    // so consecutive weeks actually progress A→B→C→D
    const d = parseWeekKey(key);
    if (d) {
      const start = new Date(d.getFullYear(), 0, 0);
      const dayNum = Math.floor((d - start) / (24 * 60 * 60 * 1000));
      return Math.floor(dayNum / 7);
    }
    let h = 0;
    const s = String(key || "");
    for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
    return Math.abs(h);
  }

  /**
   * Parse a logged set value into { weight, reps, coward }.
   * Supports objects, "225", "225 x 5", and "I'm a Coward".
   */
  function parseLogEntry(val, prescribedReps) {
    const fallbackReps = Number(prescribedReps) || 0;
    if (val == null || val === "") return null;
    if (typeof val === "object") {
      if (val.coward) return { weight: 0, reps: 0, coward: true };
      const w = Number(val.weight);
      const r = val.reps != null ? Number(val.reps) : fallbackReps;
      if (Number.isNaN(w) || w <= 0) return { weight: 0, reps: 0, coward: true };
      return { weight: w, reps: Number.isNaN(r) ? fallbackReps : r, coward: false };
    }
    const s = String(val).trim();
    if (!s || /coward/i.test(s)) return { weight: 0, reps: 0, coward: true };
    const multi = s.match(/^([\d.]+)\s*[xX×*]\s*(\d+)/);
    if (multi) {
      return { weight: Number(multi[1]), reps: Number(multi[2]), coward: false };
    }
    const n = Number(s.replace(/lb/i, "").trim());
    if (!Number.isNaN(n) && n > 0) {
      return { weight: n, reps: fallbackReps, coward: false };
    }
    return null;
  }

  /** Expand program sets into loggable rows (same keys as UI). */
  function expandProgramRows(blockSets) {
    const rows = [];
    (blockSets || []).forEach((s, bi) => {
      if (s.free) {
        for (let i = 1; i <= (s.sets || 1); i++) {
          rows.push({
            key: "free_" + bi + "_" + i,
            free: true,
            liftId: null,
            reps: s.reps,
            pct: null,
            label: s.name || "",
            isWorking: false
          });
        }
      } else {
        const n = s.sets || 1;
        const label = String(s.label || "");
        const isWorking = /work/i.test(label) || (s.pct != null && s.pct >= 0.62);
        for (let i = 1; i <= n; i++) {
          rows.push({
            key: (s.liftId || "x") + "_" + bi + "_" + i,
            free: false,
            liftId: s.liftId,
            reps: s.reps,
            pct: s.pct,
            label,
            isWorking
          });
        }
      }
    });
    return rows;
  }

  /**
   * Pull performance samples for main lifts from a completed week.
   * Uses actual logged weight/reps vs prescribed targets.
   */
  function collectLiftSamples(weekProg, program, maxes) {
    const byLift = {};
    LIFTS.forEach((l) => {
      byLift[l.id] = [];
    });
    if (!weekProg || !program) return byLift;

    program.forEach((workout, wi) => {
      const logs = (weekProg.logs && weekProg.logs[wi]) || {};
      (workout.blocks || []).forEach((block) => {
        expandProgramRows(block.sets).forEach((row) => {
          if (row.free || !row.liftId || !byLift[row.liftId]) return;
          const prescribed =
            typeof row.reps === "number" ? row.reps : parseInt(String(row.reps), 10) || 5;
          const entry = parseLogEntry(logs[row.key], prescribed);
          if (!entry || entry.coward) return;
          const target = calcTarget(maxes, row.liftId, row.pct);
          byLift[row.liftId].push({
            weight: entry.weight,
            reps: entry.reps || prescribed,
            prescribedReps: prescribed,
            target: target || entry.weight,
            pct: row.pct,
            isWorking: !!row.isWorking,
            e1rm: e1rm(entry.weight, entry.reps || prescribed)
          });
        });
      });
    });
    return byLift;
  }

  /**
   * Smart TM decision from demonstrated performance — not linear weekly bumps.
   * Higher reps at a given weight ⇒ capacity for more load at lower/same reps next week.
   * Struggle ⇒ hold or tiny bump only.
   */
  function decideMaxFromSamples(currentMax, samples) {
    const cur = Number(currentMax) || 0;
    const working = (samples || []).filter((s) => s.isWorking);
    const pool = working.length ? working : samples || [];

    if (!pool.length) {
      return { max: cur || "", changed: false, reason: "no logged sets" };
    }

    let bestE1 = 0;
    let repDeltaSum = 0;
    let hit = 0;
    let under = 0;
    let weightOverSum = 0;

    pool.forEach((s) => {
      if (s.e1rm > bestE1) bestE1 = s.e1rm;
      const pd = (s.reps || 0) - (s.prescribedReps || 0);
      repDeltaSum += pd;
      const tgt = s.target || s.weight;
      if (s.weight >= tgt * 0.95 && s.reps >= (s.prescribedReps || 0)) hit++;
      else if (s.weight < tgt * 0.9 || s.reps < (s.prescribedReps || 0) - 0.5) under++;
      if (tgt > 0) weightOverSum += s.weight / tgt - 1;
    });

    const n = pool.length;
    const avgRepDelta = repDeltaSum / n;
    const hitRatio = hit / n;
    const underRatio = under / n;
    const avgWeightRatio = 1 + weightOverSum / n;

    // Implied training max ≈ 90% of best e1RM (sustainable programming)
    const impliedTm = bestE1 > 0 ? roundLoad(bestE1 * 0.9) : 0;

    let newMax = cur;
    let reason = "held";

    if (underRatio >= 0.5) {
      // Struggled — keep intensity, no ego jump
      newMax = cur;
      reason = "held · last week was hard";
    } else if (avgRepDelta >= 1.5 && hitRatio >= 0.5) {
      // Extra reps at weight ⇒ convert to heavier loads next week
      // ~2–3 lb per extra rep on average, capped
      const repBump = Math.min(cur * 0.04, Math.max(2.5, avgRepDelta * 2.5));
      const fromReps = roundLoad(cur + repBump);
      newMax = fromReps;
      if (impliedTm > newMax) {
        newMax = Math.min(impliedTm, roundLoad(cur * 1.05));
      }
      reason = "up · high reps at weight → heavier next week";
    } else if (avgWeightRatio >= 1.03 && hitRatio >= 0.6) {
      // Used more load than prescribed and completed reps
      newMax = roundLoad(Math.max(cur + 2.5, Math.min(impliedTm || cur + 5, cur * 1.04)));
      reason = "up · beat prescribed loads";
    } else if (hitRatio >= 0.75) {
      // Clean hits — modest ability-based bump
      if (impliedTm > cur) {
        newMax = roundLoad(Math.min(impliedTm, cur * 1.035 + 2.5));
      } else {
        newMax = roundLoad(cur + 2.5);
      }
      reason = "up · targets hit cleanly";
    } else if (hitRatio >= 0.4) {
      newMax = cur ? roundLoad(cur + 2.5) : impliedTm || "";
      reason = "small bump · mixed week";
    } else {
      newMax = cur;
      reason = "held · light or incomplete data";
    }

    // Never decrease from struggle path; cap weekly gain at 5%
    if (cur && newMax && newMax < cur) newMax = cur;
    if (cur && newMax && newMax > cur * 1.05) newMax = roundLoad(cur * 1.05);
    // If no prior max but we have e1RM, seed TM from ability
    if (!cur && impliedTm) {
      newMax = impliedTm;
      reason = "set from logged ability";
    }

    const changed = Number(newMax) !== Number(cur) && newMax !== "" && newMax != null;
    return {
      max: newMax === "" || newMax == null ? cur || "" : newMax,
      changed: !!changed,
      reason,
      bestE1rm: bestE1 ? roundLoad(bestE1) : 0,
      avgRepDelta: Math.round(avgRepDelta * 10) / 10
    };
  }

  /**
   * Evaluate previous week logs and update training maxes for the new Sunday week.
   * Idempotent per week via state.progressionAppliedFor.
   */
  function applySmartProgression(state, currentWeekKey) {
    const key = currentWeekKey || weekKey();
    if (!state || state.progressionAppliedFor === key) {
      return { state, applied: false, notes: [] };
    }

    const prevKey = previousWeekKey(key);
    const prevProg = state.weeks && prevKey ? state.weeks[prevKey] : null;
    const anyDone = prevProg && (prevProg.completed || []).some(Boolean);

    if (!prevKey || !prevProg || !anyDone) {
      state.progressionAppliedFor = key;
      return { state, applied: false, notes: [] };
    }

    const prevSeed = weekSeedFromKey(prevKey);
    const program = weekProgram(prevSeed);
    const samplesByLift = collectLiftSamples(prevProg, program, state.maxes || {});
    const notes = [];
    const nextMaxes = Object.assign({}, state.maxes || {});

    LIFTS.forEach((lift) => {
      const samples = samplesByLift[lift.id] || [];
      if (!samples.length) return;
      const decision = decideMaxFromSamples(nextMaxes[lift.id], samples);
      if (decision.changed) {
        nextMaxes[lift.id] = decision.max;
        notes.push({
          liftId: lift.id,
          label: lift.label,
          from: state.maxes[lift.id],
          to: decision.max,
          reason: decision.reason,
          bestE1rm: decision.bestE1rm
        });
      } else if (samples.some((s) => s.isWorking)) {
        notes.push({
          liftId: lift.id,
          label: lift.label,
          from: state.maxes[lift.id],
          to: decision.max,
          reason: decision.reason,
          bestE1rm: decision.bestE1rm,
          held: true
        });
      }
    });

    state.maxes = nextMaxes;
    state.progressionAppliedFor = key;
    state.lastProgression = {
      weekKey: key,
      fromWeek: prevKey,
      notes,
      at: Date.now()
    };
    return { state, applied: true, notes };
  }

  global.CL = global.CL || {};
  global.CL.data = global.CL.data || {};
  global.CL.data.workoutLifts = LIFTS;
  global.CL.workoutsApi = {
    LIFTS,
    weekProgram,
    waveScheme,
    roundLoad,
    calcTarget,
    e1rm,
    weekKey,
    weekSeedFromKey,
    previousWeekKey,
    parseLogEntry,
    expandProgramRows,
    collectLiftSamples,
    decideMaxFromSamples,
    applySmartProgression
  };
})(window);
