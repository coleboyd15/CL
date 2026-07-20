/* Daily narrative News — fetch + curated fallbacks, cached per calendar day */
(function (global) {
  const CACHE_KEY = "newsDaily";
  const EPOCH_MS = 24 * 60 * 60 * 1000;

  const CATEGORIES = [
    { id: "movies", label: "Movies", feeds: ["https://www.hollywood.com/movies/rss"] },
    { id: "culture", label: "Culture", feeds: ["https://www.theguardian.com/culture/rss"] },
    { id: "science", label: "Science", feeds: ["https://www.sciencedaily.com/rss/all.xml"] },
    { id: "ai", label: "Real-world AI", feeds: ["https://www.technologyreview.com/feed/"] },
    { id: "books", label: "Books", feeds: ["https://www.theguardian.com/books/rss"] },
    { id: "opinion", label: "Opinion", feeds: ["https://www.theguardian.com/us/commentisfree/rss"] },
    { id: "investigations", label: "Investigations", feeds: ["https://feeds.propublica.org/propublica/main"] },
    { id: "truecrime", label: "True crime", feeds: [] },
    { id: "evo", label: "Evolutionary biology", feeds: ["https://www.sciencedaily.com/rss/fossils_ruins/evolution.xml"] },
    { id: "future", label: "Futuristic predictions", feeds: [] },
    { id: "studies", label: "Curious studies", feeds: ["https://www.sciencedaily.com/rss/mind_brain.xml"] }
  ];

  /** Curated narrative seeds when feeds fail — rotated by day */
  const FALLBACK_SEEDS = [
    {
      category: "science",
      title: "A quieter sky of microbes",
      hook: "Scientists mapped microbial 'weather' in city air and found communities that shift with the seasons like invisible seasons of their own.",
      body: "The air you share on a walk is not empty. It carries pollen, dust, and a rotating cast of microbes whose mix may track humidity, wind, and human density. New sampling work suggests cities have microbial 'climates' — not just pollution indexes. For a couple comparing notes after a long day, that is a gentle reminder: the world is denser with life than it looks, and even the pause between buildings has ecology.",
      source: "Science Daily / curated",
      minutes: 1
    },
    {
      category: "ai",
      title: "Tools that practice, not just answer",
      hook: "The latest wave of AI systems is less about a single clever reply and more about agents that plan, check, and revise — still messy, still powerful.",
      body: "In labs and startups, the story shifted from chatbots that complete sentences to systems that call tools, keep short memories, and fail in public ways engineers can measure. That evolution matters more than any demo: it is the difference between a party trick and a coworker that needs supervision. The interesting question is not whether machines 'think,' but which human judgments we are willing to outsource — and which we insist on keeping.",
      source: "MIT Tech Review style briefing",
      minutes: 1
    },
    {
      category: "movies",
      title: "The return of the slow reveal",
      hook: "A cluster of recent films and series is betting that audiences still want mystery that unfolds in human time, not only plot twists on a timer.",
      body: "Streaming trained us for cliffhangers every eight minutes. Pushback is showing up as quieter thrillers and character studies that trust you to sit with ambiguity. For date night, that is good news: a film that leaves you arguing on the walk home is often more romantic than one that resolves everything before the credits.",
      source: "Culture desk",
      minutes: 1
    },
    {
      category: "evo",
      title: "Evolution is still improvising",
      hook: "Field biologists keep finding rapid adaptations — lizards, insects, urban wildlife — that rewrite how 'slow' evolution has to be.",
      body: "Darwin's idea never promised glacial pace; it promised differential survival. In heat islands, polluted rivers, and light-polluted nights, species are changing behavior and sometimes measurable traits within decades. The lesson is not panic; it is attentiveness. The living world is not a museum diorama. It is a rehearsal that never ends.",
      source: "Evolutionary biology roundup",
      minutes: 1
    },
    {
      category: "books",
      title: "Why short books feel long again",
      hook: "Publishers and readers are rediscovering slim volumes that demand full attention — essays, novellas, and hybrid reportage.",
      body: "When everything competes for glances, a 120-page book can feel radical. It asks for a continuous hour. Couples who read the same short book can finish in a weekend and still have something to discuss that is not a spoiler calendar. The medium is not dying; the unit of attention is being renegotiated.",
      source: "Books desk",
      minutes: 1
    },
    {
      category: "investigations",
      title: "Paper trails in the digital age",
      hook: "The best investigations still start with documents, FOIAs, and stubborn timelines — not only viral clips.",
      body: "Public-interest reporting keeps proving that power leaves residue: emails, contracts, zoning maps, shipping manifests. Reading one carefully reported piece a week is a habit that inoculates against outrage without evidence. It is also, oddly, hopeful: it assumes the public can handle complexity.",
      source: "Investigations",
      minutes: 1
    },
    {
      category: "truecrime",
      title: "The ethics of the second glance",
      hook: "True crime remains popular, but the better podcasts and essays are turning the camera toward systems — courts, forensics, incentives — not only villains.",
      body: "There is a difference between rubbernecking and accountability. The genre is at its best when it asks who had power, who was ignored, and what would prevent a sequel. If you listen together, pause for the human cost, not only the twist.",
      source: "Media ethics note",
      minutes: 1
    },
    {
      category: "future",
      title: "Predictions that age into checklists",
      hook: "Futurists are less interested in flying cars and more interested in logistics, climate adaptation, and who pays for resilience.",
      body: "The next decade's drama may look boring on a poster: grid upgrades, water rights, aging populations, and AI-assisted work that still needs humans who care. That is the futurism worth reading — not because it is flashy, but because it is actionable. A couple's future is made of ordinary infrastructure decisions as much as of romance.",
      source: "Futures brief",
      minutes: 1
    },
    {
      category: "studies",
      title: "A study that refuses the obvious",
      hook: "Odd, careful studies keep surfacing — on friendship, sleep, maps of loneliness, or how people share food — that make you re-see a Tuesday.",
      body: "Not every paper is a revolution. Some are a flashlight in a corner. The useful habit is curiosity without credulity: read the method, note the sample, enjoy the surprise. Then ask what tiny experiment you two could run at home — earlier bedtimes, phones in another room, a weekly walk without destinations.",
      source: "Curious studies",
      minutes: 1
    },
    {
      category: "opinion",
      title: "Opinions that earn their length",
      hook: "The opinions worth five minutes are the ones that change a frame, not only a team jersey.",
      body: "A good column names a tension you already feel and gives it cleaner language. It does not demand agreement; it demands a better question. Reading one aloud — or trading one each week — is a small ritual that keeps a relationship intellectually awake.",
      source: "Opinion",
      minutes: 1
    },
    {
      category: "culture",
      title: "Culture as a shared playlist",
      hook: "Museums, memes, concerts, and neighborhood rituals are all culture — and couples curate them without calling it that.",
      body: "What you both laugh at, what you both refuse, what you both replay: that is a culture of two. Zooming out to the wider culture helps you place your private tastes in a longer story. Today's briefing is an invitation to notice one new artifact — a song, a show, a local exhibit — and decide if it belongs in your shared canon.",
      source: "Culture",
      minutes: 1
    }
  ];

  function dayKey(d) {
    d = d || new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
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

  async function fetchRssItems(feedUrl) {
    const api =
      "https://api.rss2json.com/v1/api.json?rss_url=" + encodeURIComponent(feedUrl) + "&count=6";
    const res = await fetch(api);
    if (!res.ok) throw new Error("rss " + res.status);
    const data = await res.json();
    if (data.status !== "ok" || !Array.isArray(data.items)) throw new Error("bad rss");
    return data.items
      .map((item) => ({
        title: stripHtml(item.title || "").slice(0, 160),
        summary: stripHtml(item.description || item.content || "").slice(0, 420),
        link: item.link || item.url || "",
        pubDate: item.pubDate || ""
      }))
      .filter((x) => x.title);
  }

  function narrativeFromItem(category, item, idx) {
    const bridges = [
      "Meanwhile,",
      "In another corner of the map,",
      "Hold that thought — because",
      "Zoom out, and",
      "Closer to home in spirit,"
    ];
    const bridge = bridges[idx % bridges.length];
    const summary =
      item.summary ||
      "The full piece is still unfolding; what matters is the question it leaves on the table.";
    return {
      category,
      title: item.title,
      hook: summary.slice(0, 180) + (summary.length > 180 ? "…" : ""),
      body:
        bridge +
        " " +
        summary +
        (item.link
          ? " If you want the primary source later, it is out there under the original headline — but the point of this briefing is the thread, not the tab hoard."
          : ""),
      source: category,
      link: item.link || "",
      minutes: estimateMinutes(summary)
    };
  }

  function buildFallbackEdition(date) {
    const seed = dayOfYear(date) + date.getFullYear() * 17;
    const picks = seededShuffle(FALLBACK_SEEDS, seed).slice(0, 5);
    return composeEdition(date, picks, "curated");
  }

  function composeEdition(date, segments, source) {
    const names = global.CL && CL.profile ? CL.profile.displayNames() : { myName: "you", partnerName: "partner" };
    const dateLabel = date.toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric"
    });

    const intro =
      "Good morning, " +
      (names.myName || "you") +
      " & " +
      (names.partnerName || "partner") +
      ". Here is your shared daily briefing for " +
      dateLabel +
      " — five lanes of curiosity, stitched into one ~5 minute read. Skim the headings, or take the whole walk.";

    const parts = [];
    parts.push({ type: "intro", text: intro });

    segments.forEach((seg, i) => {
      parts.push({
        type: "segment",
        index: i + 1,
        category: seg.category,
        title: seg.title,
        hook: seg.hook,
        body: seg.body,
        source: seg.source,
        link: seg.link || ""
      });
    });

    const outro =
      "That is today's loop: science and systems, stories and screens, a little future, a little past. If one item snags you, save it to Notes or argue it over coffee. Tomorrow we will gather a new set.";
    parts.push({ type: "outro", text: outro });

    const fullText = [intro]
      .concat(
        segments.map(
          (s, i) =>
            (i + 1) +
            ". [" +
            (s.category || "story") +
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
      title: "Today for two · " + dateLabel
    };
  }

  async function fetchLiveSegments(date) {
    const seed = dayOfYear(date);
    const cats = seededShuffle(CATEGORIES, seed);
    const live = [];

    // Try several category feeds in parallel; keep first successes
    const attempts = cats.slice(0, 8).map(async (cat) => {
      if (!cat.feeds || !cat.feeds.length) return null;
      for (const feed of cat.feeds) {
        try {
          const items = await fetchRssItems(feed);
          if (items[0]) return { cat: cat.id, item: items[seed % items.length] || items[0] };
        } catch (_) {
          /* try next feed */
        }
      }
      return null;
    });

    const results = await Promise.allSettled(attempts);
    results.forEach((r) => {
      if (r.status === "fulfilled" && r.value) live.push(r.value);
    });

    const segments = live.slice(0, 5).map((row, idx) => narrativeFromItem(row.cat, row.item, idx));

    // Pad with curated for diversity
    if (segments.length < 5) {
      const need = 5 - segments.length;
      const used = new Set(segments.map((s) => s.category));
      const extras = seededShuffle(FALLBACK_SEEDS, seed + 99)
        .filter((s) => !used.has(s.category))
        .slice(0, need);
      extras.forEach((e) => segments.push(e));
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

  /**
   * Fresh if:
   * - no cache, or
   * - different calendar day, or
   * - force refresh
   * Morning intent: on first open after 7:00 local, prefer new day's edition.
   */
  function needsRefresh(cache, now) {
    now = now || new Date();
    if (!cache || !cache.dateKey) return true;
    if (cache.dateKey !== dayKey(now)) return true;
    return false;
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
      const edition = composeEdition(now, segments, segments.some((s) => s.link) ? "live+curated" : "curated");
      setCached(edition);
      return Object.assign({}, edition, { fromCache: false });
    } catch (err) {
      console.warn("News fetch failed:", err);
      if (cache && cache.parts) {
        return Object.assign({}, cache, {
          fromCache: true,
          note: "Showing last saved briefing — live feeds were unreachable."
        });
      }
      const edition = buildFallbackEdition(now);
      setCached(edition);
      return Object.assign({}, edition, {
        fromCache: false,
        note: "Offline curated briefing — will retry feeds next open."
      });
    }
  }

  global.CL = global.CL || {};
  global.CL.data = global.CL.data || {};
  global.CL.news = {
    getDailyEdition,
    getCached,
    dayKey,
    CATEGORIES,
    needsRefresh
  };
})(window);
