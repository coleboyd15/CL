/* Tech vs A&M 2026 win-total tracker — ESPN schedules/records + odds math */
(function (global) {
  // v4: live win totals (VegasInsider/Covers, not stale OddsShark July 16) + Week 1 scores
  const CACHE_KEY = "cfbTracker_v4";
  const HISTORY_KEY = "cfbOddsHistory_v4";
  const CACHE_TTL_MS = 45 * 60 * 1000; // schedules: 45 min
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
   * Opening snapshot (FanDuel / OddsShark, Jul 16 2026) — history baseline only.
   * Never shown as the current market.
   */
  const OPENING_LINES_JUL16 = {
    season: 2026,
    asOf: Date.parse("2026-07-16T12:00:00Z"),
    source: "opening",
    tech: { line: 10.5, overOdds: -220, underOdds: 176, book: "FanDuel (Jul 16 2026)" },
    agm: { line: 8.5, overOdds: -106, underOdds: -114, book: "FanDuel (Jul 16 2026)" }
  };

  /**
   * Last verified live market if scrape fails (not July 16).
   * Tech 10.5 over juiced; A&M 8.5.
   */
  const FALLBACK_LIVE_LINES = {
    season: 2026,
    asOf: Date.parse("2026-09-09T15:00:00Z"),
    source: "fallback-live",
    tech: {
      line: 10.5,
      overOdds: -200,
      underOdds: 160,
      book: "DraftKings / Covers"
    },
    agm: {
      line: 8.5,
      overOdds: 120,
      underOdds: -145,
      book: "FanDuel / BetMGM / BetRivers"
    },
    note: "Latest verified market (Tech 10.5 juiced over · A&M 8.5). Live scrape retry on next refresh."
  };

  const DEFAULT_LINES_2026 = FALLBACK_LIVE_LINES;

  const WIN_TOTAL_SOURCES = [
    {
      id: "vegasinsider",
      label: "VegasInsider",
      url: "https://www.vegasinsider.com/college-football/odds/win-totals/"
    },
    {
      id: "covers-ttu",
      label: "Covers",
      url: "https://www.covers.com/ncaaf/texas-tech-red-raiders-win-totals-odds-history-predictions"
    },
    {
      id: "covers-agm",
      label: "Covers",
      url: "https://www.covers.com/ncaaf/texas-a-and-m-aggies-win-totals-odds-history-predictions"
    },
    {
      id: "sb3-agm",
      label: "SportsBetting3 / BetRivers",
      url: "https://www.sportsbetting3.com/ncaafb/texas-am-aggies-football-betting"
    },
    {
      id: "oddsshark",
      label: "OddsShark",
      url: "https://www.oddsshark.com/ncaaf/college-football-win-totals"
    }
  ];

  const KNOWN_RESULTS_2026 = [
    {
      team: "tech",
      opponentMatch: /abilene/i,
      datePrefix: "2026-09-05",
      result: "W",
      myScore: 33,
      oppScore: 10,
      homeAway: "home",
      opponent: "Abilene Christian",
      location: "Galaxy Stadium · Lubbock, TX",
      venue: "Galaxy Stadium",
      tv: "FS1",
      opponentLogo: "https://a.espncdn.com/i/teamlogos/ncaa/500/2000.png"
    },
    {
      team: "agm",
      opponentMatch: /missouri\s*state/i,
      datePrefix: "2026-09-05",
      result: "W",
      myScore: 50,
      oppScore: 0,
      homeAway: "home",
      opponent: "Missouri State",
      location: "Kyle Field · College Station, TX",
      venue: "Kyle Field",
      tv: "ESPN",
      opponentLogo: "https://a.espncdn.com/i/teamlogos/ncaa/500/2623.png"
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

  function seedOpeningHistory() {
    const openSim = simulateWhoWinsMore(OPENING_LINES_JUL16.tech, OPENING_LINES_JUL16.agm);
    return {
      dateKey: "2026-07-16",
      at: OPENING_LINES_JUL16.asOf,
      techLine: OPENING_LINES_JUL16.tech.line,
      agmLine: OPENING_LINES_JUL16.agm.line,
      techOver: OPENING_LINES_JUL16.tech.overOdds,
      agmOver: OPENING_LINES_JUL16.agm.overOdds,
      techCents: openSim.techCents,
      agmCents: openSim.agmCents,
      muTech: openSim.muTech,
      muAgm: openSim.muAgm
    };
  }

  function pushHistorySnapshot(snapshot) {
    let hist = getHistory();
    if (!hist.some((x) => x.dateKey === "2026-07-16")) {
      hist = [seedOpeningHistory()].concat(hist);
    }
    const key = dayKey();
    const last = hist.filter((x) => x.dateKey !== "2026-07-16").slice(-1)[0];
    const same =
      last &&
      last.dateKey === key &&
      last.techLine === snapshot.techLine &&
      last.agmLine === snapshot.agmLine &&
      last.techOver === snapshot.techOver &&
      last.agmOver === snapshot.agmOver &&
      last.techCents === snapshot.techCents &&
      last.agmCents === snapshot.agmCents;
    if (same) {
      CL.storage.set(HISTORY_KEY, hist, { skipSync: true });
      return hist;
    }
    hist = hist.filter((x) => x.dateKey !== key);
    hist.push(Object.assign({ dateKey: key, at: Date.now() }, snapshot));
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

  function invertAmerican(a) {
    let p;
    if (a < 0) p = Math.abs(a) / (Math.abs(a) + 100);
    else p = 100 / (a + 100);
    const q = 1 - p;
    if (q >= 0.5) return Math.round((-100 * q) / (1 - q));
    return Math.round((100 * (1 - q)) / q);
  }

  function quotesInWindow(windowText) {
    const quotes = [];
    const re = /o\s*(\d{1,2}(?:\.5)?)\s+([+-]?\d{3,4})/gi;
    let m;
    while ((m = re.exec(windowText))) {
      const line = parseLineToken(m[1]);
      const over = parseAmericanToken(m[2]);
      if (line != null && over != null) quotes.push({ line, overOdds: over });
    }
    const re2 = /(\d{1,2}\.5)\s+([+-]\d{3,4})\s+([+-]\d{3,4})/g;
    while ((m = re2.exec(windowText))) {
      const line = parseLineToken(m[1]);
      const over = parseAmericanToken(m[2]);
      const under = parseAmericanToken(m[3]);
      if (line != null && over != null) quotes.push({ line, overOdds: over, underOdds: under });
    }
    const re3 =
      /(?:O|Over)\s*(\d{1,2}\.5)[^\n]{0,80}?([+-]\d{3,4})[^\n]{0,80}?(?:U|Under)[^\n]{0,40}?([+-]\d{3,4})/gi;
    while ((m = re3.exec(windowText))) {
      const line = parseLineToken(m[1]);
      const over = parseAmericanToken(m[2]);
      const under = parseAmericanToken(m[3]);
      if (line != null && over != null) quotes.push({ line, overOdds: over, underOdds: under });
    }
    const re4 = /(\d{1,2}\.5)\s+u\s+([+-]?\d{3,4})\s+\1\s+o\s+([+-]?\d{3,4})/gi;
    while ((m = re4.exec(windowText))) {
      const line = parseLineToken(m[1]);
      const under = parseAmericanToken(m[2]);
      const over = parseAmericanToken(m[3]);
      if (line != null && over != null) quotes.push({ line, overOdds: over, underOdds: under });
    }
    return quotes;
  }

  function pickBestQuote(quotes) {
    if (!quotes || !quotes.length) return null;
    const juiced = quotes.filter((q) => q.overOdds < 0);
    const pool = juiced.length ? juiced : quotes;
    const counts = {};
    pool.forEach((q) => {
      const k = String(q.line);
      counts[k] = (counts[k] || 0) + 1;
    });
    let line = null;
    let n = 0;
    Object.keys(counts).forEach((k) => {
      if (counts[k] > n) {
        n = counts[k];
        line = Number(k);
      }
    });
    const atLine = pool.filter((q) => q.line === line);
    atLine.sort((a, b) => a.overOdds - b.overOdds);
    const best = atLine[0];
    const withUnder = atLine.find((q) => q.underOdds != null) || best;
    return {
      line: best.line,
      overOdds: best.overOdds,
      underOdds: withUnder.underOdds != null ? withUnder.underOdds : invertAmerican(best.overOdds)
    };
  }

  function windowAround(text, nameRe, span) {
    span = span || 480;
    const m = text.match(nameRe);
    if (!m || m.index == null) return "";
    return text.slice(m.index, m.index + span);
  }

  /** Parse free win-total HTML (VegasInsider tables, Covers articles, OddsShark) */
  function parseWinTotalsHtml(html, sourceLabel) {
    if (!html || html.length < 400) return null;
    const text = String(html)
      .replace(/&amp;/g, "&")
      .replace(/&nbsp;/gi, " ")
      .replace(/&#160;/g, " ")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/[ \t]+/g, " ")
      .replace(/\n+/g, "\n");

    const techWin = windowAround(text, /Texas\s+Tech/i, 520);
    const agmWin =
      windowAround(text, /Texas\s+A\s*&\s*M/i, 520) ||
      windowAround(text, /A\s*&\s*M\s+Aggies/i, 520);

    const techQ = pickBestQuote(quotesInWindow(techWin || text.slice(0, 8000)));
    const agmQ = pickBestQuote(quotesInWindow(agmWin || ""));

    const techFinal = techQ;
    const agmFinal = agmQ;

    if (!techFinal && !agmFinal) return null;

    return {
      season: 2026,
      asOf: Date.now(),
      source: "live",
      tech: techFinal ? Object.assign({}, techFinal, { book: sourceLabel }) : null,
      agm: agmFinal ? Object.assign({}, agmFinal, { book: sourceLabel }) : null,
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
   * Pull 2026 RS win totals from public pages (VegasInsider first — OddsShark is often stale).
   * Browser uses CORS proxies when direct fetch is blocked.
   */
  async function fetchWinTotals(season) {
    const results = [];
    for (let i = 0; i < WIN_TOTAL_SOURCES.length; i++) {
      const src = WIN_TOTAL_SOURCES[i];
      try {
        const html = await fetchTextViaProxies(src.url);
        const staleJuly =
          src.id === "oddsshark" && /July\s+16,\s*2026/i.test(html);
        if (staleJuly) {
          console.warn("Skipping stale OddsShark July 16 win totals");
          continue;
        }
        const parsed = parseWinTotalsHtml(html, src.label);
        if (parsed && (parsed.tech || parsed.agm)) {
          results.push(parsed);
        }
      } catch (err) {
        console.warn("Win totals source failed:", src.id, err);
      }
    }

    if (!results.length) return null;

    const techQuotes = results.map((r) => r.tech).filter(Boolean);
    const agmQuotes = results.map((r) => r.agm).filter(Boolean);
    const tech = pickBestQuote(
      techQuotes.map((t) => ({
        line: t.line,
        overOdds: t.overOdds,
        underOdds: t.underOdds
      }))
    );
    const agm = pickBestQuote(
      agmQuotes.map((t) => ({
        line: t.line,
        overOdds: t.overOdds,
        underOdds: t.underOdds
      }))
    );
    if (!tech || !agm) {
      let best = results.find((r) => r.tech && r.agm) || results[0];
      if (!best.tech || !best.agm) {
        for (let i = 1; i < results.length; i++) {
          if (!best.tech && results[i].tech) best.tech = results[i].tech;
          if (!best.agm && results[i].agm) best.agm = results[i].agm;
        }
      }
      if (!best.tech || !best.agm) return null;
      best.season = season || 2026;
      best.asOf = Date.now();
      best.source = "live";
      return best;
    }

    const books = [];
    results.forEach((r) => {
      if (r.tech && r.tech.book) books.push(r.tech.book);
      if (r.agm && r.agm.book) books.push(r.agm.book);
    });
    const bookLabel = books.filter((b, i) => books.indexOf(b) === i).join(" · ") || "Live books";

    return {
      season: season || 2026,
      asOf: Date.now(),
      source: "live",
      tech: Object.assign({}, tech, { book: bookLabel }),
      agm: Object.assign({}, agm, { book: bookLabel }),
      note: "Live regular-season win totals from public sportsbook pages."
    };
  }

  function mergeLines(live, seed) {
    if (!live || !live.tech || !live.agm) {
      return Object.assign({}, seed, {
        asOf: seed.asOf || Date.now(),
        source: seed.source || "fallback-live"
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

  function applyKnownResults(team, teamKey) {
    if (!team) return team;
    const games = (team.games || []).slice();
    KNOWN_RESULTS_2026.filter((k) => k.team === teamKey).forEach((known) => {
      const idx = games.findIndex((g) => {
        const d = String(g.date || "").slice(0, 10);
        return known.opponentMatch.test(g.opponent || "") || d === known.datePrefix;
      });
      const patch = {
        done: true,
        result: known.result,
        score: known.myScore + "–" + known.oppScore,
        myScore: known.myScore,
        oppScore: known.oppScore,
        timeLabel: "Final",
        dateLabel: "Sat, Sep 5, 2026",
        location: known.location,
        venue: known.venue,
        homeAway: known.homeAway,
        opponent: known.opponent,
        opponentLogo: known.opponentLogo,
        tv: known.tv || ""
      };
      if (idx >= 0) {
        games[idx] = Object.assign({}, games[idx], patch, {
          date: games[idx].date || known.datePrefix + "T23:00:00.000Z"
        });
      } else {
        games.push(
          Object.assign(
            {
              id: "known-" + teamKey + "-" + known.datePrefix,
              date: known.datePrefix + "T23:00:00.000Z",
              opponent: known.opponent,
              opponentLogo: known.opponentLogo
            },
            patch
          )
        );
      }
    });
    games.sort((a, b) => new Date(a.date) - new Date(b.date));
    const wins = games.filter((g) => g.done && g.result === "W").length;
    const losses = games.filter((g) => g.done && g.result === "L").length;
    team.games = games;
    if (wins + losses > 0) {
      team.wins = wins;
      team.losses = losses;
      team.record = wins + "-" + losses;
    }
    if (!team.logo) {
      team.logo = "https://a.espncdn.com/i/teamlogos/ncaa/500/" + team.espnId + ".png";
    }
    return mergeFallbackSchedule(team, teamKey);
  }

  const FALLBACK_SCHEDULE = {
    tech: [
      { date: "2026-09-12", opponent: "Oregon State", homeAway: "away", location: "Reser Stadium · Corvallis, OR", timeLabel: "6:30 PM CT", logo: "204" },
      { date: "2026-09-18", opponent: "Houston", homeAway: "home", location: "Galaxy Stadium · Lubbock, TX", timeLabel: "7:00 PM CT", logo: "248" },
      { date: "2026-09-26", opponent: "Sam Houston", homeAway: "home", location: "Galaxy Stadium · Lubbock, TX", timeLabel: "TBD", logo: "2534" },
      { date: "2026-10-03", opponent: "Colorado", homeAway: "away", location: "Folsom Field · Boulder, CO", timeLabel: "TBD", logo: "38" },
      { date: "2026-10-17", opponent: "Arizona State", homeAway: "home", location: "Galaxy Stadium · Lubbock, TX", timeLabel: "TBD", logo: "9" },
      { date: "2026-10-24", opponent: "Cincinnati", homeAway: "away", location: "Nippert Stadium · Cincinnati, OH", timeLabel: "TBD", logo: "2132" },
      { date: "2026-10-31", opponent: "Arizona", homeAway: "home", location: "Galaxy Stadium · Lubbock, TX", timeLabel: "TBD", logo: "12" },
      { date: "2026-11-07", opponent: "West Virginia", homeAway: "home", location: "Galaxy Stadium · Lubbock, TX", timeLabel: "TBD", logo: "277" },
      { date: "2026-11-14", opponent: "Oklahoma State", homeAway: "away", location: "Boone Pickens Stadium · Stillwater, OK", timeLabel: "TBD", logo: "197" },
      { date: "2026-11-21", opponent: "Baylor", homeAway: "away", location: "McLane Stadium · Waco, TX", timeLabel: "TBD", logo: "239" },
      { date: "2026-11-26", opponent: "TCU", homeAway: "home", location: "Galaxy Stadium · Lubbock, TX", timeLabel: "7:00 PM CT", logo: "2628" }
    ],
    agm: [
      { date: "2026-09-12", opponent: "Arizona State", homeAway: "home", location: "Kyle Field · College Station, TX", timeLabel: "11:00 AM CT", tv: "ABC", logo: "9" },
      { date: "2026-09-19", opponent: "Kentucky", homeAway: "home", location: "Kyle Field · College Station, TX", timeLabel: "2:30 PM CT", logo: "96" },
      { date: "2026-09-26", opponent: "LSU", homeAway: "away", location: "Tiger Stadium · Baton Rouge, LA", timeLabel: "TBD", logo: "99" },
      { date: "2026-10-03", opponent: "Arkansas", homeAway: "home", location: "Kyle Field · College Station, TX", timeLabel: "TBD", logo: "8" },
      { date: "2026-10-10", opponent: "Missouri", homeAway: "away", location: "Faurot Field · Columbia, MO", timeLabel: "TBD", logo: "142" },
      { date: "2026-10-17", opponent: "The Citadel", homeAway: "home", location: "Kyle Field · College Station, TX", timeLabel: "Noon CT", logo: "2643" },
      { date: "2026-10-24", opponent: "Alabama", homeAway: "away", location: "Bryant-Denny Stadium · Tuscaloosa, AL", timeLabel: "TBD", logo: "333" },
      { date: "2026-11-07", opponent: "South Carolina", homeAway: "away", location: "Williams-Brice Stadium · Columbia, SC", timeLabel: "TBD", logo: "2579" },
      { date: "2026-11-14", opponent: "Tennessee", homeAway: "home", location: "Kyle Field · College Station, TX", timeLabel: "TBD", logo: "2633" },
      { date: "2026-11-21", opponent: "Oklahoma", homeAway: "away", location: "Gaylord Family Oklahoma Memorial Stadium · Norman, OK", timeLabel: "TBD", logo: "201" },
      { date: "2026-11-27", opponent: "Texas", homeAway: "home", location: "Kyle Field · College Station, TX", timeLabel: "6:30 PM CT", tv: "ABC", logo: "251" }
    ]
  };

  function mergeFallbackSchedule(team, teamKey) {
    const extra = FALLBACK_SCHEDULE[teamKey] || [];
    extra.forEach((g) => {
      const exists = (team.games || []).some((x) => {
        const d = String(x.date || "").slice(0, 10);
        return d === g.date || (x.opponent || "").toLowerCase() === g.opponent.toLowerCase();
      });
      if (exists) return;
      const dt = new Date(g.date + "T18:00:00");
      team.games.push({
        id: "fb-" + teamKey + "-" + g.date,
        date: dt.toISOString(),
        dateLabel: dt.toLocaleDateString(undefined, {
          weekday: "short",
          month: "short",
          day: "numeric",
          year: "numeric"
        }),
        timeLabel: g.timeLabel || "TBD",
        opponent: g.opponent,
        opponentLogo: "https://a.espncdn.com/i/teamlogos/ncaa/500/" + g.logo + ".png",
        homeAway: g.homeAway,
        venue: g.location,
        location: g.location,
        done: false,
        result: "",
        score: "",
        tv: g.tv || ""
      });
    });
    team.games.sort((a, b) => new Date(a.date) - new Date(b.date));
    return team;
  }

  async function fetchScoreboardDate(ymd) {
    const urls = [
      "https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard?dates=" +
        ymd +
        "&limit=300",
      "https://site.web.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard?dates=" +
        ymd +
        "&limit=300"
    ];
    for (let i = 0; i < urls.length; i++) {
      try {
        const data = await fetchJson(urls[i]);
        const events = (data && data.events) || [];
        if (events.length) return events;
      } catch (_) {}
    }
    return [];
  }

  function mergeScoreboardIntoTeam(team, events, espnId) {
    if (!team || !events || !events.length) return team;
    events.forEach((ev) => {
      const g = normalizeGame(ev, espnId);
      if (!g) return;
      const games = team.games || [];
      const idx = games.findIndex(
        (x) =>
          x.id === g.id ||
          (String(x.date || "").slice(0, 10) === String(g.date || "").slice(0, 10) &&
            (x.opponent || "").toLowerCase() === (g.opponent || "").toLowerCase())
      );
      if (idx >= 0) {
        if (g.done) team.games[idx] = Object.assign({}, games[idx], g);
      } else if (g.done) {
        team.games = games.concat([g]);
      }
    });
    return team;
  }

  async function loadTracker(options) {
    options = options || {};
    const force = !!options.force;
    const season = options.season || 2026;
    const cached = getCache();
    const now = Date.now();

    const scheduleFresh =
      !force &&
      cached &&
      cached.fetchedAt &&
      now - cached.fetchedAt < CACHE_TTL_MS &&
      cached.season === season &&
      cached.tech &&
      cached.tech.games &&
      cached.tech.games.some((g) => g.done && g.result === "W");

    let techTeam;
    let agmTeam;
    let scheduleError = "";

    if (scheduleFresh) {
      techTeam = cached.tech;
      agmTeam = cached.agm;
    } else {
      try {
        [techTeam, agmTeam] = await Promise.all([
          fetchTeamBundle(TEAMS.tech.espnId, season, TEAMS.tech),
          fetchTeamBundle(TEAMS.agm.espnId, season, TEAMS.agm)
        ]);
        if (techTeam.displayName && /washington/i.test(techTeam.displayName)) {
          throw new Error("Texas Tech resolved to the wrong ESPN team");
        }
        try {
          const sb = await fetchScoreboardDate("20260905");
          techTeam = mergeScoreboardIntoTeam(techTeam, sb, TEAMS.tech.espnId);
          agmTeam = mergeScoreboardIntoTeam(agmTeam, sb, TEAMS.agm.espnId);
        } catch (_) {}
      } catch (err) {
        console.warn("ESPN schedule fetch failed", err);
        scheduleError = err.message || "Schedule fetch failed";
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
    }

    techTeam = applyKnownResults(Object.assign({}, TEAMS.tech, techTeam), "tech");
    agmTeam = applyKnownResults(Object.assign({}, TEAMS.agm, agmTeam), "agm");

    let lines = Object.assign({}, FALLBACK_LIVE_LINES);
    try {
      const liveLines = await fetchWinTotals(season);
      lines = mergeLines(liveLines, FALLBACK_LIVE_LINES);
    } catch (err) {
      console.warn("Win totals fetch failed:", err);
      lines = Object.assign({}, FALLBACK_LIVE_LINES, { asOf: now });
    }
    if (lines.tech && Number(lines.tech.line) <= 8) {
      lines.tech = Object.assign({}, FALLBACK_LIVE_LINES.tech);
      lines.note = (lines.note || "") + " Tech line floored to live consensus 10.5.";
    }
    if (lines.source === "opening" || (lines.asOf && lines.asOf === OPENING_LINES_JUL16.asOf)) {
      lines = Object.assign({}, FALLBACK_LIVE_LINES, { asOf: now });
    }

    const sim = simulateWhoWinsMore(lines.tech, lines.agm);

    const payload = {
      season,
      fetchedAt: now,
      dayKey: dayKey(),
      fromCache: false,
      scheduleError,
      lines,
      sim,
      tech: techTeam,
      agm: agmTeam,
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

    pushHistorySnapshot({
      techLine: lines.tech.line,
      agmLine: lines.agm.line,
      techOver: lines.tech.overOdds,
      agmOver: lines.agm.overOdds,
      techCents: sim.techCents,
      agmCents: sim.agmCents,
      muTech: sim.muTech,
      muAgm: sim.muAgm
    });

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
