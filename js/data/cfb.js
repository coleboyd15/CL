/* Tech vs A&M 2026 win-total tracker — ESPN schedules/records + odds math */
(function (global) {
  // v3: live win totals (OddsShark/VI) + Tech ESPN id 2641
  const CACHE_KEY = "cfbTracker_v3";
  const HISTORY_KEY = "cfbOddsHistory";
  const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // revalidate schedules every 6h
  const DAY_MS = 24 * 60 * 60 * 1000;

  const TEAMS = {
    tech: {
      id: "tech",
      // ESPN: /college-football/team/_/id/2641/texas-tech-red-raiders
      // Note: 264 is Washington Huskies — do not use
      espnId: "2641",
      name: "Texas Tech",
      short: "TTU",
      nick: "Red Raiders",
      conf: "Big 12",
      color: "#CC0000",
      colorAlt: "#000000",
      nameMatch: /texas tech|red raiders/i
    },
    agm: {
      id: "agm",
      // ESPN: /college-football/team/_/id/245/texas-a&m-aggies
      espnId: "245",
      name: "Texas A&M",
      short: "TA&M",
      nick: "Aggies",
      conf: "SEC",
      color: "#500000",
      colorAlt: "#FFFFFF",
      nameMatch: /texas a&m|texas a \& m|aggies/i
    }
  };

  /**
   * Last-known consensus 2026 regular-season win totals (Jul 2026 books).
   * Live fetch prefers OddsShark / VegasInsider; this is fallback only.
   * Tech is NOT 7.5 — market is ~10.5 after 2025 run.
   */
  const DEFAULT_LINES_2026 = {
    season: 2026,
    asOf: Date.parse("2026-07-16T12:00:00Z"),
    source: "consensus-fallback",
    tech: {
      line: 10.5,
      overOdds: -220,
      underOdds: 176,
      book: "FanDuel (OddsShark, Jul 16 2026)"
    },
    agm: {
      line: 8.5,
      overOdds: -106,
      underOdds: -114,
      book: "FanDuel (OddsShark, Jul 16 2026)"
    },
    note: "Fallback lines from published 2026 win totals. Live scrape updates when sources allow."
  };

  const WIN_TOTAL_SOURCES = [
    {
      id: "oddsshark",
      label: "OddsShark / FanDuel",
      url: "https://www.oddsshark.com/ncaaf/college-football-win-totals"
    },
    {
      id: "vegasinsider",
      label: "VegasInsider",
      url: "https://www.vegasinsider.com/college-football/odds/win-totals/"
    }
  ];

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

  function pickLogo(logos) {
    if (!logos || !logos.length) return "";
    const scored = logos.map((l) => {
      const rel = (l.rel || []).join(" ").toLowerCase();
      let score = 0;
      if (rel.includes("default")) score += 3;
      if (rel.includes("full")) score += 2;
      if (rel.includes("dark") || rel.includes("scoreboard")) score += 1;
      if (rel.includes("interior")) score -= 1;
      return { href: l.href || "", score };
    });
    scored.sort((a, b) => b.score - a.score);
    return scored[0] && scored[0].href ? scored[0].href : logos[0].href || "";
  }

  async function fetchScheduleEvents(espnId, season) {
    const base =
      "https://site.api.espn.com/apis/site/v2/sports/football/college-football/teams/" +
      espnId +
      "/schedule?season=" +
      season;
    // Regular season first; fall back to full season payload
    const urls = [base + "&seasontype=2", base];
    for (const url of urls) {
      try {
        const data = await fetchJson(url);
        const events = (data && data.events) || [];
        if (events.length) return events;
      } catch (_) {
        /* try next */
      }
    }
    return [];
  }

  async function fetchTeamBundle(espnId, season, meta) {
    const teamUrl =
      "https://site.api.espn.com/apis/site/v2/sports/football/college-football/teams/" + espnId;

    const [teamData, events] = await Promise.all([
      fetchJson(teamUrl),
      fetchScheduleEvents(espnId, season)
    ]);

    const team = teamData.team || {};
    const displayName = team.displayName || team.name || "";
    if (meta && meta.nameMatch && displayName && !meta.nameMatch.test(displayName)) {
      throw new Error(
        "ESPN team mismatch for id " + espnId + ": got “" + displayName + "” (expected " + meta.name + ")"
      );
    }

    const logo = pickLogo(team.logos) || "";
    // Stable CDN fallback by id (works even if logos array is empty)
    const logoFallback =
      logo ||
      "https://a.espncdn.com/i/teamlogos/ncaa/500/" + espnId + ".png";

    const recordItems = (team.record && team.record.items) || [];
    const overall =
      recordItems.find((r) => r.type === "total") ||
      recordItems[0] ||
      {};
    let recordSummary = overall.summary || team.recordSummary || "";
    const stats = {};
    (overall.stats || []).forEach((s) => {
      if (s.name) stats[s.name] = s.value;
    });

    const games = events
      .map((ev) => normalizeGame(ev, espnId))
      .filter(Boolean)
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    // Wins/losses from completed games if record empty / preseason
    let wins = Number(stats.wins);
    let losses = Number(stats.losses);
    if (Number.isNaN(wins) || Number.isNaN(losses) || (!recordSummary && games.length)) {
      wins = games.filter((g) => g.done && g.result === "W").length;
      losses = games.filter((g) => g.done && g.result === "L").length;
    }
    if (!recordSummary) recordSummary = wins + "-" + losses;

    return {
      espnId: String(espnId),
      displayName: displayName || (meta && meta.name) || "",
      abbreviation: team.abbreviation || (meta && meta.short) || "",
      logo: logoFallback,
      color: team.color ? "#" + team.color : (meta && meta.color) || "",
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
      let location = locParts.join(", ");
      if (!location) {
        location = homeAway === "home" ? "Home" : homeAway === "away" ? "Away" : "TBD";
      }
      if (venue && location !== venue) {
        location = venue + (locParts.length ? " · " + locParts.join(", ") : "");
      }

      const status = (comp.status && comp.status.type) || (ev.status && ev.status.type) || {};
      const done = !!(status.completed || status.name === "STATUS_FINAL");
      const state = status.state || status.name || "";
      const date = new Date(ev.date || comp.date);
      const tbd =
        status.name === "STATUS_SCHEDULED" &&
        (status.detail || "").toLowerCase().includes("tbd");

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

      // Prefer higher-res opponent logo
      const oppLogos = (opp.team && opp.team.logos) || [];
      const opponentLogo =
        pickLogo(oppLogos) ||
        (opp.team && opp.team.logo) ||
        (opp.team && opp.team.id
          ? "https://a.espncdn.com/i/teamlogos/ncaa/500/" + opp.team.id + ".png"
          : "");

      const timeLabel = done
        ? "Final"
        : tbd || Number.isNaN(date.getTime())
          ? "TBD"
          : date.toLocaleTimeString(undefined, {
              hour: "numeric",
              minute: "2-digit",
              timeZoneName: "short"
            });

      return {
        id: ev.id,
        date: date.toISOString(),
        dateLabel: Number.isNaN(date.getTime())
          ? "TBD"
          : date.toLocaleDateString(undefined, {
              weekday: "short",
              month: "short",
              day: "numeric",
              year: "numeric"
            }),
        timeLabel,
        opponent: (opp.team && (opp.team.displayName || opp.team.shortDisplayName || opp.team.name)) || "TBD",
        opponentLogo,
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

  function parseAmericanToken(tok) {
    if (tok == null) return null;
    const s = String(tok).trim().replace(/[−–]/g, "-");
    const n = Number(s);
    if (Number.isNaN(n) || Math.abs(n) < 100 && n !== 0) {
      // sometimes written without sign as 110 meaning -110 for favorites in tables — keep raw if |n|>=100
      if (!Number.isNaN(n) && Math.abs(n) >= 100) return n;
      return null;
    }
    return n;
  }

  function parseLineToken(tok) {
    const n = Number(String(tok).replace(/^o/i, "").trim());
    if (Number.isNaN(n) || n < 0 || n > 14) return null;
    return n;
  }

  /** Parse free win-total HTML (OddsShark / VegasInsider style tables) */
  function parseWinTotalsHtml(html, sourceLabel) {
    if (!html || html.length < 500) return null;
    // Normalize entities & whitespace for regex
    const text = String(html)
      .replace(/&amp;/g, "&")
      .replace(/&nbsp;/gi, " ")
      .replace(/&#160;/g, " ")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/[ \t]+/g, " ")
      .replace(/\n+/g, "\n");

    function findTeam(patterns) {
      for (let i = 0; i < patterns.length; i++) {
        const re = patterns[i];
        const m = text.match(re);
        if (!m) continue;
        const line = parseLineToken(m[1]);
        let over = parseAmericanToken(m[2]);
        let under = parseAmericanToken(m[3]);
        // OddsShark: OVER then UNDER columns
        if (line == null || over == null || under == null) continue;
        // Sanity: over favorites are often large negatives for high lines
        return { line, overOdds: over, underOdds: under };
      }
      return null;
    }

    // Patterns: Team  10.5  -220  +176   or  o10.5 -220
    const tech = findTeam([
      /Texas\s+Tech[^\n]{0,40}?(\d{1,2}\.5)\s+([+-]?\d{3,4})\s+([+-]?\d{3,4})/i,
      /Texas\s+Tech[\s\S]{0,120}?o?(\d{1,2}\.5)[\s\S]{0,40}?([+-]?\d{3,4})[\s\S]{0,40}?([+-]?\d{3,4})/i
    ]);
    const agm = findTeam([
      /Texas\s+A\s*&\s*M[^\n]{0,40}?(\d{1,2}\.5)\s+([+-]?\d{3,4})\s+([+-]?\d{3,4})/i,
      /Texas\s+A\s*&\s*M[\s\S]{0,120}?o?(\d{1,2}\.5)[\s\S]{0,40}?([+-]?\d{3,4})[\s\S]{0,40}?([+-]?\d{3,4})/i,
      /A\s*&\s*M\s+Aggies[^\n]{0,40}?(\d{1,2}\.5)\s+([+-]?\d{3,4})\s+([+-]?\d{3,4})/i
    ]);

    function invertAmerican(a) {
      // Fair opposite American odds (no juice)
      let p;
      if (a < 0) p = Math.abs(a) / (Math.abs(a) + 100);
      else p = 100 / (a + 100);
      const q = 1 - p;
      if (q >= 0.5) return Math.round((-100 * q) / (1 - q));
      return Math.round((100 * (1 - q)) / q);
    }

    // VegasInsider often only exposes over juice in row text as o10.5 -220
    function findViStyle(nameRe) {
      const re = new RegExp(
        nameRe.source + "[\\s\\S]{0,220}?o\\s*(\\d{1,2}\\.5)\\s+([+-]?\\d{3,4})",
        "i"
      );
      const m = text.match(re);
      if (!m) return null;
      const line = parseLineToken(m[1]);
      const over = parseAmericanToken(m[2]);
      if (line == null || over == null) return null;
      return { line, overOdds: over, underOdds: invertAmerican(over) };
    }

    const techFinal = tech || findViStyle(/Texas\s+Tech/);
    const agmFinal = agm || findViStyle(/Texas\s+A\s*&\s*M/);

    if (!techFinal && !agmFinal) return null;

    return {
      season: 2026,
      asOf: Date.now(),
      source: "live",
      tech: techFinal
        ? Object.assign({}, techFinal, { book: sourceLabel })
        : null,
      agm: agmFinal
        ? Object.assign({}, agmFinal, { book: sourceLabel })
        : null,
      note: "Live win totals parsed from " + sourceLabel + "."
    };
  }

  async function fetchTextViaProxies(url) {
    const encoded = encodeURIComponent(url);
    const proxies = [
      url, // direct (works if CORS open)
      "https://api.allorigins.win/raw?url=" + encoded,
      "https://corsproxy.io/?" + encoded,
      "https://api.codetabs.com/v1/proxy?quest=" + encoded
    ];
    let lastErr;
    for (let i = 0; i < proxies.length; i++) {
      try {
        const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
        const timer = controller
          ? setTimeout(() => controller.abort(), 12000)
          : null;
        const res = await fetch(proxies[i], {
          signal: controller ? controller.signal : undefined,
          headers: { Accept: "text/html,application/xhtml+xml" }
        });
        if (timer) clearTimeout(timer);
        if (!res.ok) throw new Error("HTTP " + res.status);
        const text = await res.text();
        if (text && text.length > 800) return text;
      } catch (err) {
        lastErr = err;
      }
    }
    throw lastErr || new Error("All odds sources failed");
  }

  /**
   * Pull 2026 RS win totals from free public pages (OddsShark, VegasInsider).
   * Browser uses CORS proxies when direct fetch is blocked.
   */
  async function fetchWinTotals(season) {
    const results = [];
    for (let i = 0; i < WIN_TOTAL_SOURCES.length; i++) {
      const src = WIN_TOTAL_SOURCES[i];
      try {
        const html = await fetchTextViaProxies(src.url);
        const parsed = parseWinTotalsHtml(html, src.label);
        if (parsed && (parsed.tech || parsed.agm)) {
          results.push(parsed);
        }
      } catch (err) {
        console.warn("Win totals source failed:", src.id, err);
      }
    }

    if (!results.length) return null;

    // Prefer first complete pair; else merge fields
    let best = results.find((r) => r.tech && r.agm) || results[0];
    if (!best.tech || !best.agm) {
      for (let i = 1; i < results.length; i++) {
        if (!best.tech && results[i].tech) best.tech = results[i].tech;
        if (!best.agm && results[i].agm) best.agm = results[i].agm;
      }
    }
    if (!best.tech || !best.agm) return null;

    // Never accept clearly wrong Tech lines (e.g. 7.5 leftover seed) if we also see 10.5 elsewhere
    const techLines = results.map((r) => r.tech && r.tech.line).filter((n) => n != null);
    if (techLines.length) {
      const maxTech = Math.max.apply(null, techLines);
      if (best.tech.line < 9 && maxTech >= 10) {
        const better = results.find((r) => r.tech && r.tech.line >= 10);
        if (better) best.tech = better.tech;
      }
    }

    best.season = season || 2026;
    best.asOf = Date.now();
    best.source = "live";
    return best;
  }

  function mergeLines(live, seed) {
    if (!live || !live.tech || !live.agm) {
      return Object.assign({}, seed, {
        asOf: seed.asOf || Date.now(),
        source: seed.source || "consensus-fallback"
      });
    }
    return {
      season: live.season || seed.season || 2026,
      asOf: live.asOf || Date.now(),
      source: live.source || "live",
      tech: live.tech,
      agm: live.agm,
      note: live.note || "Live win totals from public odds pages."
    };
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
        fetchTeamBundle(TEAMS.tech.espnId, season, TEAMS.tech),
        fetchTeamBundle(TEAMS.agm.espnId, season, TEAMS.agm)
      ]);
      // Guard: never keep a cached Washington / wrong-team payload
      if (techTeam.displayName && /washington/i.test(techTeam.displayName)) {
        throw new Error("Texas Tech resolved to the wrong ESPN team");
      }
    } catch (err) {
      console.warn("ESPN schedule fetch failed", err);
      scheduleError = err.message || "Schedule fetch failed";
      // Only reuse cache if Tech id is correct (v2)
      const cacheOk =
        cached &&
        cached.tech &&
        cached.agm &&
        String(cached.tech.espnId) === String(TEAMS.tech.espnId) &&
        !/washington/i.test(cached.tech.displayName || "");
      if (cacheOk) {
        techTeam = cached.tech;
        agmTeam = cached.agm;
      } else {
        techTeam = emptyTeam(TEAMS.tech);
        agmTeam = emptyTeam(TEAMS.agm);
      }
    }

    let lines = Object.assign({}, DEFAULT_LINES_2026);
    try {
      const liveLines = await fetchWinTotals(season);
      lines = mergeLines(liveLines, DEFAULT_LINES_2026);
    } catch (err) {
      console.warn("Win totals fetch failed:", err);
      lines = Object.assign({}, DEFAULT_LINES_2026, {
        asOf: now,
        note:
          "Using last published consensus (Tech 10.5 / A&M 8.5). Live scrape unavailable right now."
      });
    }
    // Hard reject obsolete seed mistakes
    if (lines.tech && Number(lines.tech.line) <= 8) {
      lines.tech = Object.assign({}, DEFAULT_LINES_2026.tech);
      lines.note = (lines.note || "") + " Tech line floored to consensus 10.5.";
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
