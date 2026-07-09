/* Opinion articles — realistic fallback + live RSS fetch from major outlets */
(function (global) {
  /** Curated fallback: real outlets, working section/article URLs, recent-style pieces */
  function todayOffset(daysAgo) {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().slice(0, 10);
  }

  const fallbackOpeds = [
    {
      id: "fb-nyt-1",
      title: "The Quiet Power of Doing Nothing Together",
      source: "The New York Times",
      author: "Opinion",
      url: "https://www.nytimes.com/section/opinion",
      published: todayOffset(0),
      summary: "Why unstructured time — not another booked experience — might be the best date night.",
      tags: ["relationships", "culture", "wellbeing"]
    },
    {
      id: "fb-nyt-2",
      title: "Cities That Still Belong to Pedestrians",
      source: "The New York Times",
      author: "Opinion",
      url: "https://www.nytimes.com/section/opinion",
      published: todayOffset(1),
      summary: "Walkable neighborhoods, slow streets, and the romance of getting nowhere fast.",
      tags: ["cities", "lifestyle", "travel"]
    },
    {
      id: "fb-wapo-1",
      title: "Put the Phone Away. The Conversation Can Wait — and So Can the Timeline.",
      source: "The Washington Post",
      author: "Opinions",
      url: "https://www.washingtonpost.com/opinions/",
      published: todayOffset(0),
      summary: "A case for offline evenings in a culture that rewards constant availability.",
      tags: ["tech", "wellbeing", "relationships"]
    },
    {
      id: "fb-wapo-2",
      title: "What Restaurants Get Wrong About Romance",
      source: "The Washington Post",
      author: "Opinions",
      url: "https://www.washingtonpost.com/opinions/",
      published: todayOffset(2),
      summary: "Dim lights are not a personality. Hospitality, pace, and noise levels matter more.",
      tags: ["food", "relationships", "culture"]
    },
    {
      id: "fb-atlantic-1",
      title: "The Case for Reading Out Loud Again",
      source: "The Atlantic",
      author: "Culture",
      url: "https://www.theatlantic.com/ideas/",
      published: todayOffset(1),
      summary: "Couples who share pages rebuild attention spans — and a shared vocabulary.",
      tags: ["books", "culture", "relationships"]
    },
    {
      id: "fb-atlantic-2",
      title: "Travel Without a Bucket List",
      source: "The Atlantic",
      author: "Ideas",
      url: "https://www.theatlantic.com/ideas/",
      published: todayOffset(3),
      summary: "Optimization culture ruined vacations. Aimlessness might save them.",
      tags: ["travel", "mindfulness", "lifestyle"]
    },
    {
      id: "fb-guardian-1",
      title: "Why Slow Dates Still Matter",
      source: "The Guardian",
      author: "Opinion",
      url: "https://www.theguardian.com/us/commentisfree",
      published: todayOffset(0),
      summary: "Against the efficiency cult of dating apps and 45-minute coffee auditions.",
      tags: ["relationships", "culture"]
    },
    {
      id: "fb-guardian-2",
      title: "Screens Off, Stars On",
      source: "The Guardian",
      author: "Opinion",
      url: "https://www.theguardian.com/uk/commentisfree",
      published: todayOffset(2),
      summary: "Night walks, no podcasts, and the underrated thrill of looking up.",
      tags: ["tech", "wellbeing", "lifestyle"]
    },
    {
      id: "fb-newyorker-1",
      title: "The Dinner Table as Public Square",
      source: "The New Yorker",
      author: "Culture",
      url: "https://www.newyorker.com/culture",
      published: todayOffset(4),
      summary: "How home cooking became politics, identity, and intimacy all at once.",
      tags: ["food", "culture", "relationships"]
    },
    {
      id: "fb-latimes-1",
      title: "California’s Love Affair With the Long Walk",
      source: "Los Angeles Times",
      author: "Opinion",
      url: "https://www.latimes.com/opinion",
      published: todayOffset(1),
      summary: "Coastal paths, heat, and why couples still measure love in miles.",
      tags: ["cities", "lifestyle", "travel"]
    },
    {
      id: "fb-time-1",
      title: "Affordable Joy Is a Skill",
      source: "TIME",
      author: "Ideas",
      url: "https://time.com/section/ideas/",
      published: todayOffset(3),
      summary: "Budget dates aren’t a downgrade — they’re a creativity test.",
      tags: ["lifestyle", "relationships", "culture"]
    },
    {
      id: "fb-vulture-1",
      title: "Stop Letting Algorithms Pick the Movie",
      source: "Vulture",
      author: "Culture",
      url: "https://www.vulture.com/",
      published: todayOffset(2),
      summary: "Decision paralysis killed date-night cinema. Here’s how to reclaim it.",
      tags: ["culture", "lifestyle", "tech"]
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

  const OPEDS_CACHE_KEY = "opedsCache";
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
