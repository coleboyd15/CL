/* Opinion articles — recent curated pieces + live RSS fetch from major outlets */
(function (global) {
  function todayOffset(daysAgo) {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().slice(0, 10);
  }

  /**
   * Curated recent opinion pieces (within ~last 6 months of mid-2026).
   * All URLs point to real articles on major outlets.
   */
  const fallbackOpeds = [
    {
      id: "fb-nyt-1",
      title: "The Democrats Can’t Go On Like This",
      source: "The New York Times",
      author: "The Editorial Board",
      url: "https://www.nytimes.com/2026/07/08/opinion/graham-platner-suspends-campaign-democrats-lessons.html",
      published: "2026-07-08",
      summary:
        "After Graham Platner suspends his Maine campaign, the Times board argues the trouble goes far beyond one candidate.",
      tags: ["politics", "culture"]
    },
    {
      id: "fb-nyt-2",
      title: "Is America’s MAGA Wing Giving Up on America?",
      source: "The New York Times",
      author: "David French",
      url: "https://www.nytimes.com/2026/07/09/opinion/birthright-maga-musk-thiel.html",
      published: "2026-07-09",
      summary:
        "French on the right’s birthright-citizenship meltdown and what it signals about American identity.",
      tags: ["politics", "culture"]
    },
    {
      id: "fb-nyt-3",
      title: "It’s a World-Class Investment. It’s a Junk Investment. What Is Going on With SpaceX?",
      source: "The New York Times",
      author: "Bethany McLean",
      url: "https://www.nytimes.com/2026/07/09/opinion/spacex-ipo-investment-smart-dumb-money.html",
      published: "2026-07-09",
      summary:
        "A guest essay on SpaceX’s dual reputation as both a world-class and junk investment — and what that means for markets.",
      tags: ["tech", "lifestyle", "culture"]
    },
    {
      id: "fb-nyt-4",
      title: "A Great University Undermines Its Mission",
      source: "The New York Times",
      author: "The Editorial Board",
      url: "https://www.nytimes.com/2026/07/06/opinion/university-california-sat-testing-admissions.html",
      published: "2026-07-06",
      summary:
        "On the University of California’s test-blind policy and students thrown into classes they aren’t prepared for.",
      tags: ["culture", "lifestyle"]
    },
    {
      id: "fb-nyt-5",
      title: "Actually, the American Economy Isn’t in Decline",
      source: "The New York Times",
      author: "Opinion",
      url: "https://www.nytimes.com/2026/07/08/opinion/american-economy-decline-china-europe.html",
      published: "2026-07-08",
      summary:
        "A counter-narrative on U.S. economic strength relative to China and Europe amid gloomy conventional wisdom.",
      tags: ["politics", "lifestyle"]
    },
    {
      id: "fb-wapo-1",
      title: "Moving on from Graham Platner",
      source: "The Washington Post",
      author: "Editorial Board",
      url: "https://www.washingtonpost.com/opinions/2026/07/09/moving-graham-platner/",
      published: "2026-07-09",
      summary:
        "Why Maine Democrats should run a competitive process to replace Platner before November.",
      tags: ["politics", "culture"]
    },
    {
      id: "fb-wapo-2",
      title: "Europe isn’t cool",
      source: "The Washington Post",
      author: "Opinions",
      url: "https://www.washingtonpost.com/opinions/2026/07/05/europe-ac-folly/",
      published: "2026-07-05",
      summary:
        "A sharp critique of Europe’s resistance to air conditioning as heat waves drive deadly excess deaths.",
      tags: ["lifestyle", "wellbeing", "culture"]
    },
    {
      id: "fb-wapo-3",
      title: "Why Gen Z hates capitalism",
      source: "The Washington Post",
      author: "James Hohmann & Megan McArdle",
      url: "https://www.washingtonpost.com/opinions/2026/06/15/why-gen-z-hates-capitalism/",
      published: "2026-06-15",
      summary:
        "Why young voters are turning toward socialism — and how politicians are capitalizing on that angst.",
      tags: ["politics", "culture", "lifestyle"]
    },
    {
      id: "fb-wapo-4",
      title: "What AI is really coming for",
      source: "The Washington Post",
      author: "Opinions",
      url: "https://www.washingtonpost.com/opinions/2026/02/17/anthropic-lawyers-technology/",
      published: "2026-02-17",
      summary:
        "Beyond doomsday AI talk: how autonomous agents are already reshaping law, marketing, and white-collar work.",
      tags: ["tech", "lifestyle", "culture"]
    },
    {
      id: "fb-atlantic-1",
      title: "The Cult of Delayed Gratification Is a Lie",
      source: "The Atlantic",
      author: "Ian Bogost",
      url: "https://www.theatlantic.com/ideas/2026/06/instant-gratification-psychology-economy/687550/",
      published: "2026-06-16",
      summary:
        "Bogost argues the marshmallow-test gospel of delayed gratification doesn’t match how people actually live.",
      tags: ["wellbeing", "lifestyle", "culture"]
    },
    {
      id: "fb-atlantic-2",
      title: "Why AI Is Incorrigibly Didactic",
      source: "The Atlantic",
      author: "Ideas",
      url: "https://www.theatlantic.com/ideas/2026/06/ai-writing-style-literature/687536/",
      published: "2026-06-15",
      summary:
        "On the preachy, unmistakable voice of AI writing — and why humans are adding typos to prove they’re real.",
      tags: ["tech", "culture", "books"]
    },
    {
      id: "fb-atlantic-3",
      title: "Trump Is Making the 250th Small",
      source: "The Atlantic",
      author: "Ideas",
      url: "https://www.theatlantic.com/ideas/2026/06/trump-250-usa-speech/687682/",
      published: "2026-06-24",
      summary:
        "America’s 250th anniversary framed through division and self-congratulation instead of a shared national story.",
      tags: ["politics", "culture"]
    },
    {
      id: "fb-atlantic-4",
      title: "The Friend-Group Fallacy",
      source: "The Atlantic",
      author: "Family",
      url: "https://www.theatlantic.com/family/2026/01/friend-group-loneliness/685528/",
      published: "2026-01-07",
      summary:
        "Why assuming everyone needs a big friend group misses how loneliness and social life actually work.",
      tags: ["relationships", "wellbeing", "lifestyle"]
    },
    {
      id: "fb-wsj-1",
      title: "Does Trump Care About the 2026 Midterms? They Care About Him",
      source: "The Wall Street Journal",
      author: "WSJ Opinion",
      url: "https://www.wsj.com/opinion/does-trump-care-about-the-2026-midterms-they-care-about-him-941d0ad6",
      published: "2026-06-09",
      summary:
        "If Republicans lose in November, the piece argues, a second Trump term could face impeachment and endless probes.",
      tags: ["politics", "culture"]
    },
    {
      id: "fb-wsj-2",
      title: "How to Deal With Students Using AI to Cheat",
      source: "The Wall Street Journal",
      author: "WSJ Opinion",
      url: "https://www.wsj.com/opinion/how-to-deal-with-students-using-ai-to-cheat-b5148177",
      published: "2026-05-25",
      summary:
        "Student AI cheating is rampant — and the Journal argues faculty design is part of the problem.",
      tags: ["tech", "culture", "lifestyle"]
    },
    {
      id: "fb-wsj-3",
      title: "The Trump Tax Increase of 2026",
      source: "The Wall Street Journal",
      author: "WSJ Opinion",
      url: "https://www.wsj.com/opinion/the-trump-tax-increase-of-2026-c179c286",
      published: "2026-04-28",
      summary:
        "Why new tariffs may more than offset the benefit of recent tax cuts for households and businesses.",
      tags: ["politics", "lifestyle"]
    },
    {
      id: "fb-wsj-4",
      title: "The Socialist Temptation of Sam Altman",
      source: "The Wall Street Journal",
      author: "The Editorial Board",
      url: "https://www.wsj.com/opinion/openai-government-sam-altman-donald-trump-ai-5b2676a2",
      published: "2026-07-07",
      summary:
        "Editorial on OpenAI, government bargains, and the stakes of AI policy for tech and markets.",
      tags: ["tech", "politics", "culture"]
    },
    {
      id: "fb-politico-1",
      title: "Has Trump Changed Democracy Forever? We Asked 11 Historians.",
      source: "POLITICO Magazine",
      author: "POLITICO Magazine",
      url: "https://www.politico.com/news/magazine/2026/07/04/america-250-round-up-00981023",
      published: "2026-07-04",
      summary:
        "For America 250, eleven historians grade U.S. democracy and what it will take to last another 250 years.",
      tags: ["politics", "culture"]
    },
    {
      id: "fb-politico-2",
      title: "Politics Is Breaking Us — Just Ask These Therapists",
      source: "POLITICO Magazine",
      author: "Catherine Kim",
      url: "https://www.politico.com/news/magazine/2026/05/15/political-anxiety-therapists-prescriptions-democracy-00920989",
      published: "2026-05-15",
      summary:
        "The political-therapy boom: how doomscrolling and partisan stress are reshaping Americans’ mental health.",
      tags: ["wellbeing", "politics", "relationships"]
    },
    {
      id: "fb-politico-3",
      title: "The Totally Bonkers Race to Replace Elise Stefanik",
      source: "POLITICO Magazine",
      author: "POLITICO Magazine",
      url: "https://www.politico.com/news/magazine/2026/06/21/elise-stefanik-competition-maga-candidates-constantino-smullen-00967961",
      published: "2026-06-21",
      summary:
        "A chaotic upstate House primary that pits traditional Republican politics against MAGA spectacle.",
      tags: ["politics", "culture"]
    },
    {
      id: "fb-guardian-1",
      title: "A super El Niño threatens disaster. Trump is handling it recklessly",
      source: "The Guardian",
      author: "Opinion",
      url: "https://www.theguardian.com/commentisfree/2026/jun/23/super-el-nino-extreme-weather-trump",
      published: "2026-06-23",
      summary:
        "Why dismantling ocean-observing systems is reckless as a strong El Niño threatens extreme weather.",
      tags: ["lifestyle", "politics", "wellbeing"]
    },
    {
      id: "fb-guardian-2",
      title: "Four million Americans will turn 18 this year. Why aren’t we registering them to vote?",
      source: "The Guardian",
      author: "Laura W. Brill",
      url: "https://www.theguardian.com/commentisfree/2026/jun/21/young-people-voter-registration",
      published: "2026-06-21",
      summary:
        "A case for automatic voter registration as millions of Americans hit voting age before the midterms.",
      tags: ["politics", "culture"]
    },
    {
      id: "fb-guardian-3",
      title: "World Cup: can big sports events bring us together?",
      source: "The Guardian",
      author: "Opinion",
      url: "https://www.theguardian.com/commentisfree/2026/jun/25/world-cup-big-sports-events-bring-us-together",
      published: "2026-06-25",
      summary:
        "On whether World Cup 2026 can still crumble divisions and highlight kinship — even briefly.",
      tags: ["culture", "lifestyle", "relationships"]
    }
  ];

  const RSS_FEEDS = [
    {
      source: "The New York Times",
      url: "https://rss.nytimes.com/services/xml/rss/nyt/Opinion.xml",
      tags: ["culture", "politics", "lifestyle"]
    },
    {
      source: "The Washington Post",
      url: "https://feeds.washingtonpost.com/rss/opinions",
      tags: ["politics", "culture", "lifestyle"]
    },
    {
      source: "The Guardian",
      url: "https://www.theguardian.com/us/commentisfree/rss",
      tags: ["culture", "politics", "lifestyle"]
    },
    {
      source: "The Atlantic",
      url: "https://www.theatlantic.com/feed/all/",
      tags: ["culture", "ideas", "lifestyle"]
    }
  ];

  // Bump key when curated list changes so stale browser caches don't hide fresh picks
  const OPEDS_CACHE_KEY = "opedsCache_v3";
  const OPEDS_TTL_MS = 60 * 60 * 1000; // 1 hour

  function slugId(source, link, title) {
    const raw = (link || title || "") + "|" + source;
    let h = 0;
    for (let i = 0; i < raw.length; i++) h = (Math.imul(31, h) + raw.charCodeAt(i)) | 0;
    return "live_" + Math.abs(h).toString(36);
  }

  function inferTags(title, sourceTags) {
    const t = (title || "").toLowerCase();
    const tags = new Set(sourceTags || ["culture"]);
    if (/love|marriage|dating|relationship|couple|family|friend/.test(t)) tags.add("relationships");
    if (/food|restaurant|dining|cook|recipe|wine/.test(t)) tags.add("food");
    if (/book|read|novel|author|literature/.test(t)) tags.add("books");
    if (/travel|city|urban|housing|transit|walk/.test(t)) {
      tags.add("cities");
      tags.add("travel");
    }
    if (/tech|phone|ai|internet|social media|screen/.test(t)) tags.add("tech");
    if (/mental|health|sleep|wellness|anxiety|happiness/.test(t)) tags.add("wellbeing");
    if (/culture|art|film|music|tv|movie/.test(t)) tags.add("culture");
    if (/lifestyle|work|career|money|home/.test(t)) tags.add("lifestyle");
    return Array.from(tags).slice(0, 4);
  }

  function stripHtml(html) {
    return String(html || "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function normalizeItem(item, source, defaultTags) {
    const title = stripHtml(item.title || "").trim();
    const url = (item.link || item.url || "").trim();
    if (!title || !url || !/^https?:\/\//i.test(url)) return null;
    const published = (item.pubDate || item.published || item.isoDate || "")
      .toString()
      .slice(0, 10) || todayOffset(0);
    const summary = stripHtml(item.description || item.content || item.summary || "").slice(0, 180);
    return {
      id: slugId(source, url, title),
      title,
      source,
      author: stripHtml(item.author || item.creator || "Opinion"),
      url,
      published,
      summary: summary || "Opinion from " + source + ".",
      tags: inferTags(title, defaultTags),
      live: true
    };
  }

  async function fetchRssViaProxy(feedUrl) {
    // rss2json free public converter (no API key required for light use)
    const api =
      "https://api.rss2json.com/v1/api.json?rss_url=" + encodeURIComponent(feedUrl) + "&count=8";
    const res = await fetch(api);
    if (!res.ok) throw new Error("rss2json " + res.status);
    const data = await res.json();
    if (data.status !== "ok" || !Array.isArray(data.items)) {
      throw new Error(data.message || "RSS parse failed");
    }
    return data.items;
  }

  async function fetchLiveOpeds() {
    const cached = CL.storage.get(OPEDS_CACHE_KEY, null);
    if (cached && cached.articles && cached.articles.length && Date.now() - (cached.at || 0) < OPEDS_TTL_MS) {
      CL.data.opeds = cached.articles;
      return { articles: cached.articles, source: "cache", fromCache: true };
    }

    const results = await Promise.allSettled(
      RSS_FEEDS.map(async (feed) => {
        const items = await fetchRssViaProxy(feed.url);
        return items
          .map((item) => normalizeItem(item, feed.source, feed.tags))
          .filter(Boolean);
      })
    );

    let articles = [];
    results.forEach((r) => {
      if (r.status === "fulfilled" && r.value) articles = articles.concat(r.value);
    });

    // Dedupe by URL
    const seen = new Set();
    articles = articles.filter((a) => {
      if (seen.has(a.url)) return false;
      seen.add(a.url);
      return true;
    });

    // Prefer fresher items
    articles.sort((a, b) => String(b.published).localeCompare(String(a.published)));
    articles = articles.slice(0, 24);

    if (articles.length >= 4) {
      CL.storage.set(OPEDS_CACHE_KEY, { at: Date.now(), articles });
      CL.data.opeds = articles;
      return { articles, source: "rss" };
    }

    // Partial or failed — merge live + fallback
    const merged = articles.concat(
      fallbackOpeds.filter((f) => !articles.some((a) => a.url === f.url))
    );
    CL.data.opeds = merged;
    if (articles.length) {
      CL.storage.set(OPEDS_CACHE_KEY, { at: Date.now(), articles: merged });
    }
    return {
      articles: merged,
      source: articles.length ? "mixed" : "fallback",
      note: articles.length
        ? null
        : "Showing curated opinion picks — live feeds unavailable."
    };
  }

  global.CL = global.CL || {};
  global.CL.data = global.CL.data || {};
  global.CL.data.opeds = fallbackOpeds;
  global.CL.data.fallbackOpeds = fallbackOpeds;
  global.CL.opedsApi = { fetchLiveOpeds, fallbackOpeds };
})(window);
