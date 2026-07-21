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

  /** Sunday-start week key YYYY-MM-DD of that Sunday */
  function weekKey(date) {
    date = date || new Date();
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const day = d.getDay(); // 0 Sun
    d.setDate(d.getDate() - day);
    return (
      d.getFullYear() +
      "-" +
      String(d.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(d.getDate()).padStart(2, "0")
    );
  }

  function weekSeedFromKey(key) {
    // Use week-of-year style progression from the Sunday date, not a hash —
    // so consecutive weeks actually progress A→B→C→D
    const parts = String(key || "").split("-").map(Number);
    if (parts.length >= 3 && parts[0] && parts[1] && parts[2]) {
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      const start = new Date(d.getFullYear(), 0, 0);
      const dayNum = Math.floor((d - start) / (24 * 60 * 60 * 1000));
      return Math.floor(dayNum / 7);
    }
    let h = 0;
    for (let i = 0; i < key.length; i++) h = (Math.imul(31, h) + key.charCodeAt(i)) | 0;
    return Math.abs(h);
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
    weekKey,
    weekSeedFromKey
  };
})(window);
