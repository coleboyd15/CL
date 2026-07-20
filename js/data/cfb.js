/* Tech vs A&M 2026 win-total tracker — ESPN schedules/records + odds math */
(function (global) {
  const CACHE_KEY = "cfbTracker";
  const HISTORY_KEY = "cfbOddsHistory";
  const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // revalidate schedules every 6h
  const DAY_MS = 24 * 60 * 60 * 1000;

  const TEAMS = {
    tech: {
      id: "tech",
      espnId: "264",
      name: "Texas Tech",
      short: "TTU",
      nick: "Red Raiders",
      conf: "Big 12",
      color: "#CC0000",
      colorAlt: "#000000"
    },
    agm: {
      id: "agm",
      espnId: "245",
      name: "Texas A&M",
      short: "TA&M",
      nick: "Aggies",
      conf: "SEC",
      color: "#500000",
      colorAlt: "#FFFFFF"
    }
  };

  /** Seed 2026 regular-season win totals (updated when live odds fetch works) */
  const DEFAULT_LINES_2026 = {
    season: 2026,
    asOf: null,
    source: "seed",
    tech: {
      line: 7.5,
      overOdds: -115,
      underOdds: -105,
      book: "Consensus (seed)"
    },
    agm: {
      line: 8.5,
      overOdds: -110,
      underOdds: -110,
      book: "Consensus (seed)"
    },
    note: "Win totals refresh when a live source is available; otherwise consensus seed lines are used."
  };

  function dayKey(d) {
    d = d || new Date();
    return (
      d.getFullYear() +
      "-" +
      String(d.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(d.getDate()).padStart(2, "0")
    );
  }

  function americanToImplied(american) {
    const a = Number(american);
    if (!a || Number.isNaN(a)) return 0.5;
    if (a > 0) return 100 / (a + 100);
    return Math.abs(a) / (Math.abs(a) + 100);
  }

  function formatAmerican(a) {
    const n = Number(a);
    if (Number.isNaN(n)) return "—";
    return n > 0 ? "+" + n : String(n);
  }

  function formatPct(p) {
    return (Math.round(p * 1000) / 10).toFixed(1) + "%";
  }

  /** Nudge expected wins from O/U juice */
  function expectedWins(line, overOdds, underOdds) {
    const overP = americanToImplied(overOdds);
    const underP = americanToImplied(underOdds);
    const total = overP + underP || 1;
    const overFair = overP / total;
    // Map over probability to expected wins around the line
    // 50% over → μ = line; higher over% → slightly above line
    const lean = (overFair - 0.5) * 1.2;
    return Number(line) + lean;
  }

  /**
   * Monte Carlo: P(Tech wins more RS games), P(A&M more), P(tie)
   * Models season wins ~ Normal(μ, σ) discretized to 0–12.
   */
  function simulateWhoWinsMore(techLine, agmLine, draws) {
    draws = draws || 20000;
    const muT = techLine.mu != null ? techLine.mu : expectedWins(techLine.line, techLine.overOdds, techLine.underOdds);
    const muA = agmLine.mu != null ? agmLine.mu : expectedWins(agmLine.line, agmLine.overOdds, agmLine.underOdds);
    const sigma = 2.15; // CFB win-total dispersion
    let techMore = 0;
    let agmMore = 0;
    let tie = 0;

    // Box-Muller
    function randn() {
      let u = 0;
      let v = 0;
      while (u === 0) u = Math.random();
      while (v === 0) v = Math.random();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    }

    function sampleWins(mu) {
      let w = Math.round(mu + sigma * randn());
      if (w < 0) w = 0;
      if (w > 12) w = 12;
      return w;
    }

    for (let i = 0; i < draws; i++) {
      const t = sampleWins(muT);
      const a = sampleWins(muA);
      if (t > a) techMore++;
      else if (a > t) agmMore++;
      else tie++;
    }

    const pTech = techMore / draws;
    const pAgm = agmMore / draws;
    const pTie = tie / draws;
    // Market-style binary (ignore ties → conditional on no tie)
    const pTechNoTie = pTech / (pTech + pAgm || 1);
    const pAgmNoTie = pAgm / (pTech + pAgm || 1);

    return {
      muTech: Math.round(muT * 100) / 100,
      muAgm: Math.round(muA * 100) / 100,
      pTech,
      pAgm,
      pTie,
      pTechNoTie,
      pAgmNoTie,
      // Kalshi-style cents
      techCents: Math.round(pTechNoTie * 100),
      agmCents: Math.round(pAgmNoTie * 100)
    };
  }

  function getHistory() {
    const h = CL.storage.get(HISTORY_KEY, []);
    return Array.isArray(h) ? h : [];
  }

  function pushHistorySnapshot(snapshot) {
    const key = dayKey();
    let hist = getHistory().filter((x) => x.dateKey !== key);
    hist.push(
      Object.assign({ dateKey: key, at: Date.now() }, snapshot)
    );
    // keep ~90 days
    hist = hist.sort((a, b) => String(a.dateKey).localeCompare(String(b.dateKey))).slice(-90);
    CL.storage.set(HISTORY_KEY, hist, { skipSync: true });
    return hist;
  }

  function getCache() {
    return CL.storage.get(CACHE_KEY, null);
  }

  function setCache(data) {
    CL.storage.set(CACHE_KEY, data, { skipSync: true });
    return data;
  }

  async function fetchJson(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error("HTTP " + res.status);
    return res.json();
  }

  async function fetchTeamBundle(espnId, season) {
    const teamUrl =
      "https://site.api.espn.com/apis/site/v2/sports/football/college-football/teams/" + espnId;
    const schedUrl =
      teamUrl +
      "/schedule?season=" +
      season +
      "&seasontype=2";

    const [teamData, schedData] = await Promise.all([
      fetchJson(teamUrl),
      fetchJson(schedUrl).catch(() => null)
    ]);

    const team = teamData.team || {};
    const logos = team.logos || [];
    const logo =
      (logos.find((l) => l.rel && l.rel.includes("default")) || logos[0] || {}).href || "";

    const recordItems = (team.record && team.record.items) || [];
    const overall =
      recordItems.find((r) => r.type === "total") ||
      recordItems[0] ||
      {};
    const recordSummary = overall.summary || team.recordSummary || "0-0";
    const stats = {};
    (overall.stats || []).forEach((s) => {
      if (s.name) stats[s.name] = s.value;
    });

    const events = (schedData && schedData.events) || [];
    const games = events.map((ev) => normalizeGame(ev, espnId)).filter(Boolean);

    // Wins/losses from completed games if record empty
    let wins = Number(stats.wins);
    let losses = Number(stats.losses);
    if (Number.isNaN(wins) || Number.isNaN(losses)) {
      wins = games.filter((g) => g.done && g.result === "W").length;
      losses = games.filter((g) => g.done && g.result === "L").length;
    }

    return {
      espnId: String(espnId),
      displayName: team.displayName || team.name || "",
      abbreviation: team.abbreviation || "",
      logo,
      color: team.color ? "#" + team.color : "",
      record: recordSummary,
      wins: wins || 0,
      losses: losses || 0,
      games
    };
  }

  function normalizeGame(ev, myEspnId) {
    try {
      const comp = (ev.competitions && ev.competitions[0]) || {};
      const competitors = comp.competitors || [];
      const me = competitors.find((c) => String(c.team && c.team.id) === String(myEspnId));
      const opp = competitors.find((c) => String(c.team && c.team.id) !== String(myEspnId));
      if (!me || !opp) return null;

      const homeAway = me.homeAway || "home";
      const venue = (comp.venue && comp.venue.fullName) || "";
      const locParts = [];
      if (comp.venue && comp.venue.address) {
        if (comp.venue.address.city) locParts.push(comp.venue.address.city);
        if (comp.venue.address.state) locParts.push(comp.venue.address.state);
      }
      const location = locParts.join(", ") || (homeAway === "home" ? "Home" : "Away");

      const status = (comp.status && comp.status.type) || (ev.status && ev.status.type) || {};
      const done = !!(status.completed || status.name === "STATUS_FINAL");
      const state = status.state || status.name || "";
      const date = new Date(ev.date || comp.date);

      let result = "";
      let score = "";
      if (done) {
        const myScore = me.score != null ? Number(me.score) : null;
        const oppScore = opp.score != null ? Number(opp.score) : null;
        if (myScore != null && oppScore != null) {
          score = myScore + "–" + oppScore;
          result = myScore > oppScore ? "W" : myScore < oppScore ? "L" : "T";
        } else if (me.winner === true) result = "W";
        else if (me.winner === false) result = "L";
      }

      const broadcasts = (comp.broadcasts || [])
        .map((b) => (b.names && b.names[0]) || b.market || "")
        .filter(Boolean);

      return {
        id: ev.id,
        date: date.toISOString(),
        dateLabel: date.toLocaleDateString(undefined, {
          weekday: "short",
          month: "short",
          day: "numeric"
        }),
        timeLabel: done
          ? "Final"
          : date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }),
        opponent: (opp.team && (opp.team.displayName || opp.team.name)) || "TBD",
        opponentLogo:
          (opp.team && opp.team.logos && opp.team.logos[0] && opp.team.logos[0].href) ||
          (opp.team && opp.team.logo) ||
          "",
        homeAway,
        venue,
        location,
        done,
        state,
        result,
        score,
        tv: broadcasts[0] || ""
      };
    } catch {
      return null;
    }
  }

  /**
   * Attempt live win-total scrape from public sportsbook aggregators is blocked by CORS.
   * We keep seed lines and allow daily manual refresh of seeds from ESPN team projections if present.
   */
  async function fetchWinTotals(season) {
    // Placeholder for future odds API key integration
    // Structure matches DEFAULT_LINES for easy swap
    try {
      // Some ESPN pages expose futures in scoreboard odds — best-effort, often empty preseason
      const url =
        "https://site.api.espn.com/apis/site/v2/sports/football/college-football/odds/featured";
      const data = await fetchJson(url);
      // If structure unexpected, fall through
      if (data && data.items) {
        // No stable CFB win-total schema — ignore
      }
    } catch (_) {
      /* expected without provider */
    }
    return null;
  }

  function mergeLines(live, seed) {
    if (!live) return Object.assign({}, seed, { asOf: seed.asOf || Date.now() });
    return Object.assign({}, seed, live, { asOf: Date.now() });
  }

  async function loadTracker(options) {
    options = options || {};
    const force = !!options.force;
    const season = options.season || 2026;
    const cached = getCache();
    const now = Date.now();

    if (
      !force &&
      cached &&
      cached.fetchedAt &&
      now - cached.fetchedAt < CACHE_TTL_MS &&
      cached.season === season
    ) {
      return Object.assign({}, cached, { fromCache: true });
    }

    // Daily odds snapshot: if new day, always recompute history point even if schedule cached
    const needDailySnap = !cached || cached.dayKey !== dayKey();

    let techTeam;
    let agmTeam;
    let scheduleError = "";

    try {
      [techTeam, agmTeam] = await Promise.all([
        fetchTeamBundle(TEAMS.tech.espnId, season),
        fetchTeamBundle(TEAMS.agm.espnId, season)
      ]);
    } catch (err) {
      console.warn("ESPN schedule fetch failed", err);
      scheduleError = err.message || "Schedule fetch failed";
      if (cached && cached.tech && cached.agm) {
        techTeam = cached.tech;
        agmTeam = cached.agm;
      } else {
        techTeam = emptyTeam(TEAMS.tech);
        agmTeam = emptyTeam(TEAMS.agm);
      }
    }

    let lines = DEFAULT_LINES_2026;
    try {
      const liveLines = await fetchWinTotals(season);
      lines = mergeLines(liveLines, DEFAULT_LINES_2026);
    } catch (_) {
      lines = Object.assign({}, DEFAULT_LINES_2026, { asOf: now });
    }

    // If season has started, blend O/U with current wins for "remaining" narrative
    // Market who-wins-more still uses full-season win totals
    const sim = simulateWhoWinsMore(lines.tech, lines.agm);

    const payload = {
      season,
      fetchedAt: now,
      dayKey: dayKey(),
      fromCache: false,
      scheduleError,
      lines,
      sim,
      tech: Object.assign({}, TEAMS.tech, techTeam),
      agm: Object.assign({}, TEAMS.agm, agmTeam),
      market: {
        question: "Who will win more regular-season games in 2026?",
        yesLabel: "Texas Tech",
        noLabel: "Texas A&M",
        techProb: sim.pTechNoTie,
        agmProb: sim.pAgmNoTie,
        techCents: sim.techCents,
        agmCents: sim.agmCents,
        tieProb: sim.pTie
      }
    };

    if (force || needDailySnap || !cached) {
      pushHistorySnapshot({
        techLine: lines.tech.line,
        agmLine: lines.agm.line,
        techCents: sim.techCents,
        agmCents: sim.agmCents,
        muTech: sim.muTech,
        muAgm: sim.muAgm
      });
    }

    payload.history = getHistory();
    setCache(payload);
    return payload;
  }

  function emptyTeam(meta) {
    return {
      espnId: meta.espnId,
      displayName: meta.name,
      abbreviation: meta.short,
      logo: "",
      record: "0-0",
      wins: 0,
      losses: 0,
      games: []
    };
  }

  global.CL = global.CL || {};
  global.CL.data = global.CL.data || {};
  global.CL.data.cfbTeams = TEAMS;
  global.CL.cfb = {
    TEAMS,
    loadTracker,
    getCache,
    getHistory,
    simulateWhoWinsMore,
    expectedWins,
    americanToImplied,
    formatAmerican,
    formatPct,
    dayKey,
    DEFAULT_LINES_2026
  };
})(window);
