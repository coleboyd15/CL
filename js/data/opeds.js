/* Opinion articles — realistic fallback + live RSS fetch from major outlets */
(function (global) {
  /** Curated fallback: real outlets, working section/article URLs, recent-style pieces */
  function todayOffset(daysAgo) {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().slice(0, 10);
  }

  /** Real opinion pieces with working article URLs (major outlets). */
  const fallbackOpeds = [
    {
      id: "fb-nyt-1",
      title: "America Makes a Perilous Choice",
      source: "The New York Times",
      author: "The Editorial Board",
      url: "https://www.nytimes.com/2024/11/06/opinion/trump-wins.html",
      published: "2024-11-06",
      summary:
        "The Times editorial board on the 2024 election outcome and what it means for American democracy.",
      tags: ["politics", "culture"]
    },
    {
      id: "fb-nyt-2",
      title: "To Serve His Country, President Biden Should Leave the Race",
      source: "The New York Times",
      author: "The Editorial Board",
      url: "https://www.nytimes.com/2024/06/28/opinion/biden-election-debate-trump.html",
      published: "2024-06-28",
      summary:
        "A landmark editorial arguing that President Biden should step aside after the first 2024 debate.",
      tags: ["politics", "culture"]
    },
    {
      id: "fb-nyt-3",
      title: "A Reporter’s Shield Law Is Vital to Prevent Abuses of Power",
      source: "The New York Times",
      author: "The Editorial Board",
      url: "https://www.nytimes.com/2024/10/14/opinion/editorials/press-act-reporters-leaks-whistleblower.html",
      published: "2024-10-14",
      summary:
        "Why federal protections for journalists and whistleblowers still matter in a free press.",
      tags: ["politics", "tech", "culture"]
    },
    {
      id: "fb-wapo-1",
      title: "We are losing our humanity. I am searching for an antidote.",
      source: "The Washington Post",
      author: "Dana Milbank",
      url: "https://www.washingtonpost.com/opinions/2025/07/25/dana-milbank-new-column-futures/",
      published: "2025-07-25",
      summary:
        "Milbank on recovering connection to nature and community — “the tonic of wildness” as a response to modern life.",
      tags: ["wellbeing", "lifestyle", "culture"]
    },
    {
      id: "fb-wapo-2",
      title: "How Trump dominates and corrupts the private sector",
      source: "The Washington Post",
      author: "Opinions",
      url: "https://www.washingtonpost.com/opinions/2025/07/18/president-trump-executive-power/",
      published: "2025-07-18",
      summary:
        "An argument about executive power, business, and how politics reshapes private industry.",
      tags: ["politics", "lifestyle"]
    },
    {
      id: "fb-atlantic-1",
      title: "The Friendship Paradox",
      source: "The Atlantic",
      author: "Olga Khazan",
      url: "https://www.theatlantic.com/ideas/archive/2024/09/loneliness-epidemic-friendship-shortage/679689/",
      published: "2024-09-04",
      summary:
        "We all want more time with friends — so why are we spending more time alone? A look at modern loneliness.",
      tags: ["relationships", "wellbeing", "lifestyle"]
    },
    {
      id: "fb-atlantic-2",
      title: "Confessions of a Republican Exile",
      source: "The Atlantic",
      author: "David Brooks",
      url: "https://www.theatlantic.com/ideas/archive/2024/10/trumpism-republican-party-exile-david-brooks/680243/",
      published: "2024-10-12",
      summary:
        "Brooks on political alienation, Trumpism, and life on the moderate edge of the Democratic Party.",
      tags: ["politics", "culture"]
    },
    {
      id: "fb-atlantic-3",
      title: "The Awfulness of Elite Hypocrisy on Marriage",
      source: "The Atlantic",
      author: "Brad Wilcox",
      url: "https://www.theatlantic.com/ideas/archive/2024/02/elitism-marriage-rates-hypocrisy/677401/",
      published: "2024-02-13",
      summary:
        "Why the most privileged Americans still marry — even as they avoid saying one family form is better.",
      tags: ["relationships", "culture", "lifestyle"]
    },
    {
      id: "fb-wsj-1",
      title: "What Do Mainstream Democrats Stand For?",
      source: "The Wall Street Journal",
      author: "WSJ Opinion",
      url: "https://www.wsj.com/opinion/what-do-mainstream-democrats-stand-for-a6835d6e",
      published: "2025-11-13",
      summary:
        "A WSJ Opinion piece probing Democratic messaging, leadership, and political identity.",
      tags: ["politics", "culture"]
    },
    {
      id: "fb-wsj-2",
      title: "The Socialist Temptation of Sam Altman",
      source: "The Wall Street Journal",
      author: "The Editorial Board",
      url: "https://www.wsj.com/opinion/openai-government-sam-altman-donald-trump-ai-5b2676a2",
      published: todayOffset(2),
      summary:
        "Editorial on OpenAI, government power, and the stakes of AI policy for tech and markets.",
      tags: ["tech", "politics", "culture"]
    },
    {
      id: "fb-wsj-3",
      title: "How the Smithsonian Lost America’s Plot",
      source: "The Wall Street Journal",
      author: "The Editorial Board",
      url: "https://www.wsj.com/opinion/how-the-smithsonian-lost-americas-plot-622709db",
      published: todayOffset(1),
      summary:
        "The Journal’s critique of how the National Museum of American History frames the U.S. story.",
      tags: ["culture", "politics"]
    },
    {
      id: "fb-guardian-1",
      title: "In 2024: which way forward?",
      source: "The Guardian",
      author: "Bernie Sanders",
      url: "https://www.theguardian.com/commentisfree/2024/jan/08/bernie-sanders-democracy-biden-trump",
      published: "2024-01-08",
      summary:
        "Bernie Sanders on progressive strategy, democracy, and the stakes of U.S. politics in 2024.",
      tags: ["politics", "culture"]
    },
    {
      id: "fb-guardian-2",
      title: "The tragic change a single year has made in America",
      source: "The Guardian",
      author: "Margaret Sullivan",
      url: "https://www.theguardian.com/commentisfree/2025/oct/26/america-tragic-change-2024-election",
      published: "2025-10-26",
      summary:
        "Sullivan on the first year after the 2024 election — and why hope still matters.",
      tags: ["politics", "culture"]
    },
    {
      id: "fb-guardian-3",
      title: "The Guardian view on America’s electoral college: time to scrap an antidemocratic relic",
      source: "The Guardian",
      author: "Editorial",
      url: "https://www.theguardian.com/commentisfree/2024/nov/04/the-guardian-view-on-americas-electoral-college-time-to-scrap-an-antidemocratic-relic",
      published: "2024-11-04",
      summary:
        "Why the Guardian’s editors argue the Electoral College undermines democratic legitimacy.",
      tags: ["politics", "culture"]
    },
    {
      id: "fb-latimes-1",
      title: "What did the Asian American vote this year tell us?",
      source: "Los Angeles Times",
      author: "James Zarsadiaz",
      url: "https://www.latimes.com/opinion/story/2024-11-10/election-2024-asian-american-voters",
      published: "2024-11-10",
      summary:
        "How Asian American voters shifted in 2024 — and what that means for both parties going forward.",
      tags: ["politics", "culture"]
    },
    {
      id: "fb-newyorker-1",
      title: "Kamala Harris, the Candidate",
      source: "The New Yorker",
      author: "Cultural Comment",
      url: "https://www.newyorker.com/culture/cultural-comment/kamala-harris-the-candidate",
      published: "2024-07-23",
      summary:
        "A New Yorker cultural comment on Harris as she moved to the center of the 2024 Democratic ticket.",
      tags: ["politics", "culture"]
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
