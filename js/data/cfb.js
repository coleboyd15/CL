/* College Football daily briefing — live RSS + Texas-centric curated fallbacks */
(function (global) {
  const CACHE_KEY = "cfbDaily";
  const EPOCH_MS = 24 * 60 * 60 * 1000;

  const TEAMS = {
    ttu: { name: "Texas Tech", nick: "Red Raiders", conf: "Big 12" },
    tamu: { name: "Texas A&M", nick: "Aggies", conf: "SEC" },
    ut: { name: "Texas", nick: "Longhorns", conf: "SEC" }
  };

  const FEEDS = [
    { id: "espn-cfb", label: "ESPN CFB", url: "https://www.espn.com/espn/rss/ncf/news", weight: 3 },
    { id: "sbn-cfb", label: "SB Nation", url: "https://www.sbnation.com/rss/current.xml", weight: 1 },
    { id: "athletic", label: "The Athletic", url: "https://theathletic.com/feed/", weight: 1 }
  ];

  /** Curated segments — portal, rankings, odds, NIL, lawsuits, tradition, Big 12 / SEC / national */
  const FALLBACK_SEEDS = [
    {
      category: "Texas Tech",
      title: "Portal chess in Lubbock",
      hook: "Texas Tech’s offseason has been about roster construction as much as scheme — who stays, who arrives, and how the Big 12 table reshuffles.",
      body: "The transfer portal rewards staffs that treat roster building like a second recruiting calendar. For the Red Raiders, that means matching immediate contributors with multi-year pieces without losing the culture that makes Jones AT&T Stadium loud in November. Watch not only the names, but the positions of scarcity: offensive line depth, edge rushers, and a secondary that can travel. In the modern Big 12, portal wins in February show up as third-down stops in October.",
      tags: ["portal", "Big 12", "Texas Tech"]
    },
    {
      category: "Texas A&M",
      title: "Aggie ambition in the SEC gauntlet",
      hook: "Texas A&M’s slate and roster profile sit at the intersection of SEC physicality and national expectations — a weekly stress test of depth and identity.",
      body: "The Aggies’ story is never only about one signing class or one ranking snapshot. It is about whether the trenches hold against the conference’s best and whether skill talent can create explosive plays without living on the edge of turnovers. Tradition at Kyle Field is real; so is the margin for error in a league that punishes soft spots. National relevance follows consistency more than any single viral portal splash.",
      tags: ["SEC", "Texas A&M", "rankings"]
    },
    {
      category: "Texas",
      title: "Longhorns under the microscope",
      hook: "Texas remains a national brand in the SEC era — rankings, betting markets, and every NIL whisper travel farther when the logo is burnt orange.",
      body: "When a blue-blood moves conferences, every metric becomes content: recruiting boards, transfer additions, injury reports, and early line moves. The Longhorns’ season will be narrated nationally whether they want that volume or not. For fans following three Texas programs at once, the useful filter is simple: which stories change who starts on Saturday, and which are just oxygen for the timeline?",
      tags: ["SEC", "Texas", "national"]
    },
    {
      category: "Transfer portal",
      title: "The portal never really closes in your head",
      hook: "Even outside peak windows, college football lives in a constant soft market for talent — rumors, visits, and ‘sources say’ become part of the weekly weather.",
      body: "The formal windows matter for paperwork; the informal market never sleeps. Programs sell playing time, scheme fit, NIL packages, and campus life. Players sell production and character. The healthiest way to read portal noise is as probability, not destiny: many links never materialize, and the ones that do still need coaching. For Tech, A&M, and Texas, portal strategy is now as brand-defining as classic high-school recruiting.",
      tags: ["portal", "NIL", "national"]
    },
    {
      category: "Rankings & odds",
      title: "Polls, playoff math, and the number next to your team",
      hook: "Rankings and betting markets are different languages for the same obsession: who is actually good, and what does the public believe?",
      body: "AP and coaches’ polls lag performance; markets reprice faster and with sharper incentives. Neither is pure truth. A Texas team can climb a poll on brand while the spread still whispers about an offensive line. Playoff expansion changed the stakes: more teams stay ‘alive’ longer, which keeps September and October national. Read both the poll graphic and the line — they argue with each other productively.",
      tags: ["rankings", "odds", "playoff"]
    },
    {
      category: "NIL",
      title: "NIL as roster policy, not just a headline",
      hook: "Name, image, and likeness money is no longer a side plot — it shapes who transfers, who stays, and how boosters organize.",
      body: "Collectives, compliance offices, and player deals sit in a gray zone that keeps shifting under lawsuits and new rules. The fan-facing story is flashy contracts; the program-facing story is predictability and equity across a roster. Schools that treat NIL as chaos lose quietly. Schools that treat it as infrastructure — clear priorities, cleaner communication — survive portal seasons with fewer self-inflicted wounds.",
      tags: ["NIL", "lawsuits", "national"]
    },
    {
      category: "Lawsuits & governance",
      title: "Courtroom football",
      hook: "Antitrust cases, employment debates, and conference realignment fallout keep turning the sport’s structure into legal briefings.",
      body: "College football’s on-field product is clearer than its off-field constitution. Players, conferences, the NCAA, and networks are renegotiating power in public. For fans of Big 12 and SEC programs, the practical takeaway is calendar uncertainty and resource gaps: who can guarantee what to a recruit when the rules may change again next summer? Tradition still sells tickets; lawyers increasingly write the fine print.",
      tags: ["lawsuits", "national", "SEC", "Big 12"]
    },
    {
      category: "Big 12",
      title: "The Big 12’s identity after the map redrew",
      hook: "The conference is louder, wider, and still fighting for playoff respect — every Saturday is a branding exercise.",
      body: "Expansion brought new markets and new travel realities. For Texas Tech, the league slate is the path to national relevance: win the games you’re supposed to win, steal one you’re not, and stay healthy in November. Style-of-play narratives (tempo, shooting, pressure) still define the conference’s TV personality. Don’t sleep on midweek storylines; they often preview which programs are building sustainably.",
      tags: ["Big 12", "Texas Tech", "rankings"]
    },
    {
      category: "SEC",
      title: "SEC depth is the product",
      hook: "Texas and Texas A&M now live in a conference where depth charts and special teams decide ‘rivalry’ weeks as much as skill talent does.",
      body: "The SEC’s brand is physical football and relentless attention. That environment rewards staffs that develop two-deep rosters and punish those living week-to-week on talent alone. For Longhorns and Aggies fans, conference play is both measuring stick and content engine. National media will inflate or dismiss based on a single highlight; the standings are blunter and fairer.",
      tags: ["SEC", "Texas", "Texas A&M"]
    },
    {
      category: "Tradition",
      title: "Midnight yell, the cannon, and the Masked Rider",
      hook: "Pageantry is not nostalgia fluff — it is how programs turn campuses into home-field weapons.",
      body: "College football’s unfair advantage over the pros is ritual: Aggie yell practice, Longhorn icons, Red Raider spirit that turns Lubbock into a destination. Tradition doesn’t win third-and-long by itself, but it recruits, retains, and raises the cost of visiting. When the news cycle is all portal and lawsuits, a packed student section is still the purest metric of health.",
      tags: ["tradition", "Texas Tech", "Texas A&M", "Texas"]
    },
    {
      category: "Trending",
      title: "What the timeline will argue about this week",
      hook: "Between injury reports, coordinator quotes, and anonymous portal smoke, the discourse has a weekly weather pattern.",
      body: "Healthy fandom means picking a few trusted reporters and ignoring engagement bait. For a multi-team Texas household, that might mean one beat each for Tech, A&M, and Texas plus a national CFB writer who understands playoff mechanics. If a story doesn’t change a depth chart, a market, or a rule, it can wait until after the game.",
      tags: ["trending", "national"]
    },
    {
      category: "Players",
      title: "Stars, roles, and the myth of the single savior",
      hook: "The best teams have a headliner and a dozen nameless correct decisions.",
      body: "QB battles and five-star arrivals will dominate thumbnails. Winning programs obsess over second-string guards, gunners, and the backup nickel. When you read a player feature, ask what system makes them multiply. When you read a transfer blurb, ask what hole they actually fill. That habit cuts through hype for all three Texas brands and for the national title picture alike.",
      tags: ["players", "portal", "national"]
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

  function dayOfYear(d) {
    const start = new Date(d.getFullYear(), 0, 0);
    return Math.floor((d - start) / EPOCH_MS);
  }

  function seededShuffle(arr, seed) {
    const a = arr.slice();
    let s = seed >>> 0;
    function rand() {
      s = (Math.imul(1664525, s) + 1013904223) >>> 0;
      return s / 4294967296;
    }
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      const t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }

  function stripHtml(html) {
    return String(html || "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function wordCount(text) {
    return String(text || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean).length;
  }

  function estimateMinutes(text) {
    return Math.max(1, Math.round(wordCount(text) / 200));
  }

  function scoreItem(item) {
    const blob = ((item.title || "") + " " + (item.summary || "")).toLowerCase();
    let score = 0;
    if (/texas tech|red raiders|\bttu\b|lubbock/.test(blob)) score += 8;
    if (/texas a&m|texas a \& m|aggies|\btamu\b|kyle field/.test(blob)) score += 8;
    if (/\btexas longhorns\b|\blonghorns\b|austin.*texas|texas football/.test(blob)) score += 6;
    if (/\btexas\b/.test(blob) && !/texas tech|a&m|a \& m/.test(blob)) score += 3;
    if (/big 12|big12|big twelve/.test(blob)) score += 3;
    if (/\bsec\b|southeastern/.test(blob)) score += 3;
    if (/transfer portal|portal|nil|name, image|lawsuit|antitrust|playoff|cfp|ranking|odds|spread|recruit/.test(blob))
      score += 2;
    if (/nfl draft|nba|mlb|nhl|soccer|mlb/.test(blob)) score -= 2;
    if (/college football|cfb|ncaaf|fbs/.test(blob)) score += 2;
    return score;
  }

  function categorizeItem(item) {
    const blob = ((item.title || "") + " " + (item.summary || "")).toLowerCase();
    if (/texas tech|red raiders|\bttu\b/.test(blob)) return "Texas Tech";
    if (/texas a&m|aggies|\btamu\b/.test(blob)) return "Texas A&M";
    if (/longhorns|\btexas\b/.test(blob) && !/tech|a&m|a \& m/.test(blob)) return "Texas";
    if (/portal|transfer/.test(blob)) return "Transfer portal";
    if (/nil|name, image/.test(blob)) return "NIL";
    if (/lawsuit|antitrust|ncaa|court/.test(blob)) return "Lawsuits & governance";
    if (/odds|spread|betting|line /.test(blob)) return "Rankings & odds";
    if (/rank|ap poll|playoff|cfp/.test(blob)) return "Rankings & odds";
    if (/big 12|big12/.test(blob)) return "Big 12";
    if (/\bsec\b/.test(blob)) return "SEC";
    return "National CFB";
  }

  async function fetchRssItems(feedUrl) {
    const api =
      "https://api.rss2json.com/v1/api.json?rss_url=" + encodeURIComponent(feedUrl) + "&count=12";
    const res = await fetch(api);
    if (!res.ok) throw new Error("rss " + res.status);
    const data = await res.json();
    if (data.status !== "ok" || !Array.isArray(data.items)) throw new Error("bad rss");
    return data.items
      .map((item) => ({
        title: stripHtml(item.title || "").slice(0, 160),
        summary: stripHtml(item.description || item.content || "").slice(0, 480),
        link: item.link || item.url || "",
        pubDate: item.pubDate || ""
      }))
      .filter((x) => x.title);
  }

  function narrativeFromLive(item, idx) {
    const bridges = [
      "Kick this off with the wire:",
      "Flip the channel:",
      "Hold the Gatorade — next up:",
      "In the national noise:",
      "Closer to the forty-acre / Lubbock / Aggieland orbit:"
    ];
    const cat = categorizeItem(item);
    const summary =
      item.summary ||
      "Details are still developing; the headline is the signal worth tracking for now.";
    return {
      category: cat,
      title: item.title,
      hook: summary.slice(0, 200) + (summary.length > 200 ? "…" : ""),
      body:
        bridges[idx % bridges.length] +
        " " +
        summary +
        " Read it as one piece of a bigger board: portal, NIL, rankings, and conference realignment all share airtime now. The question for Texas Tech, Texas A&M, and Texas fans is the same — does this change Saturday, or only the timeline?",
      source: "live",
      link: item.link || "",
      tags: [cat]
    };
  }

  function buildFallbackEdition(date) {
    const seed = dayOfYear(date) + date.getFullYear() * 31;
    // Always feature each major school somewhere in the week rotation; daily pick 5 with school bias
    const schoolFirst = FALLBACK_SEEDS.filter((s) =>
      /Texas Tech|Texas A&M|^Texas$/.test(s.category)
    );
    const rest = FALLBACK_SEEDS.filter((s) => !/Texas Tech|Texas A&M|^Texas$/.test(s.category));
    const picks = seededShuffle(schoolFirst, seed)
      .slice(0, 2)
      .concat(seededShuffle(rest, seed + 7).slice(0, 3));
    return composeEdition(date, picks, "curated");
  }

  function composeEdition(date, segments, source) {
    const names =
      global.CL && CL.profile
        ? CL.profile.displayNames()
        : { myName: "you", partnerName: "partner" };
    const dateLabel = date.toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric"
    });

    const intro =
      "Saturday never really ends for " +
      (names.myName || "you") +
      " & " +
      (names.partnerName || "partner") +
      ". Here’s your college football briefing for " +
      dateLabel +
      " — portal heat, rankings and odds, NIL noise, lawsuits, tradition, and the three Texas brands that matter most on this app: Tech, A&M, and Texas. About five minutes. No endless scroll required.";

    const parts = [{ type: "intro", text: intro }];
    segments.forEach((seg, i) => {
      parts.push({
        type: "segment",
        index: i + 1,
        category: seg.category,
        title: seg.title,
        hook: seg.hook,
        body: seg.body,
        source: seg.source,
        link: seg.link || "",
        tags: seg.tags || []
      });
    });

    const outro =
      "Whistle for today. If one item matters for your watch party, save it to Notes. Guns up, gig ’em, and hook ’em — argue kindly, bet responsibly, and remember the sport is still played by kids in helmets.";
    parts.push({ type: "outro", text: outro });

    const fullText = [intro]
      .concat(
        segments.map(
          (s, i) =>
            i +
            1 +
            ". [" +
            (s.category || "CFB") +
            "] " +
            s.title +
            "\n" +
            (s.hook || "") +
            "\n" +
            (s.body || "")
        )
      )
      .concat([outro])
      .join("\n\n");

    return {
      dateKey: dayKey(date),
      generatedAt: Date.now(),
      source: source || "mixed",
      readMinutes: Math.max(4, Math.min(7, estimateMinutes(fullText))),
      segments: segments,
      parts: parts,
      title: "CFB Daily · " + dateLabel,
      focus: ["Texas Tech", "Texas A&M", "Texas", "Big 12", "SEC"]
    };
  }

  async function fetchLiveSegments(date) {
    const seed = dayOfYear(date);
    const collected = [];

    await Promise.all(
      FEEDS.map(async (feed) => {
        try {
          const items = await fetchRssItems(feed.url);
          items.forEach((item) => {
            collected.push(Object.assign({ feed: feed.id }, item, { _score: scoreItem(item) }));
          });
        } catch (err) {
          console.warn("CFB feed failed", feed.id, err);
        }
      })
    );

    const ranked = collected
      .filter((i) => i._score > 0 || /college football|cfb|ncaa|transfer|nil/i.test(i.title))
      .sort((a, b) => b._score - a._score);

    const seen = new Set();
    const top = [];
    for (const item of ranked) {
      const key = item.title.toLowerCase().slice(0, 40);
      if (seen.has(key)) continue;
      seen.add(key);
      top.push(item);
      if (top.length >= 5) break;
    }

    // Ensure diversity: if we have few Texas hits, pad with curated Texas segments
    let segments = top.map((item, idx) => narrativeFromLive(item, idx));
    if (segments.length < 5) {
      const need = 5 - segments.length;
      const extras = seededShuffle(FALLBACK_SEEDS, seed + 3).slice(0, need);
      segments = segments.concat(extras);
    }

    // If live had zero Texas-related, force one Tech / A&M / Texas curated piece in
    const hasTexas = segments.some((s) =>
      /Texas Tech|Texas A&M|^Texas$|Longhorn|Aggie|Red Raider/i.test(
        (s.category || "") + (s.title || "")
      )
    );
    if (!hasTexas) {
      const school = seededShuffle(
        FALLBACK_SEEDS.filter((s) => /Texas Tech|Texas A&M|^Texas$/.test(s.category)),
        seed
      )[0];
      if (school) segments[segments.length - 1] = school;
    }

    return segments.slice(0, 5);
  }

  function getCached() {
    return CL.storage.get(CACHE_KEY, null);
  }

  function setCached(edition) {
    CL.storage.set(CACHE_KEY, edition, { skipSync: true });
    return edition;
  }

  function needsRefresh(cache, now) {
    now = now || new Date();
    if (!cache || !cache.dateKey) return true;
    return cache.dateKey !== dayKey(now);
  }

  async function getDailyEdition(options) {
    options = options || {};
    const now = new Date();
    const cache = getCached();

    if (!options.force && !needsRefresh(cache, now)) {
      return Object.assign({}, cache, { fromCache: true });
    }

    try {
      const segments = await fetchLiveSegments(now);
      const hasLive = segments.some((s) => s.source === "live" || s.link);
      const edition = composeEdition(now, segments, hasLive ? "live+curated" : "curated");
      setCached(edition);
      return Object.assign({}, edition, { fromCache: false });
    } catch (err) {
      console.warn("CFB edition failed:", err);
      if (cache && cache.parts) {
        return Object.assign({}, cache, {
          fromCache: true,
          note: "Showing last saved CFB briefing — live feeds were unreachable."
        });
      }
      const edition = buildFallbackEdition(now);
      setCached(edition);
      return Object.assign({}, edition, {
        fromCache: false,
        note: "Offline curated CFB briefing — will retry feeds next open."
      });
    }
  }

  global.CL = global.CL || {};
  global.CL.data = global.CL.data || {};
  global.CL.data.cfbTeams = TEAMS;
  global.CL.cfb = {
    getDailyEdition,
    getCached,
    dayKey,
    needsRefresh,
    TEAMS
  };
})(window);
