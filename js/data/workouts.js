/* Weekly strength templates — % of maxes, Brace Yourself / Brick House / Squatober style */
(function (global) {
  const LIFTS = [
    { id: "backSquat", label: "Back Squat" },
    { id: "deadlift", label: "Deadlift" },
    { id: "frontSquat", label: "Front Squat" },
    { id: "bench", label: "Bench Press" },
    { id: "powerClean", label: "Power Clean" }
  ];

  /**
   * Four sessions per week. Each set: liftId, sets, reps, pct (0–1 of max), note optional.
   * Warm-ups and accessories use fixed loads or RPE notes (no %).
   */
  function weekProgram(weekSeed) {
    // Slight progression by week number (cycles every 4 weeks of year)
    const wave = weekSeed % 4;
    const bump = wave * 0.02; // +2% each week in cycle

    function p(base) {
      return Math.min(0.95, Math.round((base + bump) * 100) / 100);
    }

    return [
      {
        id: "w1",
        dayLabel: "Day 1 · Squat",
        title: "Brace & Build",
        focus: "Back squat volume + trunk",
        warmup: [
          "5 min easy bike or walk",
          "World’s greatest stretch × 5/side",
          "Bodyweight squat × 10",
          "Empty bar back squat × 8, then build to first working set"
        ],
        blocks: [
          {
            name: "Main · Back Squat",
            rest: "2–3 min between sets",
            sets: [
              { liftId: "backSquat", sets: 1, reps: 5, pct: p(0.55), label: "Build-up" },
              { liftId: "backSquat", sets: 1, reps: 5, pct: p(0.65), label: "Build-up" },
              { liftId: "backSquat", sets: 5, reps: 5, pct: p(0.73), label: "Working" }
            ]
          },
          {
            name: "Secondary · Front Squat",
            rest: "2 min",
            sets: [{ liftId: "frontSquat", sets: 3, reps: 5, pct: p(0.6), label: "Working" }]
          },
          {
            name: "Accessories",
            rest: "60–90s",
            sets: [
              { free: true, name: "Walking lunge", sets: 3, reps: "10/leg", note: "Bodyweight or DBs" },
              { free: true, name: "Hanging knee raise", sets: 3, reps: "10–15", note: "Controlled" },
              { free: true, name: "Back extension", sets: 3, reps: "12", note: "Squeeze top" }
            ]
          }
        ],
        finisher: "Optional: 10 min easy cardio · protein + water"
      },
      {
        id: "w2",
        dayLabel: "Day 2 · Press",
        title: "Brick House Upper",
        focus: "Bench strength + upper back",
        warmup: [
          "Band pull-aparts × 20",
          "Push-up × 10",
          "Empty bar bench × 8, then build"
        ],
        blocks: [
          {
            name: "Main · Bench Press",
            rest: "2–3 min",
            sets: [
              { liftId: "bench", sets: 1, reps: 5, pct: p(0.55), label: "Build-up" },
              { liftId: "bench", sets: 1, reps: 3, pct: p(0.68), label: "Build-up" },
              { liftId: "bench", sets: 5, reps: 3, pct: p(0.78), label: "Working" }
            ]
          },
          {
            name: "Secondary · Power Clean technique",
            rest: "2 min",
            sets: [{ liftId: "powerClean", sets: 4, reps: 3, pct: p(0.6), label: "Crisp reps" }]
          },
          {
            name: "Accessories",
            rest: "60–90s",
            sets: [
              { free: true, name: "DB row", sets: 4, reps: "8/arm", note: "Chest supported if possible" },
              { free: true, name: "Face pull", sets: 3, reps: "15", note: "High elbows" },
              { free: true, name: "Triceps pressdown or skullcrushers", sets: 3, reps: "12", note: "" }
            ]
          }
        ],
        finisher: "Optional: farmer carry 3×40m"
      },
      {
        id: "w3",
        dayLabel: "Day 3 · Posterior",
        title: "Hinge & Haul",
        focus: "Deadlift + clean pull",
        warmup: [
          "Cat-cow × 8",
          "Hip hinge with dowel × 10",
          "Light RDL × 8, then build"
        ],
        blocks: [
          {
            name: "Main · Deadlift",
            rest: "3 min",
            sets: [
              { liftId: "deadlift", sets: 1, reps: 5, pct: p(0.55), label: "Build-up" },
              { liftId: "deadlift", sets: 1, reps: 3, pct: p(0.7), label: "Build-up" },
              { liftId: "deadlift", sets: 4, reps: 3, pct: p(0.8), label: "Working" }
            ]
          },
          {
            name: "Secondary · Front Squat",
            rest: "2 min",
            sets: [{ liftId: "frontSquat", sets: 3, reps: 4, pct: p(0.65), label: "Working" }]
          },
          {
            name: "Accessories",
            rest: "60–90s",
            sets: [
              { free: true, name: "Nordic curl or ham curl", sets: 3, reps: "6–8", note: "Quality over load" },
              { free: true, name: "Suitcase carry", sets: 3, reps: "30m/side", note: "Brace hard" },
              { free: true, name: "Plank", sets: 3, reps: "40s", note: "Ribs down" }
            ]
          }
        ],
        finisher: "Walk 5–10 min · stretch hips/hams"
      },
      {
        id: "w4",
        dayLabel: "Day 4 · Mixed Strength",
        title: "Squatober Saturday Energy",
        focus: "Power clean + squat + bench density",
        warmup: [
          "Jump rope or high knees 2 min",
          "PVC pass-throughs × 10",
          "Empty bar clean + front squat complex × 4"
        ],
        blocks: [
          {
            name: "Main · Power Clean",
            rest: "2–3 min",
            sets: [
              { liftId: "powerClean", sets: 1, reps: 3, pct: p(0.55), label: "Build-up" },
              { liftId: "powerClean", sets: 5, reps: 2, pct: p(0.72), label: "Working" }
            ]
          },
          {
            name: "Main · Back Squat",
            rest: "2–3 min",
            sets: [{ liftId: "backSquat", sets: 4, reps: 4, pct: p(0.75), label: "Working" }]
          },
          {
            name: "Secondary · Bench Press",
            rest: "2 min",
            sets: [{ liftId: "bench", sets: 4, reps: 5, pct: p(0.7), label: "Working" }]
          },
          {
            name: "Accessories",
            rest: "60s",
            sets: [
              { free: true, name: "Pull-up or lat pulldown", sets: 3, reps: "AMRAP / 10", note: "" },
              { free: true, name: "DB lateral raise", sets: 3, reps: "12", note: "Light" },
              { free: true, name: "Dead bug", sets: 3, reps: "8/side", note: "Slow" }
            ]
          }
        ],
        finisher: "Done. Log weights. Eat."
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
    // stable int from week key
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
    roundLoad,
    calcTarget,
    weekKey,
    weekSeedFromKey
  };
})(window);
